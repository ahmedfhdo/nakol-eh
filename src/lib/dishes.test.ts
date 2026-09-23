import { describe, expect, it } from 'vitest';
import { cookedLabel, daysBetween, filterDishes, normalizeCategories, validateDish } from './dishes';
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
  d(3, 'Gulasch', ['beef', 'pork']),
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
    expect(filterDishes(list, '', ['fish', 'pork']).map((x) => x.id)).toEqual([3, 1]);
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

describe('cookedLabel / daysBetween', () => {
  const now = new Date(2026, 8, 23, 18, 0).getTime(); // 23 Sep 2026, 18:00 local

  it('handles never, today, yesterday and N days', () => {
    expect(cookedLabel(null, now)).toBe('Never cooked');
    expect(cookedLabel(new Date(2026, 8, 23, 7, 0).getTime(), now)).toBe('Cooked today');
    expect(cookedLabel(new Date(2026, 8, 22, 23, 0).getTime(), now)).toBe('Cooked yesterday');
    expect(cookedLabel(new Date(2026, 8, 16, 12, 0).getTime(), now)).toBe('Cooked 7 days ago');
  });

  it('counts calendar days, not 24h blocks', () => {
    // 23:30 yesterday → 00:30 today is 1 hour but 1 calendar day
    expect(daysBetween(new Date(2026, 8, 22, 23, 30).getTime(), new Date(2026, 8, 23, 0, 30).getTime())).toBe(1);
  });

  it('treats a future timestamp (clock skew) as today', () => {
    expect(cookedLabel(now + 3 * 86400000, now)).toBe('Cooked today');
  });
});

describe('validateDish', () => {
  it('requires a non-blank name and at least one category', () => {
    expect(validateDish({ name: '   ', categories: ['fish'] }, list)).toMatch(/name/);
    expect(validateDish({ name: 'Soup', categories: [] }, list)).toMatch(/category/);
    expect(validateDish({ name: 'Soup', categories: ['vegetarian'] }, list)).toBeNull();
  });

  it('rejects duplicate names ignoring case, accents and whitespace', () => {
    expect(validateDish({ name: ' kasespatzle ', categories: ['vegetarian'] }, list)).toMatch(/already/);
  });

  it('allows keeping the same name when editing that dish', () => {
    expect(validateDish({ id: 2, name: 'Käsespätzle', categories: ['vegetarian'] }, list)).toBeNull();
  });

  it('rejects overly long names', () => {
    expect(validateDish({ name: 'x'.repeat(81), categories: ['fish'] }, list)).toMatch(/too long/);
  });
});

describe('normalizeCategories', () => {
  it('dedupes and sorts into canonical order', () => {
    expect(normalizeCategories(['vegetarian', 'beef', 'vegetarian', 'fish'])).toEqual(['beef', 'fish', 'vegetarian']);
  });
});
