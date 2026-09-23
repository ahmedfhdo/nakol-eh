import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import {
  addDish,
  deleteDish,
  DinnerDB,
  exportData,
  getSettings,
  replaceAllData,
  restoreDefaultDishes,
  saveSettings,
  setLastCooked,
  updateDish,
} from './db';
import { DEFAULT_DISHES } from './defaultDishes';
import { normalize } from './dishes';
import { CATEGORIES } from './types';

// Each test gets its own database name so tests are independent.
let n = 0;
const opened: DinnerDB[] = [];
function freshDb(locale: 'en' | 'ar' = 'en') {
  const d = new DinnerDB(`test-${n++}`, () => locale);
  opened.push(d);
  return d;
}

afterEach(async () => {
  for (const d of opened.splice(0)) await d.delete();
});

describe('default dish list', () => {
  it.each([
    ['en', 35],
    ['ar', 48],
  ] as const)('%s list has %i dishes, unique names, at least one valid category each', (locale, count) => {
    const list = DEFAULT_DISHES[locale];
    expect(list).toHaveLength(count);
    expect(new Set(list.map((d) => normalize(d.name))).size).toBe(count);
    for (const d of list) {
      expect(d.categories.length).toBeGreaterThan(0);
      for (const c of d.categories) expect(CATEGORIES).toContain(c);
    }
  });
});

describe('database seeding', () => {
  it('seeds default dishes and settings on first open', async () => {
    const d = freshDb();
    const dishes = await d.dishes.toArray();
    expect(dishes).toHaveLength(35);
    expect(dishes.every((x) => x.lastCooked === null && typeof x.id === 'number')).toBe(true);
    expect(await getSettings(d)).toEqual({ cooldownDays: 7 });
  });

  it('does not re-seed on later launches, even if the user deleted everything', async () => {
    const name = `test-${n++}`;
    const first = new DinnerDB(name, () => 'en');
    await first.dishes.clear();
    await first.dishes.add({ name: 'My Dish', categories: ['fish'], lastCooked: null });
    first.close();

    const second = new DinnerDB(name, () => 'en');
    opened.push(second);
    const dishes = await second.dishes.toArray();
    expect(dishes.map((x) => x.name)).toEqual(['My Dish']);
  });

  it('multi-entry index finds dishes by any of their categories', async () => {
    const d = freshDb();
    const fish = await d.dishes.where('categories').equals('fish').toArray();
    // Paella, Fish and Chips, Lachs, Fischstäbchen, Shrimp Pasta, Tuna Pasta Bake, Fried Rice
    expect(fish).toHaveLength(7);
    expect(fish.map((x) => x.name)).toContain('Fried Rice');
  });
});

describe('settings', () => {
  it('saves and reads back cooldownDays', async () => {
    const d = freshDb();
    await saveSettings({ cooldownDays: 3 }, d);
    expect(await getSettings(d)).toEqual({ cooldownDays: 3 });
  });
});

describe('dish mutations', () => {
  it('addDish trims the name, orders categories and starts never-cooked', async () => {
    const d = freshDb();
    const id = await addDish({ name: '  Soup  ', categories: ['vegetarian', 'beef'] }, d);
    expect(await d.dishes.get(id)).toEqual({ id, name: 'Soup', categories: ['beef', 'vegetarian'], lastCooked: null });
  });

  it('updateDish changes name/categories but keeps lastCooked', async () => {
    const d = freshDb();
    const id = await addDish({ name: 'Soup', categories: ['vegetarian'] }, d);
    await setLastCooked(id, 1234, d);
    await updateDish(id, { name: 'Tomato Soup', categories: ['vegetarian'] }, d);
    expect(await d.dishes.get(id)).toMatchObject({ name: 'Tomato Soup', lastCooked: 1234 });
  });

  it('setLastCooked(null) clears the cooked date', async () => {
    const d = freshDb();
    const id = await addDish({ name: 'Soup', categories: ['vegetarian'] }, d);
    await setLastCooked(id, 1234, d);
    await setLastCooked(id, null, d);
    expect((await d.dishes.get(id))?.lastCooked).toBeNull();
  });

  it('deleteDish removes only that dish', async () => {
    const d = freshDb();
    const id = await addDish({ name: 'Soup', categories: ['vegetarian'] }, d);
    await deleteDish(id, d);
    expect(await d.dishes.get(id)).toBeUndefined();
    expect(await d.dishes.count()).toBe(35);
  });
});

describe('bulk operations', () => {
  it('replaceAllData replaces dishes (fresh ids) and settings', async () => {
    const d = freshDb();
    await replaceAllData([{ name: 'Only Dish', categories: ['fish'], lastCooked: 5 }], { cooldownDays: 2 }, d);
    const all = await d.dishes.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: 'Only Dish', lastCooked: 5 });
    expect(await getSettings(d)).toEqual({ cooldownDays: 2 });
  });

  it('replaceAllData rolls back completely if the write fails', async () => {
    const d = freshDb();
    // A dish that IndexedDB cannot store (functions are not cloneable) fails mid-transaction.
    const bad = [{ name: 'Ok', categories: ['fish'], lastCooked: null }, { name: 'Bad', categories: ['fish'], lastCooked: null, x: () => 1 }];
    await expect(replaceAllData(bad as never, { cooldownDays: 1 }, d)).rejects.toThrow();
    expect(await d.dishes.count()).toBe(35);
    expect(await getSettings(d)).toEqual({ cooldownDays: 7 });
  });

  it('restoreDefaultDishes resets dishes but keeps settings', async () => {
    const d = freshDb();
    await saveSettings({ cooldownDays: 3 }, d);
    await d.dishes.clear();
    await addDish({ name: 'Mine', categories: ['fish'] }, d);
    await restoreDefaultDishes('en', d);
    const all = await d.dishes.toArray();
    expect(all).toHaveLength(35);
    expect(all.every((x) => x.lastCooked === null)).toBe(true);
    expect(await getSettings(d)).toEqual({ cooldownDays: 3 });
  });

  it('exportData returns dishes and settings', async () => {
    const d = freshDb();
    const { dishes, settings } = await exportData(d);
    expect(dishes).toHaveLength(35);
    expect(settings).toEqual({ cooldownDays: 7 });
  });
});

describe('language-specific defaults', () => {
  it('seeds the Arabic list when the app starts in Arabic', async () => {
    const d = freshDb('ar');
    const names = (await d.dishes.toArray()).map((x) => x.name);
    expect(names).toHaveLength(48);
    expect(names).toContain('ملوخية');
  });

  it('restoreDefaultDishes uses the requested language', async () => {
    const d = freshDb('en');
    await restoreDefaultDishes('ar', d);
    expect(await d.dishes.count()).toBe(48);
  });
});

describe('upgrade from schema v1 (with pork) to v2', () => {
  it('converts, strips and deletes pork dishes in an existing database, keeping other data', async () => {
    const name = `test-${n++}`;
    // Build a real v1 database the way the old app version did.
    const v1 = new Dexie(name);
    v1.version(1).stores({ dishes: '++id, name, *categories, lastCooked', settings: 'id' });
    await v1.table('dishes').bulkAdd([
      { name: 'Schnitzel', categories: ['pork'], lastCooked: 111 },
      { name: 'Gulasch', categories: ['beef', 'pork'], lastCooked: 222 },
      { name: 'Linsensuppe', categories: ['vegetarian', 'pork'], lastCooked: null },
      { name: 'Spanferkel', categories: ['pork'], lastCooked: null },
      { name: 'Paella', categories: ['chicken', 'fish'], lastCooked: 333 },
    ]);
    await v1.table('settings').put({ id: 'app', cooldownDays: 4 });
    v1.close();

    // Opening with the new app runs the upgrade.
    const d = new DinnerDB(name, () => 'en');
    opened.push(d);
    const all = await d.dishes.orderBy('name').toArray();
    expect(all.map(({ name, categories, lastCooked }) => ({ name, categories, lastCooked }))).toEqual([
      { name: 'Chicken Schnitzel', categories: ['chicken'], lastCooked: 111 },
      { name: 'Gulasch', categories: ['beef'], lastCooked: 222 },
      { name: 'Linsensuppe', categories: ['vegetarian'], lastCooked: null },
      { name: 'Paella', categories: ['chicken', 'fish'], lastCooked: 333 },
    ]);
    expect(await d.dishes.where('categories').equals('pork').count()).toBe(0);
    expect(await getSettings(d)).toEqual({ cooldownDays: 4 });
  });

  it("keeps the old name if the converted name is already taken", async () => {
    const name = `test-${n++}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({ dishes: '++id, name, *categories, lastCooked', settings: 'id' });
    await v1.table('dishes').bulkAdd([
      { name: 'Schnitzel', categories: ['pork'], lastCooked: null },
      { name: 'Chicken Schnitzel', categories: ['chicken'], lastCooked: null },
    ]);
    v1.close();
    const d = new DinnerDB(name, () => 'en');
    opened.push(d);
    const names = (await d.dishes.toArray()).map((x) => x.name).sort();
    expect(names).toEqual(['Chicken Schnitzel', 'Schnitzel']);
  });
});
