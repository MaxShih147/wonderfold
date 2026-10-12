import { useState } from 'react';
import { DemoLoop } from '../components/DemoLoop.tsx';
import { HowToDialog, SettingsDialog, StatsDialog } from '../components/Dialogs.tsx';
import { ArrowIcon, ChartIcon, CheckIcon, FlameIcon, GearIcon, HelpIcon } from '../components/icons.tsx';
import { LogoMark } from '../components/Logo.tsx';
import { DAILY_LINEUP, DIFFICULTIES, dailyNumber, dateKey } from '../engine/index.ts';
import { useT, type MessageKey } from '../game/i18n.ts';
import { navigate } from '../game/router.ts';
import { accuracy, currentDailyStreak } from '../game/save.ts';
import { updateSave, useSave } from '../game/store.ts';

type Dialog = 'howto' | 'stats' | 'settings' | null;

const DOTS: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

export function Home() {
  const t = useT();
  const save = useSave();
  const [dialog, setDialog] = useState<Dialog>(save.settings.seenHowTo ? null : 'howto');
  const today = dateKey(new Date());
  const dailyResults = save.daily.history[today]?.results ?? [];
  const dailyDone = dailyResults.length >= DAILY_LINEUP.length;
  const dayStreak = currentDailyStreak(save, today);

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

          <h2 className="text-muted mt-3 px-1 text-sm font-semibold tracking-wide uppercase">{t('practice')}</h2>
          {DIFFICULTIES.map((difficulty) => {
            const rate = accuracy(save.stats.byDifficulty[difficulty]);
            return (
              <button
                key={difficulty}
                type="button"
                onClick={() => navigate({ name: 'play', difficulty, seed: null })}
                data-testid={`start-${difficulty}`}
                className="bg-surface shadow-card border-line hover:border-accent group flex items-center justify-between gap-4 rounded-2xl border-2 px-5 py-4 text-left transition active:scale-[0.99]"
              >
                <div>
                  <h3 className="font-display flex items-center gap-2.5 text-xl font-semibold">
                    {t(difficulty)}
                    <span className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={`size-1.5 rounded-full ${n <= DOTS[difficulty]! ? 'bg-accent' : 'bg-line'}`} />
                      ))}
                    </span>
                  </h3>
                  <p className="text-muted text-sm">{t(`${difficulty}Blurb`)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {rate !== null && (
                    <span className="text-muted tabular text-sm" title={t('accuracy')}>
                      {Math.round(rate * 100)}%
                    </span>
                  )}
                  <ArrowIcon className="text-muted group-hover:text-accent transition group-hover:translate-x-0.5" />
                </div>
              </button>
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
