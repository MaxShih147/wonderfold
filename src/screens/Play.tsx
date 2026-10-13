import { useCallback, useEffect, useState } from 'react';
import { Chip, Header } from '../components/Header.tsx';
import { CheckIcon } from '../components/icons.tsx';
import { Round } from '../components/Round.tsx';
import { useT } from '../game/i18n.ts';
import { LEVEL_COUNT, LEVELS, levelLabel } from '../game/levels.ts';
import { navigate } from '../game/router.ts';
import { clearedLevels, isLevelCleared, isLevelUnlocked, recordLevelAnswer, type AnswerResult } from '../game/save.ts';
import { getSave, updateSave, useSave } from '../game/store.ts';

export function Play({ index }: { index: number }) {
  const t = useT();
  const save = useSave();
  const puzzle = LEVELS[index]!;
  const unlocked = isLevelUnlocked(save, index);
  const isLast = index === LEVEL_COUNT - 1;
  const [attempt, setAttempt] = useState(0);

  // A link to a level that is still locked goes back to the level list.
  useEffect(() => {
    if (!unlocked) navigate({ name: 'home' }, { replace: true });
  }, [unlocked]);

  const onAnswer = useCallback(
    (result: AnswerResult) => {
      const { save: next, points } = recordLevelAnswer(getSave(), index, puzzle.difficulty, result);
      updateSave(() => next);
      return points;
    },
    [index, puzzle.difficulty],
  );

  const onNext = useCallback(
    () => navigate(isLast ? { name: 'home' } : { name: 'level', index: index + 1 }, { replace: true }),
    [index, isLast],
  );
  const onRetry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!unlocked) return null;

  return (
    <div className="game-layout flex min-h-dvh flex-col">
      <Header title={t('levelTitle', { label: levelLabel(index) })} />
      <Round
        key={`${puzzle.id}-${attempt}`}
        puzzle={puzzle}
        onAnswer={onAnswer}
        onNext={onNext}
        onRetry={onRetry}
        nextLabel={isLast ? t('home') : t('nextLevel')}
        status={
          <>
            <Chip label={t('levels')}>
              <span data-testid="progress">
                {clearedLevels(save, LEVEL_COUNT)}/{LEVEL_COUNT}
              </span>
            </Chip>
            {isLevelCleared(save, index) ? (
              <Chip label={t('cleared')} icon={<CheckIcon width={16} height={16} className="text-good" />}>
                {null}
              </Chip>
            ) : (
              <Chip label={t('score')}>
                <span data-testid="score">{save.stats.score.toLocaleString()}</span>
              </Chip>
            )}
          </>
        }
      />
    </div>
  );
}
