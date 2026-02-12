/**
 * Centralized API Client with Interceptors
 *
 * Single function wrapping fetch with:
 * 1. Auto auth header injection from secure storage
 * 2. 401 interceptor with token refresh + retry
 * 3. 429 exponential backoff
 * 4. Network error retry
 * 5. Typed ApiError for non-OK responses
 * 6. Centralized APP_SECRET header
 */

import { APP_SECRET, STORAGE_KEYS } from '@/constants/config';
import { getToken, saveToken, clearAllTokens } from './secure-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// ─── Error Class ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApiClientOptions {
  /** Full URL to call */
  url: string;
  /** HTTP method (default: GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request body (will be JSON.stringify'd) */
  body?: unknown;
  /** Extra headers to merge */
  headers?: Record<string, string>;
  /** Skip auth header injection (for public endpoints like config) */
  skipAuth?: boolean;
  /** Skip APP_SECRET header */
  skipAppSecret?: boolean;
  /** Max retries for network errors (default: 2) */
  maxNetworkRetries?: number;
  /** Max retries for 429 (default: 3) */
  max429Retries?: number;
}

// ─── Refresh Lock ───────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Uses a lock so concurrent 401s share one refresh call.
 */
async function refreshAccessToken(apiBaseUrl: string): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getToken(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return null;

      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret': APP_SECRET,
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.success || !data.data?.accessToken) return null;

      await saveToken(STORAGE_KEYS.ACCESS_TOKEN, data.data.accessToken);
      return data.data.accessToken as string;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Derive the API base URL from a full URL.
 * E.g. "https://school.com/api/mobile/bookings" → "https://school.com/api/mobile"
 */
function deriveApiBaseUrl(url: string): string {
  const match = url.match(/(https?:\/\/[^/]+\/api\/mobile)/);
  return match ? match[1] : url;
}

/**
 * Attempt to recover a valid access token using the stored device certificate.
 * This is a fallback when the normal refresh token fails — the device cert
 * stores the original refresh token from first login.
 */
async function tryDeviceCertRefresh(apiBaseUrl: string): Promise<string | null> {
  try {
    const certJson = await getToken(STORAGE_KEYS.DEVICE_CERT);
    if (!certJson) return null;

    const cert = JSON.parse(certJson) as {
      refreshToken: string;
      email: string;
      userId: string;
      issuedAt: number;
    };

    console.log('[ApiClient] Trying device certificate for:', cert.email);
    const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Secret': APP_SECRET,
      },
      body: JSON.stringify({ refreshToken: cert.refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.data?.accessToken) return null;

    const newAccess = data.data.accessToken;
    const newRefresh = data.data.refreshToken || cert.refreshToken;

    await saveToken(STORAGE_KEYS.ACCESS_TOKEN, newAccess);
    await saveToken(STORAGE_KEYS.REFRESH_TOKEN, newRefresh);
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION_VALIDATED_AT, Date.now().toString());

    // Update device cert with fresh refresh token
    const updatedCert = JSON.stringify({ ...cert, refreshToken: newRefresh, issuedAt: Date.now() });
    await saveToken(STORAGE_KEYS.DEVICE_CERT, updatedCert);

    console.log('[ApiClient] Device certificate recovery successful');
    return newAccess;
  } catch {
    return null;
  }
}

// ─── Sleep helper ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main API Client ────────────────────────────────────────────────────────

/**
 * Centralized API client.
 * All API calls in the app should go through this function.
 */
export async function apiClient<T = unknown>(options: ApiClientOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    body,
    headers: extraHeaders = {},
    skipAuth = false,
    skipAppSecret = false,
    maxNetworkRetries = 2,
    max429Retries = 3,
  } = options;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...extraHeaders,
  };

  if (!skipAppSecret) {
    headers['X-App-Secret'] = APP_SECRET;
  }

  if (!skipAuth) {
    const token = await getToken(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  };

  // ── Retry loop ──────────────────────────────────────────────────────────

  let networkRetries = 0;
  let rateLimitRetries = 0;

  const execute = async (): Promise<T> => {
    let response: Response;

    // Network retry wrapper
    try {
      response = await fetch(url, fetchOptions);
    } catch (error) {
      // Network error (no response at all)
      if (
        error instanceof TypeError &&
        error.message.includes('Network request failed') &&
        networkRetries < maxNetworkRetries
      ) {
        networkRetries++;
        const delay = 1000 * networkRetries;
        console.log(`[ApiClient] Network error, retry ${networkRetries}/${maxNetworkRetries} in ${delay}ms`);
        await sleep(delay);
        return execute();
      }
      throw error;
    }

    // ── 401 Unauthorized → refresh token and retry once ───────────────────
    if (response.status === 401 && !skipAuth) {
      console.log('[ApiClient] 401 received, attempting token refresh');
      const apiBaseUrl = deriveApiBaseUrl(url);
      const newToken = await refreshAccessToken(apiBaseUrl);

      if (newToken) {
        // Retry with new token
        (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, fetchOptions);

        if (retryResponse.ok) {
          return retryResponse.json();
        }

        // If retry also fails with 401 → try device cert before logout
        if (retryResponse.status === 401) {
          console.log('[ApiClient] Retry after refresh also 401, trying device cert');
          const certToken = await tryDeviceCertRefresh(apiBaseUrl);
          if (certToken) {
            (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${certToken}`;
            const certRetry = await fetch(url, fetchOptions);
            if (certRetry.ok) return certRetry.json();
          }
          console.log('[ApiClient] All recovery exhausted, forcing logout');
          await clearAllTokens();
          router.replace('/login');
          throw new ApiError(401, 'Session expired. Please login again.');
        }

        // Handle other errors from retry
        return handleErrorResponse(retryResponse);
      }

      // Refresh failed → try device certificate recovery
      console.log('[ApiClient] Token refresh failed, trying device certificate');
      const certToken = await tryDeviceCertRefresh(apiBaseUrl);
      if (certToken) {
        (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${certToken}`;
        const certRetry = await fetch(url, fetchOptions);
        if (certRetry.ok) return certRetry.json();
      }

      // All recovery failed → force logout
      console.log('[ApiClient] All token recovery failed, forcing logout');
      await clearAllTokens();
      router.replace('/login');
      throw new ApiError(401, 'Session expired. Please login again.');
    }

    // ── 429 Too Many Requests → exponential backoff ───────────────────────
    if (response.status === 429 && rateLimitRetries < max429Retries) {
      rateLimitRetries++;
      const retryAfter = response.headers.get('Retry-After');
      let delay = Math.min(1000 * Math.pow(2, rateLimitRetries - 1), 30000);

      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed)) {
          delay = parsed * 1000;
        }
      }

      console.log(`[ApiClient] 429, retry ${rateLimitRetries}/${max429Retries} in ${delay}ms`);
      await sleep(delay);
      return execute();
    }

    // ── Success ───────────────────────────────────────────────────────────
    if (response.ok) {
      // For 204 No Content
      if (response.status === 204) {
        return {} as T;
      }
      return response.json();
    }

    // ── Other errors ──────────────────────────────────────────────────────
    return handleErrorResponse(response);
  };

  return execute();
}

async function handleErrorResponse(response: Response): Promise<never> {
  let errorMessage = `HTTP ${response.status}`;
  let errorCode: string | undefined;

  try {
    const data = await response.json();
    errorMessage = data.error || data.message || errorMessage;
    errorCode = data.errorCode;
  } catch {
    // Response body is not JSON
    try {
      errorMessage = await response.text();
    } catch {
      // Keep default message
    }
  }

  throw new ApiError(response.status, errorMessage, errorCode);
}

// ─── Convenience Helpers ────────────────────────────────────────────────────

/** GET request */
export function apiGet<T = unknown>(url: string, options?: Partial<ApiClientOptions>): Promise<T> {
  return apiClient<T>({ ...options, url, method: 'GET' });
}

/** POST request */
export function apiPost<T = unknown>(url: string, body?: unknown, options?: Partial<ApiClientOptions>): Promise<T> {
  return apiClient<T>({ ...options, url, method: 'POST', body });
}

/** PUT request */
export function apiPut<T = unknown>(url: string, body?: unknown, options?: Partial<ApiClientOptions>): Promise<T> {
  return apiClient<T>({ ...options, url, method: 'PUT', body });
}

/** PATCH request */
export function apiPatch<T = unknown>(url: string, body?: unknown, options?: Partial<ApiClientOptions>): Promise<T> {
  return apiClient<T>({ ...options, url, method: 'PATCH', body });
}

/** DELETE request */
export function apiDelete<T = unknown>(url: string, body?: unknown, options?: Partial<ApiClientOptions>): Promise<T> {
  return apiClient<T>({ ...options, url, method: 'DELETE', body });
}
