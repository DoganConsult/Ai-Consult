import * as chrono from 'chrono-node';

export function parseNaturalDate(text: string, refDate?: Date): Date | null {
  const results = chrono.parse(text, refDate || new Date());
  if (results.length === 0) return null;
  return results[0].start.date();
}

export function parseNaturalDateRange(text: string, refDate?: Date): { start: Date; end: Date } | null {
  const results = chrono.parse(text, refDate || new Date());
  if (results.length === 0) return null;

  const first = results[0];
  if (first.end) {
    return { start: first.start.date(), end: first.end.date() };
  }
  return { start: first.start.date(), end: first.start.date() };
}

export function describeCron(expression: string): string {
  try {
    const cronstrue = require('cronstrue');
    return cronstrue.toString(expression);
  } catch {
    return expression;
  }
}

export function parseAllDates(text: string, refDate?: Date): Array<{ text: string; date: Date; index: number }> {
  const results = chrono.parse(text, refDate || new Date());
  return results.map(r => ({
    text: r.text,
    date: r.start.date(),
    index: r.index,
  }));
}

export function extractDeadlineFromChat(message: string): { deadline: Date; humanReadable: string } | null {
  const date = parseNaturalDate(message);
  if (!date) return null;

  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let humanReadable: string;
  if (diffDays === 0) humanReadable = 'Today';
  else if (diffDays === 1) humanReadable = 'Tomorrow';
  else if (diffDays < 7) humanReadable = `In ${diffDays} days`;
  else if (diffDays < 30) humanReadable = `In ${Math.ceil(diffDays / 7)} weeks`;
  else humanReadable = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return { deadline: date, humanReadable };
}

export function describeCronArabic(expression: string): string {
  try {
    const cronstrue = require('cronstrue');
    return cronstrue.toString(expression, { locale: 'ar' });
  } catch {
    return describeCron(expression);
  }
}
