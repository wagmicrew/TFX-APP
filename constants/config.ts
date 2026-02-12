/**
 * App-wide configuration constants.
 * Centralizes secrets and configuration values that were previously scattered
 * across multiple files.
 */

export const APP_SECRET = 'sk_trafikskola_prod_acbdca5a99ca581b2528d9da55d5be73';

export const APP_VERSION = '1.0.0';

/** Storage keys */
export const STORAGE_KEYS = {
  // SecureStore keys (NO @ prefix — SecureStore only allows [A-Za-z0-9._-])
  ACCESS_TOKEN: 'tfx_access_token',
  REFRESH_TOKEN: 'tfx_refresh_token',
  SESSION_TOKEN: 'tfx_session_token',
  // AsyncStorage keys (@ prefix is fine for AsyncStorage)
  AUTH_USER: '@tfx_auth_user',
  DEVICE_ID: '@tfx_device_id',
  DEVICE_REGISTERED: '@tfx_device_registered',
  PUSH_TOKEN: '@tfx_push_token',
  PUSH_PERMISSIONS: '@tfx_push_permissions',
  SYNC_QUEUE: '@tfx_sync_queue',
  LAST_SYNC: '@tfx_last_sync',
  OFFLINE_DATA: '@tfx_offline_data',
  APP_CONFIG_CACHE: '@tfx_app_config',
  SCHOOL_CONFIG: '@trafikskola_school_config',
  SCHOOL_DOMAIN: '@trafikskola_school_domain',
  I18N_CACHE: '@tfx_i18n_cache',
  I18N_ETAG: '@tfx_i18n_etag',
  PUSH_PREFERENCES: '@tfx_push_preferences',
  LANGUAGE_PREFERENCE: '@tfx_language_preference',
  // Persistent device certificate for auto-re-login
  DEVICE_CERT: 'tfx_device_cert',
  SESSION_VALIDATED_AT: '@tfx_session_validated_at',
  // Legacy keys (for migration from old AsyncStorage)
  LEGACY_ACCESS_TOKEN: '@trafikskola_access_token',
  LEGACY_REFRESH_TOKEN: '@trafikskola_refresh_token',
  LEGACY_AUTH_USER: '@trafikskola_auth_user',
} as const;
