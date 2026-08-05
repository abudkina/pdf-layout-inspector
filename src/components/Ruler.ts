import { расстояние, форматИзмерения } from '../utils/geometry';

/**
 * Режим «Линейка»: измерение расстояния перетаскиванием на странице.
 */
export class Линейка {
  readonly корень: HTMLElement;
  private svg: SVGSVGElement;
  private линия: SVGLineElement;
  private метка: HTMLElement;
  private активна = false;
  private рисует = false;
  private стартX = 0;
  private стартY = 0;
  private масштаб = 1.25;
  private наРамке: HTMLElement | null = null;

  private наУказательВниз = (e: PointerEvent | MouseEvent) => this.начать(e);
  private наУказательДвижение = (e: PointerEvent | MouseEvent) => this.тянуть(e);
  private наУказательВверх = (e: PointerEvent | MouseEvent) => this.закончить(e);

  constructor() {
    this.корень = document.createElement('div');
    this.корень.className = 'линейка';
    this.корень.setAttribute('aria-hidden', 'true');
    this.корень.hidden = true;

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('линейка__холст');
    this.svg.setAttribute('aria-hidden', 'true');

    this.линия = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.линия.classList.add('линейка__линия');
    this.линия.setAttribute('x1', '0');
    this.линия.setAttribute('y1', '0');
    this.линия.setAttribute('x2', '0');
    this.линия.setAttribute('y2', '0');
    this.svg.appendChild(this.линия);

    this.метка = document.createElement('div');
    this.метка.className = 'линейка__метка';
    this.метка.setAttribute('role', 'status');
    this.метка.setAttribute('aria-live', 'polite');
    this.метка.textContent = 'Потяните, чтобы измерить';

    this.корень.append(this.svg, this.метка);
  }

  прикрепить(рамка: HTMLElement): void {
    if (this.наРамке === рамка) return;
    this.открепить();
    this.наРамке = рамка;
    рамка.appendChild(this.корень);
  }

  открепить(): void {
    this.выключить();
    this.корень.remove();
    this.наРамке = null;
  }

  установитьМасштаб(масштаб: number): void {
    this.масштаб = масштаб;
  }

  включить(): void {
    if (this.активна) return;
    this.активна = true;
    this.корень.hidden = false;
    this.корень.setAttribute('aria-hidden', 'false');
    this.корень.classList.add('линейка--активна');
    this.метка.textContent = 'Потяните, чтобы измерить';
    this.сброситьЛинию();

    this.корень.addEventListener('pointerdown', this.наУказательВниз);
    this.корень.addEventListener('mousedown', this.наУказательВниз);
    window.addEventListener('pointermove', this.наУказательДвижение);
    window.addEventListener('mousemove', this.наУказательДвижение);
    window.addEventListener('pointerup', this.наУказательВверх);
    window.addEventListener('mouseup', this.наУказательВверх);
  }

  выключить(): void {
    if (!this.активна) return;
    this.активна = false;
    this.рисует = false;
    this.корень.hidden = true;
    this.корень.setAttribute('aria-hidden', 'true');
    this.корень.classList.remove('линейка--активна');
    this.сброситьЛинию();

    this.корень.removeEventListener('pointerdown', this.наУказательВниз);
    this.корень.removeEventListener('mousedown', this.наУказательВниз);
    window.removeEventListener('pointermove', this.наУказательДвижение);
    window.removeEventListener('mousemove', this.наУказательДвижение);
    window.removeEventListener('pointerup', this.наУказательВверх);
    window.removeEventListener('mouseup', this.наУказательВверх);
  }

  установитьВключено(вкл: boolean): void {
    if (вкл) this.включить();
    else this.выключить();
  }

  private начать(e: PointerEvent | MouseEvent): void {
    if (!this.активна) return;
    e.preventDefault();
    const точка = this.локальнаяТочка(e);
    this.рисует = true;
    this.стартX = точка.x;
    this.стартY = точка.y;
    this.линия.setAttribute('x1', String(this.стартX));
    this.линия.setAttribute('y1', String(this.стартY));
    this.линия.setAttribute('x2', String(this.стартX));
    this.линия.setAttribute('y2', String(this.стартY));
    this.обновитьМетку(точка.x, точка.y);
    if ('pointerId' in e) {
      try {
        this.корень.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  private тянуть(e: PointerEvent | MouseEvent): void {
    if (!this.рисует) return;
    const точка = this.локальнаяТочка(e);
    this.линия.setAttribute('x2', String(точка.x));
    this.линия.setAttribute('y2', String(точка.y));
    this.обновитьМетку(точка.x, точка.y);
  }

  private закончить(e: PointerEvent | MouseEvent): void {
    if (!this.рисует) return;
    this.рисует = false;
    const точка = this.локальнаяТочка(e);
    this.линия.setAttribute('x2', String(точка.x));
    this.линия.setAttribute('y2', String(точка.y));
    this.обновитьМетку(точка.x, точка.y);
  }

  private локальнаяТочка(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const rect = this.корень.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private обновитьМетку(x2: number, y2: number): void {
    const dx = x2 - this.стартX;
    const dy = y2 - this.стартY;
    const длина = расстояние(this.стартX, this.стартY, x2, y2);
    const изм = форматИзмерения(длина, this.масштаб);
    this.метка.textContent = `Δx ${Math.round(dx)} · Δy ${Math.round(dy)} · ${изм.текст}`;
    this.метка.style.left = `${Math.min(this.стартX, x2) + Math.abs(dx) / 2}px`;
    this.метка.style.top = `${Math.min(this.стартY, y2) + Math.abs(dy) / 2 - 28}px`;
  }

  private сброситьЛинию(): void {
    this.линия.setAttribute('x1', '0');
    this.линия.setAttribute('y1', '0');
    this.линия.setAttribute('x2', '0');
    this.линия.setAttribute('y2', '0');
    this.метка.style.left = '12px';
    this.метка.style.top = '12px';
  }
}
