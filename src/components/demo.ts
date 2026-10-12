import { simulate, type FoldOperation, type Cell } from '../engine/index.ts';

/** A fixed, friendly puzzle used for the home animation and the tutorial. */
const folds: FoldOperation[] = [
  { axis: 'vertical', direction: 'positive', position: 2 },
  { axis: 'horizontal', direction: 'positive', position: 2 },
];
const punches: Cell[] = [{ x: 3, y: 3 }];

export const DEMO = {
  puzzle: { gridSize: 4, folds, punches },
  sim: simulate(4, folds, punches)!,
};
