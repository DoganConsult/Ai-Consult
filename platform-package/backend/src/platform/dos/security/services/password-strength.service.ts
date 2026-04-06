import zxcvbn from 'zxcvbn';

export interface PasswordStrengthResult {
  score: number;
  level: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  crackTimeDisplay: string;
  feedback: string[];
  acceptable: boolean;
}

const LEVEL_MAP: Record<number, PasswordStrengthResult['level']> = {
  0: 'very_weak',
  1: 'weak',
  2: 'fair',
  3: 'strong',
  4: 'very_strong',
};

export function checkPasswordStrength(
  password: string,
  userInputs: string[] = [],
  minScore = 3,
): PasswordStrengthResult {
  const result = zxcvbn(password, userInputs);

  const feedback: string[] = [];
  if (result.feedback.warning) feedback.push(result.feedback.warning);
  feedback.push(...(result.feedback.suggestions || []));

  return {
    score: result.score,
    level: LEVEL_MAP[result.score] || 'very_weak',
    crackTimeDisplay: String(result.crack_times_display.offline_slow_hashing_1e4_per_second),
    feedback,
    acceptable: result.score >= minScore,
  };
}
