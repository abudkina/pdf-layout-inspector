import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { логгер } from '../utils/logger';

export interface РезультатРендера {
  canvas: HTMLCanvasElement;
  ширина: number;
  высота: number;
  viewport: { width: number; height: number; scale: number };
}

const ТАЙМАУТ_РЕНДЕРА_МС = 45_000;

let текущаяЗадача: RenderTask | null = null;

/**
 * Рендерит страницу PDF на Canvas.
 */
export async function отрисоватьСтраницу(
  документ: PDFDocumentProxy,
  номерСтраницы: number,
  масштаб: number,
  целевойCanvas?: HTMLCanvasElement,
): Promise<РезультатРендера> {
  if (номерСтраницы < 1 || номерСтраницы > документ.numPages) {
    throw new Error(
      `Страница ${номерСтраницы} не существует. В документе ${документ.numPages} стр.`,
    );
  }

  // Отменяем предыдущий рендер, если он ещё идёт
  if (текущаяЗадача) {
    try {
      текущаяЗадача.cancel();
    } catch {
      /* ignore */
    }
    текущаяЗадача = null;
  }

  let страница: PDFPageProxy;
  try {
    страница = await документ.getPage(номерСтраницы);
  } catch (ошибка) {
    логгер.ошибка('Не удалось получить страницу', ошибка);
    throw new Error(`Не удалось загрузить страницу ${номерСтраницы}.`);
  }

  const viewport = страница.getViewport({ scale: масштаб });
  const canvas = целевойCanvas ?? document.createElement('canvas');
  const контекст = canvas.getContext('2d', { alpha: false });

  if (!контекст) {
    throw new Error('Браузер не поддерживает Canvas 2D.');
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  контекст.setTransform(dpr, 0, 0, dpr, 0, 0);
  контекст.fillStyle = '#ffffff';
  контекст.fillRect(0, 0, viewport.width, viewport.height);

  try {
    const задача = страница.render({
      canvasContext: контекст,
      viewport,
      // pdf.js 4.x ожидает явный canvas
      canvas,
    } as Parameters<PDFPageProxy['render']>[0]);
    текущаяЗадача = задача;

    await Promise.race([
      задача.promise,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => {
          try {
            задача.cancel();
          } catch {
            /* ignore */
          }
          reject(
            new Error(
              `Отрисовка страницы ${номерСтраницы} заняла слишком много времени. Попробуйте уменьшить масштаб или другой файл.`,
            ),
          );
        }, ТАЙМАУТ_РЕНДЕРА_МС);
      }),
    ]);
  } catch (ошибка) {
    if (
      ошибка &&
      typeof ошибка === 'object' &&
      'name' in ошибка &&
      (ошибка as { name: string }).name === 'RenderingCancelledException'
    ) {
      логгер.предупреждение('Рендер отменён');
      throw new Error('Отрисовка была прервана. Попробуйте ещё раз.');
    }
    логгер.ошибка('Ошибка рендера страницы', ошибка);
    if (ошибка instanceof Error && ошибка.message.includes('слишком много')) {
      throw ошибка;
    }
    throw new Error(`Не удалось отрисовать страницу ${номерСтраницы}.`);
  } finally {
    текущаяЗадача = null;
    try {
      страница.cleanup();
    } catch {
      /* ignore */
    }
  }

  return {
    canvas,
    ширина: viewport.width,
    высота: viewport.height,
    viewport: {
      width: viewport.width,
      height: viewport.height,
      scale: масштаб,
    },
  };
}
