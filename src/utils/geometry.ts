import type { Прямоугольник } from '../types';

/** Проверяет, пересекаются ли два прямоугольника */
export function пересекаются(a: Прямоугольник, b: Прямоугольник): boolean {
  return !(
    a.x + a.ширина <= b.x ||
    b.x + b.ширина <= a.x ||
    a.y + a.высота <= b.y ||
    b.y + b.высота <= a.y
  );
}

/** Точка внутри прямоугольника (включительно по левому/верхнему краю) */
export function точкаВнутри(
  x: number,
  y: number,
  прямоугольник: Прямоугольник,
): boolean {
  return (
    x >= прямоугольник.x &&
    x <= прямоугольник.x + прямоугольник.ширина &&
    y >= прямоугольник.y &&
    y <= прямоугольник.y + прямоугольник.высота
  );
}

/** Масштабирует прямоугольник */
export function масштабироватьПрямоугольник(
  прямоугольник: Прямоугольник,
  масштаб: number,
): Прямоугольник {
  return {
    x: прямоугольник.x * масштаб,
    y: прямоугольник.y * масштаб,
    ширина: прямоугольник.ширина * масштаб,
    высота: прямоугольник.высота * масштаб,
  };
}

/** Площадь прямоугольника */
export function площадь(прямоугольник: Прямоугольник): number {
  return Math.max(0, прямоугольник.ширина) * Math.max(0, прямоугольник.высота);
}

/**
 * Преобразует viewport-координаты pdf.js (TextItem.transform)
 * в прямоугольник в системе «сверху-слева».
 */
export function прямоугольникИзTransform(
  transform: number[],
  ширина: number,
  высота: number,
  высотаСтраницы: number,
): Прямоугольник {
  const [, , , , tx, ty] = transform;
  // В PDF начало координат — снизу слева; pdf.js viewport уже учитывает это
  // при применении transform к viewport. Здесь transform уже в viewport-единицах.
  const x = tx;
  const y = высотаСтраницы - ty - высота;
  return {
    x,
    y: Math.max(0, y),
    ширина: Math.abs(ширина),
    высота: Math.abs(высота),
  };
}

/** Оценка размера шрифта из матрицы transform (высота глифа) */
export function размерШрифтаИзTransform(transform: number[]): number {
  const a = transform[0] ?? 0;
  const b = transform[1] ?? 0;
  return Math.hypot(a, b);
}

/** Округление до заданной точности */
export function округлить(значение: number, знаки = 2): number {
  const множитель = 10 ** знаки;
  return Math.round(значение * множитель) / множитель;
}

/** Объединяет близкие текстовые блоки по горизонтали (одна строка) */
export function блокиНаОднойСтроке(
  a: Прямоугольник,
  b: Прямоугольник,
  допускY = 2,
): boolean {
  const центрA = a.y + a.высота / 2;
  const центрB = b.y + b.высота / 2;
  return Math.abs(центрA - центрB) <= допускY;
}

/** Евклидово расстояние между двумя точками (CSS-пиксели) */
export function расстояние(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Перевод CSS-пикселей страницы в пункты PDF.
 * @param масштаб — scale viewport pdf.js
 */
export function пикселиВПункты(пиксели: number, масштаб: number): number {
  const м = масштаб > 0 ? масштаб : 1;
  return пиксели / м;
}

/** Пункты PDF → миллиметры (1 pt = 1/72″) */
export function пунктыВМиллиметры(пункты: number): number {
  return (пункты * 25.4) / 72;
}

/** Форматирование результата линейки */
export function форматИзмерения(
  пиксели: number,
  масштаб: number,
): { пиксели: number; пункты: number; мм: number; текст: string } {
  const px = округлить(пиксели, 1);
  const pt = округлить(пикселиВПункты(пиксели, масштаб), 1);
  const мм = округлить(пунктыВМиллиметры(pt), 2);
  return {
    пиксели: px,
    пункты: pt,
    мм,
    текст: `${px} px · ${pt} pt · ${мм} мм`,
  };
}
