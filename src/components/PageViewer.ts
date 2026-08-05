import type {
  НастройкиПриложения,
  РазметкаСтраницы,
  ТекстовыйБлок,
} from '../types';
import { Лупа } from './Magnifier';

/**
 * Просмотрщик страницы: canvas + полупрозрачные div-оверлеи.
 */
export class ПросмотрщикСтраницы {
  readonly корень: HTMLElement;
  readonly холст: HTMLCanvasElement;
  private слойРазметки: HTMLElement;
  private лупа: Лупа;
  private текущаяСтраница: РазметкаСтраницы | null = null;
  private настройки: НастройкиПриложения;

  constructor(настройки: НастройкиПриложения) {
    this.настройки = настройки;
    this.корень = document.createElement('div');
    this.корень.className = 'просмотрщик';
    this.корень.setAttribute('role', 'region');
    this.корень.setAttribute('aria-label', 'Просмотр страницы PDF');

    const рамка = document.createElement('div');
    рамка.className = 'просмотрщик__рамка';

    this.холст = document.createElement('canvas');
    this.холст.className = 'просмотрщик__холст';
    this.холст.setAttribute('aria-label', 'Отрисованная страница PDF');
    this.холст.setAttribute('role', 'img');

    this.слойРазметки = document.createElement('div');
    this.слойРазметки.className = 'просмотрщик__разметка';
    this.слойРазметки.setAttribute('aria-hidden', 'true');

    рамка.append(this.холст, this.слойРазметки);
    this.корень.appendChild(рамка);

    this.лупа = new Лупа();

    this.слойРазметки.addEventListener('pointerleave', () => this.лупа.скрыть());
  }

  обновитьНастройки(настройки: НастройкиПриложения): void {
    this.настройки = настройки;
    this.применитьПрозрачность();
    if (this.текущаяСтраница) {
      this.отрисоватьРазметку(this.текущаяСтраница);
    }
  }

  private применитьПрозрачность(): void {
    const значение = String(this.настройки.прозрачностьРазметки);
    this.слойРазметки.style.setProperty('--прозрачность-разметки', значение);
    document.documentElement.style.setProperty(
      '--прозрачность-разметки',
      значение,
    );
  }

  установитьРазмеры(ширина: number, высота: number): void {
    this.слойРазметки.style.width = `${ширина}px`;
    this.слойРазметки.style.height = `${высота}px`;
  }

  отрисоватьРазметку(страница: РазметкаСтраницы): void {
    this.текущаяСтраница = страница;
    this.слойРазметки.replaceChildren();
    this.применитьПрозрачность();

    if (this.настройки.показыватьТекст) {
      for (const блок of страница.тексты) {
        this.слойРазметки.appendChild(this.создатьОверлейТекста(блок));
      }
    }

    if (this.настройки.показыватьИзображения) {
      for (const блок of страница.изображения) {
        const эл = document.createElement('div');
        эл.className = 'оверлей оверлей--изображение';
        эл.style.left = `${блок.прямоугольник.x}px`;
        эл.style.top = `${блок.прямоугольник.y}px`;
        эл.style.width = `${блок.прямоугольник.ширина}px`;
        эл.style.height = `${блок.прямоугольник.высота}px`;
        эл.title = 'Изображение';
        this.слойРазметки.appendChild(эл);
      }
    }
  }

  private создатьОверлейТекста(блок: ТекстовыйБлок): HTMLElement {
    const эл = document.createElement('div');
    эл.className = 'оверлей оверлей--текст';
    эл.style.left = `${блок.прямоугольник.x}px`;
    эл.style.top = `${блок.прямоугольник.y}px`;
    эл.style.width = `${блок.прямоугольник.ширина}px`;
    эл.style.height = `${блок.прямоугольник.высота}px`;
    эл.dataset.id = блок.id;
    эл.setAttribute(
      'aria-label',
      `Текст: ${блок.шрифт.семейство}, ${блок.шрифт.размер} pt`,
    );

    эл.addEventListener('pointerenter', (e) => {
      const rect = this.холст.getBoundingClientRect();
      this.лупа.показать(блок, this.холст, e.clientX, e.clientY, {
        left: rect.left,
        top: rect.top,
      });
    });

    эл.addEventListener('pointermove', (e) => {
      const rect = this.холст.getBoundingClientRect();
      this.лупа.показать(блок, this.холст, e.clientX, e.clientY, {
        left: rect.left,
        top: rect.top,
      });
    });

    эл.addEventListener('pointerleave', () => this.лупа.скрыть());

    return эл;
  }

  очистить(): void {
    this.текущаяСтраница = null;
    this.слойРазметки.replaceChildren();
    const ctx = this.холст.getContext('2d');
    ctx?.clearRect(0, 0, this.холст.width, this.холст.height);
    this.лупа.скрыть();
  }

  уничтожить(): void {
    this.лупа.уничтожить();
  }
}
