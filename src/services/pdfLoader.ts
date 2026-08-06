import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { проверитьСигнатуруPdf, проверитьФайл, проверитьUrl } from '../utils/validation';
import { логгер } from '../utils/logger';

// Vite подставит корректный URL с учётом base (GitHub Pages)
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export interface ЗагруженныйPdf {
  документ: PDFDocumentProxy;
  имяФайла: string;
  буфер: ArrayBuffer;
}

/**
 * Загружает PDF из File с полной валидацией.
 */
export async function загрузитьИзФайла(файл: File): Promise<ЗагруженныйPdf> {
  const проверка = проверитьФайл(файл);
  if (!проверка.ок) {
    throw new Error(проверка.ошибка);
  }

  let буфер: ArrayBuffer;
  try {
    буфер = await файл.arrayBuffer();
  } catch {
    throw new Error(
      'Не удалось прочитать файл. Возможно, он занят другой программой.',
    );
  }

  const сигнатура = проверитьСигнатуруPdf(буфер);
  if (!сигнатура.ок) {
    throw new Error(сигнатура.ошибка);
  }

  return открытьДокумент(буфер, файл.name);
}

/**
 * Загружает PDF по URL (CORS должен разрешать).
 */
export async function загрузитьПоUrl(адрес: string): Promise<ЗагруженныйPdf> {
  const проверка = проверитьUrl(адрес);
  if (!проверка.ок) {
    throw new Error(проверка.ошибка);
  }

  let ответ: Response;
  try {
    ответ = await fetch(адрес.trim(), { mode: 'cors' });
  } catch {
    throw new Error(
      'Не удалось загрузить документ по адресу. Проверьте доступность и CORS.',
    );
  }

  if (!ответ.ok) {
    throw new Error(
      `Сервер вернул ошибку ${ответ.status}. Документ недоступен.`,
    );
  }

  const тип = ответ.headers.get('content-type') ?? '';
  if (тип && !тип.includes('pdf') && !тип.includes('octet-stream')) {
    логгер.предупреждение('Неожиданный Content-Type', тип);
  }

  const буфер = await ответ.arrayBuffer();
  const сигнатура = проверитьСигнатуруPdf(буфер);
  if (!сигнатура.ок) {
    throw new Error(сигнатура.ошибка);
  }

  const имя = адрес.split('/').pop()?.split('?')[0] || 'документ.pdf';

  return открытьДокумент(буфер, имя);
}

async function открытьДокумент(
  буфер: ArrayBuffer,
  имяФайла: string,
): Promise<ЗагруженныйPdf> {
  try {
    const задача = pdfjs.getDocument({
      data: new Uint8Array(буфер),
      useSystemFonts: true,
      disableFontFace: false,
      standardFontDataUrl: `${import.meta.env.BASE_URL}standard_fonts/`,
    });
    const документ = await задача.promise;
    логгер.инфо('PDF загружен', {
      имяФайла,
      страниц: документ.numPages,
    });
    return { документ, имяФайла, буфер };
  } catch (ошибка) {
    логгер.ошибка('Ошибка разбора PDF', ошибка);
    throw new Error(
      'Не удалось открыть PDF. Файл повреждён или защищён паролем.',
    );
  }
}

export { pdfjs };
