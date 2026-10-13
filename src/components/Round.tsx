import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { simulate, type Puzzle } from '../engine/index.ts';
import { useT } from '../game/i18n.ts';
import type { AnswerResult } from '../game/save.ts';
import { formatTime } from '../game/share.ts';
import { setGrid, useSave } from '../game/store.ts';
import { ArrowIcon, CheckIcon, CrossIcon, GridIcon, PunchIcon, ReplayIcon } from './icons.tsx';
import { foldScript, unfoldScript, usePlayback, type View } from './playback.ts';
import { FlatSheet, Stage } from './Stage.tsx';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

interface Props {
  puzzle: Puzzle;
  /** Records the answer; returns the points earned, or `null` to show none. */
  onAnswer: (result: AnswerResult) => number | null;
  onNext: () => void;
  nextLabel: string;
  /**
   * When set, a wrong answer does not give the solution away: the player is
   * offered another go instead of the unfold animation.
   */
  onRetry?: () => void;
  /** Shown in the action bar while the puzzle is unanswered. */
  status?: ReactNode;
}

function Timer({ startedAt, stoppedMs }: { startedAt: number; stoppedMs: number | null }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    if (stoppedMs !== null) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [stoppedMs]);
  return (
    <span className="tabular text-muted text-sm font-medium" data-testid="timer">
      {formatTime(stoppedMs ?? now - startedAt)}
    </span>
  );
}

/** One puzzle from first fold to revealed answer. Remount (via `key`) per puzzle. */
export function Round({ puzzle, onAnswer, onNext, nextLabel, onRetry, status }: Props) {
  const t = useT();
  const { grid } = useSave().settings;
  const sim = useMemo(() => {
    const result = simulate(puzzle.gridSize, puzzle.folds, puzzle.punches);
    if (!result) throw new Error(`Puzzle ${puzzle.id} does not simulate`);
    return result;
  }, [puzzle]);
  const foldCount = puzzle.folds.length;

  const [startedAt] = useState(() => performance.now());
  const [answer, setAnswer] = useState<{ index: number; ms: number; points: number | null } | null>(null);
  const [run, setRun] = useState(0);
  const [manual, setManual] = useState<View | null>(null);
  const answered = useRef(false);

  const correct = answer?.index === puzzle.correctIndex;
  // The solution stays hidden after a miss when the player may try again.
  const revealed = answer !== null && (correct || !onRetry);
  const advance = answer !== null && !revealed && onRetry ? onRetry : onNext;

  const script = useMemo(() => (revealed ? unfoldScript(foldCount) : foldScript(foldCount)), [revealed, foldCount]);
  const playback = usePlayback(script, `${revealed ? 'unfold' : 'fold'}-${run}`);
  const view = manual ?? playback.view;
  const thumbs = useMemo(
    () =>
      Array.from({ length: foldCount + 1 }, (_, step): View => {
        const isLast = step === foldCount;
        return { kind: 'rest', step, hint: !isLast, holes: isLast || revealed, punchT: null };
      }),
    [foldCount, revealed],
  );
  const activeStep = view.step;

  const choose = useCallback(
    (index: number) => {
      if (answered.current) return;
      answered.current = true;
      const ms = Math.round(performance.now() - startedAt);
      const correct = index === puzzle.correctIndex;
      const points = onAnswer({ correct, ms });
      if (!correct) navigator.vibrate?.(60);
      setManual(null);
      setAnswer({ index, ms, points });
    },
    [onAnswer, puzzle.correctIndex, startedAt],
  );

  const replay = useCallback(() => {
    setManual(null);
    setRun((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || document.querySelector('[role="dialog"]')) return;
      const key = event.key.toLowerCase();
      const index = ['1', '2', '3', '4'].indexOf(key) >= 0 ? Number(key) - 1 : ['a', 'b', 'c', 'd'].indexOf(key);
      if (index >= 0) {
        choose(index);
      } else if (key === 'r') {
        replay();
      } else if (key === 'enter' && answered.current && !(event.target instanceof HTMLButtonElement)) {
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, choose, replay]);

  return (
    <div className="flex flex-1 flex-col gap-3 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-10">
      {/* Stage */}
      <section className="bg-surface shadow-card mx-4 flex flex-col items-center rounded-3xl px-3 pt-2 pb-3 min-[900px]:mx-0 min-[900px]:p-5">
        <div className="flex w-full items-center justify-between px-1">
          <Timer startedAt={startedAt} stoppedMs={answer?.ms ?? null} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setGrid(!grid)}
              aria-label={t('grid')}
              aria-pressed={grid}
              title={t('grid')}
              data-testid="toggle-grid"
              className={`grid size-9 place-items-center rounded-full ${
                grid ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-sunken hover:text-ink'
              }`}
            >
              <GridIcon width={16} height={16} />
            </button>
            <button
              type="button"
              onClick={replay}
              className="text-muted hover:bg-sunken hover:text-ink flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium"
            >
              <ReplayIcon width={16} height={16} />
              {t('replay')}
            </button>
          </div>
        </div>

        <Stage puzzle={puzzle} sim={sim} view={view} className="size-(--stage)" />

        <div className="mt-1 flex items-center gap-1" data-testid="steps">
          {thumbs.map((thumb, step) => {
            const isLast = step === foldCount;
            const active = activeStep === step;
            return (
              <div key={step} className="flex items-center gap-1">
                {step > 0 && <span className="text-muted/60 text-xs">›</span>}
                <button
                  type="button"
                  onClick={() => setManual(thumb)}
                  aria-label={t('stepLabel', { n: step + 1 })}
                  aria-pressed={active}
                  className={`relative rounded-xl border-2 p-0.5 transition-colors ${
                    active ? 'border-accent bg-accent/10' : 'hover:border-line border-transparent'
                  }`}
                >
                  <Stage puzzle={puzzle} sim={sim} view={thumb} shadow={false} className="size-11 min-[900px]:size-14" />
                  {isLast && (
                    <span className="bg-surface text-muted absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full shadow">
                      <PunchIcon width={12} height={12} />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Answers */}
      <section className="flex flex-1 flex-col items-center gap-3 px-4 min-[900px]:flex-none min-[900px]:px-0">
        <h2 className="text-center text-[15px] font-semibold min-[900px]:text-lg">{t('question')}</h2>
        <div className="grid grid-cols-2 gap-3" role="group" aria-label={t('question')}>
          {puzzle.options.map((holes, index) => {
            const isCorrect = index === puzzle.correctIndex;
            const isChosen = answer?.index === index;
            const state = !answer ? 'idle' : isCorrect && revealed ? 'correct' : isChosen ? 'wrong' : 'dim';
            const ring = {
              idle: 'border-line hover:border-accent hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
              correct: 'border-good bg-good-soft',
              wrong: 'border-bad bg-bad-soft animate-shake',
              dim: 'border-line opacity-45',
            }[state];
            return (
              <button
                key={index}
                type="button"
                disabled={answer !== null}
                onClick={() => choose(index)}
                data-testid={`option-${index}`}
                data-state={state}
                aria-label={t('optionLabel', { letter: LETTERS[index]! })}
                className={`bg-surface shadow-card relative grid size-(--opt) place-items-center rounded-2xl border-2 transition duration-150 ${ring}`}
              >
                <FlatSheet gridSize={puzzle.gridSize} holes={holes} className="size-[86%]" />
                <span
                  className={`absolute top-1.5 left-1.5 grid size-6 place-items-center rounded-full text-xs font-bold ${
                    state === 'correct'
                      ? 'bg-good text-white'
                      : state === 'wrong'
                        ? 'bg-bad text-white'
                        : 'bg-sunken text-muted'
                  }`}
                >
                  {state === 'correct' ? (
                    <CheckIcon width={14} height={14} />
                  ) : state === 'wrong' ? (
                    <CrossIcon width={14} height={14} />
                  ) : (
                    LETTERS[index]
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action bar */}
        <div
          className="bg-surface/95 border-line sticky bottom-0 mt-auto flex min-h-[68px] w-screen items-center justify-between gap-3 border-t px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur min-[900px]:static min-[900px]:mx-0 min-[900px]:mt-1 min-[900px]:w-full min-[900px]:rounded-2xl min-[900px]:border min-[900px]:bg-transparent"
          role="status"
          aria-live="polite"
        >
          {answer ? (
            <>
              <div className="animate-pop min-w-0" data-testid="result" data-correct={correct}>
                <p className={`font-display text-xl leading-tight font-semibold ${correct ? 'text-good' : 'text-bad'}`}>
                  {correct ? t('correct') : t('wrong')}
                </p>
                <p className="text-muted tabular truncate text-sm">
                  {correct
                    ? formatTime(answer.ms)
                    : revealed
                      ? t('answerWas', { letter: LETTERS[puzzle.correctIndex]! })
                      : t('retryHint')}
                  {correct && answer.points !== null && (
                    <span className="text-ink ml-2 font-semibold">{t('points', { n: answer.points })}</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={advance}
                data-testid={revealed ? 'next' : 'retry'}
                className="bg-accent text-accent-ink flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold shadow-sm transition hover:brightness-110 active:scale-[0.97]"
              >
                {revealed ? nextLabel : t('retry')}
                {revealed ? <ArrowIcon width={18} height={18} /> : <ReplayIcon width={18} height={18} />}
              </button>
            </>
          ) : (
            <div className="flex w-full items-center justify-between gap-3">{status}</div>
          )}
        </div>
      </section>
    </div>
  );
}
