import { safeQuery } from '../../../config/database/database';

export class OnboardingSessionRepo {
  async create(input: {
    sessionKey: string;
    startedByUserId: string;
    organizationName?: string;
    displayName?: string;
    languageCode?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const result = await safeQuery(
      `INSERT INTO public.onboarding_sessions
         (session_key, started_by_user_id, organization_name, display_name, language_code, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        input.sessionKey,
        input.startedByUserId,
        input.organizationName ?? null,
        input.displayName ?? null,
        input.languageCode ?? 'en',
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return { id: result.rows[0].id as string };
  }

  async updateProgress(
    sessionId: string,
    progressPercent: number,
    readinessScore: number,
    blockersCount: number,
  ): Promise<void> {
    await safeQuery(
      `UPDATE public.onboarding_sessions
       SET progress_percent = $2, readiness_score = $3, blockers_count = $4,
           last_saved_at = now(), updated_at = now()
       WHERE id = $1`,
      [sessionId, progressPercent, readinessScore, blockersCount],
    );
  }

  async markApproved(sessionId: string): Promise<void> {
    await safeQuery(
      `UPDATE public.onboarding_sessions
       SET status = 'approved', approved_at = now(), updated_at = now()
       WHERE id = $1`,
      [sessionId],
    );
  }
}
