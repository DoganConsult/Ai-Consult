import { safeQuery } from '../../../config/database/database';

interface ScoreInput {
  scoreType: string;
  scoreDomain: string;
  scoreValue: number;
  maxScore?: number;
  ratingLabel?: string;
}

export class OnboardingScoreRepo {
  async replaceScores(sessionId: string, scores: ScoreInput[]): Promise<void> {
    await safeQuery(
      `DELETE FROM public.onboarding_scores WHERE session_id = $1`,
      [sessionId],
    );
    for (const score of scores) {
      await safeQuery(
        `INSERT INTO public.onboarding_scores
           (session_id, score_type, score_domain, score_value, max_score, rating_label)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          sessionId,
          score.scoreType,
          score.scoreDomain,
          score.scoreValue,
          score.maxScore ?? 100,
          score.ratingLabel ?? null,
        ],
      );
    }
  }
}
