import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_DISHES } from './defaultDishes';
import { normalizeCategories } from './dishes';
import { DEFAULT_SETTINGS, type Category, type Dish, type Settings } from './types';

// Settings are a single row. Keeping them in the same IndexedDB database (instead of
// localStorage) means export/import and "clear site data" treat dishes and settings alike.
interface SettingsRow extends Settings {
  id: 'app';
}

export class DinnerDB extends Dexie {
  dishes!: EntityTable<Dish, 'id'>;
  settings!: EntityTable<SettingsRow, 'id'>;

  constructor(name = 'dinner-picker') {
    super(name);

    // Schema v1. Only indexed fields are listed here; other fields are stored anyway.
    // `*categories` is a multi-entry index: one index entry per category, so
    // "all dishes with category X" is an indexed lookup.
    this.version(1).stores({
      dishes: '++id, name, *categories, lastCooked',
      settings: 'id',
    });

    // `populate` fires exactly once: when the database is created for the first time.
    // That is the spec's "first launch" — and because it runs inside the creating
    // transaction, a crash mid-seed can't leave a half-seeded database.
    // Deleting every dish later does NOT re-seed; the user's copy is theirs.
    this.on('populate', async (tx) => {
      await tx.table('dishes').bulkAdd(defaultDishRows());
      await tx.table('settings').put({ id: 'app', ...DEFAULT_SETTINGS });
    });
  }
}

export function defaultDishRows(): Dish[] {
  return DEFAULT_DISHES.map((d) => ({
    name: d.name,
    categories: [...d.categories],
    lastCooked: null,
  }));
}

export const db = new DinnerDB();

export async function getSettings(database: DinnerDB = db): Promise<Settings> {
  const row = await database.settings.get('app');
  // Spread over defaults so settings added in later versions get a sane value.
  return { ...DEFAULT_SETTINGS, ...(row ? { cooldownDays: row.cooldownDays } : {}) };
}

export async function saveSettings(settings: Settings, database: DinnerDB = db): Promise<void> {
  await database.settings.put({ id: 'app', ...settings });
}

/**
 * Ask the browser not to evict our data under storage pressure.
 * Checked on every launch rather than only the first: some browsers (Chrome) decide
 * based on engagement, e.g. after the app is installed, so a later request can succeed
 * where the first one was denied. Once granted, this is a cheap no-op.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

// ---- Dish mutations -------------------------------------------------------
// Validation lives in dishes.ts (validateDish); these assume valid input and
// only normalize it, so the DB never holds untrimmed names or unordered categories.

export async function addDish(
  input: { name: string; categories: Category[] },
  database: DinnerDB = db,
): Promise<number> {
  const id = await database.dishes.add({
    name: input.name.trim(),
    categories: normalizeCategories(input.categories),
    lastCooked: null,
  });
  return id as number;
}

export async function updateDish(
  id: number,
  changes: { name: string; categories: Category[] },
  database: DinnerDB = db,
): Promise<void> {
  await database.dishes.update(id, {
    name: changes.name.trim(),
    categories: normalizeCategories(changes.categories),
  });
}

export async function deleteDish(id: number, database: DinnerDB = db): Promise<void> {
  await database.dishes.delete(id);
}

export async function setLastCooked(id: number, lastCooked: number | null, database: DinnerDB = db): Promise<void> {
  await database.dishes.update(id, { lastCooked });
}

// ---- Bulk operations (Settings screen) --------------------------------------
// Both run in ONE transaction: if anything fails halfway, IndexedDB rolls back
// and the user keeps their old data instead of an empty or half-written list.

export async function exportData(database: DinnerDB = db): Promise<{ dishes: Dish[]; settings: Settings }> {
  return database.transaction('r', database.dishes, database.settings, async () => ({
    dishes: await database.dishes.toArray(),
    settings: await getSettings(database),
  }));
}

export async function replaceAllData(
  dishes: Omit<Dish, 'id'>[],
  settings: Settings,
  database: DinnerDB = db,
): Promise<void> {
  await database.transaction('rw', database.dishes, database.settings, async () => {
    await database.dishes.clear();
    await database.dishes.bulkAdd(dishes.map((d) => ({ ...d, categories: [...d.categories] })));
    await database.settings.put({ id: 'app', ...settings });
  });
}

/** Replace all dishes with the defaults. Settings (cooldown) are kept. */
export async function restoreDefaultDishes(database: DinnerDB = db): Promise<void> {
  await database.transaction('rw', database.dishes, async () => {
    await database.dishes.clear();
    await database.dishes.bulkAdd(defaultDishRows());
  });
}
