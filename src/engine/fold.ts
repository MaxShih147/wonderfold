import {
  EPS,
  IDENTITY,
  apply,
  clipHalfPlane,
  compose,
  containsPoint,
  distanceToBoundary,
  invert,
  polygonArea,
  reflectAcross,
  side,
  type Line,
  type Mat,
  type Point,
} from './geometry.ts';
import type { Cell, FoldOperation } from './types.ts';

/** Radius of a punched hole, in grid units. */
export const HOLE_RADIUS = 0.3;
/** A punch must stay at least this far from every paper edge and crease. */
export const HOLE_CLEARANCE = 0.45;

/**
 * One ply of the folded stack. Each layer is a convex piece of the original
 * sheet together with the rigid motion that carries it to where it now lies.
 */
export interface Layer {
  /** The piece of the original, unfolded sheet this layer is made of. */
  region: Point[];
  /** Maps original-sheet coordinates to the current folded position. */
  toFolded: Mat;
  /** Bit `k` is set when fold `k` flipped this layer over. */
  flips: number;
  /** Whether the most recent fold moved this layer. */
  moved: boolean;
}

export interface PaperState {
  gridSize: number;
  /** Bottom of the stack first. */
  layers: Layer[];
}

export function flatSheet(gridSize: number): PaperState {
  const n = gridSize;
  return {
    gridSize,
    layers: [
      {
        region: [
          { x: 0, y: 0 },
          { x: n, y: 0 },
          { x: n, y: n },
          { x: 0, y: n },
        ],
        toFolded: IDENTITY,
        flips: 0,
        moved: false,
      },
    ],
  };
}

export function foldLine(fold: FoldOperation): Line {
  switch (fold.axis) {
    case 'vertical':
      return { n: { x: 1, y: 0 }, c: fold.position };
    case 'horizontal':
      return { n: { x: 0, y: 1 }, c: fold.position };
    case 'diagonal-down':
      return { n: { x: 1, y: -1 }, c: fold.position };
    case 'diagonal-up':
      return { n: { x: 1, y: 1 }, c: fold.position };
  }
}

export function foldedPolygon(layer: Layer): Point[] {
  return layer.region.map((p) => apply(layer.toFolded, p));
}

/**
 * Folds the stack along a crease. Returns `null` when the fold is not
 * physically meaningful: the crease misses the paper, or the flap would land
 * outside the outline of the original sheet.
 */
export function applyFold(state: PaperState, fold: FoldOperation, index: number): PaperState | null {
  const line = foldLine(fold);
  const reflect = reflectAcross(line);
  // A `positive` fold carries the low side of the crease over to the high side.
  const movingIsPositiveSide = fold.direction === 'negative';
  const n = state.gridSize;

  const staying: Layer[] = [];
  const moving: Layer[] = [];

  for (const layer of state.layers) {
    const folded = foldedPolygon(layer);
    const toOriginal = invert(layer.toFolded);

    const stayPart = clipHalfPlane(folded, line, !movingIsPositiveSide);
    if (stayPart.length >= 3 && polygonArea(stayPart) > EPS) {
      staying.push({ ...layer, region: stayPart.map((p) => apply(toOriginal, p)), moved: false });
    }

    const movePart = clipHalfPlane(folded, line, movingIsPositiveSide);
    if (movePart.length >= 3 && polygonArea(movePart) > EPS) {
      for (const p of movePart) {
        const q = apply(reflect, p);
        if (q.x < -EPS || q.y < -EPS || q.x > n + EPS || q.y > n + EPS) return null;
      }
      moving.push({
        region: movePart.map((p) => apply(toOriginal, p)),
        toFolded: compose(reflect, layer.toFolded),
        flips: layer.flips | (1 << index),
        moved: true,
      });
    }
  }

  if (staying.length === 0 || moving.length === 0) return null;
  // The flap turns over as it lands, so its plies end up in reverse order.
  return { gridSize: n, layers: [...staying, ...moving.reverse()] };
}

export function cellCenter(cell: Cell): Point {
  return { x: cell.x + 0.5, y: cell.y + 0.5 };
}

/** Whether a hole can be cleanly punched at this cell of the folded paper. */
export function isPunchable(state: PaperState, cell: Cell): boolean {
  const center = cellCenter(cell);
  let hits = 0;
  for (const layer of state.layers) {
    const poly = foldedPolygon(layer);
    if (distanceToBoundary(poly, center) < HOLE_CLEARANCE) return false;
    if (containsPoint(poly, center)) hits++;
  }
  return hits > 0;
}

export function punchableCells(state: PaperState): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      if (isPunchable(state, { x, y })) cells.push({ x, y });
    }
  }
  return cells;
}

export interface PunchHit {
  cell: Cell;
  /** The `flips` mask of the layer the hole went through. */
  flips: number;
}

/** Traces a punch back through every ply to cells of the original sheet. */
export function tracePunch(state: PaperState, cell: Cell): PunchHit[] {
  const center = cellCenter(cell);
  const hits: PunchHit[] = [];
  for (const layer of state.layers) {
    if (!containsPoint(foldedPolygon(layer), center)) continue;
    const origin = apply(invert(layer.toFolded), center);
    hits.push({ cell: { x: Math.floor(origin.x), y: Math.floor(origin.y) }, flips: layer.flips });
  }
  return hits;
}

export interface Simulation {
  /** `states[k]` is the paper after `k` folds; `states[0]` is the flat sheet. */
  states: PaperState[];
  hits: PunchHit[];
  /** The holes on the unfolded sheet, sorted. */
  holes: Cell[];
}

/** Runs a full fold-and-punch sequence, or returns `null` if any step is invalid. */
export function simulate(gridSize: number, folds: readonly FoldOperation[], punches: readonly Cell[]): Simulation | null {
  const states = foldAll(gridSize, folds);
  if (!states) return null;
  const final = states[states.length - 1]!;
  const hits: PunchHit[] = [];
  for (const punch of punches) {
    if (!isPunchable(final, punch)) return null;
    hits.push(...tracePunch(final, punch));
  }
  return { states, hits, holes: sortCells(hits.map((h) => h.cell)) };
}

export function foldAll(gridSize: number, folds: readonly FoldOperation[]): PaperState[] | null {
  const states = [flatSheet(gridSize)];
  for (let i = 0; i < folds.length; i++) {
    const next = applyFold(states[i]!, folds[i]!, i);
    if (!next) return null;
    states.push(next);
  }
  return states;
}

export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

export function sortCells(cells: readonly Cell[]): Cell[] {
  return cells.slice().sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Canonical, order-independent identity of a hole pattern. */
export function patternKey(cells: readonly Cell[]): string {
  return sortCells(cells).map(cellKey).join(';');
}

/** Signed side of the crease the flap starts on, for callers that need it. */
export function isOnMovingSide(fold: FoldOperation, p: Point): boolean {
  const s = side(foldLine(fold), p);
  return fold.direction === 'positive' ? s < -EPS : s > EPS;
}
