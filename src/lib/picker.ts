// The pick algorithm (CLAUDE.md §2). Pure and framework-independent: no DB, no
// Date.now(), no Math.random() hidden inside — time, randomness and session state
// are all passed in, so every branch is deterministic under test.
import { matchesCategories } from './dishes';
import type { Category, Dish } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const FALLBACK_NOTE = "Everything here was cooked recently — here's the one from longest ago.";

export interface PickInput {
  dishes: readonly Dish[];
  selected: readonly Category[]; // empty = all categories
  cooldownDays: number;
  now: number; // ms timestamp
  /** Dish ids already shown this picker session (the "shuffle bag"). */
  seen: ReadonlySet<number>;
  /** Id of the dish currently on screen, so a bag reset never repeats it immediately. */
  previousId?: number | null;
  /** Returns a float in [0, 1). Injected for tests; defaults to Math.random. */
  random?: () => number;
}

export type PickResult =
  | { kind: 'pick'; dish: Dish; seen: Set<number> }
  | { kind: 'fallback'; dish: Dish; seen: Set<number> }
  | { kind: 'empty' }; // no dish matches the selected categories at all

export function isInCooldown(dish: Dish, cooldownDays: number, now: number): boolean {
  return dish.lastCooked !== null && now - dish.lastCooked < cooldownDays * DAY_MS;
}

export function pick(input: PickInput): PickResult {
  const { dishes, selected, cooldownDays, now, seen, previousId = null, random = Math.random } = input;

  // 1. Category filter (ANY match).
  const matching = dishes.filter((d) => d.id != null && matchesCategories(d, selected));
  if (matching.length === 0) return { kind: 'empty' };

  // 2. Cooldown filter.
  const eligible = matching.filter((d) => !isInCooldown(d, cooldownDays, now));

  if (eligible.length === 0) {
    // 5. Fallback: everything matching is in cooldown → oldest lastCooked first.
    // Rerolls walk through the in-cooldown dishes from oldest to newest (using the
    // same shuffle bag) instead of returning the same dish every time.
    const byOldest = [...matching].sort((a, b) => (a.lastCooked ?? 0) - (b.lastCooked ?? 0));
    const { pool, bag } = drawFromBag(byOldest, seen, previousId);
    const dish = pool[0];
    return { kind: 'fallback', dish, seen: withId(bag, dish.id!) };
  }

  // 3. Shuffle bag: skip dishes already shown this session; reset when exhausted.
  const { pool, bag } = drawFromBag(eligible, seen, previousId);

  // 4. Uniform random pick.
  const dish = pool[Math.floor(random() * pool.length)] ?? pool[0];
  return { kind: 'pick', dish, seen: withId(bag, dish.id!) };
}

/**
 * Remove already-seen dishes. If that empties the pool, start a fresh bag —
 * but keep the dish currently on screen out (when there's anything else),
 * so "Another one" never shows the same dish twice in a row.
 */
function drawFromBag(candidates: Dish[], seen: ReadonlySet<number>, previousId: number | null) {
  const unseen = candidates.filter((d) => !seen.has(d.id!));
  if (unseen.length > 0) return { pool: unseen, bag: new Set(seen) };

  const fresh = candidates.filter((d) => d.id !== previousId);
  return { pool: fresh.length > 0 ? fresh : candidates, bag: new Set<number>() };
}

function withId(set: Set<number>, id: number): Set<number> {
  set.add(id);
  return set;
}
