import type { PDFDocumentProxy } from 'pdfjs-dist';
import type {
  НастройкиПриложения,
  РазметкаДокумента,
  СтраницаПриложения,
} from '../types';
import {
  экспортироватьКартуБлоков,
  имяФайлаЭкспорта,
} from '../services/exportPng';
import { загрузитьНастройки, сохранитьНастройки } from '../utils/storage';
import { логгер } from '../utils/logger';
import { ЗонаЗагрузки } from '../components/UploadZone';
import { ПанельИнструментов } from '../components/Toolbar';
import { ПросмотрщикСтраницы } from '../components/PageViewer';
import { Уведомления } from '../components/Toast';
import { СтраницаМультиФайл } from '../components/MultiFilePage';

/**
 * Корневое приложение PDF Layout Inspector.
 */
export class Приложение {
  private корень: HTMLElement;
  private настройки: НастройкиПриложения;
  private уведомления: Уведомления;
  private зонаЗагрузки: ЗонаЗагрузки;
  private панель: ПанельИнструментов;
  private просмотрщик: ПросмотрщикСтраницы;
  private мульти: СтраницаМультиФайл;
  private индикатор!: HTMLElement;
  private статистика!: HTMLElement;
  private навигация!: HTMLElement;
  private разделИнспектор!: HTMLElement;

  private документ: PDFDocumentProxy | null = null;
  private разметка: РазметкаДокумента | null = null;
  private занят = false;

  constructor(контейнер: HTMLElement) {
    this.корень = контейнер;
    this.настройки = загрузитьНастройки();
    this.уведомления = new Уведомления();

    this.зонаЗагрузки = new ЗонаЗагрузки(
      (файл) => void this.открытьФайл(файл),
      (url) => void this.открытьUrl(url),
    );

    this.панель = new ПанельИнструментов(
      {
        наПрозрачность: (v) => this.обновитьНастройку({ прозрачностьРазметки: v }),
        наПереключениеТекста: (v) =>
          this.обновитьНастройку({ показыватьТекст: v }),
        наПереключениеИзображений: (v) =>
          this.обновитьНастройку({ показыватьИзображения: v }),
        наМасштаб: (v) => void this.сменитьМасштаб(v),
        наСтраницу: (n) => {
          if (this.занят) return;
          void this.показатьСтраницу(n);
        },
        наЛинейку: (v) => this.обновитьНастройку({ линейкаВключена: v }),
        наЭкспорт: () => void this.экспорт(),
        наСброс: () => this.сброс(),
      },
      this.настройки,
    );

    this.просмотрщик = new ПросмотрщикСтраницы(this.настройки);
    this.мульти = new СтраницаМультиФайл(
      {
        наОшибку: (т) => this.уведомления.ошибка(т),
        наУспех: (т) => this.уведомления.успех(т),
        наПрозрачностьСлоя: (v) =>
          this.обновитьНастройку({ прозрачностьСлояКартинки: v }),
        наЛинейку: (v) => this.обновитьНастройку({ линейкаВключена: v }),
      },
      this.настройки,
    );

    this.собратьРазметку();
    this.панель.установитьАктивность(false);
    this.переключитьСтраницу(this.настройки.страница);
  }

  private собратьРазметку(): void {
    this.корень.innerHTML = '';
    this.корень.className = 'приложение';

    const шапка = document.createElement('header');
    шапка.className = 'шапка';
    шапка.innerHTML = `
      <div class="шапка__ряд">
        <div class="шапка__бренд">
          <img src="${import.meta.env.BASE_URL}favicon.svg" alt="" width="36" height="36" class="шапка__лого" />
          <div>
            <h1 class="шапка__название">PDF Layout Inspector</h1>
            <p class="шапка__слоган">Проверка вёрстки: текст, изображения, шрифты</p>
          </div>
        </div>
        <nav class="шапка__навигация" aria-label="Разделы приложения">
          <button type="button" class="шапка__вкладка" data-страница="инспектор" aria-label="Раздел Инспектор">
            Инспектор
          </button>
          <button type="button" class="шапка__вкладка" data-страница="мульти" aria-label="Раздел Мульти-файл">
            Мульти-файл
          </button>
        </nav>
      </div>
    `;
    this.навигация = шапка.querySelector('.шапка__навигация')!;
    this.навигация.querySelectorAll('.шапка__вкладка').forEach((кнопка) => {
      кнопка.addEventListener('click', () => {
        const стр = (кнопка as HTMLElement).dataset.страница as СтраницаПриложения;
        this.переключитьСтраницу(стр);
      });
    });

    this.индикатор = document.createElement('div');
    this.индикатор.className = 'индикатор';
    this.индикатор.hidden = true;
    this.индикатор.setAttribute('role', 'status');
    this.индикатор.setAttribute('aria-live', 'polite');
    this.индикатор.innerHTML = `
      <div class="индикатор__полоса" aria-hidden="true"></div>
      <p class="индикатор__текст">Загрузка…</p>
    `;

    this.статистика = document.createElement('p');
    this.статистика.className = 'статистика';
    this.статистика.hidden = true;

    this.разделИнспектор = document.createElement('div');
    this.разделИнспектор.className = 'раздел-инспектор';
    this.разделИнспектор.append(
      this.зонаЗагрузки.корень,
      this.панель.корень,
      this.индикатор,
      this.статистика,
      this.просмотрщик.корень,
    );

    const основная = document.createElement('main');
    основная.className = 'основная';
    основная.append(this.разделИнспектор, this.мульти.корень);

    const подвал = document.createElement('footer');
    подвал.className = 'подвал';
    подвал.innerHTML = `
      <p>Бесплатный инструмент для верстальщиков и дизайнеров. Все данные обрабатываются локально в браузере.</p>
    `;

    this.корень.append(шапка, основная, подвал);
    this.панель.корень.hidden = true;
    this.просмотрщик.корень.hidden = true;
  }

  private переключитьСтраницу(страница: СтраницаПриложения): void {
    this.обновитьНастройку({ страница });
    const инспектор = страница === 'инспектор';
    this.разделИнспектор.hidden = !инспектор;
    this.мульти.показать(!инспектор);
    this.мульти.применитьНастройки(this.настройки);

    this.навигация.querySelectorAll('.шапка__вкладка').forEach((кнопка) => {
      const активна =
        (кнопка as HTMLElement).dataset.страница === страница;
      кнопка.classList.toggle('шапка__вкладка--активна', активна);
      кнопка.setAttribute('aria-current', активна ? 'page' : 'false');
    });
  }

  private обновитьНастройку(часть: Partial<НастройкиПриложения>): void {
    this.настройки = { ...this.настройки, ...часть };
    сохранитьНастройки(this.настройки);
    this.просмотрщик.обновитьНастройки(this.настройки);
    if (this.настройки.страница === 'мульти') {
      this.мульти.применитьНастройки(this.настройки);
    }
  }

  private показатьЗагрузку(текст: string): void {
    this.индикатор.hidden = false;
    const t = this.индикатор.querySelector('.индикатор__текст');
    if (t) t.textContent = текст;
  }

  private скрытьЗагрузку(): void {
    this.индикатор.hidden = true;
  }

  private async открытьФайл(файл: File): Promise<void> {
    if (this.занят) return;
    this.занят = true;
    this.показатьЗагрузку('Чтение файла…');
    try {
      const { загрузитьИзФайла } = await import('../services/pdfLoader');
      const загруженный = await загрузитьИзФайла(файл);
      await this.инициализироватьДокумент(
        загруженный.документ,
        загруженный.имяФайла,
      );
    } catch (ошибка) {
      this.обработатьОшибку(ошибка);
    } finally {
      this.занят = false;
      this.скрытьЗагрузку();
    }
  }

  private async открытьUrl(url: string): Promise<void> {
    if (this.занят) return;
    this.занят = true;
    this.показатьЗагрузку('Загрузка по адресу…');
    try {
      const { загрузитьПоUrl } = await import('../services/pdfLoader');
      const загруженный = await загрузитьПоUrl(url);
      await this.инициализироватьДокумент(
        загруженный.документ,
        загруженный.имяФайла,
      );
    } catch (ошибка) {
      this.обработатьОшибку(ошибка);
    } finally {
      this.занят = false;
      this.скрытьЗагрузку();
    }
  }

  private async инициализироватьДокумент(
    документ: PDFDocumentProxy,
    имяФайла: string,
  ): Promise<void> {
    if (this.документ) {
      await this.документ.destroy();
    }
    this.документ = документ;
    this.показатьЗагрузку('Анализ разметки…');

    const { разобратьДокумент } = await import('../services/textExtractor');
    const { обработатьРазметкуВВоркере } = await import(
      '../services/layoutWorkerClient'
    );

    const сырая = await разобратьДокумент(
      документ,
      имяФайла,
      this.настройки.масштаб,
      (текущая, всего) => {
        this.показатьЗагрузку(`Анализ страницы ${текущая} из ${всего}…`);
      },
    );

    const страницы = await обработатьРазметкуВВоркере(
      сырая.страницы,
      this.настройки.масштаб,
    );

    this.разметка = { ...сырая, страницы };
    this.зонаЗагрузки.показать(false);
    this.панель.корень.hidden = false;
    this.просмотрщик.корень.hidden = false;
    this.панель.установитьАктивность(true);
    this.панель.установитьЧислоСтраниц(документ.numPages, 1);
    this.настройки.номерСтраницы = 1;
    сохранитьНастройки(this.настройки);

    await this.показатьСтраницу(1);
    this.уведомления.успех(
      `Документ «${имяФайла}» загружен: ${документ.numPages} стр.`,
    );
    логгер.инфо('Документ готов', { имяФайла, страниц: документ.numPages });
  }

  private async показатьСтраницу(номер: number): Promise<void> {
    if (!this.документ || !this.разметка) return;

    this.показатьЗагрузку(`Отрисовка страницы ${номер}…`);

    try {
      const { отрисоватьСтраницу } = await import('../services/pdfRenderer');
      const результат = await отрисоватьСтраницу(
        this.документ,
        номер,
        this.настройки.масштаб,
        this.просмотрщик.холст,
      );

      this.просмотрщик.установитьРазмеры(результат.ширина, результат.высота);

      let страница = this.разметка.страницы.find((с) => с.номер === номер);
      if (!страница || страница.ширина === 0) {
        const { разобратьДокумент } = await import('../services/textExtractor');
        const { обработатьРазметкуВВоркере } = await import(
          '../services/layoutWorkerClient'
        );
        const сырая = await разобратьДокумент(
          this.документ,
          this.разметка.имяФайла,
          this.настройки.масштаб,
        );
        const страницы = await обработатьРазметкуВВоркере(
          сырая.страницы,
          this.настройки.масштаб,
        );
        this.разметка = { ...сырая, страницы };
        страница = this.разметка.страницы.find((с) => с.номер === номер);
      }

      if (страница) {
        this.просмотрщик.отрисоватьРазметку(страница);
        this.обновитьСтатистику(
          страница.тексты.length,
          страница.изображения.length,
        );
      }

      this.настройки.номерСтраницы = номер;
      сохранитьНастройки(this.настройки);
    } catch (ошибка) {
      this.обработатьОшибку(ошибка);
    } finally {
      this.скрытьЗагрузку();
    }
  }

  private async сменитьМасштаб(масштаб: number): Promise<void> {
    if (!this.документ || !this.разметка) return;
    if (this.занят) return;
    this.занят = true;
    this.настройки.масштаб = масштаб;
    сохранитьНастройки(this.настройки);
    this.показатьЗагрузку('Пересчёт разметки…');
    try {
      const { разобратьДокумент } = await import('../services/textExtractor');
      const { обработатьРазметкуВВоркере } = await import(
        '../services/layoutWorkerClient'
      );
      const сырая = await разобратьДокумент(
        this.документ,
        this.разметка.имяФайла,
        масштаб,
      );
      const страницы = await обработатьРазметкуВВоркере(сырая.страницы, масштаб);
      this.разметка = { ...сырая, страницы };
      await this.показатьСтраницу(this.настройки.номерСтраницы);
    } catch (ошибка) {
      this.обработатьОшибку(ошибка);
    } finally {
      this.занят = false;
      this.скрытьЗагрузку();
    }
  }

  private обновитьСтатистику(текстов: number, изображений: number): void {
    this.статистика.hidden = false;
    this.статистика.textContent = `На странице: ${текстов} текстовых блоков, ${изображений} изображений`;
  }

  private async экспорт(): Promise<void> {
    if (!this.разметка) {
      this.уведомления.ошибка('Сначала загрузите PDF-документ.');
      return;
    }
    const страница = this.разметка.страницы.find(
      (с) => с.номер === this.настройки.номерСтраницы,
    );
    if (!страница) {
      this.уведомления.ошибка('Страница не найдена для экспорта.');
      return;
    }
    try {
      await экспортироватьКартуБлоков(
        страница,
        this.просмотрщик.холст,
        this.настройки.прозрачностьРазметки,
        имяФайлаЭкспорта(this.разметка.имяФайла, страница.номер),
      );
      this.уведомления.успех('Карта блоков сохранена в PNG.');
    } catch (ошибка) {
      this.обработатьОшибку(ошибка);
    }
  }

  private сброс(): void {
    void this.документ?.destroy();
    this.документ = null;
    this.разметка = null;
    this.просмотрщик.очистить();
    this.просмотрщик.корень.hidden = true;
    this.панель.корень.hidden = true;
    this.панель.установитьАктивность(false);
    this.зонаЗагрузки.показать(true);
    this.статистика.hidden = true;
    this.уведомления.инфо('Документ закрыт. Можете загрузить новый PDF.');
  }

  private обработатьОшибку(ошибка: unknown): void {
    const текст =
      ошибка instanceof Error
        ? ошибка.message
        : 'Произошла неизвестная ошибка.';
    логгер.ошибка(текст, ошибка);
    this.уведомления.ошибка(текст);
  }
}
