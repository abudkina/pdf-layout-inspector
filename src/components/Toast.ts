/**
 * Всплывающие уведомления об ошибках и статусах (на русском).
 */
export class Уведомления {
  private контейнер: HTMLElement;

  constructor(родитель: HTMLElement = document.body) {
    this.контейнер = document.createElement('div');
    this.контейнер.className = 'уведомления';
    this.контейнер.setAttribute('aria-live', 'assertive');
    this.контейнер.setAttribute('aria-relevant', 'additions');
    родитель.appendChild(this.контейнер);
  }

  ошибка(текст: string): void {
    this.показать(текст, 'ошибка');
  }

  успех(текст: string): void {
    this.показать(текст, 'успех');
  }

  инфо(текст: string): void {
    this.показать(текст, 'инфо');
  }

  private показать(
    текст: string,
    тип: 'ошибка' | 'успех' | 'инфо',
  ): void {
    const элемент = document.createElement('div');
    элемент.className = `уведомление уведомление--${тип}`;
    элемент.setAttribute('role', тип === 'ошибка' ? 'alert' : 'status');

    const сообщение = document.createElement('p');
    сообщение.className = 'уведомление__текст';
    сообщение.textContent = текст;

    const закрыть = document.createElement('button');
    закрыть.type = 'button';
    закрыть.className = 'уведомление__закрыть';
    закрыть.setAttribute('aria-label', 'Закрыть уведомление');
    закрыть.textContent = '×';
    закрыть.addEventListener('click', () => элемент.remove());

    элемент.append(сообщение, закрыть);
    this.контейнер.appendChild(элемент);

    window.setTimeout(() => {
      элемент.classList.add('уведомление--скрытие');
      window.setTimeout(() => элемент.remove(), 300);
    }, тип === 'ошибка' ? 8000 : 4000);
  }
}
