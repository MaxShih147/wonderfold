/** The Wonderfold mark: a sheet with one corner folded over and a punched hole. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M4 4h24v14L18 28H4z" fill="var(--paper)" />
      <path d="M28 18H18v10z" fill="var(--paper-back)" stroke="var(--paper-back-edge)" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="11.5" cy="11.5" r="3" fill="var(--bg)" />
    </svg>
  );
}
