import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { логгер } from '../utils/logger';

export interface РезультатРендера {
  canvas: HTMLCanvasElement;
  ширина: number;
  высота: number;
  viewport: { width: number; height: number; scale: number };
}

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

  try {
    const задача = страница.render({
      canvasContext: контекст,
      viewport,
    });
    await задача.promise;
  } catch (ошибка) {
    логгер.ошибка('Ошибка рендера страницы', ошибка);
    throw new Error(`Не удалось отрисовать страницу ${номерСтраницы}.`);
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
