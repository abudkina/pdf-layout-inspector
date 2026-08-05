import { describe, it, expect } from 'vitest';
import { имяФайлаЭкспорта } from '../../src/services/exportPng';

describe('экспорт PNG', () => {
  it('формирует имя файла карты', () => {
    expect(имяФайлаЭкспорта('макет.pdf', 2)).toBe('макет-карта-стр2.png');
    expect(имяФайлаЭкспорта('без-расширения', 1)).toBe(
      'без-расширения-карта-стр1.png',
    );
  });
});
