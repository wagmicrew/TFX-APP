/**
 * Admin Mobile Dashboard API Routes
 *
 * Express/Next.js API routes for:
 *   - Sessions: list, search, kick
 *   - Push: send notification, history
 *   - Devices: list, search, deactivate
 *
 * Mount at: /api/admin/app-dashboard/*
 *
 * Tables used:
 *   - mobile_app_sessions
 *   - mobile_push_notifications
 *
 * Dependencies:
 *   - expo-push-service.ts (sendPushToUser, sendPushToAll, etc.)
 */

import { Router, Request, Response } from 'express';
import { db } from '@/lib/db';
import { mobileAppSessions, mobilePushNotifications } from '@/lib/db/schema/mobile-otp-schema';
import { and, eq, desc, like, or, sql, isNotNull, lte, gte, count } from 'drizzle-orm';
import {
  sendPushToUser,
  sendPushToDevice,
  sendPushToAll,
  sendPushToPlatform,
  PUSH_TEMPLATES,
} from './expo-push-service';

const router = Router();

// ─── Middleware: Admin auth check ───────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: Function) {
  // TODO: Replace with your actual admin auth check
  // e.g. verify JWT, check user.role === 'admin' or 'school_admin'
  const user = (req as any).user;
  if (!user || !['admin', 'school_admin'].includes(user.role)) {
    return res.status(403).json({ success: false, error: 'Forbidden — admin access required' });
  }
  next();
}

router.use(requireAdmin);

// ═══════════════════════════════════════════════════════════════════════════
//  SESSIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/app-dashboard/sessions
 *
 * Query params:
 *   ?search=anna            — search by user name, email, or device ID
 *   ?status=active|expired  — filter by session status
 *   ?platform=ios|android   — filter by platform
 *   ?page=1&limit=25        — pagination
 *   ?sort=lastActiveAt      — sort field (default: lastActiveAt)
 *   ?order=desc             — sort order (default: desc)
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      platform,
      page = '1',
      limit = '25',
      sort = 'lastActiveAt',
      order = 'desc',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          like(mobileAppSessions.userName, searchPattern),
          like(mobileAppSessions.userEmail, searchPattern),
          like(mobileAppSessions.deviceId, searchPattern),
          like(mobileAppSessions.deviceName, searchPattern),
        ),
      );
    }

    if (status === 'active') {
      conditions.push(eq(mobileAppSessions.isActive, true));
    } else if (status === 'expired') {
      conditions.push(eq(mobileAppSessions.isActive, false));
    }

    if (platform === 'ios' || platform === 'android') {
      conditions.push(eq(mobileAppSessions.platform, platform));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(mobileAppSessions)
      .where(whereClause);

    // Get paginated sessions
    const sessions = await db
      .select({
        id: mobileAppSessions.id,
        userId: mobileAppSessions.userId,
        userName: mobileAppSessions.userName,
        userEmail: mobileAppSessions.userEmail,
        deviceId: mobileAppSessions.deviceId,
        deviceName: mobileAppSessions.deviceName,
        deviceModel: mobileAppSessions.deviceModel,
        platform: mobileAppSessions.platform,
        osVersion: mobileAppSessions.osVersion,
        appVersion: mobileAppSessions.appVersion,
        pushToken: mobileAppSessions.pushToken,
        ipAddress: mobileAppSessions.ipAddress,
        isActive: mobileAppSessions.isActive,
        lastActiveAt: mobileAppSessions.lastActiveAt,
        lastSyncAt: mobileAppSessions.lastSyncAt,
        createdAt: mobileAppSessions.createdAt,
        expiresAt: mobileAppSessions.expiresAt,
      })
      .from(mobileAppSessions)
      .where(whereClause)
      .orderBy(desc(mobileAppSessions.lastActiveAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: {
        sessions,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[Admin] Failed to fetch sessions:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

/**
 * DELETE /api/admin/app-dashboard/sessions
 * Terminate (kick) a session.
 *
 * Body: { sessionId: "uuid" }
 */
router.delete('/sessions', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const [session] = await db
      .select({
        id: mobileAppSessions.id,
        userId: mobileAppSessions.userId,
        userName: mobileAppSessions.userName,
        pushToken: mobileAppSessions.pushToken,
      })
      .from(mobileAppSessions)
      .where(eq(mobileAppSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Mark session as inactive
    await db
      .update(mobileAppSessions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(mobileAppSessions.id, sessionId));

    // Optionally: revoke the refresh token associated with this session
    // await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.sessionId, sessionId));

    // Optionally: send a push to tell the device to log out
    if (session.pushToken) {
      try {
        await sendPushToDevice(
          session.pushToken,
          'Session avslutad',
          'Din session har avslutats av administratören. Logga in igen.',
          { notificationType: 'session_terminated', action: 'force_logout' },
        );
      } catch {
        // Non-critical — device will discover on next API call (401)
      }
    }

    res.json({
      success: true,
      data: {
        sessionId,
        userId: session.userId,
        userName: session.userName,
      },
    });
  } catch (err) {
    console.error('[Admin] Failed to terminate session:', err);
    res.status(500).json({ success: false, error: 'Failed to terminate session' });
  }
});

/**
 * DELETE /api/admin/app-dashboard/sessions/user/:userId
 * Kick ALL sessions for a specific user.
 */
router.delete('/sessions/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const sessions = await db
      .select({ id: mobileAppSessions.id, pushToken: mobileAppSessions.pushToken })
      .from(mobileAppSessions)
      .where(
        and(
          eq(mobileAppSessions.userId, userId),
          eq(mobileAppSessions.isActive, true),
        ),
      );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'No active sessions for this user' });
    }

    // Deactivate all sessions
    await db
      .update(mobileAppSessions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(mobileAppSessions.userId, userId),
          eq(mobileAppSessions.isActive, true),
        ),
      );

    // Notify all devices
    const tokens = sessions.map((s) => s.pushToken).filter(Boolean) as string[];
    if (tokens.length > 0) {
      try {
        await sendPushToUser(userId, 'Alla sessioner avslutade', 'Logga in igen.', {
          notificationType: 'session_terminated',
          action: 'force_logout',
        });
      } catch { /* non-critical */ }
    }

    res.json({
      success: true,
      data: { terminatedCount: sessions.length },
    });
  } catch (err) {
    console.error('[Admin] Failed to terminate user sessions:', err);
    res.status(500).json({ success: false, error: 'Failed to terminate sessions' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/app-dashboard/push
 * Send a push notification.
 *
 * Body:
 * {
 *   title: "Meddelande",
 *   body: "Hej alla! ...",
 *   targetType: "all" | "user" | "device" | "platform",
 *   targetId?: "user-uuid" | "ExponentPushToken[xxx]",
 *   targetPlatform?: "ios" | "android",
 *   data?: { notificationType: "admin_broadcast", deepLink: "/notifications" }
 * }
 */
router.post('/push', async (req: Request, res: Response) => {
  try {
    const { title, body, targetType, targetId, targetPlatform, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title and body are required' });
    }

    if (!['all', 'user', 'device', 'platform'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: 'targetType must be one of: all, user, device, platform',
      });
    }

    let result;

    switch (targetType) {
      case 'all':
        result = await sendPushToAll(title, body, data);
        break;

      case 'user':
        if (!targetId) {
          return res.status(400).json({ success: false, error: 'targetId (userId) is required for user target' });
        }
        result = await sendPushToUser(targetId, title, body, data);
        break;

      case 'device':
        if (!targetId) {
          return res.status(400).json({ success: false, error: 'targetId (pushToken) is required for device target' });
        }
        result = await sendPushToDevice(targetId, title, body, data);
        break;

      case 'platform':
        if (!targetPlatform || !['ios', 'android'].includes(targetPlatform)) {
          return res.status(400).json({ success: false, error: 'targetPlatform must be ios or android' });
        }
        result = await sendPushToPlatform(targetPlatform, title, body, data);
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid targetType' });
    }

    res.json({
      success: true,
      data: {
        sent: result.sent,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  } catch (err) {
    console.error('[Admin] Failed to send push notification:', err);
    res.status(500).json({ success: false, error: 'Failed to send push notification' });
  }
});

/**
 * POST /api/admin/app-dashboard/push/template
 * Send a predefined push notification template.
 *
 * Body:
 * {
 *   template: "bookingReminder" | "paymentReminder" | "adminBroadcast" | ...,
 *   targetType: "all" | "user",
 *   targetId?: "user-uuid",
 *   params: { ... template-specific params }
 * }
 */
router.post('/push/template', async (req: Request, res: Response) => {
  try {
    const { template, targetType, targetId, params } = req.body;

    if (!template || !PUSH_TEMPLATES[template as keyof typeof PUSH_TEMPLATES]) {
      return res.status(400).json({
        success: false,
        error: `Unknown template. Available: ${Object.keys(PUSH_TEMPLATES).join(', ')}`,
      });
    }

    // Build message from template
    let message: { title: string; body: string; data?: Record<string, string>; channelId?: string };
    switch (template) {
      case 'bookingReminder':
        message = PUSH_TEMPLATES.bookingReminder(params?.bookingTime ?? '', params?.instructorName ?? '');
        break;
      case 'bookingConfirmed':
        message = PUSH_TEMPLATES.bookingConfirmed(params?.date ?? '');
        break;
      case 'bookingCancelled':
        message = PUSH_TEMPLATES.bookingCancelled(params?.date ?? '', params?.reason);
        break;
      case 'lessonAvailable':
        message = PUSH_TEMPLATES.lessonAvailable(params?.date ?? '');
        break;
      case 'paymentReminder':
        message = PUSH_TEMPLATES.paymentReminder(params?.amount ?? 0, params?.dueDate ?? '');
        break;
      case 'paymentReceived':
        message = PUSH_TEMPLATES.paymentReceived(params?.amount ?? 0);
        break;
      case 'adminBroadcast':
        message = PUSH_TEMPLATES.adminBroadcast(params?.message ?? '');
        break;
      default:
        return res.status(400).json({ success: false, error: 'Unknown template' });
    }

    let result;
    if (targetType === 'user' && targetId) {
      result = await sendPushToUser(targetId, message.title, message.body, message.data);
    } else {
      result = await sendPushToAll(message.title, message.body, message.data);
    }

    res.json({
      success: true,
      data: { sent: result.sent, failed: result.failed },
    });
  } catch (err) {
    console.error('[Admin] Failed to send template push:', err);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

/**
 * GET /api/admin/app-dashboard/push/history
 * List sent push notifications.
 *
 * Query params:
 *   ?page=1&limit=25
 *   ?targetType=all|user|device|platform
 */
router.get('/push/history', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '25',
      targetType,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (targetType && ['all', 'user', 'device', 'platform'].includes(targetType)) {
      conditions.push(eq(mobilePushNotifications.targetType, targetType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(mobilePushNotifications)
      .where(whereClause);

    const notifications = await db
      .select()
      .from(mobilePushNotifications)
      .where(whereClause)
      .orderBy(desc(mobilePushNotifications.sentAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: {
        notifications,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[Admin] Failed to fetch push history:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch push history' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/app-dashboard/stats
 * Aggregated stats for the admin dashboard.
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total & active sessions
    const [{ totalSessions }] = await db
      .select({ totalSessions: count() })
      .from(mobileAppSessions);

    const [{ activeSessions }] = await db
      .select({ activeSessions: count() })
      .from(mobileAppSessions)
      .where(eq(mobileAppSessions.isActive, true));

    // Unique active devices
    const [{ activeDevices }] = await db
      .select({ activeDevices: sql<number>`COUNT(DISTINCT ${mobileAppSessions.deviceId})` })
      .from(mobileAppSessions)
      .where(eq(mobileAppSessions.isActive, true));

    // Push notifications sent today
    const [{ pushSentToday }] = await db
      .select({ pushSentToday: sql<number>`COALESCE(SUM(${mobilePushNotifications.sentCount}), 0)` })
      .from(mobilePushNotifications)
      .where(gte(mobilePushNotifications.sentAt, todayStart));

    // Platform breakdown
    const platformBreakdown = await db
      .select({
        platform: mobileAppSessions.platform,
        count: count(),
      })
      .from(mobileAppSessions)
      .where(eq(mobileAppSessions.isActive, true))
      .groupBy(mobileAppSessions.platform);

    // Sessions with push tokens
    const [{ withPushToken }] = await db
      .select({ withPushToken: count() })
      .from(mobileAppSessions)
      .where(
        and(
          eq(mobileAppSessions.isActive, true),
          isNotNull(mobileAppSessions.pushToken),
        ),
      );

    res.json({
      success: true,
      data: {
        totalSessions,
        activeSessions,
        activeDevices,
        pushSentToday,
        withPushToken,
        platformBreakdown: Object.fromEntries(
          platformBreakdown.map((p) => [p.platform, p.count]),
        ),
      },
    });
  } catch (err) {
    console.error('[Admin] Failed to fetch stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SEARCH (unified)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/app-dashboard/search?q=anna
 * Search across sessions by user name, email, device name, or device ID.
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query as Record<string, string>;

    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
    }

    const searchPattern = `%${q}%`;

    const sessions = await db
      .select({
        id: mobileAppSessions.id,
        userId: mobileAppSessions.userId,
        userName: mobileAppSessions.userName,
        userEmail: mobileAppSessions.userEmail,
        deviceId: mobileAppSessions.deviceId,
        deviceName: mobileAppSessions.deviceName,
        platform: mobileAppSessions.platform,
        appVersion: mobileAppSessions.appVersion,
        isActive: mobileAppSessions.isActive,
        lastActiveAt: mobileAppSessions.lastActiveAt,
        pushToken: mobileAppSessions.pushToken,
      })
      .from(mobileAppSessions)
      .where(
        or(
          like(mobileAppSessions.userName, searchPattern),
          like(mobileAppSessions.userEmail, searchPattern),
          like(mobileAppSessions.deviceId, searchPattern),
          like(mobileAppSessions.deviceName, searchPattern),
        ),
      )
      .orderBy(desc(mobileAppSessions.lastActiveAt))
      .limit(50);

    res.json({
      success: true,
      data: { sessions, total: sessions.length },
    });
  } catch (err) {
    console.error('[Admin] Search failed:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

export default router;

// ─── Mount example ──────────────────────────────────────────────────────────
//
// In your main app/server file:
//
//   import adminMobileRouter from './admin-mobile-api';
//   app.use('/api/admin/app-dashboard', adminMobileRouter);
//
