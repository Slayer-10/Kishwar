import { prisma } from '@/lib/prisma';
import type { NotificationPayload, NotificationResult } from './types';
import { emailProvider } from './providers/email';
import { whatsappProvider } from './providers/whatsapp';

export async function dispatchNotification(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  if (payload.idempotencyKey) {
    try {
      const existing = await prisma.notificationLog.findFirst({
        where: {
          OR: [
            { idempotencyKey: payload.idempotencyKey },
            { idempotencyKey: { startsWith: `${payload.idempotencyKey}_` } },
          ],
        },
      });

      if (existing) {
        return [
          {
            channel: existing.channel as any,
            success: existing.status === 'SENT',
            skipped: true,
            error: 'Duplicate event notification skipped (idempotent lock).',
          },
        ];
      }
    } catch {
      // In case DB log check fails, proceed safely
    }
  }

  const tasks: Promise<NotificationResult>[] = [];

  if (payload.recipientEmail) {
    tasks.push(
      emailProvider.send(payload).catch((err) => ({
        channel: 'email' as const,
        success: false,
        error: err?.message || 'Email delivery failed.',
      }))
    );
  }

  if (payload.recipientPhone) {
    tasks.push(
      whatsappProvider.send(payload).catch((err) => ({
        channel: 'whatsapp' as const,
        success: false,
        error: err?.message || 'WhatsApp delivery failed.',
      }))
    );
  }

  if (tasks.length === 0) {
    const noContactResult: NotificationResult = {
      channel: 'email',
      success: false,
      skipped: true,
      error: 'No usable recipient contact details (email or phone).',
    };
    results.push(noContactResult);
    return results;
  }

  const resolvedResults = await Promise.all(tasks);
  results.push(...resolvedResults);

  // Log delivery outcomes if idempotency key is present
  if (payload.idempotencyKey) {
    for (const res of resolvedResults) {
      try {
        await prisma.notificationLog.create({
          data: {
            idempotencyKey: `${payload.idempotencyKey}_${res.channel}`,
            event: payload.event,
            channel: res.channel,
            recipient:
              res.channel === 'email'
                ? payload.recipientEmail || 'unknown'
                : payload.recipientPhone || 'unknown',
            status: res.success ? 'SENT' : res.skipped ? 'SKIPPED' : 'FAILED',
            error: res.error || null,
          },
        });
      } catch {
        // Idempotency logging failure should not throw or interrupt workflow
      }
    }
  }

  return results;
}
