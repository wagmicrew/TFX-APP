/**
 * Device Registration Service
 * 
 * Manages device registration with the server for push notifications
 * and session tracking. Integrates with admin dashboard device management.
 * 
 * Flow:
 * 1. On auth success → register device with push token
 * 2. On logout → unregister device
 * 3. On push token refresh → update registration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
import { registerDevice, unregisterDevice } from './mobile-api';
import { getStoredPushToken, getFCMToken, onTokenRefresh } from './push-service';
import { STORAGE_KEYS } from '@/constants/config';
import type { DeviceRegistrationPayload } from '@/types/app-dashboard';

const DEVICE_ID_KEY = STORAGE_KEYS.DEVICE_ID;
const DEVICE_REGISTERED_KEY = STORAGE_KEYS.DEVICE_REGISTERED;

// ─── Device ID ──────────────────────────────────────────────────────────────

/**
 * Get or create a stable device identifier.
 * Uses Expo's installationId as the base, persisted in AsyncStorage.
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (deviceId) return deviceId;

  // Use Expo installation ID if available, otherwise generate one
  const installId = Constants.default?.installationId;
  deviceId = installId ?? `tfx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId!);
  return deviceId!;
}

// ─── Device Info ────────────────────────────────────────────────────────────

function getDeviceInfo(): Omit<DeviceRegistrationPayload, 'deviceId' | 'pushToken'> {
  return {
    platform: Platform.OS as 'ios' | 'android',
    deviceName: Device.deviceName ?? (Platform.OS === 'ios' ? 'iPhone' : 'Android'),
    deviceModel: Device.modelName ??
      (Platform.OS === 'ios'
        ? (Constants.default?.platform?.ios?.model ?? 'iPhone')
        : (Constants.default?.platform?.android?.model ?? 'Android')),
    osVersion: `${Device.osVersion ?? Platform.Version?.toString() ?? 'unknown'}`,
    appVersion: '1.0.0',
  };
}

// ─── Registration ───────────────────────────────────────────────────────────

/**
 * Register this device with the server.
 * Called after successful authentication.
 */
export async function registerThisDevice(
  apiBaseUrl: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    // Use FCM token instead of Expo push token
    const fcmToken = await getFCMToken();
    const pushTokenInfo = await getStoredPushToken();
    const deviceInfo = getDeviceInfo();

    const payload: DeviceRegistrationPayload = {
      deviceId,
      ...deviceInfo,
      pushToken: fcmToken ?? pushTokenInfo?.token,
    };

    console.log('[Device] Registering device:', deviceId);
    const result = await registerDevice(apiBaseUrl, accessToken, payload);

    if (result.success) {
      await AsyncStorage.setItem(DEVICE_REGISTERED_KEY, 'true');
      console.log('[Device] Registration successful');
      return true;
    }

    console.warn('[Device] Registration failed:', result);
    return false;
  } catch (error) {
    console.error('[Device] Registration error:', error);
    return false;
  }
}

/**
 * Unregister this device from the server.
 * Called on logout.
 */
export async function unregisterThisDevice(
  apiBaseUrl: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    console.log('[Device] Unregistering device:', deviceId);

    const result = await unregisterDevice(apiBaseUrl, accessToken, deviceId);

    if (result.success) {
      await AsyncStorage.removeItem(DEVICE_REGISTERED_KEY);
      console.log('[Device] Unregistration successful');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Device] Unregistration error:', error);
    return false;
  }
}

/**
 * Check if this device is registered.
 */
export async function isDeviceRegistered(): Promise<boolean> {
  const value = await AsyncStorage.getItem(DEVICE_REGISTERED_KEY);
  return value === 'true';
}

/**
 * Update the push token on the server (e.g., after token refresh).
 */
export async function updatePushTokenOnServer(
  apiBaseUrl: string,
  accessToken: string,
  newToken: string,
): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const deviceInfo = getDeviceInfo();

    const payload: DeviceRegistrationPayload = {
      deviceId,
      ...deviceInfo,
      pushToken: newToken,
    };

    const result = await registerDevice(apiBaseUrl, accessToken, payload);
    return result.success ?? false;
  } catch (error) {
    console.error('[Device] Push token update error:', error);
    return false;
  }
}
