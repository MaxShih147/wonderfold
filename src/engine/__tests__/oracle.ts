import { cellCenter, cellKey, foldLine, isOnMovingSide } from '../fold.ts';
import { apply, reflectAcross, type Point } from '../geometry.ts';
import type { Cell, FoldOperation } from '../types.ts';

/**
 * Independent oracle. Instead of tracking layers and unfolding them, follow
 * every cell of the flat sheet *forwards* through the folds and see whether
 * it ends up under a punch. Shares no code path with the layer model beyond
 * point reflection.
 */
export function bruteForceHoles(gridSize: number, folds: FoldOperation[], punches: Cell[]): Cell[] {
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
