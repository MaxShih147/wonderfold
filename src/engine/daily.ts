import { generatePuzzle } from './generator.ts';
import { hashString, mixSeed } from './rng.ts';
import type { Difficulty, Puzzle } from './types.ts';

/** The daily set ramps up: two easy, two medium, one hard. */
export const DAILY_LINEUP: readonly Difficulty[] = ['easy', 'easy', 'medium', 'medium', 'hard'];

/** Local calendar day of the first daily challenge. */
const EPOCH = { year: 2026, month: 10, day: 12 };

/** Local calendar date as `YYYY-MM-DD`. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Sequential number of a day's challenge; the launch day is #1. */
export function dailyNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const days = (Date.UTC(y, m - 1, d) - Date.UTC(EPOCH.year, EPOCH.month - 1, EPOCH.day)) / 86_400_000;
  return Math.round(days) + 1;
}

/** Everyone gets the same five puzzles on the same calendar day. */
export function dailyPuzzles(key: string): Puzzle[] {
  const base = hashString(`wonderfold:${key}`);
  return DAILY_LINEUP.map((difficulty, i) => generatePuzzle(mixSeed(base, i), difficulty));
}

export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return dateKey(new Date(y, m - 1, d - 1));
}
