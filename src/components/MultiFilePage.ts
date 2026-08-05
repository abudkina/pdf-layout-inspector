import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { НастройкиПриложения } from '../types';
import { проверитьИзображение } from '../utils/validation';
import {
  процентыИзПрозрачности,
  прозрачностьИзПроцентов,
} from '../utils/validation';
import { Линейка } from './Ruler';
import { логгер } from '../utils/logger';

export interface СобытияМультиФайла {
  наОшибку: (текст: string) => void;
  наУспех: (текст: string) => void;
  наПрозрачностьСлоя: (значение: number) => void;
  наЛинейку: (вкл: boolean) => void;
}

/**
 * Страница «Мульти-файл»: PDF + картинка слоями.
 */
export class СтраницаМультиФайл {
  readonly корень: HTMLElement;
  private холстPdf!: HTMLCanvasElement;
  private слойКартинки!: HTMLImageElement;
  private рамка!: HTMLElement;
  private вводPdf!: HTMLInputElement;
  private вводКартинки!: HTMLInputElement;
  private слайдер!: HTMLInputElement;
  private меткаПрозрачности!: HTMLElement;
  private чекЛинейка!: HTMLInputElement;
  private смещениеX!: HTMLInputElement;
  private смещениеY!: HTMLInputElement;
  private масштабСлоя!: HTMLInputElement;
  private статус!: HTMLElement;
  private линейка: Линейка;

  private документ: PDFDocumentProxy | null = null;
  private urlКартинки: string | null = null;
  private настройки: НастройкиПриложения;
  private ширинаСтраницы = 0;

  constructor(
    private события: СобытияМультиФайла,
    настройки: НастройкиПриложения,
  ) {
    this.настройки = настройки;
    this.линейка = new Линейка();
    this.корень = document.createElement('section');
    this.корень.className = 'мульти';
    this.корень.setAttribute('aria-label', 'Мульти-файл');
    this.собрать();
    this.применитьНастройки(настройки);
  }

  private собрать(): void {
    this.корень.innerHTML = `
      <div class="мульти__интро">
        <h2 class="мульти__заголовок">Мульти-файл</h2>
        <p class="мульти__описание">
          Загрузите PDF и картинку — наложите слоями, чтобы сверить макет с вёрсткой.
        </p>
      </div>

      <div class="мульти__загрузки">
        <label class="мульти__карточка">
          <span class="мульти__карточка-название">1. PDF-страница</span>
          <span class="мульти__карточка-подсказка">Нижний слой</span>
          <input type="file" accept="application/pdf,.pdf" id="мульти-pdf" aria-label="Выбрать PDF для наложения" />
        </label>
        <label class="мульти__карточка">
          <span class="мульти__карточка-название">2. Картинка</span>
          <span class="мульти__карточка-подсказка">PNG, JPEG, WebP, GIF</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif" id="мульти-картинка" aria-label="Выбрать картинку для наложения" />
        </label>
      </div>

      <div class="мульти__панель" aria-label="Настройки слоёв">
        <div class="панель__группа">
          <label class="панель__лейбл" for="мульти-прозрачность">
            Прозрачность картинки
            <span class="панель__значение" id="мульти-прозрачность-значение">55%</span>
          </label>
          <input type="range" id="мульти-прозрачность" class="панель__слайдер" min="0" max="100" step="1" aria-label="Прозрачность картинки" />
        </div>
        <div class="панель__группа">
          <label class="панель__лейбл" for="мульти-смещение-x">Смещение X (px)</label>
          <input type="number" id="мульти-смещение-x" class="панель__страница" value="0" step="1" aria-label="Смещение картинки по горизонтали" />
        </div>
        <div class="панель__группа">
          <label class="панель__лейбл" for="мульти-смещение-y">Смещение Y (px)</label>
          <input type="number" id="мульти-смещение-y" class="панель__страница" value="0" step="1" aria-label="Смещение картинки по вертикали" />
        </div>
        <div class="панель__группа">
          <label class="панель__лейбл" for="мульти-масштаб-слоя">Масштаб картинки (%)</label>
          <input type="number" id="мульти-масштаб-слоя" class="панель__страница" value="100" min="10" max="300" step="1" aria-label="Масштаб картинки в процентах" />
        </div>
        <div class="панель__группа панель__группа--чекбоксы">
          <label class="панель__чек">
            <input type="checkbox" id="мульти-линейка" />
            <span>Линейка</span>
          </label>
        </div>
        <div class="панель__группа панель__группа--действия">
          <button type="button" class="панель__кнопка панель__кнопка--вторичная" id="мульти-сброс" aria-label="Сбросить слои мульти-файла">
            Сбросить слои
          </button>
        </div>
      </div>

      <p class="мульти__статус" id="мульти-статус" role="status">Загрузите PDF и картинку.</p>

      <div class="просмотрщик мульти__просмотр" hidden>
        <div class="просмотрщик__рамка" id="мульти-рамка">
          <canvas class="просмотрщик__холст" id="мульти-холст" role="img" aria-label="Страница PDF в мульти-файле"></canvas>
          <img class="мульти__слой-картинки" id="мульти-слой" alt="Наложенная картинка" hidden />
        </div>
      </div>
    `;

    this.вводPdf = this.корень.querySelector('#мульти-pdf')!;
    this.вводКартинки = this.корень.querySelector('#мульти-картинка')!;
    this.слайдер = this.корень.querySelector('#мульти-прозрачность')!;
    this.меткаПрозрачности = this.корень.querySelector(
      '#мульти-прозрачность-значение',
    )!;
    this.чекЛинейка = this.корень.querySelector('#мульти-линейка')!;
    this.смещениеX = this.корень.querySelector('#мульти-смещение-x')!;
    this.смещениеY = this.корень.querySelector('#мульти-смещение-y')!;
    this.масштабСлоя = this.корень.querySelector('#мульти-масштаб-слоя')!;
    this.статус = this.корень.querySelector('#мульти-статус')!;
    this.холстPdf = this.корень.querySelector('#мульти-холст')!;
    this.слойКартинки = this.корень.querySelector('#мульти-слой')!;
    this.рамка = this.корень.querySelector('#мульти-рамка')!;

    this.линейка.прикрепить(this.рамка);

    this.вводPdf.addEventListener('change', () => {
      const файл = this.вводPdf.files?.[0];
      if (файл) void this.загрузитьPdf(файл);
      this.вводPdf.value = '';
    });

    this.вводКартинки.addEventListener('change', () => {
      const файл = this.вводКартинки.files?.[0];
      if (файл) void this.загрузитьКартинку(файл);
      this.вводКартинки.value = '';
    });

    this.слайдер.addEventListener('input', () => {
      const п = Number(this.слайдер.value);
      this.меткаПрозрачности.textContent = `${п}%`;
      const значение = прозрачностьИзПроцентов(п);
      this.слойКартинки.style.opacity = String(значение);
      this.события.наПрозрачностьСлоя(значение);
    });

    const обновитьПозицию = () => this.применитьТрансформКартинки();
    this.смещениеX.addEventListener('input', обновитьПозицию);
    this.смещениеY.addEventListener('input', обновитьПозицию);
    this.масштабСлоя.addEventListener('input', обновитьПозицию);

    this.чекЛинейка.addEventListener('change', () => {
      this.линейка.установитьВключено(this.чекЛинейка.checked);
      this.события.наЛинейку(this.чекЛинейка.checked);
    });

    this.корень.querySelector('#мульти-сброс')!.addEventListener('click', () => {
      this.сбросить();
      this.события.наУспех('Слои мульти-файла сброшены.');
    });
  }

  применитьНастройки(настройки: НастройкиПриложения): void {
    this.настройки = настройки;
    const проценты = процентыИзПрозрачности(настройки.прозрачностьСлояКартинки);
    this.слайдер.value = String(проценты);
    this.меткаПрозрачности.textContent = `${проценты}%`;
    this.слойКартинки.style.opacity = String(настройки.прозрачностьСлояКартинки);
    this.чекЛинейка.checked = настройки.линейкаВключена;
    this.линейка.установитьМасштаб(настройки.масштаб);
    this.линейка.установитьВключено(настройки.линейкаВключена);
  }

  показать(видима: boolean): void {
    this.корень.hidden = !видима;
    if (!видима) this.линейка.выключить();
    else if (this.настройки.линейкаВключена) this.линейка.включить();
  }

  private async загрузитьPdf(файл: File): Promise<void> {
    try {
      const { загрузитьИзФайла } = await import('../services/pdfLoader');
      const загруженный = await загрузитьИзФайла(файл);
      if (this.документ) await this.документ.destroy();
      this.документ = загруженный.документ;

      const { отрисоватьСтраницу } = await import('../services/pdfRenderer');
      const результат = await отрисоватьСтраницу(
        this.документ,
        1,
        this.настройки.масштаб,
        this.холстPdf,
      );
      this.ширинаСтраницы = результат.ширина;
      this.рамка.style.width = `${результат.ширина}px`;
      this.рамка.style.height = `${результат.высота}px`;
      this.линейка.установитьМасштаб(this.настройки.масштаб);
      this.линейка.прикрепить(this.рамка);
      this.корень.querySelector('.мульти__просмотр')!.removeAttribute('hidden');
      this.обновитьСтатус();
      this.события.наУспех(`PDF «${загруженный.имяФайла}» загружен (стр. 1).`);
    } catch (ошибка) {
      логгер.ошибка('Мульти-файл: PDF', ошибка);
      this.события.наОшибку(
        ошибка instanceof Error ? ошибка.message : 'Не удалось загрузить PDF.',
      );
    }
  }

  private async загрузитьКартинку(файл: File): Promise<void> {
    const проверка = проверитьИзображение(файл);
    if (!проверка.ок) {
      this.события.наОшибку(проверка.ошибка || 'Ошибка изображения.');
      return;
    }

    try {
      if (this.urlКартинки) URL.revokeObjectURL(this.urlКартинки);
      this.urlКартинки = URL.createObjectURL(файл);
      await new Promise<void>((resolve, reject) => {
        this.слойКартинки.onload = () => resolve();
        this.слойКартинки.onerror = () =>
          reject(new Error('Не удалось прочитать изображение.'));
        this.слойКартинки.src = this.urlКартинки!;
      });
      this.слойКартинки.hidden = false;
      this.применитьТрансформКартинки();
      this.корень.querySelector('.мульти__просмотр')!.removeAttribute('hidden');
      this.обновитьСтатус();
      this.события.наУспех(`Картинка «${файл.name}» наложена.`);
    } catch (ошибка) {
      логгер.ошибка('Мульти-файл: картинка', ошибка);
      this.события.наОшибку(
        ошибка instanceof Error
          ? ошибка.message
          : 'Не удалось загрузить картинку.',
      );
    }
  }

  private применитьТрансформКартинки(): void {
    const x = Number(this.смещениеX.value) || 0;
    const y = Number(this.смещениеY.value) || 0;
    const масштаб = Math.max(10, Number(this.масштабСлоя.value) || 100) / 100;
    const базаШирина =
      this.ширинаСтраницы || this.слойКартинки.naturalWidth || 0;
    this.слойКартинки.style.width = `${базаШирина * масштаб}px`;
    this.слойКартинки.style.height = 'auto';
    this.слойКартинки.style.transform = `translate(${x}px, ${y}px)`;
    this.слойКартинки.style.opacity = String(
      this.настройки.прозрачностьСлояКартинки,
    );
  }

  private обновитьСтатус(): void {
    const pdf = this.документ ? 'PDF ✓' : 'PDF —';
    const img = this.urlКартинки ? 'картинка ✓' : 'картинка —';
    this.статус.textContent = `Слои: ${pdf}, ${img}`;
  }

  сбросить(): void {
    void this.документ?.destroy();
    this.документ = null;
    if (this.urlКартинки) URL.revokeObjectURL(this.urlКартинки);
    this.urlКартинки = null;
    this.слойКартинки.removeAttribute('src');
    this.слойКартинки.hidden = true;
    const ctx = this.холстPdf.getContext('2d');
    ctx?.clearRect(0, 0, this.холстPdf.width, this.холстPdf.height);
    this.смещениеX.value = '0';
    this.смещениеY.value = '0';
    this.масштабСлоя.value = '100';
    this.корень.querySelector('.мульти__просмотр')!.setAttribute('hidden', '');
    this.обновитьСтатус();
    this.статус.textContent = 'Загрузите PDF и картинку.';
  }

  уничтожить(): void {
    this.сбросить();
    this.линейка.открепить();
  }
}
