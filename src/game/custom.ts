import {
  buildDistractors,
  hashString,
  mulberry32,
  patternKey,
  simulate,
  type Cell,
  type FoldAxis,
  type FoldOperation,
  type Puzzle,
  type Work,
} from '../engine/index.ts';

/** Limits for puzzles made by players. */
export const CUSTOM_GRIDS = [4, 6] as const;
export const CUSTOM_MAX_FOLDS = 5;
export const CUSTOM_MAX_PUNCHES = 3;

const AXIS_CODE: Record<FoldAxis, string> = { vertical: 'v', horizontal: 'h', 'diagonal-down': 'd', 'diagonal-up': 'u' };
const CODE_AXIS = Object.fromEntries(Object.entries(AXIS_CODE).map(([axis, code]) => [code, axis])) as Record<string, FoldAxis>;

/**
 * Packs a hand-made puzzle into a short string for a link, for example
 * `4v2H2_10`: grid size, one letter and position per fold (upper case when
 * the fold goes the `negative` way), then the punched cells as digit pairs.
 */
export function encodeCustom(gridSize: number, work: Work): string {
  const folds = work.folds.map((fold) => {
    const code = AXIS_CODE[fold.axis];
    return (fold.direction === 'positive' ? code : code.toUpperCase()) + fold.position;
  });
  return `${gridSize}${folds.join('')}_${work.punches.map((p) => `${p.x}${p.y}`).join('')}`;
}

export function decodeCustom(code: string): { gridSize: number; work: Work } | null {
  const match = /^(\d)((?:[vhduVHDU]-?\d{1,2})+)_((?:\d\d)+)$/.exec(code);
  if (!match) return null;
  const gridSize = Number(match[1]);
  if (!CUSTOM_GRIDS.includes(gridSize as (typeof CUSTOM_GRIDS)[number])) return null;
  const folds: FoldOperation[] = [...match[2]!.matchAll(/([vhduVHDU])(-?\d{1,2})/g)].map((m) => ({
    axis: CODE_AXIS[m[1]!.toLowerCase()]!,
    direction: m[1] === m[1]!.toLowerCase() ? 'positive' : 'negative',
    position: Number(m[2]),
  }));
  const punches: Cell[] = [...match[3]!.matchAll(/(\d)(\d)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  if (folds.length > CUSTOM_MAX_FOLDS || punches.length > CUSTOM_MAX_PUNCHES) return null;
  if (new Set(punches.map((p) => `${p.x},${p.y}`)).size !== punches.length) return null;
  if (!simulate(gridSize, folds, punches)) return null;
  return { gridSize, work: { folds, punches } };
}

/**
 * Turns a hand-made fold sequence into a four-choice puzzle. Returns `null`
 * when it is not a puzzle yet: nothing folded, nothing punched, or too plain
 * to have three believable wrong answers.
 */
export function customPuzzle(gridSize: number, work: Work): Puzzle | null {
  if (work.folds.length === 0 || work.punches.length === 0) return null;
  const solution = simulate(gridSize, work.folds, work.punches);
  if (!solution) return null;
  const code = encodeCustom(gridSize, work);
  const rng = mulberry32(hashString(code));
  const distractors = buildDistractors(rng, gridSize, work.folds, work.punches, solution, 'medium');
  if (distractors.length < 3) return null;
  const order = [{ cells: solution.holes, kind: null }, ...distractors];
  // Fisher–Yates with the puzzle's own generator, so a link always shows the same order.
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  if (new Set(order.map((o) => patternKey(o.cells))).size !== 4) return null;
  return {
    id: `custom-${code}`,
    seed: 0,
    gridSize,
    folds: work.folds,
    punches: work.punches,
    options: order.map((o) => o.cells),
    correctIndex: order.findIndex((o) => o.kind === null),
    difficulty: 'medium',
    optionKinds: order.map((o) => o.kind),
    rating: 0,
  };
}
