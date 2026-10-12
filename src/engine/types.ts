import type { Point } from './geometry.ts';

export type { Point };

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

/**
 * Orientation of the crease:
 *  - `vertical`       crease is the line x = position
 *  - `horizontal`     crease is the line y = position
 *  - `diagonal-down`  crease is x − y = position (runs ↘ on screen)
 *  - `diagonal-up`    crease is x + y = position (runs ↗ on screen)
 */
export type FoldAxis = 'vertical' | 'horizontal' | 'diagonal-down' | 'diagonal-up';

export interface FoldOperation {
  axis: FoldAxis;
  /**
   * Which way the flap travels. `positive` folds the low side of the crease
   * (smaller x, smaller y, or smaller x∓y) over onto the high side.
   */
  direction: 'positive' | 'negative';
  position: number;
}

/** A grid cell, addressed by column `x` and row `y` (origin top-left). */
export type Cell = Point;

export type DistractorKind =
  | 'missed-fold'
  | 'wrong-fold'
  | 'shifted-punch'
  | 'transformed'
  | 'nudged-hole'
  | 'missing-hole'
  | 'extra-hole';

export interface Puzzle {
  id: string;
  seed: number;
  gridSize: number;
  folds: FoldOperation[];
  /** Cells punched on the folded paper, in folded-space coordinates. */
  punches: Cell[];
  /** Four candidate hole patterns on the unfolded sheet. */
  options: Cell[][];
  correctIndex: number;
  difficulty: Difficulty;
  /** The mistake each option models; `null` for the correct one. */
  optionKinds: (DistractorKind | null)[];
  /** Heuristic complexity score, higher is harder. */
  rating: number;
}
