import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  EMPTY_WORK,
  HOLE_RADIUS,
  addFold,
  cellCenter,
  creaseOptions,
  flipLastFold,
  foldFrame,
  punchableCells,
  simulate,
  staticFrame,
  togglePunch,
  workStates,
  type Work,
} from '../engine/index.ts';
import { useT } from '../game/i18n.ts';
import { useSave } from '../game/store.ts';
import { FlipIcon, PunchIcon, RedoIcon, TrashIcon, UndoIcon } from './icons.tsx';
import { PaperCanvas } from './PaperCanvas.tsx';
import { prefersReducedMotion } from './playback.ts';

const FOLD_MS = 420;

export interface WorkHistory {
  work: Work;
  canUndo: boolean;
  canRedo: boolean;
  commit: (next: Work) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

/** The folds and punches made so far, with undo and redo. */
export function useWorkHistory(): WorkHistory {
  const [state, setState] = useState<{ past: Work[]; work: Work; future: Work[] }>({
    past: [],
    work: EMPTY_WORK,
    future: [],
  });
  const commit = useCallback(
    (next: Work) => setState((s) => ({ past: [...s.past, s.work], work: next, future: [] })),
    [],
  );
  const undo = useCallback(
    () =>
      setState((s) =>
        s.past.length === 0
          ? s
          : { past: s.past.slice(0, -1), work: s.past.at(-1)!, future: [s.work, ...s.future] },
      ),
    [],
  );
  const redo = useCallback(
    () =>
      setState((s) =>
        s.future.length === 0 ? s : { past: [...s.past, s.work], work: s.future[0]!, future: s.future.slice(1) },
      ),
    [],
  );
  const reset = useCallback(() => setState({ past: [], work: EMPTY_WORK, future: [] }), []);
  return { work: state.work, canUndo: state.past.length > 0, canRedo: state.future.length > 0, commit, undo, redo, reset };
}

const onActivate = (action: () => void) => (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
};

interface Props {
  gridSize: number;
  history: WorkHistory;
  maxFolds: number;
  maxPunches: number;
  className?: string;
}

/**
 * A sheet the player folds and punches by hand. Clicking a crease folds
 * along it, in the order clicked; in punch mode clicking a spot punches it.
 */
export function Workbench({ gridSize, history, maxFolds, maxPunches, className }: Props) {
  const t = useT();
  const { grid } = useSave().settings;
  const { work, commit } = history;
  const [tool, setTool] = useState<'fold' | 'punch'>('fold');
  const [motion, setMotion] = useState<{ step: number; t: number } | null>(null);
  const frame = useRef(0);

  const states = useMemo(() => workStates(gridSize, work), [gridSize, work]);
  const top = states.at(-1)!;
  const holes = useMemo(() => simulate(gridSize, work.folds, work.punches)?.holes ?? [], [gridSize, work]);

  const canFold = work.punches.length === 0 && work.folds.length < maxFolds;
  const creases = useMemo(
    () => (tool === 'fold' && canFold ? creaseOptions(top, work.folds.length) : []),
    [tool, canFold, top, work.folds.length],
  );
  const spots = useMemo(() => (tool === 'punch' ? punchableCells(top) : []), [tool, top]);
  const flipped = useMemo(() => flipLastFold(gridSize, work), [gridSize, work]);

  const pieces = useMemo(
    () =>
      motion && motion.step < work.folds.length
        ? foldFrame(states, work.folds, motion.step, motion.t)
        : staticFrame(states, states.length - 1, holes),
    [motion, states, work.folds, holes],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const playFold = useCallback((step: number) => {
    cancelAnimationFrame(frame.current);
    if (prefersReducedMotion()) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / FOLD_MS);
      if (p >= 1) return setMotion(null);
      setMotion({ step, t: p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p) });
      frame.current = requestAnimationFrame(tick);
    };
    setMotion({ step, t: 0 });
    frame.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    setMotion(null);
  }, []);

  const fold = (axis: Work['folds'][number]['axis'], position: number) => {
    const next = addFold(gridSize, work, { axis, position });
    if (!next) return;
    commit(next);
    playFold(next.folds.length - 1);
  };

  const flip = () => {
    if (!flipped) return;
    commit(flipped);
    playFold(flipped.folds.length - 1);
  };

  const punch = (x: number, y: number) => {
    const next = togglePunch(gridSize, work, { x, y }, maxPunches);
    if (next) commit(next);
  };

  const { undo, redo, reset } = history;
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || document.querySelector('[role="dialog"]')) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      stop();
      if (key === 'y' || event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [redo, stop, undo]);

  const hint =
    tool === 'punch'
      ? t('hintPunch')
      : work.punches.length > 0
        ? t('hintPunched')
        : creases.length === 0
          ? t('hintNoFolds')
          : t('hintFold');

  const actions = [
    { id: 'undo', label: t('undo'), icon: <UndoIcon width={18} height={18} />, enabled: history.canUndo, run: undo },
    { id: 'redo', label: t('redo'), icon: <RedoIcon width={18} height={18} />, enabled: history.canRedo, run: redo },
    { id: 'flip', label: t('flip'), icon: <FlipIcon width={18} height={18} />, enabled: flipped !== null, run: flip },
    { id: 'clear', label: t('clear'), icon: <TrashIcon width={18} height={18} />, enabled: history.canUndo, run: reset },
  ];

  return (
    <div className={`flex flex-col items-center ${className ?? ''}`}>
      <div className="flex w-full items-center justify-between gap-2 px-1">
        <div role="radiogroup" aria-label={t('modes')} className="bg-sunken flex rounded-full p-1">
          {(['fold', 'punch'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={tool === id}
              onClick={() => setTool(id)}
              data-testid={`tool-${id}`}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${
                tool === id ? 'bg-surface text-ink shadow' : 'text-muted hover:text-ink'
              }`}
            >
              {id === 'punch' && <PunchIcon width={15} height={15} />}
              {id === 'fold' ? t('toolFold') : t('punchCount', { n: work.punches.length, max: maxPunches })}
            </button>
          ))}
        </div>
        <div className="flex">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={!action.enabled}
              onClick={() => {
                stop();
                action.run();
              }}
              aria-label={action.label}
              title={action.label}
              data-testid={action.id}
              className="text-muted enabled:hover:bg-sunken enabled:hover:text-ink grid size-9 place-items-center rounded-full disabled:opacity-30"
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>

      <PaperCanvas gridSize={gridSize} pieces={pieces} mat grid={grid} shadow className="size-(--stage) touch-manipulation">
        {!motion && (
          <g data-testid="bench" data-folds={work.folds.length} data-punches={work.punches.length}>
            {creases.map((crease, i) => {
              const [a, b] = crease.segment;
              const run = () => fold(crease.axis, crease.position);
              return (
                <g
                  key={`${crease.axis}${crease.position}`}
                  className="crease"
                  role="button"
                  tabIndex={0}
                  aria-label={t('creaseLabel', { n: i + 1 })}
                  data-testid={`crease-${crease.axis}-${crease.position}`}
                  onClick={run}
                  onKeyDown={onActivate(run)}
                >
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="crease-under" vectorEffect="non-scaling-stroke" />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="crease-line" vectorEffect="non-scaling-stroke" />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={0.46} strokeLinecap="round" />
                </g>
              );
            })}
            {spots.map((cell) => {
              const c = cellCenter(cell);
              const punched = work.punches.some((p) => p.x === cell.x && p.y === cell.y);
              const run = () => punch(cell.x, cell.y);
              return (
                <g
                  key={`${cell.x},${cell.y}`}
                  className="punch-spot"
                  role="button"
                  tabIndex={0}
                  aria-pressed={punched}
                  aria-label={t('punchLabel', { x: cell.x + 1, y: cell.y + 1 })}
                  data-testid={`punch-${cell.x}-${cell.y}`}
                  onClick={run}
                  onKeyDown={onActivate(run)}
                >
                  <circle cx={c.x} cy={c.y} r={HOLE_RADIUS + 0.05} vectorEffect="non-scaling-stroke" />
                  <circle cx={c.x} cy={c.y} r={0.5} style={{ fill: 'transparent', stroke: 'none' }} />
                </g>
              );
            })}
          </g>
        )}
      </PaperCanvas>

      <p className="text-muted h-5 text-center text-sm" data-testid="bench-hint">
        {hint}
      </p>
    </div>
  );
}
