import { useMemo, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { ArrowIcon, ShareIcon } from '../components/icons.tsx';
import { Round } from '../components/Round.tsx';
import { FlatSheet } from '../components/Stage.tsx';
import { Workbench, useWorkHistory } from '../components/Workbench.tsx';
import { simulate } from '../engine/index.ts';
import {
  CUSTOM_GRIDS,
  CUSTOM_MAX_FOLDS,
  CUSTOM_MAX_PUNCHES,
  customPuzzle,
  decodeCustom,
  encodeCustom,
} from '../game/custom.ts';
import { useT } from '../game/i18n.ts';
import { navigate, routeHash } from '../game/router.ts';
import { shareText } from '../game/share.ts';

const ACTION_BAR =
  'bg-surface/95 border-line sticky bottom-0 mt-auto flex min-h-[68px] w-screen items-center justify-between gap-3 border-t px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur min-[900px]:static min-[900px]:mt-1 min-[900px]:w-full min-[900px]:rounded-2xl min-[900px]:border min-[900px]:bg-transparent';

/** Fold and punch a sheet freely, then turn it into a puzzle link. */
export function Create() {
  const t = useT();
  const history = useWorkHistory();
  const { work, reset } = history;
  const [gridSize, setGridSize] = useState<number>(CUSTOM_GRIDS[0]);
  const [toast, setToast] = useState<string | null>(null);

  const holes = useMemo(() => simulate(gridSize, work.folds, work.punches)?.holes ?? [], [gridSize, work]);
  const puzzle = useMemo(() => customPuzzle(gridSize, work), [gridSize, work]);
  const started = work.folds.length > 0 && work.punches.length > 0;
  const code = puzzle ? encodeCustom(gridSize, work) : null;

  const share = async () => {
    if (!code) return;
    const url = location.origin + location.pathname + routeHash({ name: 'custom', code });
    const outcome = await shareText(url);
    if (outcome === 'shared') return;
    setToast(t(outcome === 'copied' ? 'linkCopied' : 'shareFailed'));
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="bench-layout flex min-h-dvh flex-col">
      <Header title={t('modeCreate')} />
      <div className="flex flex-1 flex-col gap-3 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-10">
        <section className="mx-4 flex items-center gap-4 min-[900px]:mx-0 min-[900px]:w-64 min-[900px]:flex-col min-[900px]:items-start">
          <div className="bg-surface shadow-card shrink-0 rounded-2xl p-1.5">
            <FlatSheet gridSize={gridSize} holes={holes} label={t('preview')} className="size-28 min-[900px]:size-60" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-semibold">{t('preview')}</h2>
            <div role="radiogroup" aria-label={t('paperSize')} className="bg-sunken flex rounded-full p-1">
              {CUSTOM_GRIDS.map((size) => (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={gridSize === size}
                  onClick={() => {
                    if (size === gridSize) return;
                    reset();
                    setGridSize(size);
                  }}
                  data-testid={`grid-${size}`}
                  className={`tabular h-9 rounded-full px-3.5 text-sm font-semibold transition ${
                    gridSize === size ? 'bg-surface text-ink shadow' : 'text-muted hover:text-ink'
                  }`}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center gap-3 min-[900px]:flex-none">
          <div className="bg-surface shadow-card mx-4 flex flex-col items-center rounded-3xl px-3 pt-2 pb-3 min-[900px]:mx-0 min-[900px]:p-5">
            <Workbench
              key={gridSize}
              gridSize={gridSize}
              history={history}
              maxFolds={CUSTOM_MAX_FOLDS}
              maxPunches={CUSTOM_MAX_PUNCHES}
            />
          </div>

          <div className={ACTION_BAR}>
            <p className={`min-w-0 text-sm leading-snug ${toast ? 'text-good font-medium' : 'text-muted'}`} role="status">
              {toast ?? (puzzle ? '' : t(started ? 'createTooPlain' : 'createHint'))}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={!code}
                onClick={() => code && navigate({ name: 'custom', code })}
                data-testid="try"
                className="border-line text-ink enabled:hover:border-accent h-12 rounded-full border-2 px-4 text-[15px] font-semibold transition disabled:opacity-40"
              >
                {t('tryIt')}
              </button>
              <button
                type="button"
                disabled={!code}
                onClick={share}
                data-testid="share-link"
                className="bg-accent text-accent-ink flex h-12 items-center gap-2 rounded-full px-4 text-[15px] font-semibold shadow-sm transition enabled:hover:brightness-110 enabled:active:scale-[0.97] disabled:opacity-40"
              >
                <ShareIcon width={18} height={18} />
                {t('shareLink')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** A puzzle someone made, opened from its link and played like a classic round. */
export function Custom({ code }: { code: string }) {
  const t = useT();
  const puzzle = useMemo(() => {
    const decoded = decodeCustom(code);
    return decoded && customPuzzle(decoded.gridSize, decoded.work);
  }, [code]);

  if (!puzzle) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Header title={t('customTitle')} />
        <p className="text-muted mx-auto max-w-xs px-6 pt-10 text-center">{t('createTooPlain')}</p>
      </div>
    );
  }
  return (
    <div className="game-layout flex min-h-dvh flex-col">
      <Header title={t('customTitle')} />
      <Round
        puzzle={puzzle}
        onAnswer={() => null}
        onNext={() => navigate({ name: 'create' })}
        nextLabel={t('makeYourOwn')}
        status={<ArrowIcon className="hidden" />}
      />
    </div>
  );
}
