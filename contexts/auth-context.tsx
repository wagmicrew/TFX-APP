import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { useSchool } from './school-context';

const AUTH_ACCESS_TOKEN_KEY = '@trafikskola_access_token';
const AUTH_REFRESH_TOKEN_KEY = '@trafikskola_refresh_token';
const AUTH_USER_KEY = '@trafikskola_auth_user';

const APP_SECRET = 'sk_trafikskola_prod_acbdca5a99ca581b2528d9da55d5be73';

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
  const { config } = useSchool();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'X-App-Secret': APP_SECRET,
  }), []);

  const saveSession = useCallback(async (data: { accessToken: string; refreshToken: string; user: User }) => {
    console.log('[Auth] Saving session for user:', data.user.email);
    await AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, data.accessToken);
    await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, data.refreshToken);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    setIsAuthenticated(true);
  }, []);

  const requestOTPMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!config) throw new Error('School not configured');

      const url = `${config.apiBaseUrl}/auth/request-otp`;
      const headers = getHeaders();
      const body = JSON.stringify({ email });

      console.log('[Auth] ===== OTP REQUEST DEBUG =====');
      console.log('[Auth] URL:', url);
      console.log('[Auth] Headers:', JSON.stringify(headers));
      console.log('[Auth] Body:', body);
      console.log('[Auth] Config apiBaseUrl:', config.apiBaseUrl);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body,
        });
      } catch (fetchError: unknown) {
        const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        console.error('[Auth] FETCH ERROR (network):', errMsg);
        throw new Error(`Network error: ${errMsg}`);
      }

      console.log('[Auth] Response status:', response.status, response.statusText);

      let rawText: string;
      try {
        rawText = await response.text();
      } catch (textError: unknown) {
        const errMsg = textError instanceof Error ? textError.message : String(textError);
        console.error('[Auth] Failed to read response body:', errMsg);
        throw new Error(`Failed to read response: ${errMsg}`);
      }

      console.log('[Auth] Raw response body:', rawText);

      let data: OTPRequestResponse;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error('[Auth] Response is not valid JSON');
        throw new Error(`Server returned invalid JSON. Status: ${response.status}. Body: ${rawText.substring(0, 200)}`);
      }

      console.log('[Auth] Parsed response:', JSON.stringify(data));
      console.log('[Auth] ===== END OTP DEBUG =====');

      if (!response.ok || !data.success || !data.data) {
        const errorMsg = data.error || `Failed to send OTP (HTTP ${response.status})`;
        console.error('[Auth] OTP request failed:', errorMsg, 'errorCode:', data.errorCode);
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

      console.log('[Auth] Verifying OTP with otpId:', otpId);
      const response = await fetch(`${config.apiBaseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, otp: code, otpId }),
      });

      const data: AuthTokenResponse = await response.json();
      console.log('[Auth] Verify OTP response status:', response.status);

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

  const quickLoginMutation = useMutation({
    mutationFn: async (qrData: string) => {
      if (!config) throw new Error('School not configured');

      console.log('[Auth] Quick login with QR');
      let parsed: { type: string; token: string };
      try {
        parsed = JSON.parse(qrData);
      } catch {
        throw new Error('Invalid QR code format');
      }

      if (parsed.type !== 'quick_login' || !parsed.token) {
        throw new Error('Invalid QR code');
      }

      const response = await fetch(`${config.apiBaseUrl}/auth/quick-login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ quickToken: parsed.token }),
      });

      const data: AuthTokenResponse = await response.json();
      console.log('[Auth] Quick login response status:', response.status);

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

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!config || !refreshToken) return null;

    try {
      console.log('[Auth] Refreshing access token');
      const response = await fetch(`${config.apiBaseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ refreshToken }),
      });

      const data: RefreshResponse = await response.json();
      if (!response.ok || !data.success || !data.data) {
        console.log('[Auth] Token refresh failed, logging out');
        await AsyncStorage.multiRemove([AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY, AUTH_USER_KEY]);
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }

      console.log('[Auth] Token refreshed successfully');
      await AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, data.data.accessToken);
      setAccessToken(data.data.accessToken);
      return data.data.accessToken;
    } catch (error) {
      console.error('[Auth] Token refresh error:', error);
      return null;
    }
  }, [config, refreshToken, getHeaders]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Logging out');
      await AsyncStorage.multiRemove([AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY, AUTH_USER_KEY]);
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

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedAccess = await AsyncStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
        const storedRefresh = await AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);

        console.log('[Auth] Loaded stored auth:', !!storedAccess, !!storedRefresh);

        if (storedAccess && storedRefresh && storedUser) {
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('[Auth] Error loading auth:', error);
        setIsAuthenticated(false);
      }
    }

    loadStoredAuth();
  }, []);

  return {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    isLoading: isAuthenticated === null,
    requestOTP: requestOTPMutation.mutate,
    verifyOTP: verifyOTPMutation.mutate,
    quickLogin: quickLoginMutation.mutate,
    logout: logoutMutation.mutate,
    refreshAccessToken,
    requestOTPLoading: requestOTPMutation.isPending,
    verifyOTPLoading: verifyOTPMutation.isPending,
    quickLoginLoading: quickLoginMutation.isPending,
    requestOTPError: requestOTPMutation.error,
    verifyOTPError: verifyOTPMutation.error,
    quickLoginError: quickLoginMutation.error,
  };
});
