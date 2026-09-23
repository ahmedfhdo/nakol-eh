# Dinner Picker — Project Spec (v1)

## What this is
A small, offline-first Progressive Web App that answers "what should I make for dinner?"
The user picks which protein categories they have at home, taps **Pick for me**, and gets
one random dish suggestion. Dishes that were cooked recently are skipped for a while so
suggestions stay varied.

It suggests **dish names only** — no full recipes, no ingredient tracking.

## Tech stack
- **Vite** + **Svelte** + **TypeScript**
- **Dexie.js** for IndexedDB storage
- **vite-plugin-pwa** for the service worker and web app manifest (installable, works offline)
- Hosted as static files on **GitHub Pages** (no backend, no accounts)
- Mobile-first layout; must also be usable on desktop

## Data model

```ts
type Category = 'beef' | 'chicken' | 'fish' | 'vegetarian';

interface Dish {
  id?: number;              // auto-increment
  name: string;
  categories: Category[];   // at least one; a dish can have several
  lastCooked: number | null; // timestamp (ms), null if never cooked
}

interface Settings {
  cooldownDays: number;     // default 7
}
```

Rules:
- Store `lastCooked`, never an "excluded until" date. Eligibility is computed at pick time,
  so changing `cooldownDays` applies to all dishes immediately.
- On first launch, seed the database from the default dish list for the current language
  (below). After that the user's copy is fully theirs to edit.
- There is no pork category (removed in DB schema v2). The v2 upgrade and the backup import
  both run `removePork`: the four old pork-only defaults are converted (Schnitzel → Chicken
  Schnitzel, Currywurst → Rindercurrywurst, Pulled Pork → Pulled Beef, Pork Stir-Fry →
  Chicken Stir-Fry), mixed dishes lose the pork tag, other pork-only dishes are dropped.

## Features

### 1. Picker (home screen — the core of the app)
- Category chips at the top (multi-select). Selecting several means "match ANY of them".
  No chip selected = all categories.
- A large, central **Pick for me** button.
- A result card showing the picked dish with two actions:
  - **Cook this** → sets `lastCooked = now`, dish enters cooldown.
    Show a snackbar with **Undo** for ~5 seconds.
  - **Another one** → rerolls.

### 2. Pick algorithm
1. Filter dishes by selected categories (any match).
2. Remove dishes still in cooldown (`now - lastCooked < cooldownDays`).
3. Remove dishes already shown in the current picker session ("shuffle bag").
   If that empties the pool, reset the session list and try again.
4. Pick uniformly at random from what remains.
5. **Fallback:** if the pool is empty because everything is in cooldown, return the matching
   dish with the oldest `lastCooked` and show a short note:
   "Everything here was cooked recently — here's the one from longest ago."
6. If no dishes match the categories at all, show a friendly empty state with a link to
   add dishes.

Only **Cook this** triggers the cooldown. Being shown or rerolled does not.

### 3. Manage dishes (secondary screen)
- List of all dishes, filterable by category, with a searchbox.
- Add, edit (name + categories), delete (with confirmation).
- Show "cooked X days ago" / "never" per dish; option to clear the cooked date.

### 4. Settings
- Cooldown length in days (default 7).
- **Export** all dishes + settings to a JSON file (download).
- **Import** from a JSON file (replace current data, with confirmation).
- **Restore default dishes** (with confirmation).

### 5. Languages (English + Egyptian Arabic)
- Two UI languages: English and Egyptian Arabic (عامية مصرية — natural colloquial phrasing,
  not a literal translation). Switch from the header or Settings → Language.
- First launch follows the browser language (Arabic if it's `ar-*`, else English); the choice is
  then remembered in localStorage (per-device display preference, not part of export/import).
- One shared dish list: dish names are stored as typed and are not translated. Only the
  default list (first launch / "Restore default dishes") depends on the current language.
- Arabic: `dir="rtl"`, Western digits (1, 2, 3), proper Arabic plural forms, bidi isolation
  around user text; search/duplicate check treat أ/إ/آ=ا, ة=ه, ى=ي and ignore tashkeel.
- All UI text lives in `src/lib/i18n/en.ts` and `ar.ts` (same keys, type-checked). Logic
  modules return numbers / error codes, never user-facing strings.

### 6. Storage safety
- On first launch call `navigator.storage.persist()`.
- Export/import is part of v1, not a later feature — browser data can be cleared.

## Build order (one milestone at a time, test and commit after each)
(Milestones 1–7 are done. Later changes: pork removed; Egyptian Arabic added.)
1. Scaffold Vite + Svelte + TS project; basic layout and navigation between the three screens.
2. Dexie database, data model, seeding with default dishes.
3. Manage dishes screen (list, add, edit, delete).
4. Picker screen with the full pick algorithm, cooldown, fallback and undo.
5. Settings: cooldown, export/import, restore defaults.
6. PWA: manifest, icons, service worker, offline support, install prompt.
7. Deploy to GitHub Pages (GitHub Actions workflow).

## Conventions
- Keep it simple: no state library, no UI component library unless clearly needed.
- Put the pick algorithm in a pure, framework-independent module (`src/lib/picker.ts`)
  with unit tests (Vitest) covering: category filtering, cooldown, shuffle bag, fallback.
- Explain non-obvious architectural decisions briefly when making them.

## Later ideas (not v1)
- Weighted random by days since cooked instead of a hard cooldown
- Optional notes or a recipe link per dish
- Real ingredient tracking / "missing 1–2 ingredients"
- Shared household list (would require a backend)

## Default dish lists
Source of truth: `src/lib/defaultDishes.ts`. Format below: name — categories.

### English (35)

- Chicken Schnitzel — chicken
- Rouladen — beef
- Gulasch — beef
- Frikadellen mit Kartoffelsalat — beef
- Rindercurrywurst mit Pommes — beef
- Sauerbraten — beef
- Königsberger Klopse — beef
- Chili con Carne — beef, vegetarian
- Spaghetti Bolognese — beef, vegetarian
- Lasagne — beef, vegetarian
- Burger — beef, chicken, vegetarian
- Tacos — beef, chicken, vegetarian
- Pulled Beef Sandwich — beef
- Chicken Stir-Fry with Rice — chicken
- Hähnchen-Curry — chicken, vegetarian
- Chicken Fajitas — chicken
- Chicken Teriyaki with Rice — chicken
- Roast Chicken with Vegetables — chicken
- Chicken Caesar Salad — chicken
- Paella — chicken, fish
- Fish and Chips — fish
- Lachs mit Ofengemüse — fish
- Fischstäbchen mit Kartoffelpüree — fish
- Shrimp Pasta — fish
- Tuna Pasta Bake — fish
- Fried Rice — chicken, fish, vegetarian
- Käsespätzle — vegetarian
- Pfannkuchen — vegetarian
- Gemüse-Risotto — vegetarian
- Shakshuka — vegetarian
- Pasta Pesto — vegetarian
- Linsensuppe — vegetarian
- Vegetable Stir-Fry with Noodles — chicken, vegetarian
- Pizza — vegetarian
- Omelette with Salad — vegetarian

### Egyptian Arabic (48)
Names exactly as provided. Stews (طبيخ) and mahshi are commonly made with or without meat,
so they carry both beef and vegetarian.

- محشي كرنب — beef, vegetarian
- محشي بتنجان — beef, vegetarian
- محشي ورق عنب — beef, vegetarian
- كبسة — beef, chicken
- رز اصفر — chicken
- ملوخية — beef, chicken
- بامية — beef, vegetarian
- بسلة — beef, vegetarian
- لوبيا — beef, vegetarian
- سبانخ — beef, vegetarian
- كوسة — beef, vegetarian
- فاصوليا بيضا — beef, vegetarian
- فاصوليا خضرا — beef, vegetarian
- كشك — chicken
- فتة — beef
- رز معمر وبطاطس — chicken
- مكرونة بشاميل — beef
- مكرونة وبانيه — chicken
- كبدة اسكندراني — beef
- سجق — beef
- صيني — chicken
- طاجن جمبري بالسبيط — fish
- جمبري مقلي — fish
- جمبري مشوي — fish
- بلطي مقلي — fish
- بلطي مشوي — fish
- سنجاري — fish
- رنجة — fish
- لحمة بالبصل — beef
- بفتيك — beef
- كفتة — beef
- كرات اللحمة بيضة — beef
- كرات اللحمة حمرة — beef
- جلاش — beef
- كفتة بالرز — beef
- كبد واوانص — chicken
- فراخ مشوية — chicken
- كشري — vegetarian
- مسقعة — beef, vegetarian
- عجة — vegetarian
- بطاطس بالبيض — vegetarian
- عدس — vegetarian
- نجرسكو — chicken
- شاورما — beef, chicken
- بطاطس محشية لحمة مفرومة — beef
- حواوشي — beef
- كشري عدس اصفر — vegetarian
- ستريبس — chicken
