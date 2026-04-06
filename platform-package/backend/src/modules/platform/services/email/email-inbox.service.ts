// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import fetch from 'node-fetch';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { oauth2EmailService } from './email-oauth.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

const GRAPH_API = process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0';
const EMAIL_FROM = process.env.EMAIL_FROM || 'info@doganconsult.com';
const POLL_PAGE_SIZE = 50;

export interface InboxMessage {
  inbox_id: string;
  graph_message_id: string;
  conversation_id: string | null;
  internet_message_id: string | null;
  subject: string | null;
  body_preview: string | null;
  body_html: string | null;
  body_text: string | null;
  from_address: string | null;
  from_name: string | null;
  to_addresses: { address: string; name?: string }[];
  cc_addresses: { address: string; name?: string }[];
  importance: string;
  has_attachments: boolean;
  attachments: any[];
  categories: string[];
  is_read: boolean;
  received_at: string;
  folder: string;
  status: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
  synced_at: string;
}

export interface InboxPollResult {
  newMessages: number;
  skippedDuplicates: number;
  errors: string[];
  totalFetched: number;
}

export interface InboxListOptions {
  status?: string;
  folder?: string;
  from?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'received_at' | 'from_address' | 'subject';
  sortDir?: 'asc' | 'desc';
}

async function getGraphToken(): Promise<string> {
  if (!oauth2EmailService.isConfigured()) {
    oauth2EmailService.initialize();
  }
  return (oauth2EmailService as any).tokenManager.getAccessToken();
}

export async function pollInbox(
  tenantId: string,
  options?: { folder?: string; sinceMinutes?: number; maxMessages?: number }
): Promise<InboxPollResult> {
  const schema = tenantSchema(tenantId);
  const folder = options?.folder || 'inbox';
  const maxMsg = options?.maxMessages || POLL_PAGE_SIZE;
  const sinceMinutes = options?.sinceMinutes || 60;

  const result: InboxPollResult = { newMessages: 0, skippedDuplicates: 0, errors: [], totalFetched: 0 };

  try {
    const token = await getGraphToken();
    const sinceDate = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

    const selectFields = 'id,conversationId,internetMessageId,subject,bodyPreview,body,from,toRecipients,ccRecipients,importance,hasAttachments,categories,isRead,receivedDateTime';
    const filterStr = `receivedDateTime ge ${sinceDate}`;
    const url = `${GRAPH_API}/users/${EMAIL_FROM}/mailFolders/${folder}/messages?$select=${selectFields}&$filter=${encodeURIComponent(filterStr)}&$orderby=receivedDateTime desc&$top=${maxMsg}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errText = await response.text();
      result.errors.push(`Graph API ${response.status}: ${errText.substring(0, 300)}`);
      return result;
    }

    const data: unknown = await response.json();
    const messages = data.value || [];
    result.totalFetched = messages.length;

    for (const msg of messages) {
      try {
        const exists = await safeQuery(
          `SELECT 1 FROM "${schema}".email_inbox WHERE graph_message_id = $1`,
          [msg.id]
        );
        if (exists.rows.length > 0) {
          result.skippedDuplicates++;
          continue;
        }

        const toAddresses = (msg.toRecipients || []).map((r: GenericRow) => ({
          address: r.emailAddress?.address,
          name: r.emailAddress?.name
        }));
        const ccAddresses = (msg.ccRecipients || []).map((r: GenericRow) => ({
          address: r.emailAddress?.address,
          name: r.emailAddress?.name
        }));

        let attachments: any[] = [];
        if (msg.hasAttachments) {
          try {
            const attRes = await fetch(`${GRAPH_API}/users/${EMAIL_FROM}/messages/${msg.id}/attachments?$select=id,name,contentType,size,isInline`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (attRes.ok) {
              const attData: unknown = await attRes.json();
              attachments = (attData.value || []).map((a: GenericRow) => ({
                id: a.id, name: a.name, contentType: a.contentType, size: a.size, isInline: a.isInline
              }));
            }
          } catch {}
        }

        await safeQuery(
          `INSERT INTO "${schema}".email_inbox
            (graph_message_id, conversation_id, internet_message_id, subject, body_preview, body_html, body_text,
             from_address, from_name, to_addresses, cc_addresses, importance, has_attachments, attachments,
             categories, is_read, received_at, folder, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [
            msg.id,
            msg.conversationId || null,
            msg.internetMessageId || null,
            msg.subject || null,
            msg.bodyPreview || null,
            msg.body?.contentType === 'html' ? msg.body?.content : null,
            msg.body?.contentType === 'text' ? msg.body?.content : (msg.body?.contentType === 'html' ? null : msg.body?.content),
            msg.from?.emailAddress?.address || null,
            msg.from?.emailAddress?.name || null,
            JSON.stringify(toAddresses),
            JSON.stringify(ccAddresses),
            msg.importance || 'normal',
            msg.hasAttachments || false,
            JSON.stringify(attachments),
            JSON.stringify(msg.categories || []),
            msg.isRead || false,
            msg.receivedDateTime,
            folder,
            msg.isRead ? 'read' : 'new'
          ]
        );
        result.newMessages++;
      } catch (err: unknown) {
        result.errors.push(`Message ${msg.id}: ${toErrorMessage(err)}`);
      }
    }

    logger.info(`[EmailInbox] Poll complete for ${schema}: ${result.newMessages} new, ${result.skippedDuplicates} skipped, ${result.errors.length} errors`);
  } catch (err: unknown) {
    result.errors.push(`Poll failed: ${toErrorMessage(err)}`);
    logger.error('[EmailInbox] Poll error:', toErrorMessage(err));
  }

  return result;
}

export async function listInboxMessages(
  tenantId: string,
  options?: InboxListOptions
): Promise<{ messages: InboxMessage[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const limit = options?.limit || 25;
  const offset = options?.offset || 0;
  const sortBy = options?.sortBy || 'received_at';
  const sortDir = options?.sortDir || 'desc';

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.status) { conditions.push(`status = $${paramIdx++}`); params.push(options.status); }
  if (options?.folder) { conditions.push(`folder = $${paramIdx++}`); params.push(options.folder); }
  if (options?.from) { conditions.push(`from_address ILIKE $${paramIdx++}`); params.push(`%${options.from}%`); }
  if (options?.search) { conditions.push(`(subject ILIKE $${paramIdx} OR body_preview ILIKE $${paramIdx})`); params.push(`%${options.search}%`); paramIdx++; }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSort = ['received_at', 'from_address', 'subject'];
  const safeSortBy = allowedSort.includes(sortBy) ? sortBy : 'received_at';
  const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';

  const countResult = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".email_inbox ${whereClause}`, params);
  const total = getFirstRow(countResult)?.c || 0;

  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".email_inbox ${whereClause} ORDER BY ${safeSortBy} ${safeSortDir} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { messages: dataResult.rows, total };
}

export async function getInboxMessage(tenantId: string, inboxId: string): Promise<InboxMessage | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT * FROM "${schema}".email_inbox WHERE inbox_id = $1`, [inboxId]);
  if (result.rows.length === 0) return null;

  const row = getFirstRow(result);
  if (row?.status === 'new') {
    await safeQuery(`UPDATE "${schema}".email_inbox SET status = 'read' WHERE inbox_id = $1`, [inboxId]);
    row.status = 'read';
  }

  return row;
}

export async function getMessageBody(tenantId: string, inboxId: string): Promise<{ html: string | null; text: string | null } | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT graph_message_id, body_html, body_text FROM "${schema}".email_inbox WHERE inbox_id = $1`,
    [inboxId]
  );
  if (result.rows.length === 0) return null;

  const row = getFirstRow(result);
  if (row.body_html || row.body_text) {
    return { html: row.body_html, text: row.body_text };
  }

  try {
    const token = await getGraphToken();
    const response = await fetch(`${GRAPH_API}/users/${EMAIL_FROM}/messages/${row.graph_message_id}?$select=body`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data: unknown = await response.json();
      const html = data.body?.contentType === 'html' ? data.body.content : null;
      const text = data.body?.contentType === 'text' ? data.body.content : data.body?.content;
      await safeQuery(
        `UPDATE "${schema}".email_inbox SET body_html = $1, body_text = $2 WHERE inbox_id = $3`,
        [html, text, inboxId]
      );
      return { html, text };
    }
  } catch {}

  return { html: null, text: null };
}

export async function updateMessageStatus(
  tenantId: string,
  inboxId: string,
  status: string,
  userId?: string,
  linkedEntityType?: string,
  linkedEntityId?: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".email_inbox
     SET status = $1, processed_by = $2, processed_at = NOW(),
         linked_entity_type = COALESCE($3, linked_entity_type),
         linked_entity_id = COALESCE($4::uuid, linked_entity_id)
     WHERE inbox_id = $5
     RETURNING inbox_id`,
    [status, userId || null, linkedEntityType || null, linkedEntityId || null, inboxId]
  );
  return result.rows.length > 0;
}

export async function markAsReadOnGraph(tenantId: string, inboxId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT graph_message_id FROM "${schema}".email_inbox WHERE inbox_id = $1`,
    [inboxId]
  );
  if (result.rows.length === 0) return false;

  try {
    const token = await getGraphToken();
    const response = await fetch(`${GRAPH_API}/users/${EMAIL_FROM}/messages/${getFirstRow(result)?.graph_message_id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true })
    });

    if (response.ok) {
      await safeQuery(`UPDATE "${schema}".email_inbox SET is_read = true WHERE inbox_id = $1`, [inboxId]);
      return true;
    }
  } catch {}

  return false;
}

export async function replyToMessage(
  tenantId: string,
  inboxId: string,
  replyHtml: string
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT graph_message_id FROM "${schema}".email_inbox WHERE inbox_id = $1`,
    [inboxId]
  );
  if (result.rows.length === 0) return { success: false, error: 'Message not found' };

  try {
    const token = await getGraphToken();
    const response = await fetch(`${GRAPH_API}/users/${EMAIL_FROM}/messages/${getFirstRow(result)?.graph_message_id}/reply`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: replyHtml })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Graph API ${response.status}: ${errText.substring(0, 200)}` };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: toErrorMessage(err) };
  }
}

export async function getAttachmentContent(
  tenantId: string,
  inboxId: string,
  attachmentId: string
): Promise<{ name: string; contentType: string; contentBytes: string } | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT graph_message_id FROM "${schema}".email_inbox WHERE inbox_id = $1`,
    [inboxId]
  );
  if (result.rows.length === 0) return null;

  try {
    const token = await getGraphToken();
    const response = await fetch(
      `${GRAPH_API}/users/${EMAIL_FROM}/messages/${getFirstRow(result)?.graph_message_id}/attachments/${attachmentId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return { name: data.name, contentType: data.contentType, contentBytes: data.contentBytes };
  } catch {
    return null;
  }
}

export async function getInboxStats(tenantId: string): Promise<{
  total: number; unread: number; new_count: number; processed: number; archived: number;
  byFolder: { folder: string; count: number }[];
}> {
  const schema = tenantSchema(tenantId);

  const statsResult = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_read = false)::int AS unread,
      COUNT(*) FILTER (WHERE status = 'new')::int AS new_count,
      COUNT(*) FILTER (WHERE status = 'processed')::int AS processed,
      COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
    FROM "${schema}".email_inbox
  `);

  const folderResult = await safeQuery(`
    SELECT folder, COUNT(*)::int AS count
    FROM "${schema}".email_inbox
    GROUP BY folder ORDER BY count DESC
  `);

  const row = getFirstRow(statsResult) || {};
  return {
    total: row.total || 0,
    unread: row.unread || 0,
    new_count: row.new_count || 0,
    processed: row.processed || 0,
    archived: row.archived || 0,
    byFolder: folderResult.rows
  };
}

export async function pollAllTenants(sinceMinutes: number = 60): Promise<Record<string, InboxPollResult>> {
  const results: Record<string, InboxPollResult> = {};
  try {
    const tenantResult = await safeQuery(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
    );
    for (const row of tenantResult.rows) {
      const tenantId = row.schema_name.replace('tenant_', '');
      try {
        results[tenantId] = await pollInbox(tenantId, { sinceMinutes });
      } catch (err: unknown) {
        results[tenantId] = { newMessages: 0, skippedDuplicates: 0, errors: [toErrorMessage(err)], totalFetched: 0 };
      }
    }
  } catch (err: unknown) {
    logger.error('[EmailInbox] pollAllTenants error:', toErrorMessage(err));
  }
  return results;
}

export async function deleteMessage(tenantId: string, inboxId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`DELETE FROM "${schema}".email_inbox WHERE inbox_id = $1 RETURNING inbox_id`, [inboxId]);
  return result.rows.length > 0;
}
