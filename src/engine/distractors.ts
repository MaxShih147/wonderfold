import { cellKey, patternKey, simulate, sortCells, type Simulation } from './fold.ts';
import { shuffle, type Rng } from './rng.ts';
import type { Cell, Difficulty, DistractorKind, FoldOperation } from './types.ts';

export interface Distractor {
  cells: Cell[];
  kind: DistractorKind;
}

interface Candidate extends Distractor {
  key: string;
  /** Jaccard similarity with the correct pattern. */
  closeness: number;
  sameCount: boolean;
}

/** Which mistakes to model first. Harder levels lead with subtler ones. */
const KIND_ORDER: Record<Difficulty, DistractorKind[]> = {
  easy: ['transformed', 'missed-fold', 'shifted-punch', 'missing-hole', 'extra-hole', 'wrong-fold', 'nudged-hole'],
  medium: ['shifted-punch', 'missed-fold', 'transformed', 'wrong-fold', 'nudged-hole', 'extra-hole', 'missing-hole'],
  hard: ['shifted-punch', 'wrong-fold', 'nudged-hole', 'transformed', 'missed-fold', 'extra-hole', 'missing-hole'],
};

const NEIGHBOURS: readonly Cell[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** The seven non-identity symmetries of the square. */
function squareSymmetries(n: number): ((c: Cell) => Cell)[] {
  const m = n - 1;
  return [
    (c) => ({ x: m - c.y, y: c.x }),
    (c) => ({ x: m - c.x, y: m - c.y }),
    (c) => ({ x: c.y, y: m - c.x }),
    (c) => ({ x: m - c.x, y: c.y }),
    (c) => ({ x: c.x, y: m - c.y }),
    (c) => ({ x: c.y, y: c.x }),
    (c) => ({ x: m - c.y, y: m - c.x }),
  ];
}

/**
 * Builds three wrong answers, each modelling a plausible reasoning slip:
 * forgetting a fold, misplacing a crease or the punch, mirroring the wrong
 * way, or mis-counting holes. All are distinct from each other and from the
 * correct pattern.
 */
export function buildDistractors(
  rng: Rng,
  gridSize: number,
  folds: readonly FoldOperation[],
  punches: readonly Cell[],
  solution: Simulation,
  difficulty: Difficulty,
): Distractor[] {
  const correct = solution.holes;
  const correctKey = patternKey(correct);
  const correctSet = new Set(correct.map(cellKey));
  const inGrid = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < gridSize && c.y < gridSize;

  const pool = new Map<string, Candidate>();
  const offer = (kind: DistractorKind, raw: readonly Cell[]) => {
    const unique = new Map(raw.map((c) => [cellKey(c), c]));
    if (unique.size === 0) return;
    const cells = sortCells([...unique.values()]);
    if (!cells.every(inGrid)) return;
    const key = patternKey(cells);
    if (key === correctKey || pool.has(key)) return;
    const shared = cells.filter((c) => correctSet.has(cellKey(c))).length;
    pool.set(key, {
      cells,
      kind,
      key,
      closeness: shared / (cells.length + correct.length - shared),
      sameCount: cells.length === correct.length,
    });
  };

  // Shifted punch: the right symmetry, applied from the wrong spot.
  for (const d of NEIGHBOURS) {
    const all = simulate(gridSize, folds, punches.map((p) => ({ x: p.x + d.x, y: p.y + d.y })));
    if (all) offer('shifted-punch', all.holes);
    if (punches.length > 1) {
      for (let i = 0; i < punches.length; i++) {
        const one = simulate(
          gridSize,
          folds,
          punches.map((p, j) => (i === j ? { x: p.x + d.x, y: p.y + d.y } : p)),
        );
        if (one) offer('shifted-punch', one.holes);
      }
    }
  }

  // Missed fold: one unfolding step is skipped, so its mirror images never appear.
  for (let k = 0; k < folds.length; k++) {
    offer('missed-fold', solution.hits.filter((h) => (h.flips & (1 << k)) === 0).map((h) => h.cell));
  }

  // Wrong fold: a crease remembered one line off, or folded the other way.
  for (let k = 0; k < folds.length; k++) {
    const fold = folds[k]!;
    const variants: FoldOperation[] = [
      { ...fold, position: fold.position + 1 },
      { ...fold, position: fold.position - 1 },
      { ...fold, direction: fold.direction === 'positive' ? 'negative' : 'positive' },
    ];
    for (const variant of variants) {
      const alt = simulate(gridSize, folds.map((f, i) => (i === k ? variant : f)), punches);
      if (alt) offer('wrong-fold', alt.holes);
    }
  }

  // Transformed: the whole pattern rotated or mirrored.
  for (const transform of squareSymmetries(gridSize)) offer('transformed', correct.map(transform));

  // Nudged hole: a single hole breaks the symmetry.
  for (let i = 0; i < correct.length; i++) {
    for (const d of NEIGHBOURS) {
      const moved = { x: correct[i]!.x + d.x, y: correct[i]!.y + d.y };
      if (!inGrid(moved) || correctSet.has(cellKey(moved))) continue;
      offer('nudged-hole', correct.map((c, j) => (i === j ? moved : c)));
    }
  }

  // Miscounted layers: one hole too few or too many.
  if (correct.length >= 3) {
    for (let i = 0; i < correct.length; i++) offer('missing-hole', correct.filter((_, j) => j !== i));
  }
  const m = gridSize - 1;
  for (const c of correct) {
    offer('extra-hole', [...correct, { x: m - c.x, y: c.y }]);
    offer('extra-hole', [...correct, { x: c.x, y: m - c.y }]);
  }

  const byKind = new Map<DistractorKind, Candidate[]>();
  for (const candidate of shuffle(rng, [...pool.values()])) {
    const list = byKind.get(candidate.kind) ?? [];
    list.push(candidate);
    byKind.set(candidate.kind, list);
  }
  if (difficulty !== 'easy') {
    // Prefer look-alikes: same number of holes, most overlap with the truth.
    for (const list of byKind.values()) {
      list.sort((a, b) => Number(b.sameCount) - Number(a.sameCount) || b.closeness - a.closeness);
    }
  }

  const chosen: Distractor[] = [];
  while (chosen.length < 3) {
    let progressed = false;
    for (const kind of KIND_ORDER[difficulty]) {
      const next = byKind.get(kind)?.shift();
      if (!next) continue;
      chosen.push({ cells: next.cells, kind: next.kind });
      progressed = true;
      if (chosen.length === 3) break;
    }
    if (!progressed) break;
  }
  return chosen;
}
