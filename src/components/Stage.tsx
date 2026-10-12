import { memo, useMemo } from 'react';
import {
  flatSheet,
  foldFrame,
  foldHint,
  staticFrame,
  type Cell,
  type Piece,
  type Puzzle,
  type Simulation,
} from '../engine/index.ts';
import { useSave } from '../game/store.ts';
import { PaperCanvas } from './PaperCanvas.tsx';
import type { View } from './playback.ts';

/** Holes pop through in the last moments of the punch animation. */
const PUNCH_THROUGH = 0.8;

interface StageProps {
  puzzle: Pick<Puzzle, 'gridSize' | 'folds' | 'punches'>;
  sim: Simulation;
  view: View;
  className?: string;
  shadow?: boolean;
}

/** The paper at one moment of the fold / punch / unfold sequence. */
export const Stage = memo(function Stage({ puzzle, sim, view, className, shadow = true }: StageProps) {
  const { grid } = useSave().settings;
  const pieces = useMemo<Piece[]>(() => {
    const punched = view.holes || (view.kind === 'rest' && (view.punchT ?? 0) >= PUNCH_THROUGH);
    const holes = punched ? sim.holes : [];
    return view.kind === 'fold'
      ? foldFrame(sim.states, puzzle.folds, view.step, view.t, holes)
      : staticFrame(sim.states, view.step, holes);
  }, [puzzle, sim, view]);

  const hint = useMemo(
    () =>
      view.kind === 'rest' && view.hint && view.step < puzzle.folds.length
        ? foldHint(sim.states, puzzle.folds, view.step)
        : null,
    [puzzle, sim, view],
  );

  const punch = view.kind === 'rest' && view.punchT !== null ? { cells: puzzle.punches, t: view.punchT } : null;

  return (
    <PaperCanvas gridSize={puzzle.gridSize} pieces={pieces} hint={hint} punch={punch} mat grid={grid} shadow={shadow} compact={!shadow} className={className} />
  );
});

/** An unfolded sheet with a given hole pattern, as shown on the answer cards. */
interface FlatSheetProps {
  gridSize: number;
  holes: readonly Cell[];
  className?: string;
  label?: string;
}

export const FlatSheet = memo(function FlatSheet({ gridSize, holes, className, label }: FlatSheetProps) {
  const { grid } = useSave().settings;
  const pieces = useMemo(() => staticFrame([flatSheet(gridSize)], 0, holes), [gridSize, holes]);
  return <PaperCanvas gridSize={gridSize} pieces={pieces} grid={grid} className={className} label={label} />;
});
