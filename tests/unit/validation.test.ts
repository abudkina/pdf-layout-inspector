import { describe, it, expect } from 'vitest';
import {
  проверитьФайл,
  проверитьСигнатуруPdf,
  проверитьUrl,
  ограничить,
  прозрачностьИзПроцентов,
  процентыИзПрозрачности,
} from '../../src/utils/validation';
import { МАКС_РАЗМЕР_ФАЙЛА } from '../../src/types';

describe('проверка файла', () => {
  it('отклоняет пустой файл', () => {
    const файл = new File([], 'пустой.pdf', { type: 'application/pdf' });
    const результат = проверитьФайл(файл);
    expect(результат.ок).toBe(false);
    expect(результат.ошибка).toMatch(/пуст/i);
  });

  it('принимает корректный PDF', () => {
    const файл = new File(['%PDF-1.4 content'], 'макет.pdf', {
      type: 'application/pdf',
    });
    expect(проверитьФайл(файл).ок).toBe(true);
  });

  it('отклоняет не-PDF расширение', () => {
    const файл = new File(['data'], 'фото.png', { type: 'image/png' });
    const результат = проверитьФайл(файл);
    expect(результат.ок).toBe(false);
    expect(результат.ошибка).toMatch(/формат|\.pdf/i);
  });

  it('отклоняет слишком большой файл', () => {
    const большой = new File([new Uint8Array(10)], 'огромный.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(большой, 'size', { value: МАКС_РАЗМЕР_ФАЙЛА + 1 });
    const результат = проверитьФайл(большой);
    expect(результат.ок).toBe(false);
    expect(результат.ошибка).toMatch(/большой|МБ/i);
  });
});

describe('сигнатура PDF', () => {
  it('принимает %PDF-', () => {
    const буфер = new TextEncoder().encode('%PDF-1.7\n...').buffer;
    expect(проверитьСигнатуруPdf(буфер).ок).toBe(true);
  });

  it('отклоняет чужой формат', () => {
    const буфер = new TextEncoder().encode('PNG\r\n...').buffer;
    const результат = проверитьСигнатуруPdf(буфер);
    expect(результат.ок).toBe(false);
    expect(результат.ошибка).toMatch(/сигнатур/i);
  });

  it('отклоняет слишком короткий буфер', () => {
    const буфер = new Uint8Array([1, 2, 3]).buffer;
    expect(проверитьСигнатуруPdf(буфер).ок).toBe(false);
  });
});

describe('проверка URL', () => {
  it('принимает https', () => {
    expect(проверитьUrl('https://example.com/doc.pdf').ок).toBe(true);
  });

  it('отклоняет пустую строку', () => {
    const р = проверитьUrl('   ');
    expect(р.ок).toBe(false);
    expect(р.ошибка).toMatch(/Введите/i);
  });

  it('отклоняет невалидный URL', () => {
    const р = проверитьUrl('не адрес');
    expect(р.ок).toBe(false);
  });

  it('отклоняет ftp', () => {
    const р = проверитьUrl('ftp://files.example.com/a.pdf');
    expect(р.ок).toBe(false);
    expect(р.ошибка).toMatch(/http/i);
  });
});

describe('числовые утилиты', () => {
  it('ограничивает диапазон', () => {
    expect(ограничить(5, 0, 10)).toBe(5);
    expect(ограничить(-1, 0, 10)).toBe(0);
    expect(ограничить(99, 0, 10)).toBe(10);
    expect(ограничить(NaN, 0, 10)).toBe(0);
  });

  it('конвертирует прозрачность', () => {
    expect(прозрачностьИзПроцентов(35)).toBeCloseTo(0.35);
    expect(процентыИзПрозрачности(0.35)).toBe(35);
    expect(прозрачностьИзПроцентов(150)).toBe(1);
  });
});
