import { safeQuery, tenantSchema } from '../../../../config/database';

export interface AnswerSnapshot {
  sessionId: string;
  stageCode: string;
  answers: Record<string, any>;
  capturedAt: string;
}

export async function storeAnswerSnapshot(
  tenantId: string,
  sessionId: string,
  stageCode: string,
  answers: Record<string, any>,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".workspace_answer_snapshots (session_id, stage_code, answers, captured_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (session_id, stage_code) DO UPDATE SET answers = $3, captured_at = NOW()`,
    [sessionId, stageCode, JSON.stringify(answers)],
  ).catch(() => {
    safeQuery(
      `UPDATE public.onboarding_sessions SET answers = answers || $2, updated_at = NOW() WHERE id = $1::uuid`,
      [sessionId, JSON.stringify(answers)],
    ).catch(() => {});
  });
}

export async function getLatestAnswers(
  tenantId: string,
  sessionId?: string,
): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT answers FROM "${schema}".workspace_answer_snapshots WHERE session_id = $1 ORDER BY captured_at DESC`,
    [sessionId],
  ).catch(() => ({ rows: [] }));

  if (result.rows.length > 0) {
    const merged: Record<string, any> = {};
    for (const row of result.rows.reverse()) {
      Object.assign(merged, typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers);
    }
    return merged;
  }

  const sessionResult = await safeQuery(
    `SELECT answers FROM public.onboarding_sessions WHERE id = $1::uuid`,
    [sessionId],
  ).catch(() => ({ rows: [] }));
  return sessionResult.rows[0]?.answers || {};
}
