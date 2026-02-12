/**
 * Admin Dashboard API Service
 * Handles all /api/admin/app-dashboard/* endpoints.
 * Now uses centralized apiClient.
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api-client';
import type {
  AppSettingsResponse,
  DashboardStatsResponse,
  DevicesResponse,
  SessionsResponse,
  PushNotificationPayload,
  PushNotificationResult,
  LocalizationResponse,
  RateLimitsResponse,
} from '@/types/app-dashboard';

function adminUrl(baseUrl: string, path: string): string {
  const origin = baseUrl.replace(/\/api\/mobile\/?$/, '');
  return `${origin}/api/admin/app-dashboard${path}`;
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────

export async function fetchDashboardStats(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<DashboardStatsResponse> {
  return apiGet<DashboardStatsResponse>(adminUrl(apiBaseUrl, '/stats'));
}

// ─── Devices ────────────────────────────────────────────────────────────────

export async function fetchDevices(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<DevicesResponse> {
  return apiGet<DevicesResponse>(adminUrl(apiBaseUrl, '/devices'));
}

export async function updateDeviceStatus(
  apiBaseUrl: string,
  accessToken: string,
  deviceId: string,
  updates: { isActive?: boolean },
): Promise<{ success: boolean }> {
  return apiPatch<{ success: boolean }>(adminUrl(apiBaseUrl, '/devices'), { deviceId, ...updates });
}

// ─── Push Notifications ─────────────────────────────────────────────────────

export async function sendPushNotification(
  apiBaseUrl: string,
  accessToken: string,
  payload: PushNotificationPayload,
): Promise<PushNotificationResult> {
  return apiPost<PushNotificationResult>(adminUrl(apiBaseUrl, '/push'), payload);
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export async function fetchActiveSessions(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<SessionsResponse> {
  return apiGet<SessionsResponse>(adminUrl(apiBaseUrl, '/sessions'));
}

export async function terminateSession(
  apiBaseUrl: string,
  accessToken: string,
  sessionId: string,
): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(adminUrl(apiBaseUrl, '/sessions'), { sessionId });
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function fetchAppSettings(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<AppSettingsResponse> {
  return apiGet<AppSettingsResponse>(adminUrl(apiBaseUrl, '/settings'));
}

export async function updateAppSettings(
  apiBaseUrl: string,
  accessToken: string,
  settings: Record<string, string | boolean | number>,
): Promise<{ success: boolean; message?: string; updatedCount?: number }> {
  return apiPut(adminUrl(apiBaseUrl, '/settings'), { settings });
}

// ─── Localization ───────────────────────────────────────────────────────────

export async function fetchLocalization(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<LocalizationResponse> {
  return apiGet<LocalizationResponse>(adminUrl(apiBaseUrl, '/localization'));
}

export async function updateLocalization(
  apiBaseUrl: string,
  accessToken: string,
  localizationData: { locale: string; translations: Record<string, Record<string, string>> },
): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>(adminUrl(apiBaseUrl, '/localization'), localizationData);
}

// ─── Rate Limits ────────────────────────────────────────────────────────────

export async function fetchRateLimits(
  apiBaseUrl: string,
  accessToken?: string,
): Promise<RateLimitsResponse> {
  return apiGet<RateLimitsResponse>(adminUrl(apiBaseUrl, '/rate-limits'));
}

export async function updateRateLimits(
  apiBaseUrl: string,
  accessToken: string,
  limits: Record<string, number>,
): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>(adminUrl(apiBaseUrl, '/rate-limits'), limits);
}
