/**
 * Push Notification Service (Firebase + Expo)
 *
 * Architecture:
 * - @react-native-firebase/messaging for FCM token + background handling
 * - expo-notifications for foreground display + notification channels
 *
 * Replaces the previous push-service.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { STORAGE_KEYS } from '@/constants/config';

export interface PushTokenInfo {
  token: string;
  platform: 'ios' | 'android';
  obtainedAt: string;
  type: 'fcm' | 'expo';
}

// ─── Notification handler config (foreground) ───────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Token Management ───────────────────────────────────────────────────────

export async function savePushToken(token: string, type: 'fcm' | 'expo' = 'fcm'): Promise<void> {
  const info: PushTokenInfo = {
    token,
    platform: Platform.OS as 'ios' | 'android',
    obtainedAt: new Date().toISOString(),
    type,
  };
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, JSON.stringify(info));
}

export async function getStoredPushToken(): Promise<PushTokenInfo | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as PushTokenInfo;
  } catch {
    return null;
  }
}

export async function clearPushToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
}

// ─── FCM Token ──────────────────────────────────────────────────────────────

/**
 * Get the FCM device token using @react-native-firebase/messaging.
 * Falls back to Expo push token on web or if Firebase not available.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      // FCM not available on web, use Expo token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    }

    const messaging = (await import('@react-native-firebase/messaging')).default;
    const token = await messaging().getToken();
    if (token) {
      await savePushToken(token, 'fcm');
      return token;
    }
    return null;
  } catch (error) {
    console.warn('[Push] Failed to get FCM token, falling back:', error);
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      await savePushToken(tokenData.data, 'expo');
      return tokenData.data;
    } catch {
      return null;
    }
  }
}

/**
 * Listen for FCM token refresh events.
 */
export function onTokenRefresh(callback: (token: string) => void): () => void {
  let unsubscribe: (() => void) | null = null;

  (async () => {
    try {
      const messaging = (await import('@react-native-firebase/messaging')).default;
      unsubscribe = messaging().onTokenRefresh(async (newToken: string) => {
        console.log('[Push] FCM token refreshed');
        await savePushToken(newToken, 'fcm');
        callback(newToken);
      });
    } catch (error) {
      console.warn('[Push] Token refresh listener setup failed:', error);
    }
  })();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

// ─── Permission ─────────────────────────────────────────────────────────────

export async function requestPushPermissions(): Promise<{
  granted: boolean;
  token?: string;
}> {
  try {
    // Request Firebase permission first (iOS)
    if (Platform.OS !== 'web') {
      try {
        const messaging = (await import('@react-native-firebase/messaging')).default;
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === 1 || // messaging.AuthorizationStatus.AUTHORIZED
          authStatus === 2;   // messaging.AuthorizationStatus.PROVISIONAL

        if (!enabled) {
          await AsyncStorage.setItem(STORAGE_KEYS.PUSH_PERMISSIONS, 'denied');
          return { granted: false };
        }
      } catch (err) {
        console.warn('[Push] Firebase permission request failed:', err);
      }
    }

    // Also request via expo-notifications (for local display)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_PERMISSIONS, 'denied');
      return { granted: false };
    }

    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_PERMISSIONS, 'granted');

    const token = await getFCMToken();
    return { granted: true, token: token ?? undefined };
  } catch (error) {
    console.error('[Push] Error requesting permissions:', error);
    return { granted: false };
  }
}

// ─── Notification Channels (Android) ────────────────────────────────────────

export async function getPushPermissionStatus(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_PERMISSIONS);
    if (stored) return stored;
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'unknown';
  }
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Bokningar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B8FCE',
    });

    await Notifications.setNotificationChannelAsync('lessons', {
      name: 'Lektioner',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#34B364',
    });

    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Betalningar',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#F5921B',
    });

    await Notifications.setNotificationChannelAsync('general', {
      name: 'Allmänt',
      importance: Notifications.AndroidImportance.LOW,
    });

    console.log('[Push] Android notification channels created');
  } catch (error) {
    console.error('[Push] Error setting up channels:', error);
  }
}

// ─── Deep Link Routing ──────────────────────────────────────────────────────

const NOTIFICATION_ROUTES: Record<string, (data: Record<string, string>) => void> = {
  booking_reminder: (data) => {
    if (data.bookingId) router.push(`/booking-detail?bookingId=${data.bookingId}` as any);
  },
  lesson_available: (data) => {
    if (data.lessonId) router.push(`/lms/lesson?lessonId=${data.lessonId}` as any);
  },
  payment_reminder: (data) => {
    if (data.invoiceId) router.push(`/invoice-detail?invoiceId=${data.invoiceId}` as any);
  },
  admin_broadcast: () => {
    router.push('/notifications' as any);
  },
  system_update: () => {
    // Handled separately via alert
  },
};

function handleNotificationNavigation(data: Record<string, string> | undefined): void {
  if (!data) return;

  const { notificationType, deepLink } = data;

  // Try specific handler first
  if (notificationType && NOTIFICATION_ROUTES[notificationType]) {
    NOTIFICATION_ROUTES[notificationType](data);
    return;
  }

  // Fall back to deepLink
  if (deepLink) {
    try {
      router.push(deepLink as any);
    } catch (err) {
      console.warn('[Push] Failed to navigate to deep link:', deepLink, err);
    }
  }
}

// ─── Firebase Background Handler ────────────────────────────────────────────

/**
 * Register the Firebase background message handler.
 * Must be called at module level (outside component tree).
 */
export async function registerBackgroundHandler(): Promise<void> {
  try {
    const messaging = (await import('@react-native-firebase/messaging')).default;
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[Push] Background message received:', remoteMessage.messageId);
      // Background messages are handled by the notification tray automatically.
      // Deep link navigation is handled when the user taps the notification.
    });
  } catch (error) {
    console.warn('[Push] Background handler registration failed:', error);
  }
}

// ─── Topic Subscriptions ────────────────────────────────────────────────────

export async function subscribeToTopics(topics: string[]): Promise<void> {
  try {
    const messaging = (await import('@react-native-firebase/messaging')).default;
    for (const topic of topics) {
      await messaging().subscribeToTopic(topic);
      console.log('[Push] Subscribed to topic:', topic);
    }
  } catch (error) {
    console.warn('[Push] Topic subscription failed:', error);
  }
}

export async function unsubscribeFromTopics(topics: string[]): Promise<void> {
  try {
    const messaging = (await import('@react-native-firebase/messaging')).default;
    for (const topic of topics) {
      await messaging().unsubscribeFromTopic(topic);
      console.log('[Push] Unsubscribed from topic:', topic);
    }
  } catch (error) {
    console.warn('[Push] Topic unsubscription failed:', error);
  }
}

// ─── Push Preferences ───────────────────────────────────────────────────────

export interface PushPreferences {
  bookingReminders: boolean;
  lessonAlerts: boolean;
  paymentReminders: boolean;
}

export async function getPushPreferences(): Promise<PushPreferences> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_PREFERENCES);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    bookingReminders: true,
    lessonAlerts: true,
    paymentReminders: true,
  };
}

export async function savePushPreferences(prefs: PushPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_PREFERENCES, JSON.stringify(prefs));

  // Update topic subscriptions based on prefs
  const subscriptions: string[] = [];
  const unsubscriptions: string[] = [];

  if (prefs.bookingReminders) subscriptions.push('booking_reminders');
  else unsubscriptions.push('booking_reminders');

  if (prefs.lessonAlerts) subscriptions.push('lesson_alerts');
  else unsubscriptions.push('lesson_alerts');

  if (prefs.paymentReminders) subscriptions.push('payment_reminders');
  else unsubscriptions.push('payment_reminders');

  if (subscriptions.length > 0) await subscribeToTopics(subscriptions);
  if (unsubscriptions.length > 0) await unsubscribeFromTopics(unsubscriptions);
}

// ─── Initialize Push System ─────────────────────────────────────────────────

/**
 * Full push notification initialization.
 * Call after successful authentication.
 * Returns cleanup function.
 */
export async function initializePush(): Promise<() => void> {
  console.log('[Push] Initializing push notification system...');

  // Set up Android channels
  await setupNotificationChannels();

  // Request permissions & get token
  const { granted, token } = await requestPushPermissions();
  console.log('[Push] Permission:', granted ? 'granted' : 'denied', 'Token:', token ? 'obtained' : 'none');

  // Register background handler
  await registerBackgroundHandler();

  // Set up foreground message handler (Firebase)
  let unsubscribeMessage: (() => void) | null = null;
  try {
    const messaging = (await import('@react-native-firebase/messaging')).default;
    unsubscribeMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('[Push] Foreground message:', remoteMessage.messageId);

      // Display as local notification via expo-notifications
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title ?? 'Ny notifikation',
          body: remoteMessage.notification?.body ?? '',
          data: remoteMessage.data as Record<string, string>,
          sound: 'default',
        },
        trigger: null,
      });
    });
  } catch (error) {
    console.warn('[Push] Foreground handler setup failed:', error);
  }

  // Set up notification response handler (tap on notification)
  const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      console.log('[Push] Notification tapped:', data);
      handleNotificationNavigation(data);
    },
  );

  // Set up token refresh listener
  const unsubscribeTokenRefresh = onTokenRefresh(async (newToken) => {
    console.log('[Push] Token refreshed, should re-register device');
    // The calling code (auth-context) should handle re-registration
  });

  // Return cleanup function
  return () => {
    if (unsubscribeMessage) unsubscribeMessage();
    notificationResponseSubscription.remove();
    unsubscribeTokenRefresh();
  };
}
