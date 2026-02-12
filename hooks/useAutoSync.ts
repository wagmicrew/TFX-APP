/**
 * useAutoSync Hook
 * 
 * Starts and stops the automatic sync timer based on:
 * - User authentication state
 * - Offline mode feature flag from admin dashboard
 * - Sync interval from admin settings
 * 
 * Also prunes stale offline data based on retention settings.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { useAppConfig } from '@/contexts/app-config-context';
import {
  startAutoSync,
  stopAutoSync,
  executeSyncToServer,
  pruneStaleOfflineData,
} from '@/services/sync-service';

export function useAutoSync() {
  const { isAuthenticated, accessToken } = useAuth();
  const { config } = useSchool();
  const { settings, isFeatureEnabled } = useAppConfig();
  const hasStarted = useRef(false);

  const offlineEnabled = isFeatureEnabled('featureOfflineMode');
  const syncInterval = settings?.syncIntervalMinutes ?? 30;
  const retentionDays = settings?.offlineRetentionDays ?? 30;

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !config?.apiBaseUrl || !offlineEnabled) {
      if (hasStarted.current) {
        stopAutoSync();
        hasStarted.current = false;
      }
      return;
    }

    const apiBaseUrl = config.apiBaseUrl;

    // Start auto-sync timer
    startAutoSync(syncInterval, async () => {
      console.log('[AutoSync] Timer fired, executing sync...');
      await executeSyncToServer(apiBaseUrl, accessToken);
    });
    hasStarted.current = true;

    // Prune stale data on mount
    pruneStaleOfflineData(retentionDays).catch((err) => {
      console.warn('[AutoSync] Prune error:', err);
    });

    return () => {
      stopAutoSync();
      hasStarted.current = false;
    };
  }, [isAuthenticated, accessToken, config?.apiBaseUrl, offlineEnabled, syncInterval]);

  // Sync when app comes to foreground
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !config?.apiBaseUrl || !offlineEnabled) {
      return;
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && config?.apiBaseUrl && accessToken) {
        console.log('[AutoSync] App foregrounded, syncing...');
        executeSyncToServer(config.apiBaseUrl, accessToken).catch((err) => {
          console.warn('[AutoSync] Foreground sync error:', err);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, accessToken, config?.apiBaseUrl, offlineEnabled]);
}
