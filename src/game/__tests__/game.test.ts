import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash } from '../router.ts';
import {
  currentDailyStreak,
  defaultSave,
  parseSave,
  pointsFor,
  recordAnswer,
  recordDailyAnswer,
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
    expect(parseRoute('#/play/hard')).toEqual({ name: 'play', difficulty: 'hard', seed: null });
    expect(parseRoute('#/play/easy/42')).toEqual({ name: 'play', difficulty: 'easy', seed: 42 });
    expect(parseRoute('#/play/impossible')).toEqual({ name: 'home' });
    expect(parseRoute('#/play/easy/abc')).toEqual({ name: 'play', difficulty: 'easy', seed: null });
    expect(routeHash({ name: 'play', difficulty: 'medium', seed: 7 })).toBe('#/play/medium/7');
  });
});
