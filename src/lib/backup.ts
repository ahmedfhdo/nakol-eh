// Export/import file format. Pure: builds and validates plain objects; the DB
// write and the file download/upload happen elsewhere.
import { normalize, normalizeCategories, MAX_NAME_LENGTH } from './dishes';
import { removePork } from './removePork';
import { CATEGORIES, DEFAULT_SETTINGS, type Dish, type Settings } from './types';

// Internal marker inside backup files. Deliberately NOT renamed with the app
// ("Nakol Eh"): changing it would make every existing backup unimportable.
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
  return `nakol-eh-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export function isValidCooldown(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_COOLDOWN_DAYS;
}

export type BackupError =
  | { code: 'invalidJson' }
  | { code: 'notOurFile' }
  | { code: 'newerVersion' }
  | { code: 'noDishList' }
  | { code: 'badCooldown'; max: number }
  | { code: 'dishInvalid'; index: number }
  | { code: 'nameMissing'; index: number }
  | { code: 'nameTooLong'; index: number }
  | { code: 'duplicateName'; name: string }
  | { code: 'noCategories'; name: string }
  | { code: 'unknownCategory'; name: string; value: string }
  | { code: 'badCookedDate'; name: string };

export type ParseResult =
  | { ok: true; data: BackupFile; /** pork-only dishes from an old backup that were left out */ skipped: string[] }
  | { ok: false; error: BackupError };

/**
 * Validate an imported file. All-or-nothing: one bad dish rejects the whole file,
 * because import REPLACES the user's data and a silently half-imported list is
 * worse than a clear error. (Exception: "pork" from backups made before it was
 * removed is migrated like the database was, and reported via `skipped`.)
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail({ code: 'invalidJson' });
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP_ID) return fail({ code: 'notOurFile' });
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) return fail({ code: 'newerVersion' });
  if (!Array.isArray(raw.dishes)) return fail({ code: 'noDishList' });

  // Settings are optional (lets you hand-write a file with just dishes).
  let settings: Settings = { ...DEFAULT_SETTINGS };
  if (raw.settings !== undefined) {
    if (!isObject(raw.settings) || !isValidCooldown(raw.settings.cooldownDays)) {
      return fail({ code: 'badCooldown', max: MAX_COOLDOWN_DAYS });
    }
    settings = { cooldownDays: raw.settings.cooldownDays };
  }

  // Names in the file, for the pork conversion's duplicate check.
  const fileNames = new Set(raw.dishes.map((d) => (isObject(d) && typeof d.name === 'string' ? d.name.trim() : '')));

  const dishes: BackupDish[] = [];
  const skipped: string[] = [];
  const names = new Set<string>();
  for (const [i, d] of raw.dishes.entries()) {
    const index = i + 1;
    if (!isObject(d)) return fail({ code: 'dishInvalid', index });
    let name = typeof d.name === 'string' ? d.name.trim() : '';
    if (!name) return fail({ code: 'nameMissing', index });
    if (name.length > MAX_NAME_LENGTH) return fail({ code: 'nameTooLong', index });

    if (!Array.isArray(d.categories) || d.categories.length === 0) return fail({ code: 'noCategories', name });
    const bad = d.categories.find((c) => c !== 'pork' && !(CATEGORIES as readonly unknown[]).includes(c));
    if (bad !== undefined) return fail({ code: 'unknownCategory', name, value: String(bad) });

    const migrated = removePork({ name, categories: d.categories as string[] }, fileNames);
    if (migrated === null) {
      skipped.push(name);
      continue;
    }
    name = migrated.name;

    if (names.has(normalize(name))) return fail({ code: 'duplicateName', name });
    names.add(normalize(name));

    const lastCooked = d.lastCooked ?? null;
    if (lastCooked !== null && !(typeof lastCooked === 'number' && Number.isFinite(lastCooked) && lastCooked >= 0)) {
      return fail({ code: 'badCookedDate', name });
    }

    dishes.push({ name, categories: normalizeCategories(migrated.categories), lastCooked });
  }

  return {
    ok: true,
    skipped,
    data: {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      settings,
      dishes,
    },
  };
}

function fail(error: BackupError): ParseResult {
  return { ok: false, error };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
