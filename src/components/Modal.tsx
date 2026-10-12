import { useEffect, useRef, type ReactNode } from 'react';
import { useT } from '../game/i18n.ts';
import { CrossIcon } from './icons.tsx';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: Props) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="animate-pop bg-surface text-ink max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="text-muted hover:bg-sunken hover:text-ink -mr-2 grid size-10 place-items-center rounded-full"
          >
            <CrossIcon strokeWidth={2.2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
