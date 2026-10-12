import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { ShareIcon } from '../components/icons.tsx';
import { Round } from '../components/Round.tsx';
import { DAILY_LINEUP, dailyNumber, dailyPuzzles, dateKey } from '../engine/index.ts';
import { useT } from '../game/i18n.ts';
import { navigate } from '../game/router.ts';
import { currentDailyStreak, recordAnswer, recordDailyAnswer, type AnswerResult } from '../game/save.ts';
import { dailyShareText, formatTime, shareText } from '../game/share.ts';
import { getSave, updateSave, useSave } from '../game/store.ts';

const TOTAL = DAILY_LINEUP.length;

function Dots({ results, current }: { results: readonly AnswerResult[]; current: number }) {
  return (
    <div className="flex gap-1.5" data-testid="daily-dots">
      {Array.from({ length: TOTAL }, (_, i) => {
        const result = results[i];
        const tone = result ? (result.correct ? 'bg-good' : 'bg-bad') : i === current ? 'bg-accent' : 'bg-line';
        return <span key={i} className={`size-2.5 rounded-full ${tone}`} />;
      })}
    </div>
  );
}

function Countdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const left = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const part = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="tabular font-display text-2xl font-semibold">
      {part(Math.floor(left / 3600))}:{part(Math.floor((left % 3600) / 60))}:{part(left % 60)}
    </span>
  );
}

function Summary({ day, results }: { day: string; results: readonly AnswerResult[] }) {
  const t = useT();
  const save = useSave();
  const [toast, setToast] = useState<string | null>(null);
  const correct = results.filter((r) => r.correct).length;
  const totalMs = results.reduce((sum, r) => sum + r.ms, 0);

  const share = async () => {
    const url = location.origin + location.pathname;
    const outcome = await shareText(dailyShareText(dailyNumber(day), results, url));
    if (outcome === 'shared') return;
    setToast(t(outcome === 'copied' ? 'copied' : 'shareFailed'));
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <main className="animate-pop mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-6 px-6 pt-6 pb-10 text-center">
      <div>
        <p className="font-display text-6xl font-semibold" data-testid="daily-score">
          {correct}
          <span className="text-muted text-4xl">/{TOTAL}</span>
        </p>
        <p className="text-muted mt-1">{t('resultTitle', { n: correct, total: TOTAL })}</p>
      </div>

      <div className="flex gap-2" aria-hidden="true">
        {results.map((r, i) => (
          <span key={i} className={`size-10 rounded-lg ${r.correct ? 'bg-good' : 'bg-bad'}`} />
        ))}
      </div>

      <dl className="bg-surface shadow-card grid w-full grid-cols-2 divide-x divide-(--line) rounded-2xl py-4">
        <div>
          <dt className="text-muted text-sm">{t('totalTime')}</dt>
          <dd className="tabular font-display text-2xl font-semibold">{formatTime(totalMs)}</dd>
        </div>
        <div>
          <dt className="text-muted text-sm">{t('dayStreak')}</dt>
          <dd className="tabular font-display text-2xl font-semibold">{currentDailyStreak(save, day)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={share}
        data-testid="share"
        className="bg-accent text-accent-ink flex h-13 w-full items-center justify-center gap-2 rounded-full text-base font-semibold shadow-sm transition hover:brightness-110 active:scale-[0.98]"
      >
        <ShareIcon />
        {t('share')}
      </button>
      <p className="text-good h-5 text-sm font-medium" role="status">
        {toast}
      </p>

      <div>
        <p className="text-muted text-sm">{t('nextDaily')}</p>
        <Countdown />
      </div>

      <button
        type="button"
        onClick={() => navigate({ name: 'home' })}
        className="text-accent hover:bg-sunken rounded-full px-5 py-2.5 font-semibold"
      >
        {t('keepPlaying')}
      </button>
    </main>
  );
}

export function Daily() {
  const t = useT();
  const save = useSave();
  const [day] = useState(() => dateKey(new Date()));
  const puzzles = useMemo(() => dailyPuzzles(day), [day]);
  const results = save.daily.history[day]?.results ?? [];

  // Resume where the player left off; a finished day goes straight to the summary.
  const [current, setCurrent] = useState(() => Math.min(results.length, TOTAL - 1));
  const [showSummary, setShowSummary] = useState(() => results.length >= TOTAL);

  const puzzle = puzzles[current]!;

  const onAnswer = useCallback(
    (result: AnswerResult) => {
      const answered = recordAnswer(getSave(), puzzle.difficulty, result);
      updateSave(() => recordDailyAnswer(answered.save, day, result));
      return answered.points;
    },
    [day, puzzle.difficulty],
  );

  const onNext = useCallback(() => {
    if (current >= TOTAL - 1) setShowSummary(true);
    else setCurrent(current + 1);
  }, [current]);

  return (
    <div className="game-layout flex min-h-dvh flex-col">
      <Header
        title={t('dailyTitle', { n: dailyNumber(day) })}
        right={showSummary ? null : <Dots results={results} current={current} />}
      />
      {showSummary ? (
        <Summary day={day} results={results} />
      ) : (
        <Round
          key={puzzle.id}
          puzzle={puzzle}
          onAnswer={onAnswer}
          onNext={onNext}
          nextLabel={current >= TOTAL - 1 ? t('seeResults') : t('next')}
          status={
            <>
              <span className="text-sm font-semibold">
                {current + 1} <span className="text-muted font-medium">/ {TOTAL}</span>
              </span>
              <span className="text-muted text-sm font-medium">{t(puzzle.difficulty)}</span>
            </>
          }
        />
      )}
    </div>
  );
}
