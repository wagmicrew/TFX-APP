/**
 * Mobile API Service
 * Handles all /api/mobile/* endpoints for the TFX app
 * 
 * Now uses centralized apiClient for all requests.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './api-client';
import { APP_SECRET } from '@/constants/config';
import type {
  MobileConfigResponse,
  DeviceRegistrationPayload,
  DeviceRegistrationResponse,
  SyncRequest,
  SyncResponse,
} from '@/types/app-dashboard';

// ─── App Configuration ──────────────────────────────────────────────────────

/**
 * GET /api/mobile/config?domain=X
 * Fetches app configuration for the given school domain.
 * Called during app boot before authentication.
 */
export async function fetchMobileConfig(
  baseUrl: string,
  domain: string,
): Promise<MobileConfigResponse> {
  return apiGet<MobileConfigResponse>(
    `${baseUrl}/api/mobile/config?domain=${encodeURIComponent(domain)}`,
    { skipAuth: true },
  );
}

// ─── Device Registration ────────────────────────────────────────────────────

/**
 * POST /api/mobile/device/register
 */
export async function registerDevice(
  apiBaseUrl: string,
  accessToken: string,
  payload: DeviceRegistrationPayload,
): Promise<DeviceRegistrationResponse> {
  return apiPost<DeviceRegistrationResponse>(
    `${apiBaseUrl}/device/register`,
    payload,
  );
}

/**
 * DELETE /api/mobile/device/register
 */
export async function unregisterDevice(
  apiBaseUrl: string,
  accessToken: string,
  deviceId: string,
): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(
    `${apiBaseUrl}/device/register`,
    { deviceId },
  );
}

// ─── Auth ───────────────────────────────────────────────────────────────────

/**
 * POST /api/mobile/auth/login — Email + password login.
 */
export async function loginWithPassword(
  apiBaseUrl: string,
  payload: {
    email: string;
    password: string;
    domain: string;
    deviceInfo: {
      deviceId: string;
      platform: string;
      deviceName?: string;
      deviceModel?: string;
      osVersion?: string;
      appVersion?: string;
      pushToken?: string;
    };
  },
): Promise<{
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: string; email: string; firstName: string; lastName: string };
    school?: unknown;
  };
  error?: string;
  errorCode?: string;
}> {
  return apiPost(`${apiBaseUrl}/auth/login`, payload, { skipAuth: true });
}

/**
 * POST /api/mobile/auth/logout — Server-side session invalidation.
 */
export async function logoutFromServer(
  apiBaseUrl: string,
): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`${apiBaseUrl}/auth/logout`);
}

// ─── Student Data ───────────────────────────────────────────────────────────

/**
 * GET /api/mobile/student/profile
 */
export async function fetchStudentProfile(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<{
  success: boolean;
  data?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    personalNumber?: string;
    address?: string;
    profileImageUrl?: string;
    enrolledAt?: string;
    licenseType?: string;
    instructor?: { id: string; name: string };
    progress?: {
      lessonsCompleted: number;
      totalLessons: number;
      examStatus?: string;
    };
    credits?: Array<{ type: string; amount: number; date: string }>;
  };
  error?: string;
}> {
  return apiGet(`${apiBaseUrl}/student/profile`);
}

/**
 * PUT /api/mobile/student/profile
 */
export async function updateStudentProfile(
  apiBaseUrl: string,
  updates: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  return apiPut(`${apiBaseUrl}/student/profile`, updates);
}

/**
 * POST /api/mobile/student/avatar
 * Uploads a new avatar image (multipart/form-data).
 * The server should save the image and set it as the user's website avatar too.
 */
export async function uploadStudentAvatar(
  apiBaseUrl: string,
  imageUri: string,
  mimeType: string = 'image/jpeg',
): Promise<{
  success: boolean;
  data?: { avatarUrl: string };
  error?: string;
}> {
  const { getToken: getSecureToken } = await import('./secure-storage');
  const { STORAGE_KEYS: keys } = await import('@/constants/config');
  const token = await getSecureToken(keys.ACCESS_TOKEN);

  const formData = new FormData();
  const filename = `avatar_${Date.now()}.${mimeType === 'image/png' ? 'png' : 'jpg'}`;

  formData.append('avatar', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const response = await fetch(`${apiBaseUrl}/student/avatar`, {
    method: 'POST',
    headers: {
      'X-App-Secret': APP_SECRET,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Let fetch set Content-Type with boundary for multipart
    },
    body: formData,
  });

  return response.json();
}

/**
 * DELETE /api/mobile/student/avatar
 * Removes the user's avatar image.
 */
export async function deleteStudentAvatar(
  apiBaseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  return apiDelete(`${apiBaseUrl}/student/avatar`);
}

/**
 * GET /api/mobile/bookings
 */
export async function fetchBookings(
  apiBaseUrl: string,
  accessToken?: string,
  options?: { upcoming?: boolean },
): Promise<{
  success: boolean;
  data?: { bookings: unknown[] };
  error?: string;
}> {
  const params = new URLSearchParams();
  if (options?.upcoming) params.set('upcoming', 'true');
  const qs = params.toString();
  return apiGet(`${apiBaseUrl}/bookings${qs ? `?${qs}` : ''}`);
}

/**
 * DELETE /api/mobile/bookings/:id
 */
export async function cancelBooking(
  apiBaseUrl: string,
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  return apiDelete(`${apiBaseUrl}/bookings/${bookingId}`);
}

/**
 * GET /api/mobile/invoices
 */
export async function fetchInvoices(
  apiBaseUrl: string,
  accessToken?: string,
  status?: 'all' | 'paid' | 'unpaid' | 'overdue',
): Promise<{
  success: boolean;
  data?: {
    invoices: Array<{
      id: string;
      amount: number;
      currency: string;
      status: 'paid' | 'unpaid' | 'overdue' | 'cancelled';
      dueDate: string;
      paidAt?: string;
      items: Array<{ description: string; amount: number }>;
      pdfUrl?: string;
    }>;
    summary?: {
      totalUnpaid: number;
      totalOverdue: number;
      nextDueDate?: string;
    };
  };
  error?: string;
}> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const qs = params.toString();
  return apiGet(`${apiBaseUrl}/invoices${qs ? `?${qs}` : ''}`);
}

/**
 * POST /api/mobile/invoices/:id/payment/initiate
 */
export async function initiatePayment(
  apiBaseUrl: string,
  invoiceId: string,
  method: 'swish' | 'qliro',
): Promise<{
  success: boolean;
  data?: {
    paymentId: string;
    swishUrl?: string;
    qrCode?: string;
    checkoutUrl?: string;
  };
  error?: string;
}> {
  return apiPost(`${apiBaseUrl}/invoices/${invoiceId}/payment/initiate`, { method });
}

/**
 * GET /api/mobile/invoices/:id/payment/:paymentId/status
 */
export async function getPaymentStatus(
  apiBaseUrl: string,
  invoiceId: string,
  paymentId: string,
): Promise<{
  success: boolean;
  data?: {
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    paidAt?: string;
  };
  error?: string;
}> {
  return apiGet(`${apiBaseUrl}/invoices/${invoiceId}/payment/${paymentId}/status`);
}

// ─── Notification Types ─────────────────────────────────────────────────────

export interface PollNotification {
  id: string;
  title: string;
  body: string;
  notificationType: string; // 'session_kicked' | 'admin_message' | 'booking_update' | 'payment_update' | ...
  data?: Record<string, string>;
  sentAt: string;
  readAt: string | null;
  createdAt: string;
}

export interface PollNotificationsResponse {
  success: boolean;
  data?: {
    notifications: PollNotification[];
    unreadCount: number;
    hasKick: boolean;
  };
  error?: string;
}

/**
 * GET /api/mobile/notifications
 *
 * Poll-based notification endpoint. The server does NOT use push (no Expo Push / FCM).
 * The app polls this endpoint periodically + on foreground resume.
 *
 * @param options.since     ISO8601 — only return notifications created after this
 * @param options.limit     Max results (default 20)
 * @param options.unreadOnly Only return unread notifications (read_at IS NULL)
 */
export async function fetchNotifications(
  apiBaseUrl: string,
  accessToken?: string,
  options?: { since?: string; limit?: number; unreadOnly?: boolean },
): Promise<PollNotificationsResponse> {
  const params = new URLSearchParams();
  if (options?.since) params.set('since', options.since);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return apiGet(`${apiBaseUrl}/notifications${qs ? `?${qs}` : ''}`);
}

/**
 * POST /api/mobile/notifications
 * Mark one or more notifications as read (batch).
 *
 * The server sets read_at = NOW() for the given IDs.
 * Only the authenticated user's own notifications are affected.
 */
export async function markNotificationsRead(
  apiBaseUrl: string,
  notificationIds: string[],
): Promise<{ success: boolean; data?: { markedAsRead: number } }> {
  return apiPost(`${apiBaseUrl}/notifications`, { notificationIds });
}

/**
 * GET /api/mobile/korklar
 */
export async function fetchKorklarStatus(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<{
  success: boolean;
  data?: {
    readinessScore: number;
    readinessLevel: string;
    categoryScores: Array<{
      category: string;
      score: number;
      maxScore: number;
    }>;
    strengths: string[];
    weaknesses: string[];
    predictedReadinessDate?: string;
    personalizedTips: string[];
    eligibleForCertificate: boolean;
    certificateUrl?: string;
  };
  error?: string;
}> {
  return apiGet(`${apiBaseUrl}/korklar`);
}

// ─── Localization ───────────────────────────────────────────────────────────

/**
 * GET /api/mobile/i18n — supports ETag caching.
 */
export async function fetchAppTranslations(
  apiBaseUrl: string,
  locale: string = 'sv-SE',
  currentETag?: string,
): Promise<{
  success: boolean;
  data?: {
    locale: string;
    translations: Record<string, Record<string, string>>;
    version: string;
  };
  notModified?: boolean;
  etag?: string;
  error?: string;
}> {
  const extraHeaders: Record<string, string> = {};
  if (currentETag) {
    extraHeaders['If-None-Match'] = currentETag;
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/i18n?locale=${encodeURIComponent(locale)}&version=1.0.0`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-App-Secret': APP_SECRET,
          ...extraHeaders,
        },
      },
    );

    if (response.status === 304) {
      return { success: true, notModified: true };
    }

    const data = await response.json();
    return {
      ...data,
      etag: response.headers.get('ETag') ?? undefined,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ─── Offline Sync ───────────────────────────────────────────────────────────

/**
 * POST /api/mobile/sync
 */
export async function syncOfflineData(
  apiBaseUrl: string,
  accessToken: string,
  syncData: SyncRequest,
): Promise<SyncResponse> {
  return apiPost<SyncResponse>(`${apiBaseUrl}/sync`, syncData);
}

/**
 * GET /api/mobile/sync/status
 */
export async function getSyncStatus(
  apiBaseUrl: string,
  accessToken: string,
  deviceId: string,
): Promise<{
  success: boolean;
  data?: {
    pending: number;
    synced: number;
    failed: number;
    lastSyncAt?: string;
  };
  error?: string;
}> {
  return apiGet(`${apiBaseUrl}/sync/status?deviceId=${encodeURIComponent(deviceId)}`);
}
