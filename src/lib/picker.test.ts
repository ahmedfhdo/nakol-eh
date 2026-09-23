import { describe, expect, it } from 'vitest';
import { DAY_MS, isInCooldown, pick, type PickInput } from './picker';
import type { Dish } from './types';

const NOW = new Date(2026, 8, 23, 18, 0).getTime();
const daysAgo = (n: number) => NOW - n * DAY_MS;

const dish = (id: number, categories: Dish['categories'], lastCooked: number | null = null): Dish => ({
  id,
  name: `Dish ${id}`,
  categories,
  lastCooked,
});

function input(over: Partial<PickInput>): PickInput {
  return { dishes: [], selected: [], cooldownDays: 7, now: NOW, seen: new Set(), random: () => 0, ...over };
}

/** Call pick repeatedly, feeding the returned bag back in, like the UI does. */
function pickMany(base: PickInput, n: number, random = Math.random) {
  let seen: ReadonlySet<number> = base.seen;
  let previousId: number | null = null;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = pick({ ...base, seen, previousId, random });
    if (r.kind === 'empty') throw new Error('unexpected empty');
    out.push(r.dish.id!);
    seen = r.seen;
    previousId = r.dish.id!;
  }
  return out;
}

describe('category filtering', () => {
  const dishes = [dish(1, ['beef']), dish(2, ['fish']), dish(3, ['chicken', 'fish']), dish(4, ['vegetarian'])];

  it('no selection means all categories', () => {
    expect(new Set(pickMany(input({ dishes }), 4))).toEqual(new Set([1, 2, 3, 4]));
  });

  it('several selected categories match ANY of them', () => {
    expect(new Set(pickMany(input({ dishes, selected: ['fish', 'beef'] }), 30))).toEqual(new Set([1, 2, 3]));
  });

  it('multi-category dishes match on any of their categories', () => {
    expect(new Set(pickMany(input({ dishes, selected: ['chicken'] }), 5))).toEqual(new Set([3]));
  });

  it('returns empty when nothing matches the categories', () => {
    expect(pick(input({ dishes: dishes.filter((x) => x.id !== 3), selected: ['chicken'] }))).toEqual({ kind: 'empty' });
    expect(pick(input({ dishes: [] }))).toEqual({ kind: 'empty' });
  });
});

describe('cooldown', () => {
  it('is based on lastCooked and cooldownDays at pick time', () => {
    const d = dish(1, ['beef'], daysAgo(3));
    expect(isInCooldown(d, 7, NOW)).toBe(true);
    expect(isInCooldown(d, 3, NOW)).toBe(false); // exactly 3 days → out of cooldown
    expect(isInCooldown(d, 2, NOW)).toBe(false);
    expect(isInCooldown(dish(2, ['beef'], null), 7, NOW)).toBe(false);
  });

  it('skips dishes still in cooldown', () => {
    const dishes = [dish(1, ['beef'], daysAgo(1)), dish(2, ['beef'], daysAgo(10)), dish(3, ['beef'])];
    expect(new Set(pickMany(input({ dishes }), 20))).toEqual(new Set([2, 3]));
  });

  it('changing cooldownDays applies immediately', () => {
    const dishes = [dish(1, ['beef'], daysAgo(3)), dish(2, ['beef'], daysAgo(10))];
    expect(new Set(pickMany(input({ dishes, cooldownDays: 7 }), 5))).toEqual(new Set([2]));
    expect(new Set(pickMany(input({ dishes, cooldownDays: 2 }), 5))).toEqual(new Set([1, 2]));
  });

  it('cooldownDays = 0 disables the cooldown', () => {
    const dishes = [dish(1, ['beef'], NOW)];
    expect(pick(input({ dishes, cooldownDays: 0 })).kind).toBe('pick');
  });
});

describe('shuffle bag', () => {
  const dishes = [1, 2, 3, 4, 5].map((i) => dish(i, ['beef']));

  it('shows every eligible dish once before repeating any', () => {
    for (let run = 0; run < 50; run++) {
      const first5 = pickMany(input({ dishes }), 5);
      expect(new Set(first5).size).toBe(5);
    }
  });

  it('resets when exhausted and never repeats the dish on screen', () => {
    for (let run = 0; run < 200; run++) {
      const seq = pickMany(input({ dishes }), 12);
      for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
    }
  });

  it('with a single eligible dish, keeps returning it', () => {
    expect(pickMany(input({ dishes: [dish(1, ['fish'])] }), 3)).toEqual([1, 1, 1]);
  });

  it('ignores seen ids that are no longer eligible (e.g. categories changed)', () => {
    const r = pick(input({ dishes, seen: new Set([99, 1, 2, 3, 4]) }));
    expect(r.kind === 'pick' && r.dish.id).toBe(5);
  });

  it('does not mutate the seen set it was given', () => {
    const seen = new Set([1]);
    pick(input({ dishes, seen }));
    expect([...seen]).toEqual([1]);
  });
});

describe('uniform random', () => {
  it('maps random() across the pool', () => {
    const dishes = [1, 2, 3, 4].map((i) => dish(i, ['beef']));
    expect(pick(input({ dishes, random: () => 0 }))).toMatchObject({ dish: { id: 1 } });
    expect(pick(input({ dishes, random: () => 0.5 }))).toMatchObject({ dish: { id: 3 } });
    expect(pick(input({ dishes, random: () => 0.9999 }))).toMatchObject({ dish: { id: 4 } });
  });

  it('is roughly uniform over many picks', () => {
    const dishes = [1, 2, 3].map((i) => dish(i, ['beef']));
    const counts = new Map<number, number>();
    for (let i = 0; i < 3000; i++) {
      const r = pick(input({ dishes }));
      if (r.kind !== 'empty') counts.set(r.dish.id!, (counts.get(r.dish.id!) ?? 0) + 1);
    }
    for (const c of counts.values()) expect(c).toBeGreaterThan(850);
  });
});

describe('fallback', () => {
  const dishes = [
    dish(1, ['fish'], daysAgo(1)),
    dish(2, ['fish'], daysAgo(5)), // oldest
    dish(3, ['fish'], daysAgo(3)),
    dish(4, ['beef']), // never cooked, but not in the selected category
  ];

  it('returns the matching dish with the oldest lastCooked when all are in cooldown', () => {
    const r = pick(input({ dishes, selected: ['fish'] }));
    expect(r).toMatchObject({ kind: 'fallback', dish: { id: 2 } });
  });

  it('rerolls walk from oldest to newest instead of repeating', () => {
    expect(pickMany(input({ dishes, selected: ['fish'] }), 4)).toEqual([2, 3, 1, 2]);
  });

  it('is not used while any matching dish is eligible', () => {
    expect(pick(input({ dishes, selected: ['fish', 'beef'] }))).toMatchObject({ kind: 'pick', dish: { id: 4 } });
  });

});
