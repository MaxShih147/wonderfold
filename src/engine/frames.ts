import { cellCenter, foldLine, type PaperState } from './fold.ts';
import { apply, compose, containsPoint, det, reflectAcross, scaleAcross, type Mat, type Point } from './geometry.ts';
import type { Cell, FoldOperation } from './types.ts';

/** One drawable ply: a piece of the original sheet and where to draw it. */
export interface Piece {
  key: string;
  /** Outline in original-sheet coordinates. */
  region: Point[];
  /** Places `region` (and its holes) on the stage. */
  matrix: Mat;
  /** True when the reverse side of the paper faces the viewer. */
  back: boolean;
  /** 0 when lying flat, 1 when standing on edge mid-fold. */
  lift: number;
  /** Holes cut in this ply, in original-sheet cells. */
  holes: Cell[];
}

function holesIn(region: readonly Point[], holes: readonly Cell[]): Cell[] {
  return holes.filter((h) => containsPoint(region, cellCenter(h)));
}

/** The paper lying still after `step` folds. */
export function staticFrame(states: readonly PaperState[], step: number, holes: readonly Cell[] = []): Piece[] {
  return states[step]!.layers.map((layer, i) => ({
    key: `s${step}-${i}`,
    region: layer.region,
    matrix: layer.toFolded,
    back: det(layer.toFolded) < 0,
    lift: 0,
    holes: holesIn(layer.region, holes),
  }));
}

/**
 * The paper part-way through fold number `step` (0-based). `t` runs from 0
 * (flap still flat) to 1 (flap landed). The flap's rotation about the crease
 * is drawn as its orthographic projection: a squash towards the crease.
 */
export function foldFrame(
  states: readonly PaperState[],
  folds: readonly FoldOperation[],
  step: number,
  t: number,
  holes: readonly Cell[] = [],
): Piece[] {
  const line = foldLine(folds[step]!);
  const angle = Math.PI * Math.min(1, Math.max(0, t));
  const swing = compose(scaleAcross(line, Math.cos(angle)), reflectAcross(line));
  const lift = Math.sin(angle);

  const staying: Piece[] = [];
  const moving: Piece[] = [];
  states[step + 1]!.layers.forEach((layer, i) => {
    const matrix = layer.moved ? compose(swing, layer.toFolded) : layer.toFolded;
    const piece: Piece = {
      key: `f${step}-${i}`,
      region: layer.region,
      matrix,
      back: det(matrix) < 0,
      lift: layer.moved ? lift : 0,
      holes: holesIn(layer.region, holes),
    };
    (layer.moved ? moving : staying).push(piece);
  });
  // Until the flap passes vertical we still see its original top ply.
  if (angle < Math.PI / 2) moving.reverse();
  return [...staying, ...moving];
}

export interface FoldHint {
  /** Crease endpoints, clipped to the paper outline. */
  crease: [Point, Point];
  /** Arrow from the middle of the flap to where it lands. */
  from: Point;
  to: Point;
}

/** Where to draw the crease and direction arrow for the upcoming fold. */
export function foldHint(states: readonly PaperState[], folds: readonly FoldOperation[], step: number): FoldHint {
  const fold = folds[step]!;
  const line = foldLine(fold);
  const reflect = reflectAcross(line);
  const flap = states[step + 1]!.layers.filter((l) => l.moved);

  // Before the fold each flap ply sits at the mirror image of where it lands.
  const before = flap.flatMap((l) => l.region.map((p) => apply(compose(reflect, l.toFolded), p)));
  const along: Point = { x: -line.n.y, y: line.n.x };
  const len2 = line.n.x ** 2 + line.n.y ** 2;
  const origin: Point = { x: (line.n.x * line.c) / len2, y: (line.n.y * line.c) / len2 };

  let lo = Infinity;
  let hi = -Infinity;
  let spanLo = Infinity;
  let spanHi = -Infinity;
  let far = 0;
  for (const p of before) {
    const s = ((p.x - origin.x) * along.x + (p.y - origin.y) * along.y) / len2;
    const d = Math.abs(line.n.x * p.x + line.n.y * p.y - line.c) / Math.sqrt(len2);
    if (d < 1e-6) {
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
    spanLo = Math.min(spanLo, s);
    spanHi = Math.max(spanHi, s);
    far = Math.max(far, d);
  }
  if (!(hi > lo)) {
    lo = spanLo;
    hi = spanHi;
  }
  const at = (s: number): Point => ({ x: origin.x + along.x * s, y: origin.y + along.y * s });
  const mid = at((lo + hi) / 2);
  const reach = Math.min(far * 0.6, 1.3) / Math.sqrt(len2);
  const sign = fold.direction === 'positive' ? -1 : 1;
  return {
    crease: [at(lo), at(hi)],
    from: { x: mid.x + sign * line.n.x * reach, y: mid.y + sign * line.n.y * reach },
    to: { x: mid.x - sign * line.n.x * reach, y: mid.y - sign * line.n.y * reach },
  };
}
