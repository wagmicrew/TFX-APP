/**
 * Secure Token Storage
 *
 * Wraps expo-secure-store for encrypted storage of sensitive tokens.
 * Provides helpers for save/get/delete and a one-time migration
 * from AsyncStorage (where tokens were previously stored insecurely).
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '@/constants/config';

const MIGRATION_DONE_KEY = '@tfx_secure_migration_done';

// ─── Core Helpers ───────────────────────────────────────────────────────────

/**
 * Save a token securely.
 * Falls back to AsyncStorage on web (SecureStore not available).
 */
export async function saveToken(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

/**
 * Retrieve a token from secure storage.
 */
export async function getToken(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

/**
 * Delete a token from secure storage.
 */
export async function deleteToken(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/**
 * Delete all auth tokens from secure storage.
 */
export async function clearAllTokens(): Promise<void> {
  await Promise.all([
    deleteToken(STORAGE_KEYS.ACCESS_TOKEN),
    deleteToken(STORAGE_KEYS.REFRESH_TOKEN),
    deleteToken(STORAGE_KEYS.SESSION_TOKEN),
    deleteToken(STORAGE_KEYS.DEVICE_CERT),
  ]);
}

/**
 * Clear only volatile tokens (access + session) but keep refresh + device cert
 * for persistent auto-login.
 */
export async function clearVolatileTokens(): Promise<void> {
  await Promise.all([
    deleteToken(STORAGE_KEYS.ACCESS_TOKEN),
    deleteToken(STORAGE_KEYS.SESSION_TOKEN),
  ]);
}

// ─── Migration from AsyncStorage ────────────────────────────────────────────

/**
 * One-time migration: move tokens from AsyncStorage to SecureStore.
 * Called once during app boot. After migration, old keys are removed.
 */
export async function migrateTokensFromAsyncStorage(): Promise<void> {
  if (Platform.OS === 'web') return; // No migration needed on web

  try {
    const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
    if (done === 'true') return;

    console.log('[SecureStorage] Starting token migration from AsyncStorage...');

    // Map legacy AsyncStorage keys → SecureStore keys
    const migrations: Array<{ from: string; to: string }> = [
      { from: STORAGE_KEYS.LEGACY_ACCESS_TOKEN, to: STORAGE_KEYS.ACCESS_TOKEN },
      { from: STORAGE_KEYS.LEGACY_REFRESH_TOKEN, to: STORAGE_KEYS.REFRESH_TOKEN },
    ];

    for (const { from, to } of migrations) {
      const value = await AsyncStorage.getItem(from);
      if (value) {
        await SecureStore.setItemAsync(to, value);
        await AsyncStorage.removeItem(from);
        console.log(`[SecureStorage] Migrated ${from} → ${to}`);
      }
    }

    await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
    console.log('[SecureStorage] Migration complete');
  } catch (error) {
    console.error('[SecureStorage] Migration error:', error);
    // Don't block app boot on migration failure
  }
}
