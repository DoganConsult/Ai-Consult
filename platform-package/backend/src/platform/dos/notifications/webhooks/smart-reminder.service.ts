// @ts-nocheck
// ============================================
// Shahin — Smart Reminder Service
// AI-generated bilingual (EN/AR) reminders
// for overdue vendor engagement items.
// Rate-limited to 1 per vendor+item per 24h.
//
// Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { recordAudit } from '../../../../modules/audit/services/audit/core/audit-trail.service';
let createNotification: any = async () => {};
try { ({ createNotification } = require('../../../../modules/notification/services/notification.service')); } catch {}
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import type { OverdueItem, EngagementHistorySummary } from '../../../../types/engagement.types';
import { getFirstRow } from '../../../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '../../constants/system-actors';

// ── Rate Limit Window ──────────────────────────────────────────────────────

const RATE_LIMIT_HOURS = 24;

// ── AI Reminder Generation ─────────────────────────────────────────────────

/**
 * Generate a bilingual (EN/AR) smart reminder using Claude.
 * Content references the specific item name, framework, business impact,
 * and offers to extend the deadline.
 *
 * Requirements: 12.1, 12.2, 12.5
 */
export async function generateReminder(
  _tenantId: string,
  input: {
    vendorName: string;
    vendorId: string;
    overdueItem: OverdueItem;
    engagementHistory: EngagementHistorySummary;
    daysOverdue: number;
  },
): Promise<{ en: string; ar: string }> {
  const { vendorName, overdueItem, engagementHistory, daysOverdue } = input;

  // Build contextual prompt for Claude
  const prompt = [
    `Generate a professional follow-up reminder for vendor "${vendorName}".`,
    `Overdue item: "${overdueItem.title}" (type: ${overdueItem.itemType}).`,
    overdueItem.frameworkRef ? `Applicable framework: ${overdueItem.frameworkRef}.` : '',
    `Days overdue: ${daysOverdue}.`,
    `Vendor engagement history: ${engagementHistory.totalQuestionnaires} questionnaires, ` +
      `${engagementHistory.completedQuestionnaires} completed, ` +
      `avg response ${engagementHistory.averageResponseDays} days.`,
    '',
    'The reminder must:',
    '1. Reference the specific item by name',
    '2. Mention the applicable regulatory framework if available',
    '3. State the business impact of non-response',
    '4. Offer to schedule a call or extend the deadline',
    '',
    'Return JSON with two keys: "en" (English) and "ar" (Arabic).',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    // Call Claude via Anthropic SDK (or internal AI service)
    const { chatCompletion } = await import('../../../../modules/ai/services/gateway/llm.service');
    const result = await chatCompletion([
      { role: 'system', content: 'You are a professional GRC communication assistant. Generate bilingual reminders in JSON format with "en" and "ar" keys. Be firm but respectful.' },
      { role: 'user', content: prompt },
    ]);
    const response = result.content;

    // Parse the JSON response
    const parsed = JSON.parse(response);
    return {
      en: parsed.en || generateFallbackReminder(input, 'en'),
      ar: parsed.ar || generateFallbackReminder(input, 'ar'),
    };
  } catch {
    // Fallback to template-based reminders if AI is unavailable
    return {
      en: generateFallbackReminder(input, 'en'),
      ar: generateFallbackReminder(input, 'ar'),
    };
  }
}

/**
 * Fallback template when Claude is unavailable.
 */
function generateFallbackReminder(
  input: {
    vendorName: string;
    overdueItem: OverdueItem;
    daysOverdue: number;
  },
  lang: 'en' | 'ar',
): string {
  const { vendorName, overdueItem, daysOverdue } = input;

  if (lang === 'ar') {
    return (
      `تذكير: "${overdueItem.title}" متأخر بمقدار ${daysOverdue} يوم/أيام. ` +
      `عزيزي ${vendorName}، يرجى إكمال هذا البند في أقرب وقت ممكن. ` +
      (overdueItem.frameworkRef ? `الإطار التنظيمي: ${overdueItem.frameworkRef}. ` : '') +
      `عدم الاستجابة قد يؤثر على تقييم المخاطر الخاص بكم. ` +
      `يمكننا ترتيب مكالمة أو تمديد الموعد النهائي إذا لزم الأمر.`
    );
  }

  return (
    `Reminder: "${overdueItem.title}" is ${daysOverdue} day(s) overdue. ` +
    `Dear ${vendorName}, please complete this item at your earliest convenience. ` +
    (overdueItem.frameworkRef ? `Applicable framework: ${overdueItem.frameworkRef}. ` : '') +
    `Non-response may impact your vendor risk assessment. ` +
    `We can arrange a call or extend the deadline if needed.`
  );
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

/**
 * Check if a reminder was already sent for this vendor+item in the last 24 hours.
 * Uses the audit trail to detect recent sends.
 *
 * Requirements: 12.3
 */
export async function isRateLimited(
  tenantId: string,
  vendorId: string,
  itemId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - RATE_LIMIT_HOURS);

  const result = await safeQuery(
    `SELECT COUNT(*)::int AS cnt
     FROM "${schema}".audit_trail
     WHERE module = 'smart-reminder'
       AND action = 'create'
       AND entity_type = 'reminder'
       AND entity_id = $1
       AND after_state->>'vendorId' = $2
       AND timestamp >= $3`,
    [itemId, vendorId, cutoff.toISOString()],
  );

  return (getFirstRow(result)?.cnt ?? 0) > 0;
}

// ── Send Reminder ──────────────────────────────────────────────────────────

/**
 * Send a smart reminder: create notification, record audit trail,
 * and publish `notification.sent` event.
 *
 * Requirements: 12.4
 */
export async function sendReminder(
  tenantId: string,
  vendorId: string,
  reminder: { en: string; ar: string },
  itemId: string,
): Promise<void> {
  // Create notification for the vendor contact
  await createNotification(tenantId, {
    userId: vendorId,
    type: 'smart_reminder',
    title: 'Engagement Reminder / تذكير بالمشاركة',
    body: reminder.en,
    link: `/vendor-portal/action-items/${itemId}`,
  });

  // Record in audit trail
  await recordAudit({
    tenantId,
    userId: SYSTEM_JOB_ACTOR,
    module: 'smart-reminder',
    action: 'create',
    entityType: 'reminder',
    entityId: itemId,
    afterState: {
      vendorId,
      reminderEn: reminder.en.substring(0, 200),
      reminderAr: reminder.ar.substring(0, 200),
      sentAt: new Date().toISOString(),
    },
  });

  // Publish notification.sent event
  await eventBus.publish({
    eventType: 'notification.sent' as any,
    tenantId,
    sourceService: 'smart-reminder',
    entityType: 'vendor',
    entityId: vendorId,
    severity: 'info',
    payload: {
      vendorId,
      itemId,
      type: 'smart_reminder',
    },
  });
}
