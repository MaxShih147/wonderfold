import { applyFold, foldAll, foldLine, foldedPolygon, isPunchable, punchableCells, type PaperState } from './fold.ts';
import { EPS, polygonArea, side, type Point } from './geometry.ts';
import type { Cell, FoldAxis, FoldOperation } from './types.ts';

/** A line the paper can be folded along, before a direction is chosen. */
export interface Crease {
  axis: FoldAxis;
  position: number;
}

export interface CreaseOption extends Crease {
  /** Directions that give a valid fold. The first is what a click does. */
  directions: FoldOperation['direction'][];
  /** Where the crease crosses the folded paper. */
  segment: [Point, Point];
}

/** Folds and punches made by hand, in the order they were made. */
export interface Work {
  folds: FoldOperation[];
  punches: Cell[];
}

export const EMPTY_WORK: Work = { folds: [], punches: [] };

function movedArea(state: PaperState): number {
  return state.layers.reduce((sum, layer) => sum + (layer.moved ? polygonArea(layer.region) : 0), 0);
}

function creaseSegment(state: PaperState, crease: Crease): [Point, Point] | null {
  const line = foldLine({ ...crease, direction: 'positive' });
  const along = { x: -line.n.y, y: line.n.x };
  let lo: Point | null = null;
  let hi: Point | null = null;
  const offer = (p: Point) => {
    const s = p.x * along.x + p.y * along.y;
    if (!lo || s < lo.x * along.x + lo.y * along.y) lo = p;
    if (!hi || s > hi.x * along.x + hi.y * along.y) hi = p;
  };
  for (const layer of state.layers) {
    const poly = foldedPolygon(layer);
    poly.forEach((a, i) => {
      const b = poly[(i + 1) % poly.length]!;
      const sa = side(line, a);
      const sb = side(line, b);
      if (Math.abs(sa) < EPS) offer(a);
      else if (Math.abs(sb) > EPS && sa * sb < 0) {
        const k = sa / (sa - sb);
        offer({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
      }
    });
  }
  if (!lo || !hi) return null;
  const [p, q] = [lo as Point, hi as Point];
  return Math.hypot(q.x - p.x, q.y - p.y) < EPS ? null : [p, q];
}

/**
 * Every crease the folded paper can take next: grid lines and 45° diagonals
 * through grid corners. Folds that would leave nowhere to punch are left out.
 * When a crease can go either way, the smaller flap moves by default.
 */
export function creaseOptions(state: PaperState, index: number): CreaseOption[] {
  const n = state.gridSize;
  const ranges: [FoldAxis, number, number][] = [
    ['vertical', 1, n - 1],
    ['horizontal', 1, n - 1],
    ['diagonal-down', 1 - n, n - 1],
    ['diagonal-up', 1, 2 * n - 1],
  ];
  const out: CreaseOption[] = [];
  for (const [axis, lo, hi] of ranges) {
    for (let position = lo; position <= hi; position++) {
      const valid = (['positive', 'negative'] as const)
        .map((direction) => ({ direction, next: applyFold(state, { axis, position, direction }, index) }))
        .filter((v): v is { direction: FoldOperation['direction']; next: PaperState } =>
          v.next !== null && punchableCells(v.next).length > 0,
        )
        .sort((a, b) => movedArea(a.next) - movedArea(b.next));
      const segment = creaseSegment(state, { axis, position });
      if (valid.length === 0 || !segment) continue;
      out.push({ axis, position, directions: valid.map((v) => v.direction), segment });
    }
  }
  return out;
}

/** The paper after each fold of `work`; the last entry is what is on the table. */
export function workStates(gridSize: number, work: Work): PaperState[] {
  const states = foldAll(gridSize, work.folds);
  if (!states) throw new Error('Work contains an invalid fold');
  return states;
}

/** Folds along a crease. Not possible once the paper has been punched. */
export function addFold(gridSize: number, work: Work, crease: Crease): Work | null {
  if (work.punches.length > 0) return null;
  const state = workStates(gridSize, work).at(-1)!;
  const option = creaseOptions(state, work.folds.length).find(
    (o) => o.axis === crease.axis && o.position === crease.position,
  );
  if (!option) return null;
  return { folds: [...work.folds, { ...crease, direction: option.directions[0]! }], punches: [] };
}

/** Redoes the last fold the other way round, when that is a valid fold too. */
export function flipLastFold(gridSize: number, work: Work): Work | null {
  const last = work.folds.at(-1);
  if (!last || work.punches.length > 0) return null;
  const before = { folds: work.folds.slice(0, -1), punches: [] };
  const state = workStates(gridSize, before).at(-1)!;
  const direction = last.direction === 'positive' ? 'negative' : 'positive';
  const flipped = { ...last, direction } as const;
  const next = applyFold(state, flipped, before.folds.length);
  if (!next || punchableCells(next).length === 0) return null;
  return { folds: [...before.folds, flipped], punches: [] };
}

/** Punches a cell of the folded paper, or removes the punch already there. */
export function togglePunch(gridSize: number, work: Work, cell: Cell, maxPunches: number): Work | null {
  const without = work.punches.filter((p) => p.x !== cell.x || p.y !== cell.y);
  if (without.length < work.punches.length) return { ...work, punches: without };
  if (work.punches.length >= maxPunches) return null;
  if (!isPunchable(workStates(gridSize, work).at(-1)!, cell)) return null;
  return { ...work, punches: [...work.punches, cell].sort((a, b) => a.y - b.y || a.x - b.x) };
}
