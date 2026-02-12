/**
 * Types for Admin APP Dashboard integration
 * Maps to server-side settings from /api/admin/app-dashboard/*
 */

// ─── App Settings ───────────────────────────────────────────────────────────

export interface AppSettingValue {
  value: string;
  label: string;
  type: 'boolean' | 'string' | 'number' | 'secret';
  group: 'core' | 'push' | 'features' | 'branding' | 'sync';
}

export interface AppSettingsGroups {
  core: string;
  push: string;
  features: string;
  branding: string;
  sync: string;
}

export interface AppSettingsResponse {
  success: boolean;
  data?: {
    settings: Record<string, AppSettingValue>;
    schoolConfigurations: SchoolConfiguration[];
    groups: AppSettingsGroups;
  };
  error?: string;
}

export interface SchoolConfiguration {
  id: string;
  schoolId: string;
  domain: string;
  appEnabled: boolean;
  customBranding?: Record<string, unknown>;
}

// ─── Parsed App Settings (typed for easy consumption) ─────────────────────

export interface MobileAppSettings {
  // Core
  mobileAppEnabled: boolean;
  maintenanceMode: boolean;
  minVersionIos: string;
  minVersionAndroid: string;
  latestVersionIos: string;
  latestVersionAndroid: string;

  // Features
  featureBookings: boolean;
  featureLms: boolean;
  featureQuiz: boolean;
  featureCertificates: boolean;
  featureKorklar: boolean;
  featureInvoices: boolean;
  featureProfile: boolean;
  featureOfflineMode: boolean;

  // Push
  pushNotificationsEnabled: boolean;
  pushBookingReminders: boolean;
  pushLessonAvailable: boolean;
  pushPaymentReminders: boolean;

  // Branding
  appName: string;
  tagline: string;
  iosAppStoreUrl: string;
  androidPlayStoreUrl: string;

  // Sync
  syncIntervalMinutes: number;
  offlineRetentionDays: number;
  maxOfflineBookings: number;
}

// ─── Rate Limits ────────────────────────────────────────────────────────────

export interface RateLimits {
  apiRequestsPerMinute: number;
  authAttemptsPerMinute: number;
  pushNotificationsPerHour: number;
  otpRequestsPerHour: number;
  bookingRequestsPerMinute: number;
  syncRequestsPerMinute: number;
}

export interface RateLimitsResponse {
  success: boolean;
  data?: RateLimits;
  error?: string;
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  activeSessions: number;
  pushSentToday: number;
  syncOperationsToday: number;
  errorRate: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  data?: DashboardStats;
  error?: string;
}

// ─── Devices ────────────────────────────────────────────────────────────────

export interface MobileDevice {
  id: string;
  userId: string;
  userName?: string;
  deviceId: string;
  platform: 'ios' | 'android';
  deviceName: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  pushToken?: string;
  isActive: boolean;
  lastActiveAt: string;
  registeredAt: string;
}

export interface DevicesResponse {
  success: boolean;
  data?: {
    devices: MobileDevice[];
    total: number;
  };
  error?: string;
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export interface MobileSession {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  deviceId: string;
  platform: string;
  ipAddress?: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface SessionsResponse {
  success: boolean;
  data?: {
    sessions: MobileSession[];
    total: number;
  };
  error?: string;
}

// ─── Push Notifications ─────────────────────────────────────────────────────

export interface PushNotificationPayload {
  title: string;
  body: string;
  targetType: 'all' | 'device' | 'user' | 'platform';
  targetId?: string;
  targetPlatform?: 'ios' | 'android';
  data?: Record<string, string>;
}

export interface PushNotificationResult {
  success: boolean;
  data?: {
    sent: number;
    failed: number;
    messageId?: string;
  };
  error?: string;
}

// ─── Localization ───────────────────────────────────────────────────────────

export interface LocalizationData {
  locale: string;
  translations: Record<string, Record<string, string>>;
  version: string;
  updatedAt: string;
}

export interface LocalizationResponse {
  success: boolean;
  data?: LocalizationData;
  error?: string;
}

// ─── Device Registration (Mobile-side) ──────────────────────────────────────

export interface DeviceRegistrationPayload {
  deviceId: string;
  platform: 'ios' | 'android';
  deviceName: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  pushToken?: string;
}

export interface DeviceRegistrationResponse {
  success: boolean;
  data?: {
    registered: boolean;
    deviceId: string;
  };
  error?: string;
}

// ─── Offline Sync ───────────────────────────────────────────────────────────

export interface SyncOperation {
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId?: string;
  payload: unknown;
  timestamp: string;
}

export interface SyncRequest {
  deviceId: string;
  operations: SyncOperation[];
  lastSyncAt?: string;
}

export interface SyncResponse {
  success: boolean;
  data?: {
    processed: number;
    failed: number;
    serverChanges?: SyncOperation[];
    nextSyncAt?: string;
  };
  error?: string;
}

// ─── Mobile Config (boot endpoint) ─────────────────────────────────────────

export interface MobileConfigResponse {
  success: boolean;
  data?: {
    appEnabled: boolean;
    maintenanceMode: boolean;
    minVersion: {
      ios: string;
      android: string;
    };
    latestVersion: {
      ios: string;
      android: string;
    };
    features: {
      bookings: boolean;
      lms: boolean;
      quiz: boolean;
      certificates: boolean;
      korklar: boolean;
      invoices: boolean;
      profile: boolean;
      offlineMode: boolean;
    };
    branding: {
      appName: string;
      tagline: string;
      iosAppStoreUrl: string;
      androidPlayStoreUrl: string;
    };
    sync: {
      intervalMinutes: number;
      offlineRetentionDays: number;
      maxOfflineBookings: number;
    };
    push: {
      enabled: boolean;
      bookingReminders: boolean;
      lessonAvailable: boolean;
      paymentReminders: boolean;
    };
  };
  error?: string;
}
