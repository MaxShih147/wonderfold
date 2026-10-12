import { useCallback, useEffect, useMemo } from 'react';
import { Chip, Header } from '../components/Header.tsx';
import { FlameIcon } from '../components/icons.tsx';
import { Round } from '../components/Round.tsx';
import { generatePuzzle, randomSeed, type Difficulty } from '../engine/index.ts';
import { useT } from '../game/i18n.ts';
import { navigate } from '../game/router.ts';
import { recordAnswer, type AnswerResult } from '../game/save.ts';
import { getSave, updateSave, useSave } from '../game/store.ts';

export function Play({ difficulty, seed }: { difficulty: Difficulty; seed: number | null }) {
  const t = useT();
  const save = useSave();

  // A bare /play/easy link picks a puzzle and pins its seed in the URL so it can be shared.
  useEffect(() => {
    if (seed === null) navigate({ name: 'play', difficulty, seed: randomSeed() }, { replace: true });
  }, [difficulty, seed]);

  const puzzle = useMemo(() => (seed === null ? null : generatePuzzle(seed, difficulty)), [difficulty, seed]);

  const onAnswer = useCallback(
    (result: AnswerResult) => {
      const { save: next, points } = recordAnswer(getSave(), difficulty, result);
      updateSave(() => next);
      return points;
    },
    [difficulty],
  );

  const onNext = useCallback(
    () => navigate({ name: 'play', difficulty, seed: randomSeed() }, { replace: true }),
    [difficulty],
  );

  return (
    <div className="game-layout flex min-h-dvh flex-col">
      <Header title={t(difficulty)} />
      {puzzle && (
        <Round
          key={puzzle.id}
          puzzle={puzzle}
          onAnswer={onAnswer}
          onNext={onNext}
          nextLabel={t('next')}
          status={
            <>
              <Chip label={t('streak')} icon={<FlameIcon width={16} height={16} className="text-bad" />}>
                <span data-testid="streak">{save.stats.streak}</span>
              </Chip>
              <Chip label={t('score')}>
                <span data-testid="score">{save.stats.score.toLocaleString()}</span>
              </Chip>
            </>
          }
        />
      )}
    </div>
  );
}
