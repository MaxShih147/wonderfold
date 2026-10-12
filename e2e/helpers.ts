import { expect, type Page } from '@playwright/test';

/** Opens the app as a returning player (tutorial already dismissed). */
export async function openApp(page: Page, hash = '') {
  await page.addInitScript(() => {
    if (!localStorage.getItem('wonderfold:v1')) {
      localStorage.setItem('wonderfold:v1', JSON.stringify({ version: 1, settings: { seenHowTo: true, lang: 'en' } }));
    }
  });
  await page.goto('/' + hash);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

export function readSave(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('wonderfold:v1')!));
}
