/**
 * Renders the app icons and social card to PNG with headless Chromium.
 * Run with `npm run assets` after changing the brand mark.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BG = '#F3EEE3';
const mark = (pad: number) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${32 + 2 * pad} ${32 + 2 * pad}" width="100%" height="100%">
    <rect x="${-pad}" y="${-pad}" width="${32 + 2 * pad}" height="${32 + 2 * pad}" fill="${BG}"/>
    <path d="M6 6h20v12L18 26H6z" fill="#2C44B8"/>
    <path d="M26 18h-8v8z" fill="#B7C4F5" stroke="#4F64C4" stroke-width=".8" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="2.6" fill="${BG}"/>
  </svg>`;

const page = (body: string) =>
  `<html><body style="margin:0;background:${BG};width:100vw;height:100vh;display:flex;align-items:center;justify-content:center">${body}</body></html>`;

const og = page(`
  <div style="display:flex;align-items:center;gap:64px;font-family:Georgia,'Times New Roman',serif;color:#1E2330">
    <div style="width:300px;height:300px">${mark(-3)}</div>
    <div>
      <div style="font-size:92px;font-weight:700;letter-spacing:-2px">Wonderfold</div>
      <div style="font-size:44px;color:#666A7A;margin-top:8px">Fold. Punch. Unfold.</div>
    </div>
  </div>`);

const targets = [
  { file: 'icon-192.png', width: 192, height: 192, html: page(mark(0)) },
  { file: 'icon-512.png', width: 512, height: 512, html: page(mark(0)) },
  // Maskable icons need the mark inside the central safe zone.
  { file: 'icon-maskable-512.png', width: 512, height: 512, html: page(mark(6)) },
  { file: 'apple-touch-icon.png', width: 180, height: 180, html: page(mark(1)) },
  { file: 'og.png', width: 1200, height: 630, html: og },
];

await mkdir('public', { recursive: true });
const browser = await chromium.launch();
for (const target of targets) {
  const tab = await browser.newPage({ viewport: { width: target.width, height: target.height } });
  await tab.setContent(target.html);
  await tab.screenshot({ path: `public/${target.file}` });
  await tab.close();
  console.log(`public/${target.file}`);
}
await browser.close();
