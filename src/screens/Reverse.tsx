import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { ArrowIcon } from '../components/icons.tsx';
import { unfoldScript, usePlayback } from '../components/playback.ts';
import { FlatSheet, Stage } from '../components/Stage.tsx';
import { Workbench, useWorkHistory } from '../components/Workbench.tsx';
import { patternKey, simulate } from '../engine/index.ts';
import { useT } from '../game/i18n.ts';
import { LEVEL_COUNT, REVERSE_LEVELS, levelLabel } from '../game/levels.ts';
import { navigate, type Route } from '../game/router.ts';
import { isLevelUnlocked, recordReverseClear } from '../game/save.ts';
import { formatTime } from '../game/share.ts';
import { updateSave, useSave } from '../game/store.ts';

/** Extra folds beyond the reference solution a player may use. */
const SPARE_FOLDS = 2;
const MAP: Route = { name: 'levels', mode: 'reverse' };

/** Plays the player's own folds back open, so they can compare with the target. */
function Unfolding({ puzzle, onDone }: { puzzle: Parameters<typeof Stage>[0]['puzzle']; onDone: () => void }) {
  const sim = useMemo(() => simulate(puzzle.gridSize, puzzle.folds, puzzle.punches)!, [puzzle]);
  const script = useMemo(() => unfoldScript(puzzle.folds.length), [puzzle.folds.length]);
  const { view, playing } = usePlayback(script, 'unfold');
  useEffect(() => {
    if (!playing) onDone();
  }, [playing, onDone]);
  return <Stage puzzle={puzzle} sim={sim} view={view} className="size-(--stage)" />;
}

function Level({ index }: { index: number }) {
  const t = useT();
  const level = REVERSE_LEVELS[index]!;
  const history = useWorkHistory();
  const { work } = history;
  const isLast = index === LEVEL_COUNT - 1;
  const [startedAt] = useState(() => performance.now());
  const [checked, setChecked] = useState<{ matched: boolean; ms: number } | null>(null);
  const [settled, setSettled] = useState(false);

  const mine = useMemo(() => ({ gridSize: level.gridSize, folds: work.folds, punches: work.punches }), [level, work]);

  const check = () => {
    const result = simulate(level.gridSize, work.folds, work.punches);
    if (!result) return;
    const matched = patternKey(result.holes) === patternKey(level.holes);
    const ms = Math.round(performance.now() - startedAt);
    if (matched) updateSave((save) => recordReverseClear(save, index, ms));
    else navigator.vibrate?.(60);
    setSettled(false);
    setChecked({ matched, ms });
  };

  const next = () => navigate(isLast ? MAP : { name: 'reverse', index: index + 1 }, { replace: true });

  return (
    <div className="flex flex-1 flex-col gap-3 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-10">
      <section className="mx-4 flex items-center gap-4 min-[900px]:mx-0 min-[900px]:w-64 min-[900px]:flex-col min-[900px]:items-start">
        <div className="bg-surface shadow-card shrink-0 rounded-2xl p-1.5">
          <FlatSheet
            gridSize={level.gridSize}
            holes={level.holes}
            label={t('target')}
            className="size-28 min-[900px]:size-60"
          />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">{t('target')}</h2>
          <p className="text-muted text-sm leading-snug">{t('punchAllowance', { n: level.punches.length })}</p>
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center gap-3 min-[900px]:flex-none">
        <div className="bg-surface shadow-card mx-4 flex flex-col items-center rounded-3xl px-3 pt-2 pb-3 min-[900px]:mx-0 min-[900px]:p-5">
          {checked ? (
            <Unfolding puzzle={mine} onDone={() => setSettled(true)} />
          ) : (
            <Workbench
              gridSize={level.gridSize}
              history={history}
              maxFolds={level.folds.length + SPARE_FOLDS}
              maxPunches={level.punches.length}
            />
          )}
        </div>

        <div
          className="bg-surface/95 border-line sticky bottom-0 mt-auto flex min-h-[68px] w-screen items-center justify-between gap-3 border-t px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur min-[900px]:static min-[900px]:mt-1 min-[900px]:w-full min-[900px]:rounded-2xl min-[900px]:border min-[900px]:bg-transparent"
          role="status"
          aria-live="polite"
        >
          {checked && settled ? (
            <>
              <div className="animate-pop min-w-0" data-testid="result" data-correct={checked.matched}>
                <p
                  className={`font-display text-xl leading-tight font-semibold ${checked.matched ? 'text-good' : 'text-bad'}`}
                >
                  {t(checked.matched ? 'matched' : 'notMatched')}
                </p>
                <p className="text-muted tabular truncate text-sm">
                  {checked.matched ? formatTime(checked.ms) : t('notMatchedHint')}
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={checked.matched ? next : () => setChecked(null)}
                data-testid={checked.matched ? 'next' : 'retry'}
                className="bg-accent text-accent-ink flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold shadow-sm transition hover:brightness-110 active:scale-[0.97]"
              >
                {checked.matched ? t(isLast ? 'levels' : 'nextLevel') : t('keepEditing')}
                {checked.matched && <ArrowIcon width={18} height={18} />}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={checked !== null || work.punches.length === 0}
              onClick={check}
              data-testid="check"
              className="bg-accent text-accent-ink ml-auto flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold shadow-sm transition enabled:hover:brightness-110 enabled:active:scale-[0.97] disabled:opacity-40"
            >
              {t('check')}
              <ArrowIcon width={18} height={18} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export function Reverse({ index }: { index: number }) {
  const t = useT();
  const unlocked = isLevelUnlocked(useSave().reverse, index);

  // A link to a level that is still locked goes back to the level list.
  useEffect(() => {
    if (!unlocked) navigate(MAP, { replace: true });
  }, [unlocked]);

  if (!unlocked) return null;
  return (
    <div className="bench-layout flex min-h-dvh flex-col">
      <Header title={t('reverseTitle', { label: levelLabel(index) })} back={MAP} />
      <Level key={index} index={index} />
    </div>
  );
}
