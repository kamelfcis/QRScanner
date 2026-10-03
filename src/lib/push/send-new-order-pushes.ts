import webpush from 'web-push';
import { hasDailyOps } from '@/i18n/config';
import { createAdminClient } from '@/lib/supabase/admin';

interface SendNewOrderPushesInput {
  orderId: string;
  orderNumber: string;
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

/**
 * OS notifications for a newly placed order. Never throws — must not fail placement.
 */
export async function sendNewOrderPushes(input: SendNewOrderPushesInput): Promise<void> {
  try {
    if (!hasDailyOps) return;

    const vapid = getVapidConfig();
    const admin = createAdminClient();
    if (!vapid || !admin) return;

    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth');
    if (error || !subscriptions?.length) return;

    const payload = JSON.stringify({
      title: 'طلب جديد / New order',
      body: input.orderNumber,
      tag: 'new-order',
      url: '/dashboard/orders',
      orderId: input.orderId,
      orderNumber: input.orderNumber,
    });

    const staleEndpoints: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 410 || status === 404) {
            staleEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    if (staleEndpoints.length > 0) {
      await admin.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
    }
  } catch {
    // Swallow — push must never fail order placement.
  }
}
