import type { НастройкиПриложения } from '../types';
import {
  процентыИзПрозрачности,
  прозрачностьИзПроцентов,
} from '../utils/validation';

export interface СобытияПанели {
  наПрозрачность: (значение: number) => void;
  наПереключениеТекста: (вкл: boolean) => void;
  наПереключениеИзображений: (вкл: boolean) => void;
  наМасштаб: (значение: number) => void;
  наСтраницу: (номер: number) => void;
  наЭкспорт: () => void;
  наСброс: () => void;
}

/**
 * Панель инструментов: прозрачность, фильтры, навигация, экспорт.
 */
export class ПанельИнструментов {
  readonly корень: HTMLElement;
  private слайдер!: HTMLInputElement;
  private меткаПрозрачности!: HTMLElement;
  private чекТекст!: HTMLInputElement;
  private чекИзображения!: HTMLInputElement;
  private полеСтраницы!: HTMLInputElement;
  private меткаСтраниц!: HTMLElement;
  private выборМасштаба!: HTMLSelectElement;
  private кнопкаЭкспорт!: HTMLButtonElement;
  private всегоСтраниц = 1;

  constructor(
    private события: СобытияПанели,
    настройки: НастройкиПриложения,
  ) {
    this.корень = document.createElement('section');
    this.корень.className = 'панель';
    this.корень.setAttribute('aria-label', 'Панель инструментов');
    this.собрать(настройки);
  }

  private собрать(настройки: НастройкиПриложения): void {
    this.корень.innerHTML = `
      <div class="панель__группа">
        <label class="панель__лейбл" for="прозрачность-разметки">
          Прозрачность разметки
          <span class="панель__значение" id="прозрачность-значение"></span>
        </label>
        <input
          type="range"
          id="прозрачность-разметки"
          class="панель__слайдер"
          min="0"
          max="100"
          step="1"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Прозрачность разметки"
        />
      </div>

      <div class="панель__группа панель__группа--чекбоксы">
        <label class="панель__чек">
          <input type="checkbox" id="показать-текст" />
          <span>Текст</span>
        </label>
        <label class="панель__чек">
          <input type="checkbox" id="показать-изображения" />
          <span>Изображения</span>
        </label>
      </div>

      <div class="панель__группа">
        <label class="панель__лейбл" for="масштаб-страницы">Масштаб</label>
        <select id="масштаб-страницы" class="панель__селект" aria-label="Масштаб страницы">
          <option value="0.75">75%</option>
          <option value="1">100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
          <option value="2">200%</option>
        </select>
      </div>

      <div class="панель__группа панель__группа--навигация">
        <button type="button" class="панель__кнопка" id="стр-назад" aria-label="Предыдущая страница">‹</button>
        <label class="панель__лейбл панель__лейбл--стр" for="номер-страницы">
          Стр.
          <input type="number" id="номер-страницы" class="панель__страница" min="1" value="1" aria-label="Номер страницы" />
          <span id="всего-страниц">из 1</span>
        </label>
        <button type="button" class="панель__кнопка" id="стр-вперёд" aria-label="Следующая страница">›</button>
      </div>

      <div class="панель__группа панель__группа--действия">
        <button type="button" class="панель__кнопка панель__кнопка--акцент" id="экспорт-png" aria-label="Экспортировать карту блоков в PNG">
          Экспорт PNG
        </button>
        <button type="button" class="панель__кнопка панель__кнопка--вторичная" id="сброс-документа" aria-label="Закрыть документ">
          Закрыть
        </button>
      </div>
    `;

    this.слайдер = this.корень.querySelector('#прозрачность-разметки')!;
    this.меткаПрозрачности = this.корень.querySelector('#прозрачность-значение')!;
    this.чекТекст = this.корень.querySelector('#показать-текст')!;
    this.чекИзображения = this.корень.querySelector('#показать-изображения')!;
    this.полеСтраницы = this.корень.querySelector('#номер-страницы')!;
    this.меткаСтраниц = this.корень.querySelector('#всего-страниц')!;
    this.выборМасштаба = this.корень.querySelector('#масштаб-страницы')!;
    this.кнопкаЭкспорт = this.корень.querySelector('#экспорт-png')!;

    const проценты = процентыИзПрозрачности(настройки.прозрачностьРазметки);
    this.слайдер.value = String(проценты);
    this.слайдер.setAttribute('aria-valuenow', String(проценты));
    this.меткаПрозрачности.textContent = `${проценты}%`;
    this.чекТекст.checked = настройки.показыватьТекст;
    this.чекИзображения.checked = настройки.показыватьИзображения;
    this.выборМасштаба.value = String(настройки.масштаб);
    this.полеСтраницы.value = String(настройки.номерСтраницы);

    this.слайдер.addEventListener('input', () => {
      const п = Number(this.слайдер.value);
      this.меткаПрозрачности.textContent = `${п}%`;
      this.слайдер.setAttribute('aria-valuenow', String(п));
      this.события.наПрозрачность(прозрачностьИзПроцентов(п));
    });

    this.чекТекст.addEventListener('change', () => {
      this.события.наПереключениеТекста(this.чекТекст.checked);
    });

    this.чекИзображения.addEventListener('change', () => {
      this.события.наПереключениеИзображений(this.чекИзображения.checked);
    });

    this.выборМасштаба.addEventListener('change', () => {
      this.события.наМасштаб(Number(this.выборМасштаба.value));
    });

    this.полеСтраницы.addEventListener('change', () => {
      let номер = Number(this.полеСтраницы.value);
      if (!Number.isFinite(номер) || номер < 1) номер = 1;
      if (номер > this.всегоСтраниц) номер = this.всегоСтраниц;
      this.полеСтраницы.value = String(номер);
      this.события.наСтраницу(номер);
    });

    this.корень.querySelector('#стр-назад')!.addEventListener('click', () => {
      const текущая = Number(this.полеСтраницы.value) || 1;
      if (текущая > 1) {
        this.полеСтраницы.value = String(текущая - 1);
        this.события.наСтраницу(текущая - 1);
      }
    });

    this.корень.querySelector('#стр-вперёд')!.addEventListener('click', () => {
      const текущая = Number(this.полеСтраницы.value) || 1;
      if (текущая < this.всегоСтраниц) {
        this.полеСтраницы.value = String(текущая + 1);
        this.события.наСтраницу(текущая + 1);
      }
    });

    this.кнопкаЭкспорт.addEventListener('click', () => this.события.наЭкспорт());
    this.корень
      .querySelector('#сброс-документа')!
      .addEventListener('click', () => this.события.наСброс());
  }

  установитьЧислоСтраниц(всего: number, текущая: number): void {
    this.всегоСтраниц = Math.max(1, всего);
    this.полеСтраницы.max = String(this.всегоСтраниц);
    this.полеСтраницы.value = String(Math.min(текущая, this.всегоСтраниц));
    this.меткаСтраниц.textContent = `из ${this.всегоСтраниц}`;
  }

  установитьАктивность(активна: boolean): void {
    this.корень
      .querySelectorAll('input, select, button')
      .forEach((эл) => {
        (эл as HTMLInputElement).disabled = !активна;
      });
  }
}
