import { logger } from '../platform/dos/observability/logger.service';

export async function sendSlackNotification(
  webhookUrl: string,
  payload: Record<string, any>,
): Promise<void> {
  if (!webhookUrl) {
    logger.warn('[SlackAdapter] No webhook URL provided — skipping notification');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error(`[SlackAdapter] Webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    logger.error(`[SlackAdapter] Webhook error: ${err}`);
  }
}
