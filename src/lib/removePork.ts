// One-time cleanup after the pork category was removed (DB schema v2).
// Also applied to old backup files on import, so importing a pre-v2 backup
// can't bring pork back.
import { CATEGORIES, type Category } from './types';

/** The old pork-only default dishes, converted to another protein instead of deleted. */
export const PORK_CONVERSIONS: Record<string, { name: string; categories: Category[] }> = {
  Schnitzel: { name: 'Chicken Schnitzel', categories: ['chicken'] },
  'Currywurst mit Pommes': { name: 'Rindercurrywurst mit Pommes', categories: ['beef'] },
  'Pulled Pork Sandwich': { name: 'Pulled Beef Sandwich', categories: ['beef'] },
  'Pork Stir-Fry with Rice': { name: 'Chicken Stir-Fry with Rice', categories: ['chicken'] },
};

interface LegacyDish {
  name: string;
  categories: readonly string[];
}

/**
 * - Known pork-only defaults → converted (name + category), cooked date kept.
 * - Dishes with pork AND something else → just lose the pork tag.
 * - Other pork-only dishes (added by the user) → null = delete, since a dish
 *   must have at least one category.
 * `takenNames` avoids creating a duplicate if the user already has e.g. "Chicken Schnitzel";
 * in that case the dish keeps its old name and only its category changes.
 */
export function removePork<T extends LegacyDish>(
  dish: T,
  takenNames: ReadonlySet<string> = new Set(),
): (Omit<T, 'categories'> & { categories: Category[] }) | null {
  const rest = CATEGORIES.filter((c) => dish.categories.includes(c));
  if (rest.length > 0 || !dish.categories.includes('pork')) return { ...dish, categories: rest };

  const conv = PORK_CONVERSIONS[dish.name];
  if (!conv) return null;
  const name = takenNames.has(conv.name) ? dish.name : conv.name;
  return { ...dish, name, categories: [...conv.categories] };
}

/** Apply removePork to a whole list, keeping names unique. */
export function removePorkFromList<T extends LegacyDish>(dishes: readonly T[]) {
  const taken = new Set(dishes.map((d) => d.name));
  const kept: (Omit<T, 'categories'> & { categories: Category[] })[] = [];
  const removed: T[] = [];
  for (const d of dishes) {
    const r = removePork(d, taken);
    if (r === null) removed.push(d);
    else {
      if (r.name !== d.name) taken.add(r.name);
      kept.push(r);
    }
  }
  return { kept, removed };
}
