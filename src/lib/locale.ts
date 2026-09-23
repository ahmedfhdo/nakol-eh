// Language choice. Plain module (no Svelte runes) so the DB and tests can use it too.

export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Stored in localStorage, not IndexedDB, on purpose: it's a per-device display
 * preference (not part of your data, so not in export/import), and it must be
 * readable synchronously at startup to set the page direction (RTL) before the
 * first paint — IndexedDB is async.
 */
export const LOCALE_STORAGE_KEY = 'dinner-picker:locale';

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** Saved choice → otherwise the browser's languages (first Arabic or English wins) → English. */
export function detectInitialLocale(
  saved: string | null = safeGet(),
  languages: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [],
): Locale {
  if (isLocale(saved)) return saved;
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // private mode / storage disabled: the choice just won't survive a reload
  }
}

function safeGet(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}
