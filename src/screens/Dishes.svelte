<script lang="ts">
  import CategoryChips from '../components/CategoryChips.svelte';
  import DishEditor from '../components/DishEditor.svelte';
  import { db } from '../lib/db';
  import { cookedLabel, filterDishes } from '../lib/dishes';
  import { live } from '../lib/live.svelte';
  import { CATEGORY_LABELS, type Category, type Dish } from '../lib/types';

  // Load everything and filter in memory: a personal dish list is tens to
  // hundreds of rows, so this is instant and keeps the filter logic pure/testable.
  const dishes = live(() => db.dishes.toArray());

  let query = $state('');
  let selected = $state<Category[]>([]);
  // null = editor closed, 'new' = adding, Dish = editing that dish
  let editing = $state<Dish | 'new' | null>(null);

  const visible = $derived(dishes.current ? filterDishes(dishes.current, query, selected) : []);
  const filtering = $derived(query.trim() !== '' || selected.length > 0);
</script>

<section>
  <div class="head">
    <h2>Dishes</h2>
    <button onclick={() => (editing = 'new')}>+ Add dish</button>
  </div>

  <input type="search" placeholder="Search dishes…" aria-label="Search dishes" bind:value={query} />

  <CategoryChips bind:selected label="Filter by category" />

  {#if dishes.current === undefined}
    <p class="muted">Loading…</p>
  {:else if dishes.current.length === 0}
    <div class="empty">
      <p>You don't have any dishes yet.</p>
      <button onclick={() => (editing = 'new')}>Add your first dish</button>
    </div>
  {:else}
    <p class="muted count">
      {#if filtering}{visible.length} of {dishes.current.length} dishes{:else}{dishes.current.length} dishes{/if}
    </p>

    {#if visible.length === 0}
      <p class="muted">No dishes match. Try a different search or category.</p>
    {:else}
      <ul>
        {#each visible as dish (dish.id)}
          <li>
            <button class="dish" onclick={() => (editing = dish)}>
              <span class="name">{dish.name}</span>
              <span class="meta">
                <span class="cats" aria-label={dish.categories.map((c) => CATEGORY_LABELS[c].label).join(', ')}>
                  {#each dish.categories as c (c)}
                    <span title={CATEGORY_LABELS[c].label}>{CATEGORY_LABELS[c].icon}</span>
                  {/each}
                </span>
                <span class="muted">{cookedLabel(dish.lastCooked)}</span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

{#if editing !== null}
  <DishEditor
    dish={editing === 'new' ? null : editing}
    allDishes={dishes.current ?? []}
    onclose={() => (editing = null)}
  />
{/if}

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .head h2 {
    margin: 0;
  }

  .count {
    margin: 0;
    font-size: 0.9rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  li + li {
    border-top: 1px solid var(--border);
  }

  .dish {
    all: unset;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 12px 16px;
    cursor: pointer;
  }

  .dish:hover {
    background: var(--hover);
  }

  .dish:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .name {
    font-weight: 600;
  }

  .meta {
    display: flex;
    gap: 10px;
    font-size: 0.85rem;
  }

  .cats {
    display: inline-flex;
    gap: 2px;
  }

  .empty {
    text-align: center;
    padding: 24px 0;
  }
</style>
