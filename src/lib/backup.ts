// Export/import file format. Pure: builds and validates plain objects; the DB
// write and the file download/upload happen elsewhere.
import { normalize, normalizeCategories, MAX_NAME_LENGTH } from './dishes';
import { CATEGORIES, DEFAULT_SETTINGS, type Category, type Dish, type Settings } from './types';

export const BACKUP_APP_ID = 'dinner-picker';
export const BACKUP_VERSION = 1;
export const MAX_COOLDOWN_DAYS = 365;

/**
 * Dish ids are deliberately NOT exported. Import replaces everything, so the DB
 * assigns fresh ids — no chance of clashing with ids left over from before.
 */
export type BackupDish = Omit<Dish, 'id'>;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number; // bumped if the format ever changes, so old files can be migrated
  exportedAt: string; // ISO timestamp, shown in the import confirmation
  settings: Settings;
  dishes: BackupDish[];
}

export function createBackup(dishes: readonly Dish[], settings: Settings, now: number = Date.now()): BackupFile {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    settings: { cooldownDays: settings.cooldownDays },
    dishes: dishes.map((d) => ({ name: d.name, categories: [...d.categories], lastCooked: d.lastCooked })),
  };
}

export function backupFilename(now: number = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `dinner-picker-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export function isValidCooldown(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_COOLDOWN_DAYS;
}

export type ParseResult = { ok: true; data: BackupFile } | { ok: false; error: string };

/**
 * Validate an imported file. All-or-nothing: one bad dish rejects the whole file,
 * because import REPLACES the user's data and a silently half-imported list is
 * worse than a clear error.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("This file isn't valid JSON.");
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP_ID) {
    return fail("This doesn't look like a Dinner Picker export.");
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return fail('This file was made by a newer version of the app.');
  }
  if (!Array.isArray(raw.dishes)) return fail('The file has no dish list.');

  // Settings are optional (lets you hand-write a file with just dishes).
  let settings: Settings = { ...DEFAULT_SETTINGS };
  if (raw.settings !== undefined) {
    if (!isObject(raw.settings) || !isValidCooldown(raw.settings.cooldownDays)) {
      return fail(`Cooldown must be a whole number between 0 and ${MAX_COOLDOWN_DAYS}.`);
    }
    settings = { cooldownDays: raw.settings.cooldownDays };
  }

  const dishes: BackupDish[] = [];
  const names = new Set<string>();
  for (const [i, d] of raw.dishes.entries()) {
    const where = `Dish #${i + 1}`;
    if (!isObject(d)) return fail(`${where} is not valid.`);
    const name = typeof d.name === 'string' ? d.name.trim() : '';
    if (!name) return fail(`${where} has no name.`);
    if (name.length > MAX_NAME_LENGTH) return fail(`${where} ("${name.slice(0, 20)}…") has a name that is too long.`);
    if (names.has(normalize(name))) return fail(`"${name}" appears more than once.`);
    names.add(normalize(name));

    if (!Array.isArray(d.categories) || d.categories.length === 0) return fail(`"${name}" has no categories.`);
    const bad = d.categories.find((c) => !(CATEGORIES as readonly unknown[]).includes(c));
    if (bad !== undefined) return fail(`"${name}" has an unknown category: ${JSON.stringify(bad)}.`);

    const lastCooked = d.lastCooked ?? null;
    if (lastCooked !== null && !(typeof lastCooked === 'number' && Number.isFinite(lastCooked) && lastCooked >= 0)) {
      return fail(`"${name}" has an invalid cooked date.`);
    }

    dishes.push({ name, categories: normalizeCategories(d.categories as Category[]), lastCooked });
  }

  return {
    ok: true,
    data: {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      settings,
      dishes,
    },
  };
}

function fail(error: string): ParseResult {
  return { ok: false, error };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
