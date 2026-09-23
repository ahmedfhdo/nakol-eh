// Pure, framework-independent helpers for the dish list. No DB access here,
// so everything is unit-testable with plain data. No user-facing text either:
// functions return numbers / error codes, and i18n/ turns them into words.
import type { Locale } from './locale';
import { CATEGORIES, type Category, type Dish } from './types';

export const MAX_NAME_LENGTH = 80;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Categories match if the dish has ANY of the selected ones. Empty selection = all. */
export function matchesCategories(dish: Dish, selected: readonly Category[]): boolean {
  return selected.length === 0 || dish.categories.some((c) => selected.includes(c));
}

/**
 * Loose form for search and duplicate checks.
 * Latin: lowercase + strip accents ("kase" finds "Käsespätzle").
 * Arabic: unify the spellings people mix freely in Egyptian writing —
 * أ/إ/آ → ا, ة → ه, ى → ي — and drop tashkeel and tatweel,
 * so "ملوخيه" finds "ملوخية" and "رز أصفر" finds "رز اصفر".
 */
export function normalize(s: string): string {
  return s
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filter by search text and categories, sorted by name in the UI language's collation.
 * Sorting happens here (not via the DB index) because IndexedDB sorts by raw code
 * points, which would put "Käsespätzle" after "Tuna Pasta Bake".
 */
export function filterDishes(
  dishes: readonly Dish[],
  query: string,
  selected: readonly Category[],
  locale: Locale = 'en',
): Dish[] {
  const q = normalize(query);
  const collator = new Intl.Collator(locale);
  return dishes
    .filter((d) => matchesCategories(d, selected) && (q === '' || normalize(d.name).includes(q)))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** Whole calendar days between two timestamps, in local time (not 24h blocks). */
export function daysBetween(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / DAY_MS);
}

/** Calendar days since cooked (never negative), or null if never cooked. */
export function daysSinceCooked(lastCooked: number | null, now: number = Date.now()): number | null {
  return lastCooked === null ? null : Math.max(0, daysBetween(lastCooked, now));
}

/** Deduplicate and put categories in canonical order. */
export function normalizeCategories(cats: readonly Category[]): Category[] {
  return CATEGORIES.filter((c) => cats.includes(c));
}

export type DishError =
  | { code: 'nameRequired' }
  | { code: 'nameTooLong'; max: number }
  | { code: 'categoryRequired' }
  | { code: 'duplicate'; name: string };

/** Returns an error, or null if the input is valid. */
export function validateDish(
  input: { id?: number; name: string; categories: readonly Category[] },
  existing: readonly Dish[],
): DishError | null {
  const name = input.name.trim();
  if (name === '') return { code: 'nameRequired' };
  if (name.length > MAX_NAME_LENGTH) return { code: 'nameTooLong', max: MAX_NAME_LENGTH };
  if (input.categories.length === 0) return { code: 'categoryRequired' };
  const dup = existing.find((d) => d.id !== input.id && normalize(d.name) === normalize(name));
  if (dup) return { code: 'duplicate', name: dup.name };
  return null;
}
