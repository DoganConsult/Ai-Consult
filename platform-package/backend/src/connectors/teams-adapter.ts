import { logger } from '../platform/dos/observability/logger.service';

export async function sendTeamsNotification(
  webhookUrl: string,
  payload: Record<string, any>,
): Promise<void> {
  if (!webhookUrl) {
    logger.warn('[TeamsAdapter] No webhook URL provided — skipping notification');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error(`[TeamsAdapter] Webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    logger.error(`[TeamsAdapter] Webhook error: ${err}`);
  }
}
