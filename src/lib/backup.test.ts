import { describe, expect, it } from 'vitest';
import { backupFilename, createBackup, isValidCooldown, parseBackup } from './backup';
import type { Dish } from './types';

const dishes: Dish[] = [
  { id: 7, name: 'Gulasch', categories: ['beef', 'pork'], lastCooked: 1_700_000_000_000 },
  { id: 9, name: 'Käsespätzle', categories: ['vegetarian'], lastCooked: null },
];

const file = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'dinner-picker', version: 1, exportedAt: '2026-09-23T10:00:00.000Z', settings: { cooldownDays: 5 }, dishes: [], ...over });

describe('createBackup / parseBackup', () => {
  it('round-trips dishes and settings (without ids)', () => {
    const backup = createBackup(dishes, { cooldownDays: 4 }, Date.UTC(2026, 8, 23));
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.settings).toEqual({ cooldownDays: 4 });
    expect(parsed.data.dishes).toEqual([
      { name: 'Gulasch', categories: ['beef', 'pork'], lastCooked: 1_700_000_000_000 },
      { name: 'Käsespätzle', categories: ['vegetarian'], lastCooked: null },
    ]);
    expect(parsed.data.exportedAt).toBe('2026-09-23T00:00:00.000Z');
    expect(JSON.stringify(backup)).not.toContain('"id"');
  });

  it('accepts an empty dish list', () => {
    expect(parseBackup(file()).ok).toBe(true);
  });

  it('uses default settings when the file has none', () => {
    const r = parseBackup(file({ settings: undefined }));
    expect(r.ok && r.data.settings).toEqual({ cooldownDays: 7 });
  });

  it('trims names, orders categories, and defaults a missing lastCooked to null', () => {
    const r = parseBackup(file({ dishes: [{ name: '  Soup ', categories: ['vegetarian', 'beef'] }] }));
    expect(r.ok && r.data.dishes).toEqual([{ name: 'Soup', categories: ['beef', 'vegetarian'], lastCooked: null }]);
  });
});

describe('parseBackup rejects bad files with a helpful message', () => {
  const cases: [string, string, RegExp][] = [
    ['not JSON', '{oops', /valid JSON/],
    ['another app', JSON.stringify({ app: 'other', version: 1, dishes: [] }), /Dinner Picker export/],
    ['a JSON array', '[]', /Dinner Picker export/],
    ['a newer version', file({ version: 2 }), /newer version/],
    ['no dish list', file({ dishes: 'nope' }), /no dish list/],
    ['bad cooldown', file({ settings: { cooldownDays: -1 } }), /Cooldown/],
    ['fractional cooldown', file({ settings: { cooldownDays: 2.5 } }), /Cooldown/],
    ['a nameless dish', file({ dishes: [{ name: ' ', categories: ['fish'] }] }), /Dish #1 has no name/],
    ['no categories', file({ dishes: [{ name: 'Soup', categories: [] }] }), /"Soup" has no categories/],
    ['unknown category', file({ dishes: [{ name: 'Soup', categories: ['lamb'] }] }), /unknown category: "lamb"/],
    ['bad lastCooked', file({ dishes: [{ name: 'Soup', categories: ['fish'], lastCooked: 'yesterday' }] }), /invalid cooked date/],
    [
      'duplicate names',
      file({ dishes: [{ name: 'Soup', categories: ['fish'] }, { name: 'soup', categories: ['beef'] }] }),
      /appears more than once/,
    ],
  ];
  for (const [label, text, msg] of cases) {
    it(label, () => {
      const r = parseBackup(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(msg);
    });
  }
});

describe('helpers', () => {
  it('backupFilename uses the local date', () => {
    expect(backupFilename(new Date(2026, 0, 5, 23, 0).getTime())).toBe('dinner-picker-2026-01-05.json');
  });

  it('isValidCooldown accepts whole numbers 0–365', () => {
    expect([0, 7, 365].every(isValidCooldown)).toBe(true);
    expect([-1, 366, 1.5, NaN, '7'].some(isValidCooldown)).toBe(false);
  });
});
