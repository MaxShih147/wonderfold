/**
 * Minimal 2D geometry for the folding engine.
 *
 * All fold lines sit on integer grid lines or 45° diagonals through grid
 * corners, so every coordinate the engine produces is a multiple of 0.5 and
 * floating point arithmetic stays exact. EPS only guards degenerate slivers.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Affine transform in SVG `matrix(a b c d e f)` order:
 *   x' = a·x + c·y + e
 *   y' = b·x + d·y + f
 */
export type Mat = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

/** A line `n · p = c`. `n` is not normalised so reflections stay exact. */
export interface Line {
  n: Point;
  c: number;
}

export const EPS = 1e-9;
export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export function apply(m: Mat, p: Point): Point {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

/** Returns `m2 ∘ m1` (apply `m1` first). */
export function compose(m2: Mat, m1: Mat): Mat {
  return [
    m2[0] * m1[0] + m2[2] * m1[1],
    m2[1] * m1[0] + m2[3] * m1[1],
    m2[0] * m1[2] + m2[2] * m1[3],
    m2[1] * m1[2] + m2[3] * m1[3],
    m2[0] * m1[4] + m2[2] * m1[5] + m2[4],
    m2[1] * m1[4] + m2[3] * m1[5] + m2[5],
  ];
}

export function det(m: Mat): number {
  return m[0] * m[3] - m[1] * m[2];
}

export function invert(m: Mat): Mat {
  const d = det(m);
  const a = m[3] / d;
  const b = -m[1] / d;
  const c = -m[2] / d;
  const dd = m[0] / d;
  return [a, b, c, dd, -(a * m[4] + c * m[5]), -(b * m[4] + dd * m[5])];
}

/** Signed distance to the line, scaled by |n|. */
export function side(line: Line, p: Point): number {
  return line.n.x * p.x + line.n.y * p.y - line.c;
}

/**
 * Scales space perpendicular to `line` by `factor`, keeping the line fixed.
 * `factor = -1` is a reflection; `factor = cos θ` is the orthographic
 * projection of a flap rotated by θ around the line.
 */
export function scaleAcross(line: Line, factor: number): Mat {
  const { x: nx, y: ny } = line.n;
  const k = (1 - factor) / (nx * nx + ny * ny);
  return [1 - k * nx * nx, -k * nx * ny, -k * nx * ny, 1 - k * ny * ny, k * line.c * nx, k * line.c * ny];
}

export function reflectAcross(line: Line): Mat {
  return scaleAcross(line, -1);
}

export function polygonArea(poly: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    sum += p.x * q.y - q.x * p.y;
  }
  return Math.abs(sum) / 2;
}

/** Sutherland–Hodgman clip of a convex polygon against one half-plane. */
export function clipHalfPlane(poly: readonly Point[], line: Line, keepPositive: boolean): Point[] {
  const sign = keepPositive ? 1 : -1;
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    const sp = sign * side(line, p);
    const sq = sign * side(line, q);
    if (sp >= -EPS) out.push(p);
    if ((sp > EPS && sq < -EPS) || (sp < -EPS && sq > EPS)) {
      const t = sp / (sp - sq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Smallest distance from `p` to any edge of the polygon. */
export function distanceToBoundary(poly: readonly Point[], p: Point): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    best = Math.min(best, distanceToSegment(p, poly[i]!, poly[(i + 1) % poly.length]!));
  }
  return best;
}

/** Strict interior test for a convex polygon of either orientation. */
export function containsPoint(poly: readonly Point[], p: Point): boolean {
  let pos = false;
  let neg = false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross > EPS) pos = true;
    else if (cross < -EPS) neg = true;
    else return false;
    if (pos && neg) return false;
  }
  return true;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(points: readonly Point[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
