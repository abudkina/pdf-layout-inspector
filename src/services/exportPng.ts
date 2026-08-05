import type { РазметкаСтраницы } from '../types';
import { логгер } from '../utils/logger';

/**
 * Экспорт «карты блоков» страницы в PNG.
 * Использует OffscreenCanvas при поддержке, иначе обычный Canvas.
 */
export async function экспортироватьКартуБлоков(
  страница: РазметкаСтраницы,
  фоновыйCanvas: HTMLCanvasElement,
  прозрачность: number,
  имяФайла: string,
): Promise<void> {
  const ширина = Math.floor(фоновыйCanvas.width);
  const высота = Math.floor(фоновыйCanvas.height);
  const cssШирина = фоновыйCanvas.clientWidth || страница.ширина;
  const cssВысота = фоновыйCanvas.clientHeight || страница.высота;
  const масштабX = ширина / cssШирина;
  const масштабY = высота / cssВысота;

  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      await экспортЧерезOffscreen(
        страница,
        фоновыйCanvas,
        ширина,
        высота,
        масштабX,
        масштабY,
        прозрачность,
        имяФайла,
      );
    } else {
      await экспортЧерезCanvas(
        страница,
        фоновыйCanvas,
        ширина,
        высота,
        масштабX,
        масштабY,
        прозрачность,
        имяФайла,
      );
    }
  } catch (ошибка) {
    логгер.ошибка('Ошибка экспорта PNG', ошибка);
    throw new Error('Не удалось экспортировать карту блоков в PNG.');
  }
}

async function экспортЧерезOffscreen(
  страница: РазметкаСтраницы,
  фон: HTMLCanvasElement,
  ширина: number,
  высота: number,
  sx: number,
  sy: number,
  прозрачность: number,
  имяФайла: string,
): Promise<void> {
  const offscreen = new OffscreenCanvas(ширина, высота);
  const ctx = offscreen.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas недоступен.');

  ctx.drawImage(фон, 0, 0);
  нарисоватьРазметку(ctx, страница, sx, sy, прозрачность);

  const blob = await offscreen.convertToBlob({ type: 'image/png' });
  скачатьBlob(blob, имяФайла);
}

async function экспортЧерезCanvas(
  страница: РазметкаСтраницы,
  фон: HTMLCanvasElement,
  ширина: number,
  высота: number,
  sx: number,
  sy: number,
  прозрачность: number,
  имяФайла: string,
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = ширина;
  canvas.height = высота;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D недоступен.');

  ctx.drawImage(фон, 0, 0);
  нарисоватьРазметку(ctx, страница, sx, sy, прозрачность);

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Пустой результат экспорта.'));
        return;
      }
      скачатьBlob(blob, имяФайла);
      resolve();
    }, 'image/png');
  });
}

type КонтекстРисования =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

function нарисоватьРазметку(
  ctx: КонтекстРисования,
  страница: РазметкаСтраницы,
  sx: number,
  sy: number,
  прозрачность: number,
): void {
  const альфа = Math.max(0.15, прозрачность);

  for (const блок of страница.тексты) {
    const { x, y, ширина, высота } = блок.прямоугольник;
    ctx.fillStyle = `rgba(61, 139, 253, ${альфа})`;
    ctx.strokeStyle = `rgba(30, 90, 200, ${Math.min(1, альфа + 0.4)})`;
    ctx.lineWidth = 2 * Math.max(sx, sy);
    ctx.fillRect(x * sx, y * sy, ширина * sx, высота * sy);
    ctx.strokeRect(x * sx, y * sy, ширина * sx, высота * sy);
  }

  for (const блок of страница.изображения) {
    const { x, y, ширина, высота } = блок.прямоугольник;
    ctx.fillStyle = `rgba(243, 156, 18, ${альфа})`;
    ctx.strokeStyle = `rgba(200, 120, 0, ${Math.min(1, альфа + 0.4)})`;
    ctx.lineWidth = 2 * Math.max(sx, sy);
    ctx.fillRect(x * sx, y * sy, ширина * sx, высота * sy);
    ctx.strokeRect(x * sx, y * sy, ширина * sx, высота * sy);
  }
}

function скачатьBlob(blob: Blob, имяФайла: string): void {
  const url = URL.createObjectURL(blob);
  const ссылка = document.createElement('a');
  ссылка.href = url;
  ссылка.download = имяФайла.endsWith('.png') ? имяФайла : `${имяФайла}.png`;
  ссылка.rel = 'noopener';
  document.body.appendChild(ссылка);
  ссылка.click();
  ссылка.remove();
  URL.revokeObjectURL(url);
}

/**
 * Формирует имя файла экспорта.
 */
export function имяФайлаЭкспорта(
  исходноеИмя: string,
  номерСтраницы: number,
): string {
  const база = исходноеИмя.replace(/\.pdf$/i, '') || 'документ';
  return `${база}-карта-стр${номерСтраницы}.png`;
}
