/**
 * Mobile OTP Sync Queue Service
 *
 * OTP-based mobile clients use mobile_app_sessions + mobile_sync_queue (OTP schema).
 * This service implements queueing + processing + status reporting.
 */

import { db } from ;
import { mobileAppSessions, mobileSyncQueue } from '@/lib/db/schema/mobile-otp-schema';
import { and, asc, eq, sql } from 'drizzle-orm';

export interface OtpSyncOperation {
  operation: string;
  entityType: string;
  entityId?: string;
  payload: unknown;
}

export class MobileOtpSyncQueueService {
  static async queueForSync(sessionId: string, userId: string, operation: OtpSyncOperation) {
    await db.insert(mobileSyncQueue).values({
      sessionId,
      userId,
      operation: operation.operation,
      entityType: operation.entityType,
      entityId: operation.entityId,
      payload: operation.payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static async processSyncQueue(sessionId: string) {
    const pending = await db
      .select()
      .from(mobileSyncQueue)
      .where(and(eq(mobileSyncQueue.sessionId, sessionId), eq(mobileSyncQueue.status, 'pending')))
      .orderBy(asc(mobileSyncQueue.createdAt));

    const results: Array<{ id: string; success: boolean; result?: unknown; error?: string }> = [];

    for (const op of pending) {
      try {
        await db
          .update(mobileSyncQueue)
          .set({
            status: 'syncing',
            lastAttemptAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(mobileSyncQueue.id, op.id));

        const result = await this.processOperation(op.operation, op.payload);

        await db
          .update(mobileSyncQueue)
          .set({
            status: 'synced',
            syncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(mobileSyncQueue.id, op.id));

        results.push({ id: op.id, success: true, result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const newRetryCount = (op.retryCount ?? 0) + 1;
        const newStatus = newRetryCount >= (op.maxRetries ?? 3) ? 'failed' : 'pending';

        await db
          .update(mobileSyncQueue)
          .set({
            status: newStatus,
            retryCount: newRetryCount,
            errorMessage: message,
            errorDetails: { error: String(error) },
            updatedAt: new Date(),
          })
          .where(eq(mobileSyncQueue.id, op.id));

        results.push({ id: op.id, success: false, error: message });
      }
    }

    await db
      .update(mobileAppSessions)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mobileAppSessions.id, sessionId));

    return results;
  }

  static async getSyncStatus(sessionId: string) {
    const pendingRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileSyncQueue)
      .where(and(eq(mobileSyncQueue.sessionId, sessionId), eq(mobileSyncQueue.status, 'pending')));

    const failedRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileSyncQueue)
      .where(and(eq(mobileSyncQueue.sessionId, sessionId), eq(mobileSyncQueue.status, 'failed')));

    const sessionRows = await db
      .select({ lastSyncAt: mobileAppSessions.lastSyncAt })
      .from(mobileAppSessions)
      .where(eq(mobileAppSessions.id, sessionId))
      .limit(1);

    return {
      pendingCount: pendingRows[0]?.count ?? 0,
      failedCount: failedRows[0]?.count ?? 0,
      lastSyncAt: sessionRows[0]?.lastSyncAt ?? null,
    };
  }

  private static async processOperation(operation: string, payload: unknown) {
    // Integrate real business operations here.
    // For now, return a stub result (mirrors existing MobileSyncService behavior).
    switch (operation) {
      case 'booking_create':
        return { bookingId: 'created-id', payload };
      case 'feedback_submit':
        return { feedbackId: 'created-id', payload };
      case 'lesson_progress':
        return { progressId: 'updated-id', payload };
      case 'quiz_attempt':
        return { attemptId: 'created-id', payload };
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}
