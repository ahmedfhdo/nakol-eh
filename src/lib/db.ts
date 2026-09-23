import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_DISHES } from './defaultDishes';
import { DEFAULT_SETTINGS, type Dish, type Settings } from './types';

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
