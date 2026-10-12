import { useState } from 'react';
import { DIFFICULTIES } from '../engine/index.ts';
import { LANGUAGES, useLang, useT } from '../game/i18n.ts';
import { accuracy, type ThemeChoice } from '../game/save.ts';
import { formatTime } from '../game/share.ts';
import { resetProgress, setGrid, updateSave, useSave } from '../game/store.ts';
import { DEMO } from './demo.ts';
import { Modal } from './Modal.tsx';
import type { View } from './playback.ts';
import { Stage } from './Stage.tsx';

const HOW_TO_VIEWS: View[] = [
  { kind: 'rest', step: 0, hint: true, holes: false, punchT: null },
  { kind: 'rest', step: DEMO.puzzle.folds.length, hint: false, holes: false, punchT: 0.35 },
  { kind: 'rest', step: 0, hint: false, holes: true, punchT: null },
];

export function HowToDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const steps = [
    { title: t('howTo1Title'), body: t('howTo1') },
    { title: t('howTo2Title'), body: t('howTo2') },
    { title: t('howTo3Title'), body: t('howTo3') },
  ];
  return (
    <Modal title={t('howTo')} onClose={onClose}>
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-4">
            <div className="bg-sunken shrink-0 rounded-2xl p-1">
              <Stage puzzle={DEMO.puzzle} sim={DEMO.sim} view={HOW_TO_VIEWS[i]!} shadow={false} className="size-22" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">
                <span className="text-accent mr-1.5">{i + 1}</span>
                {step.title}
              </h3>
              <p className="text-muted text-[15px] leading-snug">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="bg-sunken text-muted mt-5 rounded-xl px-4 py-3 text-sm leading-snug">{t('howToTip')}</p>
      <button
        type="button"
        onClick={onClose}
        data-testid="howto-close"
        className="bg-accent text-accent-ink mt-5 h-12 w-full rounded-full font-semibold transition hover:brightness-110"
      >
        {t('gotIt')}
      </button>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-sunken rounded-2xl px-3 py-3 text-center">
      <dd className="tabular font-display text-2xl font-semibold">{value}</dd>
      <dt className="text-muted text-xs">{label}</dt>
    </div>
  );
}

export function StatsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { stats, daily } = useSave();
  const played = DIFFICULTIES.reduce((sum, d) => sum + stats.byDifficulty[d].played, 0);
  return (
    <Modal title={t('stats')} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('played')} value={played} />
        <Stat label={t('score')} value={stats.score.toLocaleString()} />
        <Stat label={t('streak')} value={stats.streak} />
        <Stat label={t('bestStreak')} value={stats.bestStreak} />
      </dl>
      {played === 0 ? (
        <p className="text-muted mt-6 text-center">{t('noStats')}</p>
      ) : (
        <table className="mt-5 w-full text-left text-sm">
          <thead className="text-muted text-xs">
            <tr>
              <th className="py-1 font-medium" />
              <th className="py-1 text-right font-medium">{t('played')}</th>
              <th className="py-1 text-right font-medium">{t('accuracy')}</th>
              <th className="py-1 text-right font-medium">{t('avgTime')}</th>
              <th className="py-1 text-right font-medium">{t('bestTime')}</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {DIFFICULTIES.map((d) => {
              const s = stats.byDifficulty[d];
              const rate = accuracy(s);
              return (
                <tr key={d} className="border-line border-t">
                  <th className="py-2.5 font-semibold">{t(d)}</th>
                  <td className="text-right">{s.played}</td>
                  <td className="text-right">{rate === null ? '–' : `${Math.round(rate * 100)}%`}</td>
                  <td className="text-right">{s.correct ? formatTime(s.correctMs / s.correct) : '–'}</td>
                  <td className="text-right">{s.bestMs === null ? '–' : formatTime(s.bestMs)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-2">
        <Stat label={`${t('daily')} · ${t('dayStreak')}`} value={daily.streak} />
        <Stat label={`${t('daily')} · ${t('bestStreak')}`} value={daily.bestStreak} />
      </dl>
    </Modal>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="bg-sunken flex rounded-full p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={`h-10 flex-1 rounded-full text-sm font-semibold transition ${
            value === option.id ? 'bg-surface text-ink shadow' : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const { settings } = useSave();
  const [resetStage, setResetStage] = useState<'idle' | 'confirm' | 'done'>('idle');
  const themes: { id: ThemeChoice; label: string }[] = [
    { id: 'system', label: t('themeSystem') },
    { id: 'light', label: t('themeLight') },
    { id: 'dark', label: t('themeDark') },
  ];

  return (
    <Modal title={t('settings')} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-muted mb-2 text-sm font-medium">{t('language')}</p>
          <Segmented
            label={t('language')}
            value={lang}
            options={LANGUAGES}
            onChange={(next) => updateSave((s) => ({ ...s, settings: { ...s.settings, lang: next } }))}
          />
        </div>
        <div>
          <p className="text-muted mb-2 text-sm font-medium">{t('theme')}</p>
          <Segmented
            label={t('theme')}
            value={settings.theme}
            options={themes}
            onChange={(next) => updateSave((s) => ({ ...s, settings: { ...s.settings, theme: next } }))}
          />
        </div>
        <div>
          <p className="text-muted mb-2 text-sm font-medium">{t('grid')}</p>
          <Segmented
            label={t('grid')}
            value={settings.grid ? 'on' : 'off'}
            options={[
              { id: 'off', label: t('off') },
              { id: 'on', label: t('on') },
            ]}
            onChange={(next) => setGrid(next === 'on')}
          />
        </div>
        <div className="border-line border-t pt-4">
          {resetStage === 'confirm' && <p className="text-bad mb-2 text-sm">{t('resetConfirm')}</p>}
          <button
            type="button"
            disabled={resetStage === 'done'}
            data-testid="reset"
            onClick={() => {
              if (resetStage === 'idle') return setResetStage('confirm');
              resetProgress();
              setResetStage('done');
            }}
            className={`h-11 w-full rounded-full border-2 text-sm font-semibold transition ${
              resetStage === 'confirm' ? 'border-bad bg-bad text-white' : 'border-line text-bad hover:border-bad'
            } disabled:text-muted disabled:border-line`}
          >
            {resetStage === 'done' ? t('resetDone') : t('reset')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
