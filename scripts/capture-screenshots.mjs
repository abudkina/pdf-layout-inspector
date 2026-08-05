/**
 * Снимает скриншоты UI для README.
 * Запуск при поднятом dev-сервере: node scripts/capture-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/screenshots');
const pdf = path.join(__dirname, '../tests/fixtures/sample.pdf');
const base = process.env.BASE_URL || 'http://127.0.0.1:18765';

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(base, { waitUntil: 'networkidle' });
await page.screenshot({
  path: path.join(outDir, 'ui-overview.png'),
  fullPage: false,
});

await page.locator('#выбор-pdf').setInputFiles(pdf);
await page.waitForSelector('.оверлей--текст', { timeout: 30_000 });
await page.waitForTimeout(500);
await page.screenshot({
  path: path.join(outDir, 'markup.png'),
  fullPage: false,
});

const overlay = page.locator('.оверлей--текст').first();
const box = await overlay.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, 'magnifier.png'),
    fullPage: false,
  });
}

await page.setViewportSize({ width: 320, height: 640 });
await page.goto(base, { waitUntil: 'networkidle' });
await page.screenshot({
  path: path.join(outDir, 'mobile-320.png'),
  fullPage: false,
});

await browser.close();
console.info('Скриншоты сохранены в', outDir);
