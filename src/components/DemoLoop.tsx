import { useEffect, useMemo, useState } from 'react';
import { DEMO } from './demo.ts';
import { foldScript, unfoldScript, usePlayback, type Script } from './playback.ts';
import { Stage } from './Stage.tsx';

/** Endlessly folds, punches and unfolds the demo sheet. */
export function DemoLoop({ className }: { className?: string }) {
  const script = useMemo<Script>(() => {
    const count = DEMO.puzzle.folds.length;
    const fold = foldScript(count);
    const unfold = unfoldScript(count);
    return {
      segments: [...fold.segments, { ms: 500, at: () => fold.end }, ...unfold.segments, { ms: 1400, at: () => unfold.end }],
      end: unfold.end,
    };
  }, []);
  const [loop, setLoop] = useState(0);
  const { view, playing } = usePlayback(script, `demo-${loop}`);

  useEffect(() => {
    if (playing || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => setLoop((n) => n + 1), 0);
    return () => clearTimeout(id);
  }, [playing]);

  return <Stage puzzle={DEMO.puzzle} sim={DEMO.sim} view={view} className={className} />;
}
