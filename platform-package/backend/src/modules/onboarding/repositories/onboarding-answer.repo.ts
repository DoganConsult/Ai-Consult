import { safeQuery } from '../../../config/database/database';

interface AnswerInput {
  questionCode: string;
  answerText?: string;
  answerBool?: boolean;
  answerJson?: unknown;
  answerNumber?: number;
}

interface Actor {
  tenantId?: string;
  userId?: string;
  email?: string;
  role?: string;
}

export class OnboardingAnswerRepo {
  async upsertAnswers(
    sessionId: string,
    actor: Actor,
    answers: AnswerInput[],
  ): Promise<void> {
    for (const answer of answers) {
      await safeQuery(
        `INSERT INTO public.onboarding_answers
           (session_id, question_code, answer_text, answer_bool, answer_json, answer_number)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id, question_code)
         DO UPDATE SET
           answer_text   = EXCLUDED.answer_text,
           answer_bool   = EXCLUDED.answer_bool,
           answer_json   = EXCLUDED.answer_json,
           answer_number = EXCLUDED.answer_number,
           updated_at    = now()`,
        [
          sessionId,
          answer.questionCode,
          answer.answerText ?? null,
          answer.answerBool ?? null,
          answer.answerJson != null ? JSON.stringify(answer.answerJson) : null,
          answer.answerNumber ?? null,
        ],
      );
    }
  }
}
