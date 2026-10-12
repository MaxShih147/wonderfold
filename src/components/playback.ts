import { useEffect, useState } from 'react';

/**
 * What the stage is showing.
 *  - `rest`: the paper lying still after `step` folds
 *  - `fold`: fold number `step` in motion, `t` from 0 (flat) to 1 (landed)
 */
export type View =
  | { kind: 'rest'; step: number; hint: boolean; holes: boolean; punchT: number | null }
  | { kind: 'fold'; step: number; t: number; holes: boolean };

export interface Segment {
  ms: number;
  at: (t: number) => View;
}

export interface Script {
  segments: Segment[];
  end: View;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rest = (step: number, extra: Partial<Extract<View, { kind: 'rest' }>> = {}): View => ({
  kind: 'rest',
  step,
  hint: false,
  holes: false,
  punchT: null,
  ...extra,
});

/** Flat sheet → each fold in turn → punch. */
export function foldScript(foldCount: number): Script {
  const segments: Segment[] = [{ ms: 450, at: () => rest(0) }];
  for (let i = 0; i < foldCount; i++) {
    segments.push({ ms: 750, at: () => rest(i, { hint: true }) });
    segments.push({ ms: 850, at: (t) => ({ kind: 'fold', step: i, t: ease(t), holes: false }) });
  }
  segments.push({ ms: 300, at: () => rest(foldCount) });
  segments.push({ ms: 650, at: (t) => rest(foldCount, { punchT: ease(t) }) });
  return { segments, end: rest(foldCount, { holes: true }) };
}

/** Punched stack → each fold undone in reverse → flat sheet with every hole. */
export function unfoldScript(foldCount: number): Script {
  const segments: Segment[] = [{ ms: 550, at: () => rest(foldCount, { holes: true }) }];
  for (let i = foldCount - 1; i >= 0; i--) {
    segments.push({ ms: 800, at: (t) => ({ kind: 'fold', step: i, t: 1 - ease(t), holes: true }) });
    segments.push({ ms: 180, at: () => rest(i, { holes: true }) });
  }
  return { segments, end: rest(0, { holes: true }) };
}

function viewAt(script: Script, elapsed: number): View {
  let remaining = elapsed;
  for (const segment of script.segments) {
    if (remaining < segment.ms) return segment.at(remaining / segment.ms);
    remaining -= segment.ms;
  }
  return script.end;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Plays a script from the start whenever `runKey` changes and returns the
 * current view. With reduced motion the script jumps straight to its end.
 */
export function usePlayback(script: Script, runKey: string): { view: View; playing: boolean } {
  const [clock, setClock] = useState({ runKey, elapsed: 0 });
  const elapsed = clock.runKey === runKey ? clock.elapsed : 0;
  const total = script.segments.reduce((sum, s) => sum + s.ms, 0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setClock({ runKey, elapsed: total });
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const next = now - start;
      setClock({ runKey, elapsed: next });
      if (next < total) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [runKey, total]);

  return { view: viewAt(script, elapsed), playing: elapsed < total };
}
