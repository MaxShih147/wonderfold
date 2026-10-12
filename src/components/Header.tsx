import type { ReactNode } from 'react';
import { useT } from '../game/i18n.ts';
import { navigate } from '../game/router.ts';
import { BackIcon } from './icons.tsx';

export function Header({ title, right }: { title: ReactNode; right?: ReactNode }) {
  const t = useT();
  return (
    <header className="mx-auto grid h-13 w-full max-w-5xl shrink-0 grid-cols-[1fr_auto_1fr] items-center px-2 pt-[env(safe-area-inset-top)]">
      <button
        type="button"
        onClick={() => navigate({ name: 'home' })}
        aria-label={t('home')}
        className="text-muted hover:bg-sunken hover:text-ink grid size-10 place-items-center rounded-full"
      >
        <BackIcon />
      </button>
      <h1 className="font-display text-lg font-semibold">{title}</h1>
      <div className="flex items-center justify-end gap-2 pr-2">{right}</div>
    </header>
  );
}

export function Chip({ icon, children, label }: { icon?: ReactNode; children: ReactNode; label: string }) {
  return (
    <span className="text-ink tabular flex items-center gap-1.5 text-sm font-semibold" title={label}>
      {icon}
      <span className="text-muted font-medium">{label}</span>
      {children}
    </span>
  );
}
