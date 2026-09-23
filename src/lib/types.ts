export const CATEGORIES = ['beef', 'pork', 'chicken', 'fish', 'vegetarian'] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Dish {
  id?: number; // auto-increment
  name: string;
  categories: Category[]; // at least one; a dish can have several
  lastCooked: number | null; // timestamp (ms), null if never cooked
}

export interface Settings {
  cooldownDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  cooldownDays: 7,
};

export const CATEGORY_LABELS: Record<Category, { label: string; icon: string }> = {
  beef: { label: 'Beef', icon: '🐄' },
  pork: { label: 'Pork', icon: '🐖' },
  chicken: { label: 'Chicken', icon: '🐔' },
  fish: { label: 'Fish', icon: '🐟' },
  vegetarian: { label: 'Vegetarian', icon: '🥦' },
};
