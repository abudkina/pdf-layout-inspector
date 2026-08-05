import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfПуть = path.join(__dirname, '../fixtures/sample.pdf');

test.describe('PDF Layout Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'PDF Layout Inspector' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('главная страница на русском', async ({ page }) => {
    await expect(page.getByText('Перетащите PDF сюда')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Загрузить PDF по адресу' })).toBeVisible();
  });

  test('валидация пустого URL', async ({ page }) => {
    await page.getByRole('button', { name: 'Загрузить PDF по адресу' }).click();
    await expect(page.getByRole('alert')).toContainText(/Введите адрес/i);
  });

  test('валидация некорректного URL', async ({ page }) => {
    await page.getByLabel('Адрес PDF-документа').fill('это-не-url');
    await page.getByRole('button', { name: 'Загрузить PDF по адресу' }).click();
    await expect(page.getByRole('alert')).toContainText(/Некорректный|адрес/i);
  });

  test('загрузка PDF и появление разметки', async ({ page }) => {
    await page.locator('#выбор-pdf').setInputFiles(pdfПуть);

    await expect(page.getByText(/Документ .* загружен/i)).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByLabel('Прозрачность разметки')).toBeVisible();
    await expect(page.getByLabel('Отрисованная страница PDF')).toBeVisible();
    await expect(page.locator('.оверлей--текст').first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('слайдер прозрачности меняет CSS-переменную', async ({ page }) => {
    await page.locator('#выбор-pdf').setInputFiles(pdfПуть);
    await expect(page.getByLabel('Прозрачность разметки')).toBeVisible({
      timeout: 45_000,
    });

    const слайдер = page.getByLabel('Прозрачность разметки');
    await слайдер.fill('10');
    await expect(page.locator('#прозрачность-значение')).toHaveText('10%');

    const прозрачность = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--прозрачность-разметки')
        .trim(),
    );
    expect(прозрачность).toBe('0.1');
  });

  test('переключение чекбоксов текста', async ({ page }) => {
    await page.locator('#выбор-pdf').setInputFiles(pdfПуть);
    await expect(page.locator('.оверлей--текст').first()).toBeVisible({
      timeout: 45_000,
    });

    await page.locator('#показать-текст').uncheck();
    await expect(page.locator('.оверлей--текст')).toHaveCount(0);

    await page.locator('#показать-текст').check();
    await expect(page.locator('.оверлей--текст').first()).toBeVisible();
  });

  test('экспорт PNG и закрытие документа', async ({ page }) => {
    await page.locator('#выбор-pdf').setInputFiles(pdfПуть);
    await expect(
      page.getByRole('button', { name: 'Экспортировать карту блоков в PNG' }),
    ).toBeVisible({ timeout: 45_000 });

    const [скачивание] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      page.getByRole('button', { name: 'Экспортировать карту блоков в PNG' }).click(),
    ]);
    expect(скачивание.suggestedFilename()).toMatch(/карта.*\.png$/i);

    await page.getByRole('button', { name: 'Закрыть документ' }).click();
    await expect(page.getByText('Перетащите PDF сюда')).toBeVisible();
  });

  test('адаптив 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'PDF Layout Inspector' })).toBeVisible();
    const ширина = await page
      .locator('.загрузка__зона')
      .evaluate((el) => el.clientWidth);
    expect(ширина).toBeLessThanOrEqual(304);
    expect(ширина).toBeGreaterThan(200);
  });
});
