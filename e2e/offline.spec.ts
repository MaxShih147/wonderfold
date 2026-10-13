import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('installs a service worker and plays offline', async ({ page, context, browserName }, testInfo) => {
  test.skip(browserName !== 'chromium' || testInfo.project.name !== 'desktop', 'one browser is enough');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Give the worker a moment to finish precaching.
  await expect
    .poll(() => page.evaluate(async () => (await caches.keys()).length), { timeout: 15_000 })
    .toBeGreaterThan(0);
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.reload();
  await page.getByTestId('howto-close').click();
  await page.getByTestId('mode-classic').click();
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('option-0')).toBeVisible();
});
