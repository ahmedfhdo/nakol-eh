import type { BackupError } from '../backup';
import type { DishError } from '../dishes';
import type { Category } from '../types';

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);
const dishes = (n: number) => `${n} ${plural(n, 'dish', 'dishes')}`;

export const en = {
  // Used for <html lang>, Intl formatting and sorting.
  intl: 'en',
  dir: 'ltr' as 'ltr' | 'rtl',
  languageName: 'English',

  appTitle: 'Nakol Eh',

  nav: {
    label: 'Main',
    picker: 'Pick',
    dishes: 'Dishes',
    settings: 'Settings',
  },

  categories: {
    beef: 'Beef',
    chicken: 'Chicken',
    fish: 'Fish',
    vegetarian: 'Veggie',
  } satisfies Record<Category, string>,

  /** "Cooked 3 days ago". `days` null = never. */
  cooked: (days: number | null) =>
    days === null ? 'Never cooked' : days === 0 ? 'Cooked today' : days === 1 ? 'Cooked yesterday' : `Cooked ${days} days ago`,

  picker: {
    title: "What's for dinner?",
    question: 'What do you have at home?',
    chipsLabel: 'Categories you have at home',
    anyCategory: 'No selection — any category.',
    anyOf: (labels: string[]) => `Any of: ${labels.join(', ')}`,
    pick: 'Pick for me',
    cook: 'Cook this',
    another: 'Another one',
    special: "Tonight's special",
    enjoy: '✓ Enjoy your meal!',
    fallbackNote: "Everything here was cooked recently — here's the one from longest ago.",
    noDishesAtAll: "You don't have any dishes yet.",
    noDishesInCategories: 'No dishes in these categories yet.',
    addDishesLink: 'Add some dishes →',
    cookedSnack: (name: string) => `Marked “${name}” as cooked`,
    undo: 'Undo',
  },

  dishes: {
    title: 'Dishes',
    add: '+ Add dish',
    search: 'Search dishes…',
    filterLabel: 'Filter by category',
    loading: 'Loading…',
    count: (n: number) => dishes(n),
    countFiltered: (shown: number, total: number) => `${shown} of ${dishes(total)}`,
    empty: "You don't have any dishes yet.",
    addFirst: 'Add your first dish',
    noMatch: 'No dishes match. Try a different search or category.',
  },

  editor: {
    addTitle: 'Add dish',
    editTitle: 'Edit dish',
    name: 'Name',
    categories: 'Categories',
    categoriesLabel: 'Dish categories',
    clearCooked: 'Clear',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmDelete: (name: string) => `Delete “${name}”? This can't be undone.`,
    saveFailed: 'Could not save. Please try again.',
    error: (e: DishError): string => {
      switch (e.code) {
        case 'nameRequired':
          return 'Please enter a name.';
        case 'nameTooLong':
          return `Name is too long (max ${e.max} characters).`;
        case 'categoryRequired':
          return 'Pick at least one category.';
        case 'duplicate':
          return `“${e.name}” is already in your list.`;
      }
    },
  },

  settings: {
    title: 'Settings',

    languageTitle: 'Language',

    cooldownTitle: 'Cooldown',
    cooldownHelp: "After you cook a dish, it won't be suggested again for this many days.",
    cooldownInput: 'Cooldown in days',
    fewer: 'Fewer days',
    more: 'More days',
    daysUnit: (n: number) => plural(n, 'day', 'days'),
    cooldownInvalid: (max: number) => `Enter a whole number from 0 to ${max}.`,
    cooldownOff: 'No cooldown — every dish can come up any time.',
    inCooldown: (n: number) => `${n} ${plural(n, 'dish is', 'dishes are')} in cooldown right now.`,

    backupTitle: 'Backup',
    backupHelp: 'Your dishes are stored only in this browser. Clearing browsing data deletes them — export a backup now and then.',
    export: 'Export to file',
    import: 'Import from file…',
    exported: (n: number) => `Exported ${dishes(n)}`,
    imported: (n: number) => `Imported ${dishes(n)}`,
    importFailed: (file: string, reason: string) => `Couldn't import ${file}: ${reason}`,
    persisted: "✓ Storage is marked as persistent — the browser won't clear it on its own.",
    notPersisted: 'The browser may clear this data when it runs low on space.',
    askPersist: 'Ask to keep it',
    persistDeclined: 'The browser declined — installing the app usually helps',

    importTitle: 'Replace all data?',
    importConfirm: 'Replace',
    importBody: (n: number, file: string, date: string) =>
      `Import ${dishes(n)} from ${file}${date ? ` (exported ${date})` : ''}?`,
    importReplaces: (current: number, cooldown: number) =>
      `This replaces your current ${dishes(current)} and sets the cooldown to ${cooldown} ${plural(cooldown, 'day', 'days')}. It can't be undone.`,
    importSkipped: (names: string[]) =>
      `${names.length} pork-only ${plural(names.length, 'dish', 'dishes')} from an old backup will be left out: ${names.join(', ')}.`,

    appTitle: 'App',
    installed: '✓ Installed. Works offline — your dishes never leave this device.',
    installHelp: 'Install Nakol Eh to open it from your home screen, full-screen and offline.',
    install: 'Install app',
    iosInstall: 'To install on iPhone or iPad: open this page in Safari, tap Share, then “Add to Home Screen”.',
    otherInstall: 'Works offline once loaded. To install, use your browser’s menu (“Install app” or “Add to Home screen”).',

    resetTitle: 'Reset',
    resetHelp: (n: number) => `Replace your dish list with the ${n} default dishes. Your cooldown setting is kept.`,
    reset: 'Restore default dishes…',
    resetConfirmTitle: 'Restore default dishes?',
    resetConfirm: 'Restore',
    resetBody: (current: number, defaults: number) =>
      `Your ${dishes(current)}, including ones you added and all cooked dates, will be replaced by the ${defaults} defaults. It can't be undone.`,
    resetTip: 'Tip: export a backup first.',
    restored: 'Default dishes restored',
    cancel: 'Cancel',

    backupError: (e: BackupError): string => {
      switch (e.code) {
        case 'invalidJson':
          return "this file isn't valid JSON.";
        case 'notOurFile':
          return "this doesn't look like a Nakol Eh backup.";
        case 'newerVersion':
          return 'it was made by a newer version of the app.';
        case 'noDishList':
          return 'the file has no dish list.';
        case 'badCooldown':
          return `the cooldown must be a whole number between 0 and ${e.max}.`;
        case 'dishInvalid':
          return `dish #${e.index} is not valid.`;
        case 'nameMissing':
          return `dish #${e.index} has no name.`;
        case 'nameTooLong':
          return `dish #${e.index} has a name that is too long.`;
        case 'duplicateName':
          return `“${e.name}” appears more than once.`;
        case 'noCategories':
          return `“${e.name}” has no categories.`;
        case 'unknownCategory':
          return `“${e.name}” has an unknown category: “${e.value}”.`;
        case 'badCookedDate':
          return `“${e.name}” has an invalid cooked date.`;
      }
    },
  },

  pwa: {
    install: 'Install',
    updateAvailable: 'A new version is available.',
    reload: 'Reload',
    offlineReady: 'Ready to work offline.',
  },
};

export type Messages = typeof en;
