import { expect, test } from '@playwright/test';
import { dailyPuzzles, dateKey, generatePuzzle } from '../src/engine/index.ts';
import { expectNoHorizontalScroll, openApp, readSave } from './helpers.ts';

test('first visit shows the tutorial once, then the home screen', async ({ page }) => {
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('howto-close').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fold. Punch. Unfold.');
  await page.reload();
  await expect(page.getByTestId('start-easy')).toBeVisible();
  await expect(dialog).toBeHidden();
  await expectNoHorizontalScroll(page);
});

test('a correct answer scores, builds a streak and persists', async ({ page }) => {
  const puzzle = generatePuzzle(42, 'easy');
  await openApp(page, '#/play/easy/42');

  await expect(page.getByTestId('option-0')).toBeVisible();
  await expect(page.getByTestId('steps').getByRole('button')).toHaveCount(puzzle.folds.length + 1);
  await page.getByTestId(`option-${puzzle.correctIndex}`).click();

  await expect(page.getByTestId('result')).toHaveAttribute('data-correct', 'true');
  await expect(page.getByTestId(`option-${puzzle.correctIndex}`)).toHaveAttribute('data-state', 'correct');
  await expect(page.getByTestId('option-0')).toBeDisabled();

  const save = await readSave(page);
  expect(save.stats.streak).toBe(1);
  expect(save.stats.score).toBeGreaterThanOrEqual(100);
  expect(save.stats.byDifficulty.easy).toMatchObject({ played: 1, correct: 1 });

  await page.getByTestId('next').click();
  await expect(page.getByTestId('result')).toBeHidden();
  await expect(page).not.toHaveURL(/easy\/42$/);
  await expect(page.getByTestId('streak')).toHaveText('1');

  await page.reload();
  await expect(page.getByTestId('streak')).toHaveText('1');
});

test('a wrong answer reveals the right one and resets the streak', async ({ page }) => {
  const puzzle = generatePuzzle(7, 'hard');
  const wrong = (puzzle.correctIndex + 1) % 4;
  await openApp(page, '#/play/hard/7');

  await page.getByTestId(`option-${wrong}`).click();
  await expect(page.getByTestId('result')).toHaveAttribute('data-correct', 'false');
  await expect(page.getByTestId(`option-${wrong}`)).toHaveAttribute('data-state', 'wrong');
  await expect(page.getByTestId(`option-${puzzle.correctIndex}`)).toHaveAttribute('data-state', 'correct');

  const save = await readSave(page);
  expect(save.stats.streak).toBe(0);
  expect(save.stats.byDifficulty.hard).toMatchObject({ played: 1, correct: 0 });
});

test('the keyboard can answer and advance', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard is a desktop affordance');
  const puzzle = generatePuzzle(99, 'medium');
  await openApp(page, '#/play/medium/99');
  await expect(page.getByTestId('option-0')).toBeVisible();
  await page.keyboard.press(String(puzzle.correctIndex + 1));
  await expect(page.getByTestId('result')).toHaveAttribute('data-correct', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('result')).toBeHidden();
});

test('step thumbnails and replay control the stage', async ({ page }) => {
  await openApp(page, '#/play/medium/5');
  const steps = page.getByTestId('steps').getByRole('button');
  await steps.first().click();
  await expect(steps.first()).toHaveAttribute('aria-pressed', 'true');
  await steps.last().click();
  await expect(steps.last()).toHaveAttribute('aria-pressed', 'true');
  await expect(steps.first()).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(steps.first()).toHaveAttribute('aria-pressed', 'true');
});

test('the whole round fits on screen without scrolling sideways', async ({ page }) => {
  await openApp(page, '#/play/hard/7');
  await expect(page.getByTestId('option-3')).toBeVisible();
  await expectNoHorizontalScroll(page);
  const viewport = page.viewportSize()!;
  for (const id of ['option-0', 'option-1', 'option-2', 'option-3']) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, `${id} is above the fold`).toBeLessThanOrEqual(viewport.height);
    expect(box.width).toBeGreaterThanOrEqual(96);
  }
});

test('the daily challenge runs five puzzles, then shows a shareable result', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await openApp(page);
  // Use the browser's own date so the test agrees with the app at any hour.
  const today = await page.evaluate(() => {
    const d = new Date();
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  });
  const puzzles = dailyPuzzles(dateKey(new Date(today[0]!, today[1]! - 1, today[2]!)));

  await page.getByTestId('start-daily').click();
  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = puzzles[i]!;
    // Miss the third one on purpose.
    const pick = i === 2 ? (puzzle.correctIndex + 1) % 4 : puzzle.correctIndex;
    await page.getByTestId(`option-${pick}`).click();
    await expect(page.getByTestId('result')).toHaveAttribute('data-correct', String(i !== 2));
    await page.getByTestId('next').click();
  }

  await expect(page.getByTestId('daily-score')).toHaveText('4/5');
  await expectNoHorizontalScroll(page);

  // One attempt per day: coming back shows the result, not the puzzles.
  await page.reload();
  await expect(page.getByTestId('daily-score')).toHaveText('4/5');
  await expect(page.getByTestId('option-0')).toHaveCount(0);

  const save = await readSave(page);
  expect(save.daily.streak).toBe(1);

  await page.goto('/#/');
  await expect(page.getByTestId('start-daily')).toContainText('4/5');
});

test('a half-finished daily challenge resumes where it stopped', async ({ page }) => {
  await openApp(page, '#/daily');
  await page.getByTestId('option-0').click();
  await expect(page.getByTestId('result')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('option-0')).toBeEnabled();
  const save = await readSave(page);
  const results = Object.values(save.daily.history)[0] as { results: unknown[] };
  expect(results.results).toHaveLength(1);
});

test('settings switch language and theme, and reset progress', async ({ page }) => {
  await openApp(page, '#/play/easy/1');
  await page.getByTestId('option-0').click();
  await page.getByRole('button', { name: 'Home' }).click();

  await page.getByTestId('open-settings').click();
  await page.getByRole('radio', { name: '繁體中文' }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('設定');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await page.getByRole('radio', { name: 'English' }).click();

  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByTestId('reset').click();
  await page.getByTestId('reset').click();
  const save = await readSave(page);
  expect(save.stats.byDifficulty.easy.played).toBe(0);
  expect(save.settings.theme).toBe('dark');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('grid lines are off by default and the player can turn them on', async ({ page }) => {
  await openApp(page, '#/play/medium/5');
  const option = page.getByTestId('option-0').locator('svg');
  const toggle = page.getByTestId('toggle-grid');
  await expect(option).toHaveAttribute('data-grid', 'false');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(option).toHaveAttribute('data-grid', 'true');
  expect((await readSave(page)).settings.grid).toBe(true);

  // The choice sticks, and the settings dialog controls the same switch.
  await page.reload();
  await expect(page.getByTestId('option-0').locator('svg')).toHaveAttribute('data-grid', 'true');
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByTestId('open-settings').click();
  await expect(page.getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Off', exact: true }).click();
  expect((await readSave(page)).settings.grid).toBe(false);
});

test('statistics reflect what was played', async ({ page }) => {
  const puzzle = generatePuzzle(3, 'easy');
  await openApp(page, '#/play/easy/3');
  await page.getByTestId(`option-${puzzle.correctIndex}`).click();
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByTestId('open-stats').click();
  const row = page.getByRole('row', { name: /Easy/ });
  await expect(row).toContainText('100%');
});

test('unknown links fall back to the home screen', async ({ page }) => {
  await openApp(page, '#/play/impossible/1');
  await expect(page.getByTestId('start-easy')).toBeVisible();
});

test('respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, '#/play/easy/42');
  const steps = page.getByTestId('steps').getByRole('button');
  // With no animation the stage starts on the final, punched state.
  await expect(steps.last()).toHaveAttribute('aria-pressed', 'true');
});
