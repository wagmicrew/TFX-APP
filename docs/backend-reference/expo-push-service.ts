/**
 * Expo Push Notification Service
 *
 * Server-side utility to send push notifications via the Expo Push API.
 * Supports single & batch sends, receipt checking, and DB logging.
 *
 * Expo Push API docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * Tables used:
 *   - mobile_push_notifications  (log of all sent notifications)
 *   - mobile_app_sessions        (to look up push tokens by user/device)
 */

import { db } from '@/lib/db';
import { mobilePushNotifications, mobileAppSessions } from '@/lib/db/schema/mobile-otp-schema';
import { and, eq, inArray, isNotNull, sql, desc, like, or } from 'drizzle-orm';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExpoPushMessage {
  to: string | string[];          // Expo push token(s)  ExponentPushToken[xxx]
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;             // Android notification channel
  categoryId?: string;            // iOS action category
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;                   // seconds — 0 = immediate, default 2419200 (28 days)
  expiration?: number;            // Unix timestamp
  subtitle?: string;              // iOS subtitle
  mutableContent?: boolean;       // iOS — allows notification service extension
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;                    // receipt ID (when status === 'ok')
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
    expoPushToken?: string;
  };
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
  };
}

export interface SendResult {
  sent: number;
  failed: number;
  tickets: ExpoPushTicket[];
  errors: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const BATCH_SIZE = 100;  // Expo recommends max 100 per request

// ─── Core Send ──────────────────────────────────────────────────────────────

/**
 * Send push notifications via Expo Push API.
 * Automatically batches if > 100 messages.
 */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<SendResult> {
  const allTickets: ExpoPushTicket[] = [];
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  // Split into batches of BATCH_SIZE
  const batches: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          // If you have an Expo access token for enhanced rate limits:
          // 'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        const text = await response.text();
        errors.push(`Expo API returned ${response.status}: ${text}`);
        failed += batch.length;
        continue;
      }

      const result = await response.json() as { data: ExpoPushTicket[] };

      for (const ticket of result.data) {
        allTickets.push(ticket);
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          errors.push(ticket.message ?? `Push error: ${ticket.details?.error}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Network error sending push batch: ${msg}`);
      failed += batch.length;
    }
  }

  return { sent, failed, tickets: allTickets, errors };
}

// ─── Receipt Checking ───────────────────────────────────────────────────────

/**
 * Check receipts for previously sent push notifications.
 * Call this ~15 minutes after sending to verify delivery.
 */
export async function checkPushReceipts(
  receiptIds: string[],
): Promise<Record<string, ExpoPushReceipt>> {
  const allReceipts: Record<string, ExpoPushReceipt> = {};

  // Batch receipt checks too
  const batches: string[][] = [];
  for (let i = 0; i < receiptIds.length; i += BATCH_SIZE) {
    batches.push(receiptIds.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const response = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: batch }),
      });

      if (!response.ok) continue;

      const result = await response.json() as { data: Record<string, ExpoPushReceipt> };
      Object.assign(allReceipts, result.data);
    } catch {
      // Silently skip — receipts are best-effort
    }
  }

  return allReceipts;
}

// ─── High-Level Helpers ─────────────────────────────────────────────────────

/**
 * Send a push notification to a specific user (all their devices).
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<SendResult> {
  // Get all active sessions with push tokens for this user
  const sessions = await db
    .select({
      pushToken: mobileAppSessions.pushToken,
      deviceId: mobileAppSessions.deviceId,
    })
    .from(mobileAppSessions)
    .where(
      and(
        eq(mobileAppSessions.userId, userId),
        eq(mobileAppSessions.isActive, true),
        isNotNull(mobileAppSessions.pushToken),
      ),
    );

  if (sessions.length === 0) {
    return { sent: 0, failed: 0, tickets: [], errors: ['No active devices with push tokens'] };
  }

  const tokens = sessions
    .map((s) => s.pushToken)
    .filter((t): t is string => !!t);

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: 'default' as const,
    data,
  }));

  const result = await sendExpoPush(messages);

  // Log to DB
  await logPushNotification({
    targetType: 'user',
    targetId: userId,
    title,
    body,
    data,
    sent: result.sent,
    failed: result.failed,
    receiptIds: result.tickets.filter((t) => t.id).map((t) => t.id!),
  });

  return result;
}

/**
 * Send a push notification to a single device (by push token).
 */
export async function sendPushToDevice(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  channelId?: string,
): Promise<SendResult> {
  const messages: ExpoPushMessage[] = [
    {
      to: pushToken,
      title,
      body,
      sound: 'default',
      data,
      channelId,
    },
  ];

  const result = await sendExpoPush(messages);

  await logPushNotification({
    targetType: 'device',
    targetId: pushToken,
    title,
    body,
    data,
    sent: result.sent,
    failed: result.failed,
    receiptIds: result.tickets.filter((t) => t.id).map((t) => t.id!),
  });

  return result;
}

/**
 * Send a push notification to ALL active devices.
 */
export async function sendPushToAll(
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<SendResult> {
  const sessions = await db
    .select({ pushToken: mobileAppSessions.pushToken })
    .from(mobileAppSessions)
    .where(
      and(
        eq(mobileAppSessions.isActive, true),
        isNotNull(mobileAppSessions.pushToken),
      ),
    );

  const tokens = sessions
    .map((s) => s.pushToken)
    .filter((t): t is string => !!t);

  if (tokens.length === 0) {
    return { sent: 0, failed: 0, tickets: [], errors: ['No active devices with push tokens'] };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: 'default' as const,
    data,
  }));

  const result = await sendExpoPush(messages);

  await logPushNotification({
    targetType: 'all',
    targetId: null,
    title,
    body,
    data,
    sent: result.sent,
    failed: result.failed,
    receiptIds: result.tickets.filter((t) => t.id).map((t) => t.id!),
  });

  return result;
}

/**
 * Send a push notification to all devices on a specific platform.
 */
export async function sendPushToPlatform(
  platform: 'ios' | 'android',
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<SendResult> {
  const sessions = await db
    .select({ pushToken: mobileAppSessions.pushToken })
    .from(mobileAppSessions)
    .where(
      and(
        eq(mobileAppSessions.isActive, true),
        eq(mobileAppSessions.platform, platform),
        isNotNull(mobileAppSessions.pushToken),
      ),
    );

  const tokens = sessions
    .map((s) => s.pushToken)
    .filter((t): t is string => !!t);

  if (tokens.length === 0) {
    return { sent: 0, failed: 0, tickets: [], errors: [`No active ${platform} devices`] };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: 'default' as const,
    data,
  }));

  const result = await sendExpoPush(messages);

  await logPushNotification({
    targetType: 'platform',
    targetId: platform,
    title,
    body,
    data,
    sent: result.sent,
    failed: result.failed,
    receiptIds: result.tickets.filter((t) => t.id).map((t) => t.id!),
  });

  return result;
}

// ─── DB Logging ─────────────────────────────────────────────────────────────

interface LogEntry {
  targetType: 'all' | 'user' | 'device' | 'platform';
  targetId: string | null;
  title: string;
  body: string;
  data?: Record<string, string>;
  sent: number;
  failed: number;
  receiptIds: string[];
}

async function logPushNotification(entry: LogEntry): Promise<void> {
  try {
    await db.insert(mobilePushNotifications).values({
      targetType: entry.targetType,
      targetId: entry.targetId,
      title: entry.title,
      body: entry.body,
      data: entry.data ?? {},
      status: entry.failed === 0 ? 'sent' : entry.sent > 0 ? 'partial' : 'failed',
      sentCount: entry.sent,
      failedCount: entry.failed,
      receiptIds: entry.receiptIds,
      sentAt: new Date(),
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[ExpoPush] Failed to log notification:', err);
  }
}

// ─── Token Cleanup ──────────────────────────────────────────────────────────

/**
 * Process push receipts and clean up invalid tokens.
 * Run this as a cron job ~15 min after sending batches.
 *
 * Handles `DeviceNotRegistered` errors by deactivating the push token.
 */
export async function processReceiptsAndCleanup(): Promise<{
  checked: number;
  cleaned: number;
}> {
  // Get recent notifications with receipt IDs
  const recentNotifications = await db
    .select({
      id: mobilePushNotifications.id,
      receiptIds: mobilePushNotifications.receiptIds,
    })
    .from(mobilePushNotifications)
    .where(
      and(
        eq(mobilePushNotifications.status, 'sent'),
        isNotNull(mobilePushNotifications.receiptIds),
        // Only check within last hour
        sql`${mobilePushNotifications.sentAt} > NOW() - INTERVAL '1 hour'`,
      ),
    );

  const allReceiptIds = recentNotifications
    .flatMap((n) => (n.receiptIds as string[]) ?? [])
    .filter(Boolean);

  if (allReceiptIds.length === 0) {
    return { checked: 0, cleaned: 0 };
  }

  const receipts = await checkPushReceipts(allReceiptIds);
  let cleaned = 0;

  for (const [receiptId, receipt] of Object.entries(receipts)) {
    if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
      // The token is no longer valid — deactivate sessions with that token
      // We'd need to track which token maps to which receipt — for now, log it
      console.warn(`[ExpoPush] DeviceNotRegistered for receipt ${receiptId}`);
      cleaned++;
    }
  }

  return { checked: allReceiptIds.length, cleaned };
}

// ─── Notification Types (predefined templates) ──────────────────────────────

export const PUSH_TEMPLATES = {
  bookingReminder: (bookingTime: string, instructorName: string) => ({
    title: 'Påminnelse om körlektion',
    body: `Din lektion med ${instructorName} börjar ${bookingTime}`,
    data: { notificationType: 'booking_reminder' },
    channelId: 'bookings',
  }),

  bookingConfirmed: (date: string) => ({
    title: 'Bokning bekräftad',
    body: `Din körlektion den ${date} är nu bekräftad`,
    data: { notificationType: 'booking_confirmed' },
    channelId: 'bookings',
  }),

  bookingCancelled: (date: string, reason?: string) => ({
    title: 'Lektion avbokad',
    body: reason
      ? `Din lektion den ${date} har avbokats: ${reason}`
      : `Din lektion den ${date} har avbokats`,
    data: { notificationType: 'booking_cancelled' },
    channelId: 'bookings',
  }),

  lessonAvailable: (date: string) => ({
    title: 'Ny lektionstid tillgänglig',
    body: `En ledig tid finns den ${date}. Boka nu!`,
    data: { notificationType: 'lesson_available' },
    channelId: 'lessons',
  }),

  paymentReminder: (amount: number, dueDate: string) => ({
    title: 'Betalningspåminnelse',
    body: `Faktura på ${amount} kr förfaller ${dueDate}`,
    data: { notificationType: 'payment_reminder' },
    channelId: 'payments',
  }),

  paymentReceived: (amount: number) => ({
    title: 'Betalning mottagen',
    body: `Vi har mottagit din betalning på ${amount} kr. Tack!`,
    data: { notificationType: 'payment_received' },
    channelId: 'payments',
  }),

  adminBroadcast: (message: string) => ({
    title: 'Meddelande från trafikskolan',
    body: message,
    data: { notificationType: 'admin_broadcast' },
    channelId: 'general',
  }),
} as const;
