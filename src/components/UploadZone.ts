/**
 * Зона загрузки PDF: drag-and-drop, выбор файла, URL.
 */
export class ЗонаЗагрузки {
  readonly корень: HTMLElement;
  private вводФайла!: HTMLInputElement;
  private вводUrl!: HTMLInputElement;
  private наФайл: (файл: File) => void;
  private наUrl: (url: string) => void;

  constructor(наФайл: (файл: File) => void, наUrl: (url: string) => void) {
    this.наФайл = наФайл;
    this.наUrl = наUrl;
    this.корень = document.createElement('section');
    this.корень.className = 'загрузка';
    this.корень.setAttribute('aria-label', 'Загрузка PDF');
    this.собрать();
  }

  private собрать(): void {
    this.корень.innerHTML = `
      <div class="загрузка__зона" tabindex="0" role="button" aria-label="Перетащите PDF или нажмите, чтобы выбрать файл">
        <div class="загрузка__иконка" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="14" y="8" width="36" height="48" rx="4" stroke="currentColor" stroke-width="2.5"/>
            <path d="M22 24h20M22 32h16M22 40h12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="загрузка__заголовок">Перетащите PDF сюда</p>
        <p class="загрузка__подсказка">или нажмите, чтобы выбрать файл (до 50 МБ)</p>
        <input
          type="file"
          accept="application/pdf,.pdf"
          class="загрузка__файл"
          id="выбор-pdf"
          aria-label="Выбрать PDF-файл"
        />
      </div>

      <div class="загрузка__url">
        <label class="загрузка__лейбл" for="url-pdf">Или укажите адрес PDF</label>
        <div class="загрузка__url-ряд">
          <input
            type="url"
            id="url-pdf"
            class="загрузка__поле"
            placeholder="https://пример.рф/документ.pdf"
            aria-label="Адрес PDF-документа"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="загрузка__кнопка" id="загрузить-url" aria-label="Загрузить PDF по адресу">
            Загрузить
          </button>
        </div>
      </div>

      <p class="загрузка__легенда">
        <span class="легенда легенда--текст"></span> текстовые блоки
        <span class="легенда легенда--изображение"></span> изображения
      </p>
    `;

    this.вводФайла = this.корень.querySelector('#выбор-pdf')!;
    this.вводUrl = this.корень.querySelector('#url-pdf')!;
    const зона = this.корень.querySelector('.загрузка__зона') as HTMLElement;

    зона.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('input')) return;
      this.вводФайла.click();
    });

    зона.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.вводФайла.click();
      }
    });

    this.вводФайла.addEventListener('change', () => {
      const файл = this.вводФайла.files?.[0];
      if (файл) this.наФайл(файл);
      this.вводФайла.value = '';
    });

    зона.addEventListener('dragover', (e) => {
      e.preventDefault();
      зона.classList.add('загрузка__зона--активна');
    });

    зона.addEventListener('dragleave', () => {
      зона.classList.remove('загрузка__зона--активна');
    });

    зона.addEventListener('drop', (e) => {
      e.preventDefault();
      зона.classList.remove('загрузка__зона--активна');
      const файл = e.dataTransfer?.files?.[0];
      if (файл) this.наФайл(файл);
    });

    this.корень.querySelector('#загрузить-url')!.addEventListener('click', () => {
      this.наUrl(this.вводUrl.value);
    });

    this.вводUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.наUrl(this.вводUrl.value);
      }
    });
  }

  показать(видима: boolean): void {
    this.корень.hidden = !видима;
  }
}
