/**
 * App Config Context
 * 
 * Fetches and provides mobile app configuration from the server.
 * Maps admin dashboard settings to typed feature flags, branding,
 * push config, sync intervals, and version requirements.
 * 
 * Uses /api/mobile/config?domain=X for app-side boot config.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSchool } from './school-context';
import { fetchMobileConfig } from '@/services/mobile-api';
import type { MobileAppSettings } from '@/types/app-dashboard';
import type { SchoolFeatures } from '@/types/school-config';

const APP_CONFIG_CACHE_KEY = '@tfx_app_config';
const APP_VERSION = '1.0.0';

/** Parse the server config response into typed settings */
function parseAppSettings(data: NonNullable<Awaited<ReturnType<typeof fetchMobileConfig>>['data']>): MobileAppSettings {
  return {
    // Core
    mobileAppEnabled: data.appEnabled ?? true,
    maintenanceMode: data.maintenanceMode ?? false,
    minVersionIos: data.minVersion?.ios ?? '1.0.0',
    minVersionAndroid: data.minVersion?.android ?? '1.0.0',
    latestVersionIos: data.latestVersion?.ios ?? '1.0.0',
    latestVersionAndroid: data.latestVersion?.android ?? '1.0.0',

    // Features — accept both formats: bookings/lms/quiz AND enableBookings/enableLms/enableQuiz
    featureBookings: data.features?.bookings ?? (data.features as Record<string, unknown>)?.enableBookings as boolean ?? true,
    featureLms: data.features?.lms ?? (data.features as Record<string, unknown>)?.enableLms as boolean ?? (data.features as Record<string, unknown>)?.enableLessons as boolean ?? true,
    featureQuiz: data.features?.quiz ?? (data.features as Record<string, unknown>)?.enableQuiz as boolean ?? true,
    featureCertificates: data.features?.certificates ?? (data.features as Record<string, unknown>)?.enableCertificates as boolean ?? false,
    featureKorklar: data.features?.korklar ?? (data.features as Record<string, unknown>)?.enableKorklar as boolean ?? true,
    featureInvoices: data.features?.invoices ?? (data.features as Record<string, unknown>)?.enableInvoices as boolean ?? true,
    featureProfile: data.features?.profile ?? (data.features as Record<string, unknown>)?.enableProfile as boolean ?? true,
    featureOfflineMode: data.features?.offlineMode ?? (data.features as Record<string, unknown>)?.enableOfflineMode as boolean ?? false,

    // Push
    pushNotificationsEnabled: data.push?.enabled ?? true,
    pushBookingReminders: data.push?.bookingReminders ?? true,
    pushLessonAvailable: data.push?.lessonAvailable ?? true,
    pushPaymentReminders: data.push?.paymentReminders ?? true,

    // Branding
    appName: data.branding?.appName ?? 'Din Trafikskola',
    tagline: data.branding?.tagline ?? '',
    iosAppStoreUrl: data.branding?.iosAppStoreUrl ?? '',
    androidPlayStoreUrl: data.branding?.androidPlayStoreUrl ?? '',

    // Sync
    syncIntervalMinutes: data.sync?.intervalMinutes ?? 30,
    offlineRetentionDays: data.sync?.offlineRetentionDays ?? 30,
    maxOfflineBookings: data.sync?.maxOfflineBookings ?? 50,
  };
}

/**
 * Build settings from SchoolConfig.features when /api/mobile/config is unavailable.
 * Maps enableX → featureX format. Also uses enabledFeatures array if present.
 */
function buildSettingsFromSchoolFeatures(features?: SchoolFeatures, enabledFeatures?: string[]): MobileAppSettings {
  // Build a lookup from the enabledFeatures array (e.g. ["bookings","invoices","lms","profile"])
  const ef = new Set(enabledFeatures ?? []);
  const fromArray = (key: string) => ef.size > 0 ? ef.has(key) : undefined;

  return {
    mobileAppEnabled: true,
    maintenanceMode: false,
    minVersionIos: '1.0.0',
    minVersionAndroid: '1.0.0',
    latestVersionIos: '1.0.0',
    latestVersionAndroid: '1.0.0',

    featureBookings: features?.enableBookings ?? features?.bookings ?? fromArray('bookings') ?? true,
    featureLms: features?.enableLms ?? features?.enableLessons ?? features?.lms ?? fromArray('lms') ?? true,
    featureQuiz: features?.enableQuiz ?? features?.quiz ?? fromArray('quiz') ?? fromArray('lms') ?? true,
    featureCertificates: features?.enableCertificates ?? features?.certificates ?? fromArray('certificates') ?? false,
    featureKorklar: features?.enableKorklar ?? features?.korklar ?? fromArray('korklar') ?? false,
    featureInvoices: features?.enableInvoices ?? features?.invoices ?? fromArray('invoices') ?? true,
    featureProfile: features?.enableProfile ?? features?.profile ?? fromArray('profile') ?? true,
    featureOfflineMode: features?.enableOfflineMode ?? features?.offlineMode ?? fromArray('offlineMode') ?? false,

    pushNotificationsEnabled: true,
    pushBookingReminders: true,
    pushLessonAvailable: true,
    pushPaymentReminders: true,

    appName: 'Din Trafikskola',
    tagline: '',
    iosAppStoreUrl: '',
    androidPlayStoreUrl: '',

    syncIntervalMinutes: 30,
    offlineRetentionDays: 30,
    maxOfflineBookings: 50,
  };
}

/** Semver comparison: returns true if current < required */
function isVersionOutdated(current: string, required: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [cMajor, cMinor = 0, cPatch = 0] = parse(current);
  const [rMajor, rMinor = 0, rPatch = 0] = parse(required);

  if (cMajor < rMajor) return true;
  if (cMajor > rMajor) return false;
  if (cMinor < rMinor) return true;
  if (cMinor > rMinor) return false;
  return cPatch < rPatch;
}

export const [AppConfigProvider, useAppConfig] = createContextHook(() => {
  const { config: schoolConfig, selectedDomain } = useSchool();
  const [cachedSettings, setCachedSettings] = useState<MobileAppSettings | null>(null);

  // Load cached settings on mount
  useEffect(() => {
    AsyncStorage.getItem(APP_CONFIG_CACHE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            setCachedSettings(JSON.parse(stored));
          } catch {
            // Ignore parse errors
          }
        }
      })
      .catch(() => {});
  }, []);

  // Derive the base URL for mobile config endpoint
  const configBaseUrl = schoolConfig
    ? schoolConfig.apiBaseUrl.replace(/\/api\/mobile\/?$/, '')
    : selectedDomain
      ? `https://${selectedDomain}`
      : null;

  const configQuery = useQuery({
    queryKey: ['mobileAppConfig', selectedDomain],
    queryFn: async () => {
      if (!configBaseUrl || !selectedDomain) {
        throw new Error('No domain configured');
      }
      const result = await fetchMobileConfig(configBaseUrl, selectedDomain);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch app config');
      }
      const parsed = parseAppSettings(result.data);

      // Cache for offline use
      await AsyncStorage.setItem(APP_CONFIG_CACHE_KEY, JSON.stringify(parsed));
      setCachedSettings(parsed);

      return parsed;
    },
    enabled: !!configBaseUrl && !!selectedDomain,
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
  });

  // Fall back to school config features when /api/mobile/config is unavailable
  const schoolFallbackSettings = schoolConfig
    ? buildSettingsFromSchoolFeatures(schoolConfig.features, schoolConfig.enabledFeatures)
    : null;

  const settings = configQuery.data ?? cachedSettings ?? schoolFallbackSettings;

  // Log for debugging
  useEffect(() => {
    if (configQuery.error) {
      console.log('[AppConfig] /api/mobile/config failed, using school config features as fallback');
    }
    if (settings) {
      console.log('[AppConfig] Active settings — bookings:', settings.featureBookings,
        'lms:', settings.featureLms, 'invoices:', settings.featureInvoices,
        'korklar:', settings.featureKorklar, 'profile:', settings.featureProfile,
        'quiz:', settings.featureQuiz);
    }
  }, [configQuery.error, settings]);

  // Version checks
  const minVersion = Platform.OS === 'ios'
    ? settings?.minVersionIos
    : settings?.minVersionAndroid;

  const latestVersion = Platform.OS === 'ios'
    ? settings?.latestVersionIos
    : settings?.latestVersionAndroid;

  const requiresUpdate = minVersion ? isVersionOutdated(APP_VERSION, minVersion) : false;
  const updateAvailable = latestVersion ? isVersionOutdated(APP_VERSION, latestVersion) : false;

  // Feature flags
  const isFeatureEnabled = useCallback(
    (feature: keyof Pick<
      MobileAppSettings,
      | 'featureBookings'
      | 'featureLms'
      | 'featureQuiz'
      | 'featureCertificates'
      | 'featureKorklar'
      | 'featureInvoices'
      | 'featureProfile'
      | 'featureOfflineMode'
    >): boolean => {
      if (!settings) return false;
      return settings[feature];
    },
    [settings],
  );

  const refetchConfig = useCallback(() => {
    return configQuery.refetch();
  }, [configQuery]);

  return {
    /** Fully parsed app settings from admin dashboard */
    settings,
    /** Whether settings are still loading */
    isLoading: configQuery.isLoading && !cachedSettings && !schoolFallbackSettings,
    /** Error loading config (null if OK or using cache) */
    error: configQuery.error,
    /** App is enabled by admin */
    isAppEnabled: settings?.mobileAppEnabled ?? false,
    /** Maintenance mode is active */
    isMaintenanceMode: settings?.maintenanceMode ?? false,
    /** App requires a mandatory update */
    requiresUpdate,
    /** A newer version is available (optional) */
    updateAvailable,
    /** Current app version */
    appVersion: APP_VERSION,
    /** Check if a specific feature is enabled by admin */
    isFeatureEnabled,
    /** Refresh config from server */
    refetchConfig,
    /** Store URL for this platform */
    storeUrl: Platform.OS === 'ios'
      ? settings?.iosAppStoreUrl
      : settings?.androidPlayStoreUrl,
  };
});
