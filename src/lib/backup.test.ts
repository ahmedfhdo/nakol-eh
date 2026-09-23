import { describe, expect, it } from 'vitest';
import { backupFilename, createBackup, isValidCooldown, parseBackup } from './backup';
import type { Dish } from './types';

const dishes: Dish[] = [
  { id: 7, name: 'Gulasch', categories: ['beef', 'fish'], lastCooked: 1_700_000_000_000 },
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
      { name: 'Gulasch', categories: ['beef', 'fish'], lastCooked: 1_700_000_000_000 },
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

describe('parseBackup rejects bad files with an error code', () => {
  const cases: [string, string, object][] = [
    ['not JSON', '{oops', { code: 'invalidJson' }],
    ['another app', JSON.stringify({ app: 'other', version: 1, dishes: [] }), { code: 'notOurFile' }],
    ['a JSON array', '[]', { code: 'notOurFile' }],
    ['a newer version', file({ version: 2 }), { code: 'newerVersion' }],
    ['no dish list', file({ dishes: 'nope' }), { code: 'noDishList' }],
    ['bad cooldown', file({ settings: { cooldownDays: -1 } }), { code: 'badCooldown', max: 365 }],
    ['fractional cooldown', file({ settings: { cooldownDays: 2.5 } }), { code: 'badCooldown', max: 365 }],
    ['a nameless dish', file({ dishes: [{ name: ' ', categories: ['fish'] }] }), { code: 'nameMissing', index: 1 }],
    ['no categories', file({ dishes: [{ name: 'Soup', categories: [] }] }), { code: 'noCategories', name: 'Soup' }],
    [
      'unknown category',
      file({ dishes: [{ name: 'Soup', categories: ['lamb'] }] }),
      { code: 'unknownCategory', name: 'Soup', value: 'lamb' },
    ],
    [
      'bad lastCooked',
      file({ dishes: [{ name: 'Soup', categories: ['fish'], lastCooked: 'yesterday' }] }),
      { code: 'badCookedDate', name: 'Soup' },
    ],
    [
      'duplicate names',
      file({ dishes: [{ name: 'Soup', categories: ['fish'] }, { name: 'soup', categories: ['beef'] }] }),
      { code: 'duplicateName', name: 'soup' },
    ],
  ];
  for (const [label, text, error] of cases) {
    it(label, () => {
      expect(parseBackup(text)).toEqual({ ok: false, error });
    });
  }
});

describe('importing a backup made before pork was removed', () => {
  const old = file({
    dishes: [
      { name: 'Schnitzel', categories: ['pork'], lastCooked: 123 },
      { name: 'Gulasch', categories: ['beef', 'pork'], lastCooked: null },
      { name: 'Spanferkel', categories: ['pork'], lastCooked: null },
    ],
  });

  it('converts known pork defaults, strips pork from mixed dishes, skips other pork-only dishes', () => {
    const r = parseBackup(old);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.dishes).toEqual([
      { name: 'Chicken Schnitzel', categories: ['chicken'], lastCooked: 123 },
      { name: 'Gulasch', categories: ['beef'], lastCooked: null },
    ]);
    expect(r.skipped).toEqual(['Spanferkel']);
  });

  it('never produces "pork" in the output', () => {
    const r = parseBackup(old);
    expect(JSON.stringify(r)).not.toContain('"pork"');
  });
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
