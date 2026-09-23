import { describe, expect, it } from 'vitest';
import { detectInitialLocale } from '../locale';
import { ar } from './ar';
import { en } from './en';

const strip = (s: string) => s.replace(/[⁨⁩]/g, ''); // remove bidi isolation marks

/** Every key path in a catalog, e.g. "picker.title". */
function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('catalogs', () => {
  it('Arabic has exactly the same keys as English', () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it('no Arabic string is left in English by accident', () => {
    const allowed = new Set(['intl', 'dir']);
    for (const [k, v] of Object.entries(ar.picker)) {
      if (typeof v === 'string' && !allowed.has(k)) expect(v, k).toMatch(/[؀-ۿ]/);
    }
  });
});

describe('Arabic plurals (Egyptian)', () => {
  it('dish counts use the right form for 1, 2, 3–10, 11+', () => {
    expect(ar.dishes.count(1)).toBe('أكلة واحدة');
    expect(ar.dishes.count(2)).toBe('أكلتين');
    expect(ar.dishes.count(3)).toBe('3 أكلات');
    expect(ar.dishes.count(10)).toBe('10 أكلات');
    expect(ar.dishes.count(11)).toBe('11 أكلة');
    expect(ar.dishes.count(48)).toBe('48 أكلة');
    expect(ar.dishes.count(100)).toBe('100 أكلة');
  });

  it('"cooked X ago" reads naturally', () => {
    expect(ar.cooked(null)).toBe('لسه ما اتعملتش');
    expect(ar.cooked(0)).toBe('اتعملت النهارده');
    expect(ar.cooked(1)).toBe('اتعملت امبارح');
    expect(ar.cooked(2)).toBe('اتعملت من يومين');
    expect(ar.cooked(5)).toBe('اتعملت من 5 أيام');
    expect(ar.cooked(14)).toBe('اتعملت من 14 يوم');
  });

  it('day unit after a number', () => {
    expect([1, 2, 3, 7, 10, 11, 30].map(ar.settings.daysUnit)).toEqual(['يوم', 'يوم', 'أيام', 'أيام', 'أيام', 'يوم', 'يوم']);
  });

  it('"X of Y" agrees with the total', () => {
    expect(ar.dishes.countFiltered(3, 48)).toBe('3 من 48 أكلة');
    expect(ar.dishes.countFiltered(2, 5)).toBe('2 من 5 أكلات');
  });

  it('category lists use "or"', () => {
    expect(ar.picker.anyOf(['لحمة', 'سمك'])).toBe('أي أكلة فيها لحمة أو سمك');
  });

  it('uses Western digits for dates', () => {
    expect(new Date(2026, 8, 23).toLocaleDateString(ar.intl, { dateStyle: 'medium' })).toMatch(/23/);
  });

  it('wraps user text in bidi isolation marks', () => {
    expect(ar.picker.cookedSnack('Gulasch')).toBe('سجلنا إنك عملت «⁨Gulasch⁩»');
    expect(strip(ar.picker.cookedSnack('Gulasch'))).toBe('سجلنا إنك عملت «Gulasch»');
  });
});

describe('English', () => {
  it('pluralises', () => {
    expect(en.dishes.count(1)).toBe('1 dish');
    expect(en.dishes.count(35)).toBe('35 dishes');
    expect(en.cooked(3)).toBe('Cooked 3 days ago');
  });
});

describe('detectInitialLocale', () => {
  it('prefers a saved choice', () => {
    expect(detectInitialLocale('ar', ['en-US'])).toBe('ar');
    expect(detectInitialLocale('en', ['ar-EG'])).toBe('en');
  });

  it('otherwise follows the browser languages in order', () => {
    expect(detectInitialLocale(null, ['ar-EG', 'en'])).toBe('ar');
    expect(detectInitialLocale(null, ['de-DE', 'ar'])).toBe('ar');
    expect(detectInitialLocale(null, ['de-DE', 'en-GB', 'ar'])).toBe('en');
  });

  it('falls back to English and ignores junk', () => {
    expect(detectInitialLocale('xx', ['de-DE'])).toBe('en');
    expect(detectInitialLocale(null, [])).toBe('en');
  });
});
