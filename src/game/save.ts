import { DAILY_LINEUP, previousDateKey, type Difficulty } from '../engine/index.ts';

export type Lang = 'en' | 'zh-TW';
export type ThemeChoice = 'system' | 'light' | 'dark';

export interface DifficultyStats {
  played: number;
  correct: number;
  /** Total time spent on correctly answered puzzles. */
  correctMs: number;
  bestMs: number | null;
}

export interface AnswerResult {
  correct: boolean;
  ms: number;
}

export interface DailyRecord {
  results: AnswerResult[];
}

export interface Save {
  version: 1;
  settings: { lang: Lang | null; theme: ThemeChoice; seenHowTo: boolean; grid: boolean };
  stats: {
    streak: number;
    bestStreak: number;
    score: number;
    byDifficulty: Record<Difficulty, DifficultyStats>;
  };
  daily: {
    history: Record<string, DailyRecord>;
    streak: number;
    bestStreak: number;
    lastCompleted: string | null;
  };
}

const emptyDifficulty = (): DifficultyStats => ({ played: 0, correct: 0, correctMs: 0, bestMs: null });

export function defaultSave(): Save {
  return {
    version: 1,
    settings: { lang: null, theme: 'system', seenHowTo: false, grid: false },
    stats: {
      streak: 0,
      bestStreak: 0,
      score: 0,
      byDifficulty: { easy: emptyDifficulty(), medium: emptyDifficulty(), hard: emptyDifficulty() },
    },
    daily: { history: {}, streak: 0, bestStreak: 0, lastCompleted: null },
  };
}

const BASE_POINTS: Record<Difficulty, number> = { easy: 100, medium: 200, hard: 300 };
const PAR_MS: Record<Difficulty, number> = { easy: 20_000, medium: 30_000, hard: 45_000 };

/**
 * Points for an answer. A correct answer earns the base value, up to +50%
 * for speed, and +10% per answer already in the streak (capped at +50%).
 */
export function pointsFor(difficulty: Difficulty, correct: boolean, ms: number, streakBefore: number): number {
  if (!correct) return 0;
  const base = BASE_POINTS[difficulty];
  const speed = 0.5 * Math.max(0, 1 - ms / PAR_MS[difficulty]);
  const streak = 0.1 * Math.min(5, Math.max(0, streakBefore));
  return Math.round((base * (1 + speed + streak)) / 5) * 5;
}

export function recordAnswer(save: Save, difficulty: Difficulty, result: AnswerResult): { save: Save; points: number } {
  const points = pointsFor(difficulty, result.correct, result.ms, save.stats.streak);
  const prev = save.stats.byDifficulty[difficulty];
  const streak = result.correct ? save.stats.streak + 1 : 0;
  const next: DifficultyStats = {
    played: prev.played + 1,
    correct: prev.correct + (result.correct ? 1 : 0),
    correctMs: prev.correctMs + (result.correct ? result.ms : 0),
    bestMs: result.correct ? Math.min(prev.bestMs ?? Infinity, result.ms) : prev.bestMs,
  };
  return {
    points,
    save: {
      ...save,
      stats: {
        streak,
        bestStreak: Math.max(save.stats.bestStreak, streak),
        score: save.stats.score + points,
        byDifficulty: { ...save.stats.byDifficulty, [difficulty]: next },
      },
    },
  };
}

/** Appends one answer to a day's challenge and updates the day streak when it completes. */
export function recordDailyAnswer(save: Save, key: string, result: AnswerResult): Save {
  const existing = save.daily.history[key]?.results ?? [];
  if (existing.length >= DAILY_LINEUP.length) return save;
  const results = [...existing, result];
  const daily = { ...save.daily, history: { ...save.daily.history, [key]: { results } } };
  if (results.length === DAILY_LINEUP.length) {
    daily.streak = save.daily.lastCompleted === previousDateKey(key) ? save.daily.streak + 1 : 1;
    daily.bestStreak = Math.max(save.daily.bestStreak, daily.streak);
    daily.lastCompleted = key;
  }
  return { ...save, daily };
}

/** The day streak as of `today`: it lapses once a full day is missed. */
export function currentDailyStreak(save: Save, today: string): number {
  const last = save.daily.lastCompleted;
  return last === today || last === previousDateKey(today) ? save.daily.streak : 0;
}

export function accuracy(stats: DifficultyStats): number | null {
  return stats.played === 0 ? null : stats.correct / stats.played;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDefaults<T>(defaults: T, stored: unknown): T {
  if (!isRecord(defaults)) {
    if (defaults === null) return stored === undefined ? defaults : (stored as T);
    return typeof stored === typeof defaults ? (stored as T) : defaults;
  }
  if (!isRecord(stored)) return defaults;
  const out: Record<string, unknown> = { ...stored };
  for (const [key, value] of Object.entries(defaults)) out[key] = mergeDefaults(value, stored[key]);
  return out as T;
}

/** Parses a stored save, falling back to defaults for anything missing or malformed. */
export function parseSave(raw: string | null): Save {
  if (!raw) return defaultSave();
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 1) return defaultSave();
    return mergeDefaults(defaultSave(), data);
  } catch {
    return defaultSave();
  }
}
