import { describe, expect, it } from 'vitest';
import { dailyNumber, dailyPuzzles, dateKey, previousDateKey } from '../daily.ts';
import { cellCenter, cellKey, foldLine, isOnMovingSide, patternKey, simulate } from '../fold.ts';
import { foldFrame, foldHint, staticFrame } from '../frames.ts';
import { DIFFICULTY_CONFIG, generatePuzzle } from '../generator.ts';
import { apply, reflectAcross, type Point } from '../geometry.ts';
import { DIFFICULTIES, type Cell, type FoldOperation, type Puzzle } from '../types.ts';

const PER_DIFFICULTY = 1500;

/**
 * Independent oracle. Instead of tracking layers and unfolding them, follow
 * every cell of the flat sheet *forwards* through the folds and see whether
 * it ends up under a punch. Shares no code path with the layer model beyond
 * point reflection.
 */
function bruteForceHoles(gridSize: number, folds: FoldOperation[], punches: Cell[]): Cell[] {
  const punched = new Set(punches.map(cellKey));
  const holes: Cell[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      let p: Point = cellCenter({ x, y });
      for (const fold of folds) {
        if (isOnMovingSide(fold, p)) p = apply(reflectAcross(foldLine(fold)), p);
      }
      if (punched.has(cellKey({ x: p.x - 0.5, y: p.y - 0.5 }))) holes.push({ x, y });
    }
  }
  return holes;
}

const puzzles: Record<string, Puzzle[]> = {};
for (const difficulty of DIFFICULTIES) {
  puzzles[difficulty] = Array.from({ length: PER_DIFFICULTY }, (_, seed) => generatePuzzle(seed, difficulty));
}

describe.each(DIFFICULTIES)('generated %s puzzles', (difficulty) => {
  const set = puzzles[difficulty]!;
  const config = DIFFICULTY_CONFIG[difficulty];

  it('respect the difficulty limits', () => {
    for (const p of set) {
      expect(p.gridSize).toBe(config.gridSize);
      expect(p.folds.length).toBeGreaterThanOrEqual(config.folds[0]);
      expect(p.folds.length).toBeLessThanOrEqual(config.folds[1]);
      expect(p.punches.length).toBeGreaterThanOrEqual(config.punches[0]);
      expect(p.punches.length).toBeLessThanOrEqual(config.punches[1]);
      const holes = p.options[p.correctIndex]!.length;
      expect(holes).toBeGreaterThanOrEqual(config.holes[0]);
      expect(holes).toBeLessThanOrEqual(config.holes[1]);
      const diagonals = p.folds.filter((f) => f.axis.startsWith('diagonal')).length;
      expect(diagonals).toBeLessThanOrEqual(config.maxDiagonals);
    }
  });

  it('have a correct answer that matches the fold mapping', () => {
    for (const p of set) {
      const solution = simulate(p.gridSize, p.folds, p.punches);
      expect(solution, p.id).not.toBeNull();
      expect(patternKey(p.options[p.correctIndex]!)).toBe(patternKey(solution!.holes));
    }
  });

  it('agree with an independent forward simulation', () => {
    for (const p of set) {
      const expected = patternKey(bruteForceHoles(p.gridSize, p.folds, p.punches));
      expect(patternKey(p.options[p.correctIndex]!), p.id).toBe(expected);
    }
  });

  it('offer four distinct in-grid options with exactly one correct', () => {
    for (const p of set) {
      expect(p.options).toHaveLength(4);
      const keys = p.options.map(patternKey);
      expect(new Set(keys).size, p.id).toBe(4);
      const truth = patternKey(bruteForceHoles(p.gridSize, p.folds, p.punches));
      expect(keys.filter((k) => k === truth)).toHaveLength(1);
      expect(keys.indexOf(truth)).toBe(p.correctIndex);
      expect(p.optionKinds.filter((k) => k === null)).toHaveLength(1);
      expect(p.optionKinds[p.correctIndex]).toBeNull();
      for (const option of p.options) {
        expect(option.length).toBeGreaterThan(0);
        expect(new Set(option.map(cellKey)).size).toBe(option.length);
        for (const c of option) {
          expect(Number.isInteger(c.x) && Number.isInteger(c.y)).toBe(true);
          expect(c.x >= 0 && c.y >= 0 && c.x < p.gridSize && c.y < p.gridSize).toBe(true);
        }
      }
    }
  });

  it('do not favour any answer position', () => {
    const counts = [0, 0, 0, 0];
    for (const p of set) counts[p.correctIndex]!++;
    for (const count of counts) {
      expect(count).toBeGreaterThan(PER_DIFFICULTY * 0.2);
      expect(count).toBeLessThan(PER_DIFFICULTY * 0.3);
    }
  });

  it('are varied', () => {
    const signatures = new Set(set.map((p) => JSON.stringify([p.folds, p.punches])));
    expect(signatures.size).toBeGreaterThan(difficulty === 'easy' ? 80 : PER_DIFFICULTY * 0.8);
  });

  it('produce drawable frames for every step', () => {
    for (const p of set.slice(0, 200)) {
      const { states, holes } = simulate(p.gridSize, p.folds, p.punches)!;
      // Every hole belongs to exactly one ply at every stage of unfolding.
      for (let step = 0; step < states.length; step++) {
        const frame = staticFrame(states, step, holes);
        expect(frame.reduce((n, piece) => n + piece.holes.length, 0)).toBe(holes.length);
      }
      for (let step = 0; step < p.folds.length; step++) {
        // A fold animation starts on the previous state and ends on the next.
        const place = (pieces: ReturnType<typeof foldFrame>) =>
          pieces
            .map((piece) => JSON.stringify(piece.region.map((q) => apply(piece.matrix, q))))
            .sort()
            .join('|');
        const end = foldFrame(states, p.folds, step, 1);
        expect(place(end)).toBe(place(staticFrame(states, step + 1)));
        expect(end.map((piece) => piece.back)).toEqual(staticFrame(states, step + 1).map((piece) => piece.back));
        const start = foldFrame(states, p.folds, step, 0);
        const within = (q: Point) => q.x > -1e-9 && q.y > -1e-9 && q.x < p.gridSize + 1e-9 && q.y < p.gridSize + 1e-9;
        for (const piece of start) expect(piece.region.every((q) => within(apply(piece.matrix, q)))).toBe(true);

        const hint = foldHint(states, p.folds, step);
        for (const q of [...hint.crease, hint.from, hint.to]) {
          expect(Number.isFinite(q.x) && Number.isFinite(q.y)).toBe(true);
        }
        expect(Math.hypot(hint.crease[1].x - hint.crease[0].x, hint.crease[1].y - hint.crease[0].y)).toBeGreaterThan(0.5);
      }
    }
  });
});

describe('determinism', () => {
  it('returns the same puzzle for the same seed', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generatePuzzle(424242, difficulty)).toEqual(generatePuzzle(424242, difficulty));
    }
  });

  it('gets harder on average', () => {
    const mean = (d: string) => puzzles[d]!.reduce((sum, p) => sum + p.rating, 0) / PER_DIFFICULTY;
    expect(mean('easy')).toBeLessThan(mean('medium'));
    expect(mean('medium')).toBeLessThan(mean('hard'));
  });
});

describe('daily challenge', () => {
  it('is stable for a date and differs between dates', () => {
    const a = dailyPuzzles('2026-10-12');
    expect(a).toEqual(dailyPuzzles('2026-10-12'));
    expect(a.map((p) => p.difficulty)).toEqual(['easy', 'easy', 'medium', 'medium', 'hard']);
    expect(dailyPuzzles('2026-10-13').map((p) => p.seed)).not.toEqual(a.map((p) => p.seed));
  });

  it('numbers days from launch', () => {
    expect(dailyNumber('2026-10-12')).toBe(1);
    expect(dailyNumber('2026-10-13')).toBe(2);
    expect(dailyNumber('2027-10-12')).toBe(366);
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28');
  });
});
