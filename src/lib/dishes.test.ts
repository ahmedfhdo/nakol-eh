import { describe, expect, it } from 'vitest';
import { daysBetween, daysSinceCooked, filterDishes, normalize, normalizeCategories, validateDish } from './dishes';
import type { Dish } from './types';

const d = (id: number, name: string, categories: Dish['categories'], lastCooked: number | null = null): Dish => ({
  id,
  name,
  categories,
  lastCooked,
});

const list: Dish[] = [
  d(1, 'Tuna Pasta Bake', ['fish']),
  d(2, 'Käsespätzle', ['vegetarian']),
  d(3, 'Gulasch', ['beef', 'fish']),
  d(4, 'Hähnchen-Curry', ['chicken', 'vegetarian']),
];

describe('filterDishes', () => {
  it('returns everything sorted by German collation when nothing is filtered', () => {
    expect(filterDishes(list, '', []).map((x) => x.name)).toEqual([
      'Gulasch',
      'Hähnchen-Curry',
      'Käsespätzle',
      'Tuna Pasta Bake',
    ]);
  });

  it('matches ANY selected category', () => {
    expect(filterDishes(list, '', ['fish', 'beef']).map((x) => x.id)).toEqual([3, 1]);
  });

  it('search is case- and accent-insensitive', () => {
    expect(filterDishes(list, 'KASE', []).map((x) => x.id)).toEqual([2]);
    expect(filterDishes(list, 'hahnchen', []).map((x) => x.id)).toEqual([4]);
    expect(filterDishes(list, '  pasta ', []).map((x) => x.id)).toEqual([1]);
  });

  it('combines search and categories', () => {
    expect(filterDishes(list, 'curry', ['vegetarian']).map((x) => x.id)).toEqual([4]);
    expect(filterDishes(list, 'curry', ['fish'])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const copy = [...list];
    filterDishes(list, '', []);
    expect(list).toEqual(copy);
  });
});

describe('daysSinceCooked / daysBetween', () => {
  const now = new Date(2026, 8, 23, 18, 0).getTime(); // 23 Sep 2026, 18:00 local

  it('handles never, today, yesterday and N days', () => {
    expect(daysSinceCooked(null, now)).toBeNull();
    expect(daysSinceCooked(new Date(2026, 8, 23, 7, 0).getTime(), now)).toBe(0);
    expect(daysSinceCooked(new Date(2026, 8, 22, 23, 0).getTime(), now)).toBe(1);
    expect(daysSinceCooked(new Date(2026, 8, 16, 12, 0).getTime(), now)).toBe(7);
  });

  it('counts calendar days, not 24h blocks', () => {
    // 23:30 yesterday → 00:30 today is 1 hour but 1 calendar day
    expect(daysBetween(new Date(2026, 8, 22, 23, 30).getTime(), new Date(2026, 8, 23, 0, 30).getTime())).toBe(1);
  });

  it('treats a future timestamp (clock skew) as today', () => {
    expect(daysSinceCooked(now + 3 * 86400000, now)).toBe(0);
  });
});

describe('validateDish', () => {
  it('requires a non-blank name and at least one category', () => {
    expect(validateDish({ name: '   ', categories: ['fish'] }, list)).toEqual({ code: 'nameRequired' });
    expect(validateDish({ name: 'Soup', categories: [] }, list)).toEqual({ code: 'categoryRequired' });
    expect(validateDish({ name: 'Soup', categories: ['vegetarian'] }, list)).toBeNull();
  });

  it('rejects duplicate names ignoring case, accents and whitespace', () => {
    expect(validateDish({ name: ' kasespatzle ', categories: ['vegetarian'] }, list)).toEqual({
      code: 'duplicate',
      name: 'Käsespätzle',
    });
  });

  it('allows keeping the same name when editing that dish', () => {
    expect(validateDish({ id: 2, name: 'Käsespätzle', categories: ['vegetarian'] }, list)).toBeNull();
  });

  it('rejects overly long names', () => {
    expect(validateDish({ name: 'x'.repeat(81), categories: ['fish'] }, list)).toEqual({ code: 'nameTooLong', max: 80 });
  });
});

describe('normalizeCategories', () => {
  it('dedupes and sorts into canonical order', () => {
    expect(normalizeCategories(['vegetarian', 'beef', 'vegetarian', 'fish'])).toEqual(['beef', 'fish', 'vegetarian']);
  });
});

describe('Arabic search and duplicates', () => {
  const ar: Dish[] = [
    d(10, 'ملوخية', ['chicken']),
    d(11, 'رز اصفر', ['chicken']),
    d(12, 'كشري', ['vegetarian']),
    d(13, 'محشي كرنب', ['beef', 'vegetarian']),
  ];

  it('treats common spelling variants as equal (ة/ه, أ/ا, ى/ي, tashkeel, tatweel)', () => {
    expect(normalize('ملوخيه')).toBe(normalize('ملوخية'));
    expect(normalize('رز أصفر')).toBe(normalize('رز اصفر'));
    expect(normalize('كشرى')).toBe(normalize('كشري'));
    expect(normalize('كُشَرِي')).toBe(normalize('كشري'));
    expect(normalize('كشـــري')).toBe(normalize('كشري'));
  });

  it('search finds dishes across those variants', () => {
    expect(filterDishes(ar, 'ملوخيه', [], 'ar').map((x) => x.id)).toEqual([10]);
    expect(filterDishes(ar, 'أصفر', [], 'ar').map((x) => x.id)).toEqual([11]);
    expect(filterDishes(ar, 'محشى', [], 'ar').map((x) => x.id)).toEqual([13]);
  });

  it('blocks a duplicate that only differs in spelling', () => {
    expect(validateDish({ name: 'كشرى', categories: ['vegetarian'] }, ar)).toEqual({ code: 'duplicate', name: 'كشري' });
  });

  it('sorts in Arabic alphabetical order', () => {
    expect(filterDishes(ar, '', [], 'ar').map((x) => x.name)).toEqual(['رز اصفر', 'كشري', 'محشي كرنب', 'ملوخية']);
  });
});
