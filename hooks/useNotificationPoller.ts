/**
 * Notification Polling Hook
 *
 * Since the server does NOT use Expo Push or FCM, the app polls
 * GET /api/mobile/notifications for new notifications.
 *
 * This hook:
 * - Polls every 30s while the app is in the foreground
 * - Re-polls on app resume (foreground)
 * - Detects `session_kicked` → triggers force logout
 * - Exposes unreadCount for badge UI
 * - Tracks `since` timestamp for incremental polls
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, Alert, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import {
  fetchNotifications,
  markNotificationsRead,
  type PollNotification,
} from '@/services/mobile-api';

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const MAX_CONSECUTIVE_FAILURES = 5;
const MAX_BACKOFF_MS = 5 * 60_000; // 5 minutes

export interface NotificationPollerState {
  /** Total unread notification count for this user */
  unreadCount: number;
  /** Latest notifications from the most recent poll */
  latestNotifications: PollNotification[];
  /** Whether the poller is actively running */
  isPolling: boolean;
  /** Force an immediate poll */
  refetch: () => Promise<void>;
  /** Mark specific notifications as read */
  markAsRead: (ids: string[]) => Promise<void>;
}

export function useNotificationPoller(): NotificationPollerState {
  const { accessToken, isAuthenticated, logout } = useAuth();
  const { config } = useSchool();
  const queryClient = useQueryClient();

  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotifications, setLatestNotifications] = useState<PollNotification[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const lastFetchRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const consecutiveFailuresRef = useRef(0);

  const apiBaseUrl = config?.apiBaseUrl;

  // ─── Core poll function ─────────────────────────────────────────────────

  const poll = useCallback(async () => {
    if (!apiBaseUrl || !accessToken || !isAuthenticated) return;

    try {
      const params: { unreadOnly: boolean; since?: string; limit: number } = {
        unreadOnly: true,
        limit: 20,
      };

      if (lastFetchRef.current) {
        params.since = lastFetchRef.current;
      }

      const response = await fetchNotifications(apiBaseUrl, accessToken, params);

      if (!isMountedRef.current) return;

      if (!response.success || !response.data) {
        console.warn('[NotifPoller] Poll failed:', response.error);
        return;
      }

      const { notifications, unreadCount: serverUnread, hasKick } = response.data;

      // Update timestamp for next incremental poll
      lastFetchRef.current = new Date().toISOString();

      // ── Kick detection (CRITICAL) ──────────────────────────────────────
      if (hasKick) {
        const kickNotif = notifications.find(
          (n) => n.notificationType === 'session_kicked',
        );

        console.warn('[NotifPoller] KICK DETECTED — forcing logout');

        // Show alert to user
        Alert.alert(
          kickNotif?.title || 'Session avslutad',
          kickNotif?.body || 'Din session har avslutats av en administratör.',
        );

        // Mark the kick notification as read so it doesn't re-trigger
        if (kickNotif) {
          try {
            await markNotificationsRead(apiBaseUrl, [kickNotif.id]);
          } catch {
            // Best effort — we're logging out anyway
          }
        }

        // Force logout
        logout();
        return;
      }

      // Reset failure counter on success
      consecutiveFailuresRef.current = 0;

      // ── Update state ───────────────────────────────────────────────────
      setUnreadCount(serverUnread);

      if (notifications.length > 0) {
        setLatestNotifications(notifications);
        // Invalidate the full notifications query so the list screen refreshes
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    } catch (err) {
      consecutiveFailuresRef.current++;
      // Only log first few failures to avoid log spam
      if (consecutiveFailuresRef.current <= 3) {
        console.warn(`[NotifPoller] Poll error (${consecutiveFailuresRef.current}/${MAX_CONSECUTIVE_FAILURES}):`, err);
      } else if (consecutiveFailuresRef.current === MAX_CONSECUTIVE_FAILURES) {
        console.warn('[NotifPoller] Too many consecutive failures, backing off');
      }
    }
  }, [apiBaseUrl, accessToken, isAuthenticated, logout, queryClient]);

  // ─── Mark as read ───────────────────────────────────────────────────────

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!apiBaseUrl || ids.length === 0) return;

    try {
      const result = await markNotificationsRead(apiBaseUrl, ids);
      if (result.success) {
        // Decrement local unread count
        const markedCount = result.data?.markedAsRead ?? ids.length;
        setUnreadCount((prev) => Math.max(0, prev - markedCount));
        // Remove from latest notifications
        setLatestNotifications((prev) =>
          prev.filter((n) => !ids.includes(n.id)),
        );
      }
    } catch (err) {
      console.warn('[NotifPoller] Mark as read failed:', err);
    }
  }, [apiBaseUrl]);

  // ─── Lifecycle: start/stop polling ──────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;

    if (!isAuthenticated || !accessToken || !apiBaseUrl) {
      // Not authenticated — clear state and don't poll
      setUnreadCount(0);
      setLatestNotifications([]);
      setIsPolling(false);
      lastFetchRef.current = null;
      return;
    }

    // Initial poll
    setIsPolling(true);
    consecutiveFailuresRef.current = 0;
    poll();

    // Adaptive polling: back off on consecutive failures
    const adaptivePoll = () => {
      const failures = consecutiveFailuresRef.current;
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        // Switch to longer backoff interval
        const backoff = Math.min(POLL_INTERVAL_MS * Math.pow(2, failures - MAX_CONSECUTIVE_FAILURES + 1), MAX_BACKOFF_MS);
        intervalRef.current = setTimeout(() => {
          poll();
          intervalRef.current = setTimeout(adaptivePoll, 0);
        }, backoff) as unknown as ReturnType<typeof setInterval>;
        return;
      }
      intervalRef.current = setTimeout(() => {
        poll();
        adaptivePoll();
      }, POLL_INTERVAL_MS) as unknown as ReturnType<typeof setInterval>;
    };
    intervalRef.current = setTimeout(adaptivePoll, POLL_INTERVAL_MS) as unknown as ReturnType<typeof setInterval>;

    // Re-poll on app resume
    const appStateHandler = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('[NotifPoller] App resumed — polling now');
        poll();
      }
    };
    const subscription = AppState.addEventListener('change', appStateHandler);

    return () => {
      isMountedRef.current = false;
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, [isAuthenticated, accessToken, apiBaseUrl, poll]);

  return {
    unreadCount,
    latestNotifications,
    isPolling,
    refetch: poll,
    markAsRead,
  };
}
