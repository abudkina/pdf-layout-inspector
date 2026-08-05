import type { ТекстовыйБлок } from '../types';
import { округлить } from '../utils/geometry';

const РАЗМЕР_ЛУПЫ = 140;
const МАСШТАБ_ЛУПЫ = 2.2;

/**
 * Лупа при наведении на текстовый блок: увеличенный фрагмент + метрики шрифта.
 */
export class Лупа {
  private корень: HTMLElement;
  private холст: HTMLCanvasElement;
  private подпись: HTMLElement;
  private видна = false;

  constructor() {
    this.корень = document.createElement('div');
    this.корень.className = 'лупа';
    this.корень.setAttribute('role', 'tooltip');
    this.корень.setAttribute('aria-hidden', 'true');
    this.корень.hidden = true;

    this.холст = document.createElement('canvas');
    this.холст.width = РАЗМЕР_ЛУПЫ;
    this.холст.height = РАЗМЕР_ЛУПЫ;
    this.холст.className = 'лупа__холст';
    this.холст.setAttribute('aria-hidden', 'true');

    this.подпись = document.createElement('div');
    this.подпись.className = 'лупа__подпись';

    this.корень.append(this.холст, this.подпись);
    document.body.appendChild(this.корень);
  }

  показать(
    блок: ТекстовыйБлок,
    источник: HTMLCanvasElement,
    клиентX: number,
    клиентY: number,
    смещениеСтраницы: { left: number; top: number },
  ): void {
    const ctx = this.холст.getContext('2d');
    if (!ctx) return;

    const cssW = источник.clientWidth || источник.width;
    const cssH = источник.clientHeight || источник.height;
    const scaleX = источник.width / cssW;
    const scaleY = источник.height / cssH;

    const центрX = блок.прямоугольник.x + блок.прямоугольник.ширина / 2;
    const центрY = блок.прямоугольник.y + блок.прямоугольник.высота / 2;
    const вырез = РАЗМЕР_ЛУПЫ / МАСШТАБ_ЛУПЫ;

    const sx = (центрX - вырез / 2) * scaleX;
    const sy = (центрY - вырез / 2) * scaleY;
    const sw = вырез * scaleX;
    const sh = вырез * scaleY;

    ctx.clearRect(0, 0, РАЗМЕР_ЛУПЫ, РАЗМЕР_ЛУПЫ);
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, РАЗМЕР_ЛУПЫ, РАЗМЕР_ЛУПЫ);

    try {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        источник,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        РАЗМЕР_ЛУПЫ,
        РАЗМЕР_ЛУПЫ,
      );
    } catch {
      // Игнорируем выход за границы холста
    }

    // Рамка центра
    ctx.strokeStyle = 'rgba(61, 139, 253, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, РАЗМЕР_ЛУПЫ - 2, РАЗМЕР_ЛУПЫ - 2);

    const размер = округлить(блок.шрифт.размер, 1);
    this.подпись.innerHTML = `
      <span class="лупа__семейство">${экранировать(блок.шрифт.семейство)}</span>
      <span class="лупа__размер">${размер} pt</span>
      <span class="лупа__текст">${экранировать(обрезать(блок.текст, 40))}</span>
    `;

    const отступ = 16;
    let left = клиентX + отступ;
    let top = клиентY + отступ;

    if (left + РАЗМЕР_ЛУПЫ + 20 > window.innerWidth) {
      left = клиентX - РАЗМЕР_ЛУПЫ - отступ;
    }
    if (top + РАЗМЕР_ЛУПЫ + 80 > window.innerHeight) {
      top = клиентY - РАЗМЕР_ЛУПЫ - 60;
    }

    this.корень.style.left = `${Math.max(8, left)}px`;
    this.корень.style.top = `${Math.max(8, top)}px`;
    this.корень.hidden = false;
    this.корень.setAttribute('aria-hidden', 'false');
    this.видна = true;

    // смещениеСтраницы зарезервировано для будущих расчётов
    void смещениеСтраницы;
  }

  скрыть(): void {
    if (!this.видна) return;
    this.корень.hidden = true;
    this.корень.setAttribute('aria-hidden', 'true');
    this.видна = false;
  }

  уничтожить(): void {
    this.корень.remove();
  }
}

function экранировать(текст: string): string {
  return текст
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function обрезать(текст: string, макс: number): string {
  if (текст.length <= макс) return текст;
  return `${текст.slice(0, макс)}…`;
}
