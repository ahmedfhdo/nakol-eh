<script lang="ts">
  import { scale } from 'svelte/transition';
  import CategoryChips from '../components/CategoryChips.svelte';
  import CategoryTag from '../components/CategoryTag.svelte';
  import Snackbar from '../components/Snackbar.svelte';
  import { db, getSettings, setLastCooked } from '../lib/db';
  import { live } from '../lib/live.svelte';
  import { i18n } from '../lib/i18n/index.svelte';
  import { pick } from '../lib/picker';
  import { href } from '../lib/router.svelte';
  import { DEFAULT_SETTINGS, type Category, type Dish } from '../lib/types';

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
    <CategoryChips bind:selected label={i18n.m.picker.chipsLabel} variant="tiles" />
    <p class="hint muted">
      {selected.length === 0
        ? i18n.m.picker.anyCategory
        : i18n.m.picker.anyOf(selected.map((c) => i18n.m.categories[c]))}
    </p>
  </div>

  <button class="pick" onclick={doPick} disabled={!dishes.current}>
    {i18n.m.picker.pick}
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
        <div class="shown" in:scale={{ start: 0.95, duration: 150 }}>
          <!-- The result is a painted sign: solid frame, dashed inner border. -->
          <div class="card sign">
            <div class="sign-inner">
              {#if result.fallback}
                <p class="note">{i18n.m.picker.fallbackNote}</p>
              {/if}
              <p class="special">{i18n.m.picker.special}</p>
              <p class="dish-name"><bdi>{result.dish.name}</bdi></p>
              <p class="cats">
                {#each result.dish.categories as c (c)}
                  <CategoryTag category={c} />
                {/each}
              </p>
              {#if result.cooked}
                <p class="cooked">{i18n.m.picker.enjoy}</p>
              {/if}
            </div>
          </div>
          {#if !result.cooked}
            <div class="actions">
              <button class="cook" onclick={cook}>{i18n.m.picker.cook}</button>
              <button class="another" onclick={doPick}>{i18n.m.picker.another}</button>
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
    font-family: var(--font-display);
    font-size: 1.6rem;
  }

  .filter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .filter p {
    margin: 0;
  }

  .hint {
    font-size: 0.85rem;
  }

  .pick {
    font-size: 1.3rem;
    font-weight: 800;
    padding: 18px 48px;
    border-radius: 12px;
    background: var(--brand-navy);
    color: var(--on-brand);
    border: 2px solid var(--ink);
    box-shadow: 5px 5px 0 var(--brand-red);
    transition: transform 80ms, box-shadow 80ms;
  }

  .pick:active {
    transform: translate(3px, 3px);
    box-shadow: 2px 2px 0 var(--brand-red);
  }

  .result,
  .shown {
    width: 100%;
  }

  .shown {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card {
    background: var(--surface);
    border: 3px solid var(--ink);
    border-radius: 14px;
    padding: 8px;
  }

  .sign-inner,
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .sign-inner {
    border: 1.5px dashed var(--ink);
    border-radius: 8px;
    padding: 28px 18px;
  }

  .empty {
    padding: 24px 20px;
  }

  .card p {
    margin: 0;
  }

  .special {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--brand-red);
  }

  .dish-name {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1.15;
  }

  .cats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .note {
    font-size: 0.9rem;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--accent-soft);
  }

  .actions {
    display: flex;
    gap: 10px;
  }

  .actions button {
    min-height: 54px;
    font-weight: 700;
    border: 2px solid var(--ink);
  }

  .cook {
    flex: 1;
    background: var(--brand-navy);
    color: var(--on-brand);
  }

  .another {
    min-width: 120px;
    background: var(--brand-saffron);
    color: var(--on-saffron);
  }

  .cooked {
    color: var(--brand-red);
    font-weight: 700;
  }

  .big {
    font-size: 2.5rem;
  }

  .empty a {
    color: var(--accent);
    font-weight: 600;
  }
</style>
