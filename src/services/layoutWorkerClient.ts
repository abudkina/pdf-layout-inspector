import type {
  РазметкаСтраницы,
  СообщениеВоркерЗапрос,
  СообщениеВоркерОтвет,
} from '../types';
import { логгер } from '../utils/logger';

/**
 * Обёртка над layout.worker: постобработка разметки вне UI-потока.
 */
export async function обработатьРазметкуВВоркере(
  страницы: РазметкаСтраницы[],
  масштаб: number,
): Promise<РазметкаСтраницы[]> {
  return new Promise((resolve, reject) => {
    let воркер: Worker;
    try {
      воркер = new Worker(
        new URL('../workers/layout.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch (ошибка) {
      логгер.предупреждение(
        'Web Worker недоступен, обработка в основном потоке',
        ошибка,
      );
      resolve(страницы);
      return;
    }

    const таймер = window.setTimeout(() => {
      воркер.terminate();
      логгер.предупреждение('Воркер не ответил вовремя');
      resolve(страницы);
    }, 15_000);

    воркер.onmessage = (событие: MessageEvent<СообщениеВоркерОтвет>) => {
      window.clearTimeout(таймер);
      воркер.terminate();
      const данные = событие.data;
      if (данные.тип === 'разметка-готова' && данные.страницы) {
        resolve(данные.страницы);
      } else {
        reject(new Error(данные.сообщение || 'Ошибка воркера разметки.'));
      }
    };

    воркер.onerror = (событие) => {
      window.clearTimeout(таймер);
      воркер.terminate();
      логгер.ошибка('Сбой воркера', событие.message);
      resolve(страницы);
    };

    const запрос: СообщениеВоркерЗапрос = {
      тип: 'обработать-разметку',
      страницы,
      масштаб,
    };
    воркер.postMessage(запрос);
  });
}
