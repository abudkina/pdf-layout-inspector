import type { PDFDocumentProxy } from 'pdfjs-dist';
import type {
  РазметкаСтраницы,
  ТекстовыйБлок,
  БлокИзображения,
  РазметкаДокумента,
} from '../types';
import {
  округлить,
  размерШрифтаИзTransform,
} from '../utils/geometry';
import { логгер } from '../utils/logger';
import { OPS } from 'pdfjs-dist';

/** Элемент текста из getTextContent */
interface ЭлементТекстаPdf {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
  fontName?: string;
}

function этоTextItem(элемент: unknown): элемент is ЭлементТекстаPdf {
  return (
    typeof элемент === 'object' &&
    элемент !== null &&
    'str' in элемент &&
    'transform' in элемент
  );
}

/** Умножение матриц аффинного преобразования [a,b,c,d,e,f] */
function умножитьМатрицы(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * Извлекает текстовые блоки со страницы.
 */
export async function извлечьТекстСтраницы(
  документ: PDFDocumentProxy,
  номер: number,
  масштаб: number,
): Promise<ТекстовыйБлок[]> {
  const страница = await документ.getPage(номер);
  const viewport = страница.getViewport({ scale: масштаб });
  const содержимое = await страница.getTextContent();

  const блоки: ТекстовыйБлок[] = [];
  let индекс = 0;

  const стили = содержимое.styles as
    | Record<string, { fontFamily?: string }>
    | undefined;

  for (const элемент of содержимое.items) {
    if (!этоTextItem(элемент)) continue;
    if (!элемент.str.trim()) continue;

    const tx = умножитьМатрицы(viewport.transform, элемент.transform);
    const размерБазовый =
      элемент.height && элемент.height > 0
        ? элемент.height
        : размерШрифтаИзTransform(элемент.transform);

    // Высота глифа после viewport (модуль вектора оси Y)
    const высотаШрифта = Math.hypot(tx[2], tx[3]) || размерБазовый * масштаб;
    const масштабированнаяШирина =
      элемент.width !== undefined && элемент.width > 0
        ? элемент.width * масштаб
        : оценитьШирину(элемент.str, высотаШрифта);

    const x = tx[4];
    // tx[5] — базовая линия; верх блока = baseline - ascent≈height
    const y = tx[5] - высотаШрифта;

    блоки.push({
      id: `т-${номер}-${индекс++}`,
      текст: элемент.str,
      прямоугольник: {
        x: округлить(x),
        y: округлить(Math.max(0, y)),
        ширина: округлить(Math.max(масштабированнаяШирина, 1)),
        высота: округлить(Math.max(высотаШрифта, 1)),
      },
      шрифт: {
        семейство: извлечьИмяШрифта(элемент.fontName, стили),
        размер: округлить(размерБазовый, 1),
      },
      уголПоворота: 0,
      страница: номер,
    });
  }

  логгер.отладка(`Текст страницы ${номер}`, { блоков: блоки.length });
  return блоки;
}

function извлечьИмяШрифта(
  fontName: string | undefined,
  styles: Record<string, { fontFamily?: string }> | undefined,
): string {
  if (!fontName) return 'Неизвестный';
  const стиль = styles?.[fontName];
  if (стиль?.fontFamily) {
    return очиститьИмяШрифта(стиль.fontFamily);
  }
  return очиститьИмяШрифта(fontName);
}

function очиститьИмяШрифта(имя: string): string {
  return (
    имя
      .replace(/^.*?[+]/, '')
      .replace(/[,].*$/, '')
      .replace(/['"]/g, '')
      .replace(/^g_d\d+_f\d+$/i, 'Helvetica')
      .trim() || 'Неизвестный'
  );
}

function оценитьШирину(текст: string, размерШрифта: number): number {
  return текст.length * размерШрифта * 0.5;
}

/**
 * Извлекает изображения через operatorList.
 */
export async function извлечьИзображенияСтраницы(
  документ: PDFDocumentProxy,
  номер: number,
  масштаб: number,
): Promise<БлокИзображения[]> {
  try {
    const страница = await документ.getPage(номер);
    const viewport = страница.getViewport({ scale: масштаб });
    const операторы = await страница.getOperatorList();
    const изображения: БлокИзображения[] = [];

    const стекМатриц: number[][] = [[1, 0, 0, 1, 0, 0]];
    let индекс = 0;

    for (let i = 0; i < операторы.fnArray.length; i++) {
      const fn = операторы.fnArray[i];
      const args = операторы.argsArray[i] as unknown[];

      if (fn === OPS.save) {
        стекМатриц.push([...стекМатриц[стекМатриц.length - 1]]);
      } else if (fn === OPS.restore) {
        стекМатриц.pop();
        if (стекМатриц.length === 0) стекМатриц.push([1, 0, 0, 1, 0, 0]);
      } else if (fn === OPS.transform && Array.isArray(args)) {
        const текущая = стекМатриц[стекМатриц.length - 1];
        стекМатриц[стекМатриц.length - 1] = умножитьМатрицы(
          текущая,
          args as number[],
        );
      } else if (
        fn === OPS.paintImageXObject ||
        fn === OPS.paintInlineImageXObject ||
        fn === OPS.paintImageMaskXObject
      ) {
        const ctm = стекМатриц[стекМатриц.length - 1];
        const tx = ctm[4];
        const ty = ctm[5];

        const точка1 = viewport.convertToViewportPoint(tx, ty);
        const точка2 = viewport.convertToViewportPoint(tx + ctm[0], ty + ctm[1]);
        const точка3 = viewport.convertToViewportPoint(tx + ctm[2], ty + ctm[3]);

        const xs = [точка1[0], точка2[0], точка3[0]];
        const ys = [точка1[1], точка2[1], точка3[1]];
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const ширина = maxX - minX;
        const высота = maxY - minY;

        if (ширина > 2 && высота > 2) {
          изображения.push({
            id: `и-${номер}-${индекс++}`,
            прямоугольник: {
              x: округлить(minX),
              y: округлить(minY),
              ширина: округлить(ширина),
              высота: округлить(высота),
            },
            страница: номер,
          });
        }
      }
    }

    return изображения;
  } catch (ошибка) {
    логгер.предупреждение(
      `Не удалось извлечь изображения со страницы ${номер}`,
      ошибка,
    );
    return [];
  }
}

/**
 * Полный разбор документа: тексты + изображения по всем страницам.
 */
export async function разобратьДокумент(
  документ: PDFDocumentProxy,
  имяФайла: string,
  масштаб: number,
  наПрогресс?: (текущая: number, всего: number) => void,
): Promise<РазметкаДокумента> {
  const всего = документ.numPages;
  const страницы: РазметкаСтраницы[] = [];

  for (let номер = 1; номер <= всего; номер++) {
    наПрогресс?.(номер, всего);
    try {
      const страница = await документ.getPage(номер);
      const viewport = страница.getViewport({ scale: масштаб });

      let тексты: ТекстовыйБлок[] = [];
      try {
        тексты = await извлечьТекстСтраницы(документ, номер, масштаб);
      } catch (ошибка) {
        логгер.ошибка(`Ошибка текста стр. ${номер}`, ошибка);
      }

      const изображения = await извлечьИзображенияСтраницы(
        документ,
        номер,
        масштаб,
      );

      страницы.push({
        номер,
        ширина: viewport.width,
        высота: viewport.height,
        тексты,
        изображения,
      });
    } catch (ошибка) {
      логгер.ошибка(`Ошибка разбора страницы ${номер}`, ошибка);
      страницы.push({
        номер,
        ширина: 0,
        высота: 0,
        тексты: [],
        изображения: [],
      });
    }
  }

  return { имяФайла, числоСтраниц: всего, страницы };
}
