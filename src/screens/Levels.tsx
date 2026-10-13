import { Header } from '../components/Header.tsx';
import { ArrowIcon, CheckIcon, LockIcon } from '../components/icons.tsx';
import { useT } from '../game/i18n.ts';
import { LEVEL_COUNT, LEVELS_PER_TIER, TIER_COUNT, levelLabel, tierSummary, type LevelMode } from '../game/levels.ts';
import { navigate } from '../game/router.ts';
import { clearedLevels, isLevelCleared, isLevelUnlocked, nextLevel } from '../game/save.ts';
import { useSave } from '../game/store.ts';

/** The level map of a campaign: five tiers of ten, opened one level at a time. */
export function Levels({ mode }: { mode: LevelMode }) {
  const t = useT();
  const save = useSave();
  const progress = mode === 'classic' ? save.levels : save.reverse;
  const route = mode === 'classic' ? 'level' : 'reverse';
  const titleKey = mode === 'classic' ? 'levelTitle' : 'reverseTitle';
  const cleared = clearedLevels(progress, LEVEL_COUNT);
  const upNext = nextLevel(progress, LEVEL_COUNT);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        title={t(mode === 'classic' ? 'modeClassic' : 'modeReverse')}
        right={
          <span className="text-muted tabular text-sm font-medium" data-testid="levels-cleared">
            {cleared}/{LEVEL_COUNT}
          </span>
        }
      />
      <main className="mx-auto flex w-full max-w-md flex-col gap-3 px-5 pt-2 pb-8">
        <button
          type="button"
          onClick={() => navigate({ name: route, index: upNext ?? 0 })}
          data-testid="continue"
          className="bg-accent text-accent-ink group flex h-14 items-center justify-between gap-4 rounded-2xl px-5 text-left font-semibold shadow-sm transition hover:brightness-110 active:scale-[0.99]"
        >
          <span>
            {upNext === null
              ? t('allCleared')
              : `${t(cleared === 0 ? 'play' : 'continue')} · ${t(titleKey, { label: levelLabel(upNext) })}`}
          </span>
          {upNext === null ? <CheckIcon /> : <ArrowIcon className="transition group-hover:translate-x-0.5" />}
        </button>
        {Array.from({ length: TIER_COUNT }, (_, tier) => {
          const first = tier * LEVELS_PER_TIER;
          const { diagonals, ...summary } = tierSummary(mode, tier);
          const done = Array.from({ length: LEVELS_PER_TIER }, (_, i) => isLevelCleared(progress, first + i)).filter(
            Boolean,
          ).length;
          const open = isLevelUnlocked(progress, first);
          const blurb = mode === 'reverse' ? 'tierBlurbReverse' : diagonals ? 'tierBlurbDiagonal' : 'tierBlurb';
          return (
            <section
              key={tier}
              data-testid={`tier-${tier + 1}`}
              className={`bg-surface shadow-card rounded-2xl px-4 pt-3 pb-4 ${open ? '' : 'opacity-60'}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{t('tier', { n: tier + 1 })}</h2>
                <span className="text-muted tabular flex items-center gap-1 text-sm">
                  {!open && <LockIcon width={13} height={13} />}
                  {done}/{LEVELS_PER_TIER}
                </span>
              </div>
              <p className="text-muted text-sm">{t(blurb, summary)}</p>
              <div className="mt-3 grid grid-cols-5 gap-2 min-[440px]:grid-cols-10 min-[440px]:gap-1.5">
                {Array.from({ length: LEVELS_PER_TIER }, (_, step) => {
                  const index = first + step;
                  const label = levelLabel(index);
                  const state = isLevelCleared(progress, index) ? 'cleared' : index === upNext ? 'current' : 'locked';
                  const look = {
                    cleared: 'bg-accent text-accent-ink hover:brightness-110',
                    current: 'border-accent text-accent border-2',
                    locked: 'bg-sunken text-muted/60',
                  }[state];
                  return (
                    <button
                      key={step}
                      type="button"
                      disabled={state === 'locked'}
                      onClick={() => navigate({ name: route, index })}
                      data-testid={`level-${label}`}
                      data-state={state}
                      aria-label={t(
                        state === 'locked' ? 'levelLocked' : state === 'cleared' ? 'levelCleared' : 'levelTitle',
                        { label },
                      )}
                      className={`tabular grid h-10 place-items-center rounded-xl text-sm font-semibold transition enabled:active:scale-95 ${look}`}
                    >
                      {step}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
