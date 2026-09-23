import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { addDish, deleteDish, DinnerDB, getSettings, saveSettings, setLastCooked, updateDish } from './db';
import { DEFAULT_DISHES } from './defaultDishes';
import { CATEGORIES } from './types';

// Each test gets its own database name so tests are independent.
let n = 0;
const opened: DinnerDB[] = [];
function freshDb() {
  const d = new DinnerDB(`test-${n++}`);
  opened.push(d);
  return d;
}

afterEach(async () => {
  for (const d of opened.splice(0)) await d.delete();
});

describe('default dish list', () => {
  it('has 35 dishes, unique names, at least one valid category each', () => {
    expect(DEFAULT_DISHES).toHaveLength(35);
    expect(new Set(DEFAULT_DISHES.map((d) => d.name)).size).toBe(35);
    for (const d of DEFAULT_DISHES) {
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
    const first = new DinnerDB(name);
    await first.dishes.clear();
    await first.dishes.add({ name: 'My Dish', categories: ['fish'], lastCooked: null });
    first.close();

    const second = new DinnerDB(name);
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
