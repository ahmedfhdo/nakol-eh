// Pure, framework-independent helpers for the dish list. No DB access here,
// so everything is unit-testable with plain data.
import { CATEGORIES, type Category, type Dish } from './types';

export const MAX_NAME_LENGTH = 80;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Categories match if the dish has ANY of the selected ones. Empty selection = all. */
export function matchesCategories(dish: Dish, selected: readonly Category[]): boolean {
  return selected.length === 0 || dish.categories.some((c) => selected.includes(c));
}

/** Lowercase + strip accents, so "kase" finds "Käsespätzle" and "hahnchen" finds "Hähnchen-Curry". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * Filter by search text and categories, sorted by name.
 * Sorting happens here (not via the DB index) because IndexedDB sorts by raw code
 * points, which would put "Käsespätzle" after "Tuna Pasta Bake".
 */
export function filterDishes(dishes: readonly Dish[], query: string, selected: readonly Category[]): Dish[] {
  const q = normalize(query);
  return dishes
    .filter((d) => matchesCategories(d, selected) && (q === '' || normalize(d.name).includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Whole calendar days between two timestamps, in local time (not 24h blocks). */
export function daysBetween(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / DAY_MS);
}

export function cookedLabel(lastCooked: number | null, now: number = Date.now()): string {
  if (lastCooked === null) return 'Never cooked';
  const days = daysBetween(lastCooked, now);
  if (days <= 0) return 'Cooked today';
  if (days === 1) return 'Cooked yesterday';
  return `Cooked ${days} days ago`;
}

/** Deduplicate and put categories in canonical order (beef, pork, chicken, fish, vegetarian). */
export function normalizeCategories(cats: readonly Category[]): Category[] {
  return CATEGORIES.filter((c) => cats.includes(c));
}

/** Returns an error message, or null if the input is valid. */
export function validateDish(
  input: { id?: number; name: string; categories: readonly Category[] },
  existing: readonly Dish[],
): string | null {
  const name = input.name.trim();
  if (name === '') return 'Please enter a name.';
  if (name.length > MAX_NAME_LENGTH) return `Name is too long (max ${MAX_NAME_LENGTH} characters).`;
  if (input.categories.length === 0) return 'Pick at least one category.';
  const dup = existing.find((d) => d.id !== input.id && normalize(d.name) === normalize(name));
  if (dup) return `"${dup.name}" is already in your list.`;
  return null;
}
