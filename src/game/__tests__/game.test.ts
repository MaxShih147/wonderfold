import { describe, expect, it } from 'vitest';
import { patternKey, simulate } from '../../engine/index.ts';
import { bruteForceHoles } from '../../engine/__tests__/oracle.ts';
import { LEVELS, TIER_COUNT, levelLabel, parseLevelLabel } from '../levels.ts';
import { parseRoute, routeHash } from '../router.ts';
import {
  clearedLevels,
  currentDailyStreak,
  defaultSave,
  isLevelCleared,
  isLevelUnlocked,
  nextLevel,
  parseSave,
  pointsFor,
  recordAnswer,
  recordDailyAnswer,
  recordLevelAnswer,
  type Save,
} from '../save.ts';
import { dailyShareText, formatTime } from '../share.ts';

describe('scoring', () => {
  it('gives nothing for a wrong answer', () => {
    expect(pointsFor('hard', false, 1000, 5)).toBe(0);
  });

  it('rewards difficulty, speed and streaks', () => {
    expect(pointsFor('easy', true, 60_000, 0)).toBe(100);
    expect(pointsFor('easy', true, 0, 0)).toBe(150);
    expect(pointsFor('medium', true, 60_000, 0)).toBe(200);
    expect(pointsFor('hard', true, 60_000, 3)).toBe(390);
    expect(pointsFor('hard', true, 60_000, 99)).toBe(450);
    expect(pointsFor('medium', true, 5_000, 0)).toBeGreaterThan(pointsFor('medium', true, 25_000, 0));
  });
});

describe('progress', () => {
  it('tracks streaks, accuracy and best time', () => {
    let save = defaultSave();
    save = recordAnswer(save, 'easy', { correct: true, ms: 8000 }).save;
    save = recordAnswer(save, 'easy', { correct: true, ms: 5000 }).save;
    expect(save.stats.streak).toBe(2);
    const wrong = recordAnswer(save, 'medium', { correct: false, ms: 3000 });
    expect(wrong.points).toBe(0);
    save = wrong.save;
    expect(save.stats.streak).toBe(0);
    expect(save.stats.bestStreak).toBe(2);
    expect(save.stats.byDifficulty.easy).toEqual({ played: 2, correct: 2, correctMs: 13000, bestMs: 5000 });
    expect(save.stats.byDifficulty.medium).toEqual({ played: 1, correct: 0, correctMs: 0, bestMs: null });
    expect(save.stats.score).toBeGreaterThan(200);
  });

  it('does not mutate the previous save', () => {
    const before = defaultSave();
    recordAnswer(before, 'hard', { correct: true, ms: 1 });
    expect(before).toEqual(defaultSave());
  });

  const playDay = (save: Save, key: string) => {
    for (let i = 0; i < 5; i++) save = recordDailyAnswer(save, key, { correct: i !== 2, ms: 1000 });
    return save;
  };

  it('builds a day streak on consecutive days and breaks it after a gap', () => {
    let save = playDay(defaultSave(), '2026-10-12');
    expect(save.daily.streak).toBe(1);
    save = playDay(save, '2026-10-13');
    expect(save.daily.streak).toBe(2);
    expect(currentDailyStreak(save, '2026-10-14')).toBe(2);
    expect(currentDailyStreak(save, '2026-10-15')).toBe(0);
    save = playDay(save, '2026-10-16');
    expect(save.daily.streak).toBe(1);
    expect(save.daily.bestStreak).toBe(2);
  });

  it('ignores answers beyond the daily set and partial days', () => {
    let save = recordDailyAnswer(defaultSave(), '2026-10-12', { correct: true, ms: 1 });
    expect(save.daily.streak).toBe(0);
    save = playDay(save, '2026-10-12');
    expect(save.daily.history['2026-10-12']!.results).toHaveLength(5);
  });
});

describe('persistence', () => {
  it('round-trips a save', () => {
    const save = recordAnswer(defaultSave(), 'easy', { correct: true, ms: 1234 }).save;
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });

  it('recovers from missing, corrupt or outdated data', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('{not json')).toEqual(defaultSave());
    expect(parseSave('{"version":99}')).toEqual(defaultSave());
    const partial = parseSave('{"version":1,"stats":{"streak":4,"score":"oops"},"settings":{"lang":"zh-TW"}}');
    expect(partial.stats.streak).toBe(4);
    expect(partial.stats.score).toBe(0);
    expect(partial.settings.lang).toBe('zh-TW');
    expect(partial.stats.byDifficulty.hard.played).toBe(0);
    // Settings added after a save was written take their default.
    expect(partial.settings.grid).toBe(false);
    expect(partial.levels).toEqual({});
  });
});

describe('sharing', () => {
  it('formats times', () => {
    expect(formatTime(8432)).toBe('8.4s');
    expect(formatTime(83_000)).toBe('1:23');
  });

  it('builds a spoiler-free result card', () => {
    const results = [true, true, false, true, true].map((correct) => ({ correct, ms: 10_000 }));
    expect(dailyShareText(12, results, 'https://wonderfold.app')).toBe(
      'Wonderfold #12  4/5  ⏱ 50.0s\n🟩🟩🟥🟩🟩\nhttps://wonderfold.app',
    );
  });
});

describe('routing', () => {
  it('parses and builds hashes', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/daily')).toEqual({ name: 'daily' });
    expect(parseRoute('#/level/1-0')).toEqual({ name: 'level', index: 0 });
    expect(parseRoute('#/level/5-9')).toEqual({ name: 'level', index: 49 });
    for (const bad of ['#/level', '#/level/0-0', '#/level/6-0', '#/level/1-10', '#/level/abc', '#/play/easy/42']) {
      expect(parseRoute(bad), bad).toEqual({ name: 'home' });
    }
    expect(routeHash({ name: 'level', index: 23 })).toBe('#/level/3-3');
  });
});

describe('levels', () => {
  it('are five tiers of ten fixed, distinct puzzles', () => {
    expect(TIER_COUNT).toBe(5);
    expect(LEVELS).toHaveLength(50);
    expect(new Set(LEVELS.map((p) => p.id)).size).toBe(50);
    expect(new Set(LEVELS.map((p) => JSON.stringify([p.gridSize, p.folds, p.punches]))).size).toBe(50);
    expect(LEVELS.map((_, i) => parseLevelLabel(levelLabel(i)))).toEqual(LEVELS.map((_, i) => i));
  });

  it('each have exactly one right answer, confirmed by an independent simulation', () => {
    for (const p of LEVELS) {
      expect(p.options, p.id).toHaveLength(4);
      expect(new Set(p.options.map(patternKey)).size, p.id).toBe(4);
      for (const cell of p.options.flat()) {
        expect(cell.x >= 0 && cell.y >= 0 && cell.x < p.gridSize && cell.y < p.gridSize, p.id).toBe(true);
      }
      expect(simulate(p.gridSize, p.folds, p.punches), p.id).not.toBeNull();
      const expected = patternKey(bruteForceHoles(p.gridSize, p.folds, p.punches));
      expect(p.options.map(patternKey).filter((key) => key === expected), p.id).toHaveLength(1);
      expect(patternKey(p.options[p.correctIndex]!), p.id).toBe(expected);
    }
  });

  it('get harder within a tier and never easier from one tier to the next', () => {
    const rank = { easy: 0, medium: 1, hard: 2 };
    for (let i = 1; i < LEVELS.length; i++) {
      const [prev, level] = [LEVELS[i - 1]!, LEVELS[i]!];
      expect(rank[level.difficulty], level.id).toBeGreaterThanOrEqual(rank[prev.difficulty]);
      if (level.difficulty === prev.difficulty) expect(level.rating, level.id).toBeGreaterThanOrEqual(prev.rating);
    }
  });

  it('unlock one at a time', () => {
    let save = defaultSave();
    expect(nextLevel(save, 50)).toBe(0);
    expect(isLevelUnlocked(save, 0)).toBe(true);
    expect(isLevelUnlocked(save, 1)).toBe(false);

    // A miss costs the streak but opens nothing.
    save = recordLevelAnswer(save, 0, 'easy', { correct: false, ms: 900 }).save;
    expect(isLevelCleared(save, 0)).toBe(false);
    expect(isLevelUnlocked(save, 1)).toBe(false);
    expect(save.stats.byDifficulty.easy.played).toBe(1);

    const win = recordLevelAnswer(save, 0, 'easy', { correct: true, ms: 4000 });
    save = win.save;
    expect(win.points).toBeGreaterThanOrEqual(100);
    expect(isLevelCleared(save, 0)).toBe(true);
    expect(isLevelUnlocked(save, 1)).toBe(true);
    expect(isLevelUnlocked(save, 2)).toBe(false);
    expect(nextLevel(save, 50)).toBe(1);
    expect(clearedLevels(save, 50)).toBe(1);
  });

  it('replaying a cleared level only improves its best time', () => {
    let save = recordLevelAnswer(defaultSave(), 0, 'easy', { correct: true, ms: 4000 }).save;
    const { score } = save.stats;
    for (const result of [
      { correct: true, ms: 9000 },
      { correct: false, ms: 100 },
      { correct: true, ms: 2500 },
    ]) {
      const replay = recordLevelAnswer(save, 0, 'easy', result);
      expect(replay.points).toBeNull();
      save = replay.save;
    }
    expect(save.levels[0]).toEqual({ bestMs: 2500 });
    expect(save.stats.score).toBe(score);
    expect(save.stats.byDifficulty.easy.played).toBe(1);
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });

  it('finishes when every level is cleared', () => {
    let save = defaultSave();
    for (let i = 0; i < 3; i++) save = recordLevelAnswer(save, i, 'easy', { correct: true, ms: 1 }).save;
    expect(nextLevel(save, 3)).toBeNull();
  });
});
