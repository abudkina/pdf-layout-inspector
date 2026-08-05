/**
 * Короткая GIF-демка: несколько PNG-кадров + сборка через ffmpeg при наличии.
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/screenshots');
const frames = path.join(outDir, 'frames');
const pdf = path.join(__dirname, '../tests/fixtures/sample.pdf');
const base = process.env.BASE_URL || 'http://127.0.0.1:18765';

mkdirSync(frames, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(frames, '01.png') });

await page.locator('#выбор-pdf').setInputFiles(pdf);
await page.waitForSelector('.оверлей--текст', { timeout: 30_000 });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(frames, '02.png') });

const overlay = page.locator('.оверлей--текст').first();
const box = await overlay.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
}
await page.screenshot({ path: path.join(frames, '03.png') });

await page.locator('#прозрачность-разметки').fill('70');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(frames, '04.png') });

await browser.close();

const gifPath = path.join(outDir, 'demo.gif');
try {
  execSync(
    `ffmpeg -y -framerate 1 -i "${path.join(frames, '%02d.png')}" -vf "fps=1,scale=960:-1:flags=lanczos" -loop 0 "${gifPath}"`,
    { stdio: 'inherit' },
  );
  console.info('GIF:', gifPath);
} catch {
  // Без ffmpeg — копируем ключевой кадр как заглушку анимации (PNG)
  copyFileSync(path.join(frames, '02.png'), path.join(outDir, 'demo.png'));
  if (!existsSync(gifPath)) {
    copyFileSync(path.join(frames, '02.png'), gifPath);
  }
  console.info('ffmpeg не найден — сохранён demo.png / demo.gif как кадр разметки');
}
