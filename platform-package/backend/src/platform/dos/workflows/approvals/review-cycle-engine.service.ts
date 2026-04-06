import { safeQuery } from '../../../../config/database';

function tenantSchema(tenantId: string): string {
  return `tenant_${tenantId.replace(/[^a-z0-9_]/gi, '')}`;
}

interface ReviewDueItem {
  entity_type: string;
  entity_id: string;
  title: string;
  review_date: string;
  owner: string;
  days_overdue: number;
}

export async function checkReviewCycles(tenantId: string): Promise<ReviewDueItem[]> {
  const schema = tenantSchema(tenantId);
  const dueItems: ReviewDueItem[] = [];

  const checks = [
    {
      type: 'policy',
      query: `SELECT policy_id AS entity_id, title, review_date, owner,
        EXTRACT(DAY FROM NOW() - review_date)::int AS days_overdue
        FROM "${schema}".policies
        WHERE deleted_at IS NULL AND status = 'active'
          AND review_date IS NOT NULL AND review_date <= NOW()`,
    },
    {
      type: 'charter',
      query: `SELECT charter_id AS entity_id, title_en AS title, review_date, sponsor AS owner,
        EXTRACT(DAY FROM NOW() - review_date)::int AS days_overdue
        FROM "${schema}".governance_charters
        WHERE deleted_at IS NULL AND status = 'active'
          AND review_date IS NOT NULL AND review_date <= NOW()`,
    },
    {
      type: 'control',
      query: `SELECT control_id AS entity_id, control_title AS title, next_review_date AS review_date, owner,
        EXTRACT(DAY FROM NOW() - next_review_date)::int AS days_overdue
        FROM "${schema}".controls
        WHERE deleted_at IS NULL
          AND next_review_date IS NOT NULL AND next_review_date <= NOW()`,
    },
    {
      type: 'risk',
      query: `SELECT risk_id AS entity_id, risk_title AS title, next_review_date AS review_date, risk_owner AS owner,
        EXTRACT(DAY FROM NOW() - next_review_date)::int AS days_overdue
        FROM "${schema}".risks
        WHERE deleted_at IS NULL
          AND next_review_date IS NOT NULL AND next_review_date <= NOW()`,
    },
    {
      type: 'delegation',
      query: `SELECT delegation_id AS entity_id, authority_type AS title, expiry_date AS review_date, delegator_user_id AS owner,
        EXTRACT(DAY FROM NOW() - expiry_date)::int AS days_overdue
        FROM "${schema}".governance_delegations
        WHERE deleted_at IS NULL AND status = 'active'
          AND expiry_date IS NOT NULL AND expiry_date <= NOW()`,
    },
    {
      type: 'exception',
      query: `SELECT exception_id AS entity_id, title, expiry_date AS review_date, requester AS owner,
        EXTRACT(DAY FROM NOW() - expiry_date)::int AS days_overdue
        FROM "${schema}".exceptions
        WHERE deleted_at IS NULL AND status IN ('approved','active')
          AND expiry_date IS NOT NULL AND expiry_date <= NOW()`,
    },
    {
      type: 'evidence',
      query: `SELECT evidence_id AS entity_id, title, review_date, owner,
        EXTRACT(DAY FROM NOW() - review_date)::int AS days_overdue
        FROM "${schema}".evidence
        WHERE deleted_at IS NULL
          AND review_date IS NOT NULL AND review_date <= NOW()`,
    },
    {
      type: 'obligation',
      query: `SELECT cr.review_id::text AS entity_id, o.title_en AS title, cr.next_review_date AS review_date, cr.reviewer_id AS owner,
        EXTRACT(DAY FROM NOW() - cr.next_review_date)::int AS days_overdue
        FROM "${schema}".compliance_reviews cr
        JOIN "${schema}".obligations o ON o.obligation_id = cr.obligation_id
        WHERE cr.deleted_at IS NULL AND o.deleted_at IS NULL
          AND cr.next_review_date IS NOT NULL AND cr.next_review_date <= NOW()
          AND cr.status IN ('pending','scheduled')`,
    },
  ];

  for (const check of checks) {
    try {
      const result = await safeQuery(check.query);
      for (const row of result.rows) {
        dueItems.push({
          entity_type: check.type,
          entity_id: row.entity_id,
          title: row.title || 'Untitled',
          review_date: row.review_date,
          owner: row.owner || 'unassigned',
          days_overdue: row.days_overdue || 0,
        });
      }
    } catch {
    }
  }

  if (dueItems.length > 0) {
    await createReviewNotifications(tenantId, dueItems);
    await escalateOverdueReviews(tenantId, dueItems);
  }

  return dueItems;
}

async function createReviewNotifications(tenantId: string, items: ReviewDueItem[]): Promise<void> {
  const schema = tenantSchema(tenantId);
  for (const item of items) {
    if (!item.owner || item.owner === 'unassigned') continue;
    try {
      await safeQuery(`
        INSERT INTO "${schema}".notifications (user_id, type, title, body, link, read, created_at)
        SELECT $1, 'review_due', $2, $3, $4, FALSE, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM "${schema}".notifications
          WHERE user_id = $1 AND type = 'review_due' AND link = $4
            AND created_at > NOW() - INTERVAL '7 days'
        )
      `, [
        item.owner,
        `Review overdue: ${item.title}`,
        `${item.entity_type} "${item.title}" is ${item.days_overdue} days overdue for review.`,
        `/${item.entity_type === 'policy' ? 'governance/policies' : item.entity_type === 'charter' ? 'governance/charters' : item.entity_type === 'control' ? 'compliance/controls' : item.entity_type === 'risk' ? 'risk' : item.entity_type === 'exception' ? 'governance/exceptions' : item.entity_type === 'evidence' ? 'foundation/evidence' : item.entity_type === 'obligation' ? 'compliance/obligations' : 'governance/delegations'}`,
      ]);
    } catch {
    }
  }
}

async function escalateOverdueReviews(tenantId: string, items: ReviewDueItem[]): Promise<void> {
  const schema = tenantSchema(tenantId);
  const criticalItems = items.filter(i => i.days_overdue > 30);

  for (const item of criticalItems) {
    try {
      await safeQuery(`
        INSERT INTO "${schema}".governance_action_items
          (title_en, title_ar, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
        SELECT $1, $2, $3, 'high', 'open', $4, $5::uuid, $6, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM "${schema}".governance_action_items
          WHERE source_type = $4 AND source_id = $5::uuid AND status = 'open'
        )
      `, [
        `Review overdue (${item.days_overdue}d): ${item.title}`,
        `مراجعة متأخرة (${item.days_overdue} يوم): ${item.title}`,
        `Auto-escalated: ${item.entity_type} "${item.title}" is ${item.days_overdue} days overdue for review.`,
        item.entity_type,
        item.entity_id,
        item.days_overdue > 60,
      ]);
    } catch {
    }
  }
}

export async function getReviewCalendar(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const upcoming: any[] = [];

  const queries = [
    { type: 'policy', q: `SELECT policy_id AS id, title, review_date, owner FROM "${schema}".policies WHERE deleted_at IS NULL AND review_date IS NOT NULL AND review_date > NOW() ORDER BY review_date LIMIT 20` },
    { type: 'charter', q: `SELECT charter_id AS id, title_en AS title, review_date, sponsor AS owner FROM "${schema}".governance_charters WHERE deleted_at IS NULL AND review_date IS NOT NULL AND review_date > NOW() ORDER BY review_date LIMIT 20` },
    { type: 'control', q: `SELECT control_id AS id, control_title AS title, next_review_date AS review_date, owner FROM "${schema}".controls WHERE deleted_at IS NULL AND next_review_date IS NOT NULL AND next_review_date > NOW() ORDER BY next_review_date LIMIT 20` },
    { type: 'obligation', q: `SELECT cr.review_id AS id, o.title_en AS title, cr.next_review_date AS review_date, cr.reviewer_id AS owner FROM "${schema}".compliance_reviews cr JOIN "${schema}".obligations o ON o.obligation_id = cr.obligation_id WHERE cr.deleted_at IS NULL AND o.deleted_at IS NULL AND cr.next_review_date IS NOT NULL AND cr.next_review_date > NOW() ORDER BY cr.next_review_date LIMIT 20` },
  ];

  for (const { type, q } of queries) {
    try {
      const r = await safeQuery(q);
      for (const row of r.rows) {
        upcoming.push({ ...row, entity_type: type });
      }
    } catch {
    }
  }

  return upcoming.sort((a, b) => new Date(a.review_date).getTime() - new Date(b.review_date).getTime());
}
