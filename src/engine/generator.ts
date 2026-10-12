import { buildDistractors } from './distractors.ts';
import {
  applyFold,
  flatSheet,
  foldedPolygon,
  patternKey,
  punchableCells,
  simulate,
  type PaperState,
} from './fold.ts';
import { boundsOf } from './geometry.ts';
import { mixSeed, mulberry32, pickWeighted, randInt, shuffle, type Rng } from './rng.ts';
import type { Difficulty, FoldAxis, FoldOperation, Puzzle } from './types.ts';

type FoldStyle = 'half' | 'offset' | 'diagonal';

export interface DifficultyConfig {
  gridSize: number;
  folds: readonly [min: number, max: number];
  punches: readonly [min: number, max: number];
  /** Allowed number of holes on the unfolded sheet. */
  holes: readonly [min: number, max: number];
  /** Relative likelihood of each kind of fold. */
  weights: Record<FoldStyle, number>;
  maxDiagonals: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    gridSize: 4,
    folds: [1, 2],
    punches: [1, 1],
    holes: [2, 4],
    weights: { half: 3, offset: 1.2, diagonal: 0 },
    maxDiagonals: 0,
  },
  medium: {
    gridSize: 6,
    folds: [2, 3],
    punches: [1, 2],
    holes: [3, 8],
    weights: { half: 3, offset: 2, diagonal: 1.5 },
    maxDiagonals: 1,
  },
  hard: {
    gridSize: 6,
    folds: [3, 4],
    punches: [2, 3],
    holes: [5, 12],
    weights: { half: 2, offset: 2, diagonal: 2.5 },
    maxDiagonals: 2,
  },
};

const DIFFICULTY_SALT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const MAX_ATTEMPTS = 400;

interface FoldCandidate {
  fold: FoldOperation;
  style: FoldStyle;
  next: PaperState;
}

function candidateFolds(state: PaperState, index: number, allowDiagonal: boolean): FoldCandidate[] {
  const n = state.gridSize;
  const bounds = boundsOf(state.layers.flatMap(foldedPolygon));
  const ranges: [FoldAxis, number, number][] = [
    ['vertical', 1, n - 1],
    ['horizontal', 1, n - 1],
  ];
  if (allowDiagonal) ranges.push(['diagonal-down', 1 - n, n - 1], ['diagonal-up', 1, 2 * n - 1]);

  const out: FoldCandidate[] = [];
  for (const [axis, lo, hi] of ranges) {
    for (let position = lo; position <= hi; position++) {
      for (const direction of ['positive', 'negative'] as const) {
        const fold: FoldOperation = { axis, direction, position };
        const next = applyFold(state, fold, index);
        // Keep only folds that leave somewhere to punch.
        if (!next || punchableCells(next).length === 0) continue;
        let style: FoldStyle = 'diagonal';
        if (axis === 'vertical') style = position * 2 === bounds.minX + bounds.maxX ? 'half' : 'offset';
        if (axis === 'horizontal') style = position * 2 === bounds.minY + bounds.maxY ? 'half' : 'offset';
        out.push({ fold, style, next });
      }
    }
  }
  return out;
}

function rate(folds: readonly FoldOperation[], styles: readonly FoldStyle[], punches: number, holes: number): number {
  const diagonals = styles.filter((s) => s === 'diagonal').length;
  const offsets = styles.filter((s) => s === 'offset').length;
  const score = folds.length * 2 + diagonals * 1.5 + offsets * 0.75 + punches + Math.log2(holes);
  return Math.round(score * 10) / 10;
}

function attempt(rng: Rng, seed: number, difficulty: Difficulty): Puzzle | null {
  const config = DIFFICULTY_CONFIG[difficulty];
  const foldCount = randInt(rng, config.folds[0], config.folds[1]);

  let state = flatSheet(config.gridSize);
  const folds: FoldOperation[] = [];
  const styles: FoldStyle[] = [];
  for (let i = 0; i < foldCount; i++) {
    const diagonals = styles.filter((s) => s === 'diagonal').length;
    const candidates = candidateFolds(state, i, diagonals < config.maxDiagonals).filter(
      (c) => config.weights[c.style] > 0,
    );
    if (candidates.length === 0) return null;
    const chosen = pickWeighted(rng, candidates, (c) => config.weights[c.style]);
    folds.push(chosen.fold);
    styles.push(chosen.style);
    state = chosen.next;
  }

  const punchCount = randInt(rng, config.punches[0], config.punches[1]);
  const spots = shuffle(rng, punchableCells(state));
  if (spots.length < punchCount) return null;
  const punches = spots.slice(0, punchCount).sort((a, b) => a.y - b.y || a.x - b.x);

  const solution = simulate(config.gridSize, folds, punches);
  if (!solution) return null;
  const holeCount = solution.holes.length;
  if (holeCount < config.holes[0] || holeCount > config.holes[1]) return null;

  const distractors = buildDistractors(rng, config.gridSize, folds, punches, solution, difficulty);
  if (distractors.length < 3) return null;

  const order = shuffle(rng, [
    { cells: solution.holes, kind: null },
    ...distractors.map((d) => ({ cells: d.cells, kind: d.kind })),
  ]);
  const options = order.map((o) => o.cells);
  if (new Set(options.map(patternKey)).size !== 4) return null;

  return {
    id: `${difficulty}-${seed}`,
    seed,
    gridSize: config.gridSize,
    folds,
    punches,
    options,
    correctIndex: order.findIndex((o) => o.kind === null),
    difficulty,
    optionKinds: order.map((o) => o.kind),
    rating: rate(folds, styles, punchCount, holeCount),
  };
}

/**
 * Deterministically generates the puzzle for a seed. The same seed and
 * difficulty always produce the same puzzle, on any device.
 */
export function generatePuzzle(seed: number, difficulty: Difficulty): Puzzle {
  const normalized = seed >>> 0;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const rng = mulberry32(mixSeed(normalized, DIFFICULTY_SALT[difficulty], i));
    const puzzle = attempt(rng, normalized, difficulty);
    if (puzzle) return puzzle;
  }
  throw new Error(`Could not generate a ${difficulty} puzzle for seed ${normalized}`);
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
