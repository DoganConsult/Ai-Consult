// @ts-nocheck
// ============================================
// Shahin — Quote Service
// Motivational quotes with daily rotation
// ============================================

import { safeQuery } from "../../../../config/database";
import type { GenericRow } from '../../../../types/db-rows.types';

// === Types ===

export interface Quote {
  quoteId: string;
  category: 'islamic_wisdom' | 'saudi_leadership' | 'vision_2030';
  textAr: string;
  textEn: string;
}

// === Pure Functions ===

export function serializeQuote(quote: Quote): string {
  return JSON.stringify(quote);
}

export function deserializeQuote(json: string): Quote {
  const parsed = JSON.parse(json);
  if (!parsed.textAr || !parsed.textEn) {
    throw new Error('Invalid quote: missing required fields');
  }
  return {
    quoteId: parsed.quoteId || '',
    category: parsed.category || 'islamic_wisdom',
    textAr: parsed.textAr,
    textEn: parsed.textEn,
  };
}

export function getDailyQuoteIndex(date: Date, totalQuotes: number): number {
  if (totalQuotes <= 0) return 0;
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dayOfYear % totalQuotes;
}

export function getQuoteOfTheDay(quotes: Quote[], date: Date): Quote | null {
  if (quotes.length === 0) return null;
  const idx = getDailyQuoteIndex(date, quotes.length);
  return quotes[idx];
}

// === Seed Data ===

const SEED_QUOTES: Omit<Quote, 'quoteId'>[] = [
  { category: 'islamic_wisdom', textAr: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى', textEn: 'Actions are judged by intentions, and everyone shall have what they intended.' },
  { category: 'islamic_wisdom', textAr: 'من سلك طريقاً يلتمس فيه علماً سهل الله له به طريقاً إلى الجنة', textEn: 'Whoever takes a path seeking knowledge, Allah will make easy for them a path to Paradise.' },
  { category: 'islamic_wisdom', textAr: 'خيركم من تعلم القرآن وعلمه', textEn: 'The best among you are those who learn and teach.' },
  { category: 'saudi_leadership', textAr: 'نحن لا نقبل إلا أن نكون في المقدمة', textEn: 'We accept nothing less than being at the forefront.' },
  { category: 'saudi_leadership', textAr: 'طموحنا أبعد من النجوم', textEn: 'Our ambition reaches beyond the stars.' },
  { category: 'saudi_leadership', textAr: 'المملكة العربية السعودية قادرة على تحقيق المستحيل', textEn: 'Saudi Arabia is capable of achieving the impossible.' },
  { category: 'vision_2030', textAr: 'رؤية 2030: مجتمع حيوي، اقتصاد مزدهر، وطن طموح', textEn: 'Vision 2030: A vibrant society, a thriving economy, an ambitious nation.' },
  { category: 'vision_2030', textAr: 'نحن نبني مستقبلاً أفضل لأجيالنا القادمة', textEn: 'We are building a better future for our coming generations.' },
  { category: 'vision_2030', textAr: 'التحول الرقمي ركيزة أساسية لتحقيق رؤية 2030', textEn: 'Digital transformation is a fundamental pillar for achieving Vision 2030.' },
  { category: 'islamic_wisdom', textAr: 'إن الله يحب إذا عمل أحدكم عملاً أن يتقنه', textEn: 'Allah loves that when one of you does work, they do it with excellence.' },
];

// === API Functions ===

export async function seedQuotes(): Promise<number> {
  let seeded = 0;
  for (const q of SEED_QUOTES) {
    const existing = await safeQuery(`SELECT quote_id FROM quotes WHERE text_ar = $1`, [q.textAr]);
    if (existing.rows.length === 0) {
      await safeQuery(
        `INSERT INTO quotes (category, text_ar, text_en, sort_order) VALUES ($1, $2, $3, $4)`,
        [q.category, q.textAr, q.textEn, seeded]
      );
      seeded++;
    }
  }
  return seeded;
}

export async function getDailyQuote(): Promise<Quote | null> {
  const result = await safeQuery(`SELECT quote_id, category, text_ar, text_en FROM quotes ORDER BY sort_order, quote_id`);
  if (result.rows.length === 0) return null;
  const quotes: Quote[] = result.rows.map((r: GenericRow) => ({
    quoteId: r.quote_id, category: r.category, textAr: r.text_ar, textEn: r.text_en,
  }));
  return getQuoteOfTheDay(quotes, new Date());
}
