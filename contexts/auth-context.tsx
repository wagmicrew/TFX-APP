/**
 * Auth Context
 *
 * Manages authentication state, token storage (via SecureStore),
 * login flows (OTP, password, quick-login), and logout.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Constants from 'expo-constants';
import { useSchool } from './school-context';
import { getDeviceId } from '@/services/device-service';
import { registerThisDevice, unregisterThisDevice } from '@/services/device-service';
import {
  requestPushPermissions,
  clearPushToken,
  setupNotificationChannels,
  initializePush,
  getFCMToken,
} from '@/services/push-service';
import { clearAllOfflineData } from '@/services/sync-service';
import { saveToken, getToken, clearAllTokens, migrateTokensFromAsyncStorage } from '@/services/secure-storage';
import { logoutFromServer, loginWithPassword as apiLoginWithPassword } from '@/services/mobile-api';
import { APP_SECRET, STORAGE_KEYS } from '@/constants/config';

const AUTH_USER_KEY = STORAGE_KEYS.AUTH_USER;

/** How long (ms) before we proactively re-validate the session on app start.
 *  Set to 7 days — if the app was opened within this window, skip the refresh check.
 */
const SESSION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface OTPRequestResponse {
  success: boolean;
  data?: {
    message: string;
    expiresIn: number;
    otpId: string;
  };
  error?: string;
  errorCode?: string;
}

interface AuthTokenResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
  };
  error?: string;
  errorCode?: string;
}

interface RefreshResponse {
  success: boolean;
  data?: {
    accessToken: string;
    expiresIn: number;
  };
  error?: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { config, selectedDomain } = useSchool();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const pushCleanupRef = useRef<(() => void) | null>(null);

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'X-App-Secret': APP_SECRET,
  }), []);

  const saveSession = useCallback(async (data: { accessToken: string; refreshToken: string; user: User; expiresIn?: number }) => {
    console.log('[Auth] Saving session for user:', data.user.email);
    // Store tokens in SecureStore
    await saveToken(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
    await saveToken(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    // Store user info in AsyncStorage (non-sensitive)
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

    // Persist a device certificate: stores the refresh token + user email
    // so we can silently re-authenticate even if the access token expires.
    // The refresh token is long-lived and stored in SecureStore (encrypted at rest).
    const deviceCert = JSON.stringify({
      refreshToken: data.refreshToken,
      email: data.user.email,
      userId: data.user.id,
      issuedAt: Date.now(),
    });
    await saveToken(STORAGE_KEYS.DEVICE_CERT, deviceCert);

    // Record when session was last validated
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION_VALIDATED_AT, Date.now().toString());

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    setIsAuthenticated(true);

    // Initialize push notifications & register device
    if (config) {
      try {
        const cleanup = await initializePush();
        pushCleanupRef.current = cleanup;
        await registerThisDevice(config.apiBaseUrl, data.accessToken);
      } catch (err) {
        console.warn('[Auth] Push/device registration after login failed:', err);
      }
    }
  }, [config]);

  // ─── Build deviceInfo for auth requests ─────────────────────────────────

  const buildDeviceInfo = useCallback(async () => {
    const deviceId = await getDeviceId();
    const pushToken = await getFCMToken();
    return {
      deviceId,
      platform: Platform.OS,
      deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android',
      deviceModel: Platform.OS === 'ios'
        ? (Constants.default?.platform?.ios?.model ?? 'iPhone')
        : (Constants.default?.platform?.android?.model ?? 'Android'),
      osVersion: Platform.Version?.toString() ?? 'unknown',
      appVersion: '1.0.0',
      pushToken: pushToken ?? undefined,
    };
  }, []);

  // ─── OTP Login ──────────────────────────────────────────────────────────

  const requestOTPMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!config) throw new Error('School not configured');

      const deviceInfo = await buildDeviceInfo();
      const url = `${config.apiBaseUrl}/auth/request-otp`;
      const headers = getHeaders();
      const body = JSON.stringify({ email, deviceInfo: { deviceId: deviceInfo.deviceId, platform: deviceInfo.platform } });

      console.log('[Auth] ===== OTP REQUEST =====');
      console.log('[Auth] URL:', url);

      let response: Response;
      try {
        response = await fetch(url, { method: 'POST', headers, body });
      } catch (fetchError: unknown) {
        const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        throw new Error(`Network error: ${errMsg}`);
      }

      let rawText: string;
      try {
        rawText = await response.text();
      } catch (textError: unknown) {
        const errMsg = textError instanceof Error ? textError.message : String(textError);
        throw new Error(`Failed to read response: ${errMsg}`);
      }

      let data: OTPRequestResponse;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned invalid JSON. Status: ${response.status}. Body: ${rawText.substring(0, 200)}`);
      }

      if (!response.ok || !data.success || !data.data) {
        const errorMsg = data.error || `Failed to send OTP (HTTP ${response.status})`;
        throw new Error(errorMsg);
      }

      setOtpId(data.data.otpId);
      return data.data;
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      if (!config) throw new Error('School not configured');
      if (!otpId) throw new Error('No OTP request found. Please request a new code.');

      const deviceInfo = await buildDeviceInfo();

      console.log('[Auth] Verifying OTP with otpId:', otpId);
      const response = await fetch(`${config.apiBaseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          email,
          otpCode: code,
          otpId,
          deviceInfo,
        }),
      });

      const data: AuthTokenResponse = await response.json();

      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Invalid OTP');
      }
      return data.data;
    },
    onSuccess: async (data) => {
      console.log('[Auth] OTP verified successfully');
      await saveSession(data);
      setOtpId(null);
    },
  });

  // ─── Password Login ─────────────────────────────────────────────────────

  const loginWithPasswordMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!config || !selectedDomain) throw new Error('School not configured');

      const deviceInfo = await buildDeviceInfo();

      const result = await apiLoginWithPassword(config.apiBaseUrl, {
        email,
        password,
        domain: selectedDomain,
        deviceInfo,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Login failed');
      }

      return result.data;
    },
    onSuccess: async (data) => {
      console.log('[Auth] Password login successful');
      await saveSession(data);
    },
  });

  // ─── Quick Login (QR) ───────────────────────────────────────────────────

  const quickLoginMutation = useMutation({
    mutationFn: async (qrData: string) => {
      if (!config) throw new Error('School not configured');

      let parsed: { type: string; token: string };
      try {
        parsed = JSON.parse(qrData);
      } catch {
        throw new Error('Invalid QR code format');
      }

      if (!['quick_login', 'session_login'].includes(parsed.type) || !parsed.token) {
        throw new Error('Invalid QR code');
      }

      const url = `${config.apiBaseUrl}/auth/quick-login`;
      console.log('[Auth] Quick login URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ token: parsed.token }),
      });

      // Guard against HTML responses (server returning error page)
      const bodyText = await response.text();
      if (bodyText.trimStart().startsWith('<')) {
        console.error('[Auth] Quick login: server returned HTML instead of JSON (HTTP', response.status, ')');
        throw new Error('Servern svarade inte korrekt. Kontrollera att servern är igång.');
      }

      let data: AuthTokenResponse;
      try {
        data = JSON.parse(bodyText);
      } catch {
        console.error('[Auth] Quick login: invalid JSON response:', bodyText.substring(0, 200));
        throw new Error('Quick login failed: invalid server response');
      }

      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Quick login failed');
      }
      return data.data;
    },
    onSuccess: async (data) => {
      console.log('[Auth] Quick login successful');
      await saveSession(data);
    },
  });

  // ─── Token Refresh ──────────────────────────────────────────────────────

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!config || !refreshToken) return null;

    try {
      console.log('[Auth] Refreshing access token');
      const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ refreshToken }),
      });

      const data: RefreshResponse = await response.json();
      if (!response.ok || !data.success || !data.data) {
        console.log('[Auth] Token refresh failed, logging out');
        await clearAllTokens();
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }

      console.log('[Auth] Token refreshed successfully');
      await saveToken(STORAGE_KEYS.ACCESS_TOKEN, data.data.accessToken);
      setAccessToken(data.data.accessToken);
      return data.data.accessToken;
    } catch (error) {
      console.error('[Auth] Token refresh error:', error);
      return null;
    }
  }, [config, refreshToken, getHeaders]);

  // ─── Logout ─────────────────────────────────────────────────────────────

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Logging out');

      // Server-side logout
      if (config && accessToken) {
        try {
          await logoutFromServer(config.apiBaseUrl);
        } catch (err) {
          console.warn('[Auth] Server-side logout failed:', err);
        }

        // Unregister device
        try {
          await unregisterThisDevice(config.apiBaseUrl, accessToken);
        } catch (err) {
          console.warn('[Auth] Device unregister on logout failed:', err);
        }
      }

      // Clean up push
      await clearPushToken();
      if (pushCleanupRef.current) {
        pushCleanupRef.current();
        pushCleanupRef.current = null;
      }

      // Clear offline data
      await clearAllOfflineData();

      // Clear tokens from SecureStore
      await clearAllTokens();
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_VALIDATED_AT);
    },
    onSuccess: () => {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setOtpId(null);
      queryClient.clear();
    },
  });

  // ─── Load Stored Auth ───────────────────────────────────────────────────

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        // Run migration from AsyncStorage → SecureStore on first launch
        await migrateTokensFromAsyncStorage();

        const storedAccess = await getToken(STORAGE_KEYS.ACCESS_TOKEN);
        const storedRefresh = await getToken(STORAGE_KEYS.REFRESH_TOKEN);
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        const lastValidated = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_VALIDATED_AT);

        console.log('[Auth] Loaded stored auth:', !!storedAccess, !!storedRefresh);

        if (storedAccess && storedRefresh && storedUser) {
          const parsedUser = JSON.parse(storedUser) as User;

          // Check if session was recently validated
          const lastValidatedMs = lastValidated ? parseInt(lastValidated, 10) : 0;
          const sessionAge = Date.now() - lastValidatedMs;
          const needsRefresh = sessionAge > SESSION_VALIDITY_MS;

          if (!needsRefresh) {
            // Session still fresh — trust stored tokens
            console.log('[Auth] Session still valid (validated', Math.round(sessionAge / 3600000), 'h ago)');
            setAccessToken(storedAccess);
            setRefreshToken(storedRefresh);
            setUser(parsedUser);
            setIsAuthenticated(true);
            return;
          }

          // Session is stale — try to refresh the access token silently
          console.log('[Auth] Session stale, attempting silent refresh');
          if (config) {
            try {
              const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-App-Secret': APP_SECRET,
                },
                body: JSON.stringify({ refreshToken: storedRefresh }),
              });

              if (response.ok) {
                const data = await response.json();
                if (data.success && data.data?.accessToken) {
                  console.log('[Auth] Silent refresh successful');
                  const newAccessToken = data.data.accessToken;
                  await saveToken(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
                  await AsyncStorage.setItem(STORAGE_KEYS.SESSION_VALIDATED_AT, Date.now().toString());

                  // If server returned a new refresh token, save that too
                  if (data.data.refreshToken) {
                    await saveToken(STORAGE_KEYS.REFRESH_TOKEN, data.data.refreshToken);
                    setRefreshToken(data.data.refreshToken);
                  } else {
                    setRefreshToken(storedRefresh);
                  }

                  setAccessToken(newAccessToken);
                  setUser(parsedUser);
                  setIsAuthenticated(true);
                  return;
                }
              }

              // Refresh failed — try re-auth with device certificate
              console.log('[Auth] Refresh failed, trying device certificate re-auth');
              const reauthed = await tryDeviceCertReauth();
              if (reauthed) return;

              // All recovery failed
              console.log('[Auth] All session recovery failed, user must log in again');
              setIsAuthenticated(false);
            } catch (err) {
              console.warn('[Auth] Silent refresh network error:', err);
              // Network error — trust stored tokens (offline mode)
              setAccessToken(storedAccess);
              setRefreshToken(storedRefresh);
              setUser(parsedUser);
              setIsAuthenticated(true);
            }
          } else {
            // No config yet — trust stored tokens, refresh will happen when config loads
            setAccessToken(storedAccess);
            setRefreshToken(storedRefresh);
            setUser(parsedUser);
            setIsAuthenticated(true);
          }
        } else {
          // No stored tokens — check for device certificate for auto-login
          const reauthed = await tryDeviceCertReauth();
          if (!reauthed) {
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('[Auth] Error loading auth:', error);
        setIsAuthenticated(false);
      }
    }

    /**
     * Attempt to re-authenticate using the stored device certificate.
     * The device certificate contains a refresh token that was saved at first login.
     * We try this as a last resort before forcing the user to log in again.
     */
    async function tryDeviceCertReauth(): Promise<boolean> {
      try {
        const certJson = await getToken(STORAGE_KEYS.DEVICE_CERT);
        if (!certJson || !config) return false;

        const cert = JSON.parse(certJson) as {
          refreshToken: string;
          email: string;
          userId: string;
          issuedAt: number;
        };

        console.log('[Auth] Attempting device certificate re-auth for:', cert.email);

        const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-Secret': APP_SECRET,
          },
          body: JSON.stringify({ refreshToken: cert.refreshToken }),
        });

        if (!response.ok) {
          console.log('[Auth] Device cert re-auth failed (HTTP', response.status, ')');
          return false;
        }

        const data = await response.json();
        if (!data.success || !data.data?.accessToken) {
          console.log('[Auth] Device cert re-auth response invalid');
          return false;
        }

        console.log('[Auth] Device certificate re-auth successful!');
        const newAccess = data.data.accessToken;
        const newRefresh = data.data.refreshToken || cert.refreshToken;

        await saveToken(STORAGE_KEYS.ACCESS_TOKEN, newAccess);
        await saveToken(STORAGE_KEYS.REFRESH_TOKEN, newRefresh);
        await AsyncStorage.setItem(STORAGE_KEYS.SESSION_VALIDATED_AT, Date.now().toString());

        // Update device certificate with the fresh refresh token
        const updatedCert = JSON.stringify({
          ...cert,
          refreshToken: newRefresh,
          issuedAt: Date.now(),
        });
        await saveToken(STORAGE_KEYS.DEVICE_CERT, updatedCert);

        // Restore user from stored data or cert
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        const parsedUser = storedUser ? JSON.parse(storedUser) as User : null;

        setAccessToken(newAccess);
        setRefreshToken(newRefresh);
        if (parsedUser) setUser(parsedUser);
        setIsAuthenticated(true);
        return true;
      } catch (err) {
        console.warn('[Auth] Device cert re-auth error:', err);
        return false;
      }
    }

    loadStoredAuth();
  }, [config]);

  return {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    isLoading: isAuthenticated === null,
    // OTP
    requestOTP: requestOTPMutation.mutate,
    verifyOTP: verifyOTPMutation.mutate,
    requestOTPLoading: requestOTPMutation.isPending,
    verifyOTPLoading: verifyOTPMutation.isPending,
    requestOTPError: requestOTPMutation.error,
    verifyOTPError: verifyOTPMutation.error,
    // Password
    loginWithPassword: loginWithPasswordMutation.mutate,
    loginWithPasswordLoading: loginWithPasswordMutation.isPending,
    loginWithPasswordError: loginWithPasswordMutation.error,
    // Quick login
    quickLogin: quickLoginMutation.mutate,
    quickLoginLoading: quickLoginMutation.isPending,
    quickLoginError: quickLoginMutation.error,
    // Logout + refresh
    logout: logoutMutation.mutate,
    refreshAccessToken,
  };
});
