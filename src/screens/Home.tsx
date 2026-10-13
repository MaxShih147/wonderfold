import { useState } from 'react';
import { DemoLoop } from '../components/DemoLoop.tsx';
import { HowToDialog, SettingsDialog, StatsDialog } from '../components/Dialogs.tsx';
import { ArrowIcon, ChartIcon, CheckIcon, FlameIcon, GearIcon, HelpIcon, LockIcon } from '../components/icons.tsx';
import { LogoMark } from '../components/Logo.tsx';
import { DAILY_LINEUP, dailyNumber, dateKey } from '../engine/index.ts';
import { useT, type MessageKey } from '../game/i18n.ts';
import { LEVEL_COUNT, LEVELS_PER_TIER, TIER_COUNT, levelLabel, tierSummary } from '../game/levels.ts';
import { navigate } from '../game/router.ts';
import { clearedLevels, currentDailyStreak, isLevelCleared, isLevelUnlocked, nextLevel } from '../game/save.ts';
import { updateSave, useSave } from '../game/store.ts';

type Dialog = 'howto' | 'stats' | 'settings' | null;

export function Home() {
  const t = useT();
  const save = useSave();
  const [dialog, setDialog] = useState<Dialog>(save.settings.seenHowTo ? null : 'howto');
  const today = dateKey(new Date());
  const dailyResults = save.daily.history[today]?.results ?? [];
  const dailyDone = dailyResults.length >= DAILY_LINEUP.length;
  const dayStreak = currentDailyStreak(save, today);
  const cleared = clearedLevels(save, LEVEL_COUNT);
  const upNext = nextLevel(save, LEVEL_COUNT);

  const closeDialog = () => {
    if (dialog === 'howto' && !save.settings.seenHowTo) {
      updateSave((s) => ({ ...s, settings: { ...s.settings, seenHowTo: true } }));
    }
    setDialog(null);
  };

  const toolbar: { id: Exclude<Dialog, null>; label: MessageKey; icon: React.ReactNode }[] = [
    { id: 'howto', label: 'howTo', icon: <HelpIcon /> },
    { id: 'stats', label: 'stats', icon: <ChartIcon /> },
    { id: 'settings', label: 'settings', icon: <GearIcon /> },
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-8">
      <header className="flex h-14 items-center justify-between pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="font-display text-xl font-semibold tracking-tight">Wonderfold</span>
        </div>
        <nav className="-mr-2 flex">
          {toolbar.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDialog(item.id)}
              aria-label={t(item.label)}
              data-testid={`open-${item.id}`}
              className="text-muted hover:bg-sunken hover:text-ink grid size-10 place-items-center rounded-full"
            >
              {item.icon}
            </button>
          ))}
        </nav>
      </header>

      <main className="grid flex-1 items-center gap-8 py-4 min-[900px]:grid-cols-2 min-[900px]:gap-14">
        <section className="flex flex-col items-center text-center min-[900px]:items-start min-[900px]:text-left">
          <div className="bg-surface shadow-card mb-5 rounded-[2rem] p-2 min-[900px]:order-last min-[900px]:mt-8 min-[900px]:mb-0">
            <DemoLoop className="size-44 min-[900px]:size-64" />
          </div>
          <h1 className="font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight min-[900px]:text-6xl">
            {t('tagline')}
          </h1>
          <p className="text-muted mt-3 max-w-sm text-[17px] leading-snug">{t('pitch')}</p>
        </section>

        <section className="mx-auto flex w-full max-w-md flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate({ name: 'daily' })}
            data-testid="start-daily"
            className="bg-accent text-accent-ink group flex items-center justify-between gap-4 rounded-3xl p-5 text-left shadow-lg transition hover:brightness-110 active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium opacity-80">
                #{dailyNumber(today)}
                {dayStreak > 0 && (
                  <span className="ml-2 inline-flex items-center gap-0.5 align-middle">
                    <FlameIcon width={14} height={14} />
                    {dayStreak}
                  </span>
                )}
              </p>
              <h2 className="font-display text-2xl font-semibold">{t('daily')}</h2>
              <p className="mt-0.5 text-sm opacity-85">
                {dailyDone
                  ? `${t('dailyDone')} · ${dailyResults.filter((r) => r.correct).length}/${DAILY_LINEUP.length}`
                  : t('dailyBlurb')}
              </p>
            </div>
            <span className="bg-accent-ink/15 grid size-12 shrink-0 place-items-center rounded-full transition group-hover:translate-x-0.5">
              {dailyDone ? <CheckIcon /> : <ArrowIcon />}
            </span>
          </button>

          <div className="mt-3 flex items-end justify-between px-1">
            <h2 className="text-muted text-sm font-semibold tracking-wide uppercase">{t('levels')}</h2>
            <span className="text-muted tabular text-sm" data-testid="levels-cleared">
              {cleared}/{LEVEL_COUNT}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate({ name: 'level', index: upNext ?? 0 })}
            data-testid="continue"
            className="bg-surface shadow-card border-accent text-accent group flex h-13 items-center justify-between gap-4 rounded-2xl border-2 px-5 text-left font-semibold transition active:scale-[0.99]"
          >
            <span>
              {upNext === null
                ? t('allCleared')
                : `${t(cleared === 0 ? 'play' : 'continue')} · ${t('levelTitle', { label: levelLabel(upNext) })}`}
            </span>
            {upNext === null ? <CheckIcon /> : <ArrowIcon className="transition group-hover:translate-x-0.5" />}
          </button>
          {Array.from({ length: TIER_COUNT }, (_, tier) => {
            const first = tier * LEVELS_PER_TIER;
            const { diagonals, ...summary } = tierSummary(tier);
            const done = Array.from({ length: LEVELS_PER_TIER }, (_, i) => isLevelCleared(save, first + i)).filter(Boolean).length;
            const open = isLevelUnlocked(save, first);
            return (
              <section
                key={tier}
                data-testid={`tier-${tier + 1}`}
                className={`bg-surface shadow-card rounded-2xl px-4 pt-3 pb-4 ${open ? '' : 'opacity-60'}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">{t('tier', { n: tier + 1 })}</h3>
                  <span className="text-muted tabular flex items-center gap-1 text-sm">
                    {!open && <LockIcon width={13} height={13} />}
                    {done}/{LEVELS_PER_TIER}
                  </span>
                </div>
                <p className="text-muted text-sm">{t(diagonals ? 'tierBlurbDiagonal' : 'tierBlurb', summary)}</p>
                <div className="mt-3 grid grid-cols-5 gap-2 min-[440px]:grid-cols-10 min-[440px]:gap-1.5">
                  {Array.from({ length: LEVELS_PER_TIER }, (_, step) => {
                    const index = first + step;
                    const label = levelLabel(index);
                    const state = isLevelCleared(save, index) ? 'cleared' : index === upNext ? 'current' : 'locked';
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
                        onClick={() => navigate({ name: 'level', index })}
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

          {save.stats.bestStreak > 0 && (
            <p className="text-muted tabular mt-2 flex justify-center gap-5 text-sm">
              <span>
                {t('streak')} <b className="text-ink">{save.stats.streak}</b>
              </span>
              <span>
                {t('bestStreak')} <b className="text-ink">{save.stats.bestStreak}</b>
              </span>
              <span>
                {t('score')} <b className="text-ink">{save.stats.score.toLocaleString()}</b>
              </span>
            </p>
          )}
        </section>
      </main>

      {dialog === 'howto' && <HowToDialog onClose={closeDialog} />}
      {dialog === 'stats' && <StatsDialog onClose={closeDialog} />}
      {dialog === 'settings' && <SettingsDialog onClose={closeDialog} />}
    </div>
  );
}
