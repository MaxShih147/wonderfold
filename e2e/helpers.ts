import { expect, type Page } from '@playwright/test';

/**
 * Opens the app as a returning player (tutorial already dismissed) who has
 * already cleared the first `cleared` levels.
 */
export async function openApp(page: Page, hash = '', cleared = 0, reverseCleared = 0) {
  await page.addInitScript(
    ([classic, reverse]) => {
      if (localStorage.getItem('wonderfold:v1')) return;
      const done = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, i) => [i, { bestMs: 5000 }]));
      localStorage.setItem(
        'wonderfold:v1',
        JSON.stringify({
          version: 1,
          settings: { seenHowTo: true, lang: 'en' },
          levels: done(classic!),
          reverse: done(reverse!),
        }),
      );
    },
    [cleared, reverseCleared],
  );
  await page.goto('/' + hash);
}

/** Goes to the home screen without reloading the page. */
export async function goHome(page: Page) {
  await page.evaluate(() => {
    location.hash = '#/';
  });
  await expect(page.getByTestId('mode-classic')).toBeVisible();
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

export function readSave(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('wonderfold:v1')!));
}
