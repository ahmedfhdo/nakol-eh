<script lang="ts">
  import { scale } from 'svelte/transition';
  import CategoryChips from '../components/CategoryChips.svelte';
  import Snackbar from '../components/Snackbar.svelte';
  import { db, getSettings, setLastCooked } from '../lib/db';
  import { live } from '../lib/live.svelte';
  import { FALLBACK_NOTE, pick } from '../lib/picker';
  import { href } from '../lib/router.svelte';
  import { CATEGORY_LABELS, DEFAULT_SETTINGS, type Category, type Dish } from '../lib/types';

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
  <h2>What's for dinner?</h2>

  <div class="filter">
    <p class="muted">What do you have at home?</p>
    <CategoryChips bind:selected label="Categories you have at home" />
    <p class="hint muted">
      {selected.length === 0
        ? 'No selection — any category.'
        : `Any of: ${selected.map((c) => CATEGORY_LABELS[c].label).join(', ')}`}
    </p>
  </div>

  <button class="pick" onclick={doPick} disabled={!dishes.current}>
    <span aria-hidden="true">🎲</span> Pick for me
  </button>

  <div class="result" aria-live="polite">
    {#if result.status === 'empty'}
      <div class="card empty" in:scale={{ start: 0.95, duration: 150 }}>
        <p class="big" aria-hidden="true">🤷</p>
        <p>
          {dishes.current?.length === 0
            ? "You don't have any dishes yet."
            : 'No dishes in these categories yet.'}
        </p>
        <a href={href('dishes')}>Add some dishes →</a>
      </div>
    {:else if result.status === 'shown'}
      {#key pickCount}
        <div class="card" in:scale={{ start: 0.95, duration: 150 }}>
          {#if result.fallback}
            <p class="note">{FALLBACK_NOTE}</p>
          {/if}
          <p class="dish-name">{result.dish.name}</p>
          <p class="cats">
            {#each result.dish.categories as c (c)}
              <span class="tag">{CATEGORY_LABELS[c].icon} {CATEGORY_LABELS[c].label}</span>
            {/each}
          </p>
          {#if result.cooked}
            <p class="cooked">✓ Enjoy your meal!</p>
          {:else}
            <div class="actions">
              <button onclick={cook}>Cook this</button>
              <button class="secondary" onclick={doPick}>Another one</button>
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
      message={`Marked "${snack.name}" as cooked`}
      actionLabel="Undo"
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
