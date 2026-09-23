<script lang="ts">
  import { scale } from 'svelte/transition';
  import CategoryChips from '../components/CategoryChips.svelte';
  import Snackbar from '../components/Snackbar.svelte';
  import { db, getSettings, setLastCooked } from '../lib/db';
  import { live } from '../lib/live.svelte';
  import { i18n } from '../lib/i18n/index.svelte';
  import { pick } from '../lib/picker';
  import { href } from '../lib/router.svelte';
  import { CATEGORY_ICONS, DEFAULT_SETTINGS, type Category, type Dish } from '../lib/types';

  const dishes = live(() => db.dishes.toArray());
  const settings = live(() => getSettings());

  let selected = $state<Category[]>([]);

  // Picker session state. Lives as long as this screen is open: switching tabs or
  // reloading starts a fresh session (fresh shuffle bag).
  let seen: ReadonlySet<number> = new Set();

  type Result = { status: 'none' } | { status: 'empty' } | { status: 'shown'; dish: Dish; fallback: boolean; cooked: boolean };
  let result = $state<Result>({ status: 'none' });
  // Bumped on every pick so the card animates even if the same dish comes up again.
  let pickCount = $state(0);

  let snack = $state<{ id: number; dishId: number; name: string; previous: number | null } | null>(null);

  function doPick() {
    if (!dishes.current) return;
    const r = pick({
      dishes: dishes.current,
      selected,
      cooldownDays: (settings.current ?? DEFAULT_SETTINGS).cooldownDays,
      now: Date.now(),
      seen,
      previousId: result.status === 'shown' ? (result.dish.id ?? null) : null,
    });
    pickCount++;
    if (r.kind === 'empty') {
      result = { status: 'empty' };
      return;
    }
    seen = r.seen;
    result = { status: 'shown', dish: r.dish, fallback: r.kind === 'fallback', cooked: false };
  }

  async function cook() {
    if (result.status !== 'shown' || result.dish.id == null) return;
    const { dish } = result;
    await setLastCooked(dish.id!, Date.now());
    result = { ...result, cooked: true };
    // Remember the previous value (not just "null") so Undo restores the exact old state.
    snack = { id: pickCount, dishId: dish.id!, name: dish.name, previous: dish.lastCooked };
  }

  async function undo() {
    if (!snack) return;
    const { dishId, previous } = snack;
    snack = null;
    await setLastCooked(dishId, previous);
    if (result.status === 'shown' && result.dish.id === dishId) result = { ...result, cooked: false };
  }
</script>

<section>
  <h2>{i18n.m.picker.title}</h2>

  <div class="filter">
    <p class="muted">{i18n.m.picker.question}</p>
    <CategoryChips bind:selected label={i18n.m.picker.chipsLabel} />
    <p class="hint muted">
      {selected.length === 0
        ? i18n.m.picker.anyCategory
        : i18n.m.picker.anyOf(selected.map((c) => i18n.m.categories[c]))}
    </p>
  </div>

  <button class="pick" onclick={doPick} disabled={!dishes.current}>
    <span aria-hidden="true">🎲</span> {i18n.m.picker.pick}
  </button>

  <div class="result" aria-live="polite">
    {#if result.status === 'empty'}
      <div class="card empty" in:scale={{ start: 0.95, duration: 150 }}>
        <p class="big" aria-hidden="true">🤷</p>
        <p>
          {dishes.current?.length === 0 ? i18n.m.picker.noDishesAtAll : i18n.m.picker.noDishesInCategories}
        </p>
        <a href={href('dishes')}>{i18n.m.picker.addDishesLink}</a>
      </div>
    {:else if result.status === 'shown'}
      {#key pickCount}
        <div class="card" in:scale={{ start: 0.95, duration: 150 }}>
          {#if result.fallback}
            <p class="note">{i18n.m.picker.fallbackNote}</p>
          {/if}
          <p class="dish-name">{result.dish.name}</p>
          <p class="cats">
            {#each result.dish.categories as c (c)}
              <span class="tag">{CATEGORY_ICONS[c]} {i18n.m.categories[c]}</span>
            {/each}
          </p>
          {#if result.cooked}
            <p class="cooked">{i18n.m.picker.enjoy}</p>
          {:else}
            <div class="actions">
              <button onclick={cook}>{i18n.m.picker.cook}</button>
              <button class="secondary" onclick={doPick}>{i18n.m.picker.another}</button>
            </div>
          {/if}
        </div>
      {/key}
    {/if}
  </div>
</section>

{#if snack}
  {#key snack.id}
    <Snackbar
      message={i18n.m.picker.cookedSnack(snack.name)}
      actionLabel={i18n.m.picker.undo}
      onaction={undo}
      ondismiss={() => (snack = null)}
    />
  {/key}
{/if}

<style>
  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    text-align: center;
    padding-top: 8px;
    padding-bottom: 72px; /* room for the snackbar */
  }

  h2 {
    margin: 0;
  }

  .filter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .filter p {
    margin: 0;
  }

  .filter :global(.chips) {
    justify-content: center;
  }

  .hint {
    font-size: 0.85rem;
  }

  .pick {
    font-size: 1.35rem;
    padding: 20px 44px;
    border-radius: 999px;
    box-shadow: 0 6px 18px rgb(210 85 30 / 0.3);
  }

  .pick:active {
    transform: scale(0.97);
  }

  .result {
    width: 100%;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .card p {
    margin: 0;
  }

  .dish-name {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .cats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .tag {
    font-size: 0.85rem;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--bg);
    border: 1px solid var(--border);
  }

  .note {
    font-size: 0.9rem;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--accent-soft);
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }

  .cooked {
    color: var(--accent);
    font-weight: 600;
  }

  .big {
    font-size: 2.5rem;
  }

  .empty a {
    color: var(--accent);
    font-weight: 600;
  }
</style>
