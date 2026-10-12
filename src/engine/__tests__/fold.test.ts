import { describe, expect, it } from 'vitest';
import {
  applyFold,
  flatSheet,
  foldAll,
  foldedPolygon,
  isPunchable,
  patternKey,
  punchableCells,
  simulate,
} from '../fold.ts';
import { apply, compose, invert, polygonArea, reflectAcross, scaleAcross } from '../geometry.ts';
import type { Cell, FoldOperation } from '../types.ts';

const cells = (...pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));
const solve = (n: number, folds: FoldOperation[], punches: Cell[]) => {
  const result = simulate(n, folds, punches);
  if (!result) throw new Error('invalid sequence');
  return patternKey(result.holes);
};

describe('geometry', () => {
  it('reflects exactly across grid lines and diagonals', () => {
    expect(apply(reflectAcross({ n: { x: 1, y: 0 }, c: 2 }), { x: 0.5, y: 1.5 })).toEqual({ x: 3.5, y: 1.5 });
    expect(apply(reflectAcross({ n: { x: 1, y: 1 }, c: 4 }), { x: 0.5, y: 1.5 })).toEqual({ x: 2.5, y: 3.5 });
    expect(apply(reflectAcross({ n: { x: 1, y: -1 }, c: 0 }), { x: 0.5, y: 2.5 })).toEqual({ x: 2.5, y: 0.5 });
  });

  it('inverts and composes transforms', () => {
    const m = compose(reflectAcross({ n: { x: 1, y: 1 }, c: 3 }), reflectAcross({ n: { x: 0, y: 1 }, c: 2 }));
    const p = { x: 1.5, y: 0.5 };
    expect(apply(invert(m), apply(m, p))).toEqual(p);
  });

  it('a half-turn about a crease is a reflection; no turn is the identity', () => {
    const line = { n: { x: 1, y: -1 }, c: 1 };
    const p = { x: 3, y: 0.5 };
    expect(apply(scaleAcross(line, 1), p)).toEqual(p);
    expect(apply(scaleAcross(line, -1), p)).toEqual(apply(reflectAcross(line), p));
  });
});

describe('folding', () => {
  it('folds a sheet in half and keeps total area', () => {
    const folded = applyFold(flatSheet(4), { axis: 'vertical', direction: 'positive', position: 2 }, 0)!;
    expect(folded.layers).toHaveLength(2);
    expect(folded.layers.map((l) => l.moved)).toEqual([false, true]);
    expect(folded.layers.reduce((sum, l) => sum + polygonArea(l.region), 0)).toBe(16);
    // Both plies now occupy the right half.
    for (const layer of folded.layers) {
      for (const p of foldedPolygon(layer)) expect(p.x).toBeGreaterThanOrEqual(2);
    }
  });

  it('rejects creases that miss the paper or throw the flap outside the sheet', () => {
    const sheet = flatSheet(4);
    expect(applyFold(sheet, { axis: 'vertical', direction: 'positive', position: 0 }, 0)).toBeNull();
    expect(applyFold(sheet, { axis: 'vertical', direction: 'positive', position: 3 }, 0)).toBeNull();
    expect(applyFold(sheet, { axis: 'vertical', direction: 'negative', position: 3 }, 0)).not.toBeNull();
    const half = applyFold(sheet, { axis: 'vertical', direction: 'positive', position: 2 }, 0)!;
    expect(applyFold(half, { axis: 'vertical', direction: 'positive', position: 1 }, 1)).toBeNull();
  });

  it('reverses ply order when a stack is folded over', () => {
    const states = foldAll(4, [
      { axis: 'vertical', direction: 'positive', position: 2 },
      { axis: 'horizontal', direction: 'positive', position: 2 },
    ])!;
    expect(states[2]!.layers.map((l) => l.flips)).toEqual([0, 1, 3, 2]);
  });
});

describe('punching', () => {
  it('mirrors a hole across a single vertical fold', () => {
    const folds: FoldOperation[] = [{ axis: 'vertical', direction: 'positive', position: 2 }];
    expect(solve(4, folds, cells([2, 1]))).toBe(patternKey(cells([1, 1], [2, 1])));
    expect(solve(4, folds, cells([3, 0]))).toBe(patternKey(cells([0, 0], [3, 0])));
  });

  it('produces four holes from two perpendicular half folds', () => {
    const folds: FoldOperation[] = [
      { axis: 'vertical', direction: 'negative', position: 2 },
      { axis: 'horizontal', direction: 'negative', position: 2 },
    ];
    expect(solve(4, folds, cells([0, 0]))).toBe(patternKey(cells([0, 0], [3, 0], [0, 3], [3, 3])));
  });

  it('only pierces the plies under the punch on an off-centre fold', () => {
    // A one-cell strip folded over: columns 1 is doubled, 2-3 stay single.
    const folds: FoldOperation[] = [{ axis: 'vertical', direction: 'positive', position: 1 }];
    expect(solve(4, folds, cells([1, 2]))).toBe(patternKey(cells([0, 2], [1, 2])));
    expect(solve(4, folds, cells([3, 2]))).toBe(patternKey(cells([3, 2])));
  });

  it('mirrors across a diagonal fold', () => {
    // Fold the lower-left triangle up over the main diagonal.
    const folds: FoldOperation[] = [{ axis: 'diagonal-down', direction: 'positive', position: 0 }];
    const states = foldAll(4, folds)!;
    expect(isPunchable(states[1]!, { x: 1, y: 1 })).toBe(false); // on the crease
    expect(isPunchable(states[1]!, { x: 0, y: 2 })).toBe(false); // paper folded away
    expect(solve(4, folds, cells([2, 0]))).toBe(patternKey(cells([2, 0], [0, 2])));
  });

  it('never offers a punch on a crease or outside the paper', () => {
    const states = foldAll(6, [
      { axis: 'vertical', direction: 'positive', position: 3 },
      { axis: 'diagonal-up', direction: 'negative', position: 6 },
    ])!;
    const spots = punchableCells(states[2]!);
    expect(spots.length).toBeGreaterThan(0);
    for (const spot of spots) {
      expect(spot.x + spot.y + 1).not.toBe(6);
      // The corner beyond the crease was folded away.
      expect(spot.x + spot.y + 1).toBeLessThan(6);
    }
  });
});
