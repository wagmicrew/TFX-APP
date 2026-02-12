/**
 * Offline Sync Service
 * 
 * Manages offline data persistence and synchronization with the server.
 * Configured via admin dashboard sync settings (interval, retention, max bookings).
 * 
 * Flow:
 * 1. Operations are queued locally when offline
 * 2. On reconnect, queued operations are sent to /api/mobile/sync
 * 3. Sync interval is configurable via admin settings
 * 4. Stale offline data is pruned based on retention settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncOfflineData, getSyncStatus } from './mobile-api';
import { getDeviceId } from './device-service';
import type { SyncOperation, SyncRequest } from '@/types/app-dashboard';

const SYNC_QUEUE_KEY = '@tfx_sync_queue';
const LAST_SYNC_KEY = '@tfx_last_sync';
const OFFLINE_DATA_KEY = '@tfx_offline_data';

// ─── Queue Management ───────────────────────────────────────────────────────

/** Add an operation to the offline sync queue */
export async function queueSyncOperation(operation: Omit<SyncOperation, 'timestamp'>): Promise<void> {
  const queue = await getQueuedOperations();
  queue.push({
    ...operation,
    timestamp: new Date().toISOString(),
  });
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  console.log('[Sync] Operation queued:', operation.operation, operation.entityType);
}

/** Get all queued operations */
export async function getQueuedOperations(): Promise<SyncOperation[]> {
  const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/** Clear all queued operations */
export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}

/** Get count of pending operations */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueuedOperations();
  return queue.length;
}

// ─── Sync Execution ─────────────────────────────────────────────────────────

/**
 * Execute sync: send all queued operations to the server.
 * Returns the number of successfully processed operations.
 */
export async function executeSyncToServer(
  apiBaseUrl: string,
  accessToken: string,
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
}> {
  try {
    const queue = await getQueuedOperations();
    if (queue.length === 0) {
      return { success: true, processed: 0, failed: 0 };
    }

    const deviceId = await getDeviceId();
    const lastSyncAt = await AsyncStorage.getItem(LAST_SYNC_KEY);

    const syncRequest: SyncRequest = {
      deviceId,
      operations: queue,
      lastSyncAt: lastSyncAt ?? undefined,
    };

    console.log('[Sync] Syncing', queue.length, 'operations');
    const result = await syncOfflineData(apiBaseUrl, accessToken, syncRequest);

    if (result.success && result.data) {
      // Clear successfully synced operations
      if (result.data.failed === 0) {
        await clearSyncQueue();
      } else {
        // Keep only failed operations (re-queue them)
        const remainingOps = queue.slice(result.data.processed);
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingOps));
      }

      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      console.log('[Sync] Completed:', result.data.processed, 'processed,', result.data.failed, 'failed');
      return {
        success: true,
        processed: result.data.processed,
        failed: result.data.failed,
      };
    }

    return { success: false, processed: 0, failed: queue.length };
  } catch (error) {
    console.error('[Sync] Execution error:', error);
    return { success: false, processed: 0, failed: 0 };
  }
}

/**
 * Get sync status from the server.
 */
export async function fetchServerSyncStatus(
  apiBaseUrl: string,
  accessToken: string,
) {
  const deviceId = await getDeviceId();
  return getSyncStatus(apiBaseUrl, accessToken, deviceId);
}

// ─── Last Sync ──────────────────────────────────────────────────────────────

/** Get the last sync timestamp */
export async function getLastSyncTime(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

// ─── Offline Data Cache ─────────────────────────────────────────────────────

/**
 * Store data locally for offline access.
 * Data is keyed by entity type.
 */
export async function cacheOfflineData(
  entityType: string,
  data: unknown,
): Promise<void> {
  const allData = await getAllOfflineData();
  allData[entityType] = {
    data,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(allData));
}

/** Retrieve cached offline data for an entity type */
export async function getOfflineData<T = unknown>(
  entityType: string,
): Promise<{ data: T; cachedAt: string } | null> {
  const allData = await getAllOfflineData();
  return (allData[entityType] as { data: T; cachedAt: string }) ?? null;
}

/** Get all cached offline data */
async function getAllOfflineData(): Promise<Record<string, { data: unknown; cachedAt: string }>> {
  const stored = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

/**
 * Prune offline data older than the retention period.
 * @param retentionDays - Number of days to keep cached data (from admin settings)
 */
export async function pruneStaleOfflineData(retentionDays: number): Promise<number> {
  const allData = await getAllOfflineData();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString();

  let pruned = 0;
  const retained: typeof allData = {};

  for (const [key, entry] of Object.entries(allData)) {
    if (entry.cachedAt < cutoffStr) {
      pruned++;
    } else {
      retained[key] = entry;
    }
  }

  if (pruned > 0) {
    await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(retained));
    console.log('[Sync] Pruned', pruned, 'stale offline entries');
  }

  return pruned;
}

/** Clear all offline data (e.g., on logout) */
export async function clearAllOfflineData(): Promise<void> {
  await AsyncStorage.multiRemove([SYNC_QUEUE_KEY, LAST_SYNC_KEY, OFFLINE_DATA_KEY]);
}

// ─── Auto-Sync Timer ────────────────────────────────────────────────────────

let syncTimerId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the auto-sync timer.
 * @param intervalMinutes - Sync interval from admin settings
 * @param onSync - Callback when sync should execute
 */
export function startAutoSync(
  intervalMinutes: number,
  onSync: () => Promise<void>,
): void {
  stopAutoSync();

  const intervalMs = intervalMinutes * 60 * 1000;
  console.log('[Sync] Starting auto-sync every', intervalMinutes, 'minutes');

  syncTimerId = setInterval(async () => {
    try {
      await onSync();
    } catch (error) {
      console.error('[Sync] Auto-sync error:', error);
    }
  }, intervalMs);
}

/** Stop the auto-sync timer */
export function stopAutoSync(): void {
  if (syncTimerId) {
    clearInterval(syncTimerId);
    syncTimerId = null;
    console.log('[Sync] Auto-sync stopped');
  }
}
