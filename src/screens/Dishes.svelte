<script lang="ts">
  import CategoryChips from '../components/CategoryChips.svelte';
  import DishEditor from '../components/DishEditor.svelte';
  import { db } from '../lib/db';
  import { daysSinceCooked, filterDishes } from '../lib/dishes';
  import { i18n } from '../lib/i18n/index.svelte';
  import { live } from '../lib/live.svelte';
  import { CATEGORY_ICONS, type Category, type Dish } from '../lib/types';

  // Load everything and filter in memory: a personal dish list is tens to
  // hundreds of rows, so this is instant and keeps the filter logic pure/testable.
  const dishes = live(() => db.dishes.toArray());

  let query = $state('');
  let selected = $state<Category[]>([]);
  // null = editor closed, 'new' = adding, Dish = editing that dish
  let editing = $state<Dish | 'new' | null>(null);

  const visible = $derived(dishes.current ? filterDishes(dishes.current, query, selected, i18n.locale) : []);
  const filtering = $derived(query.trim() !== '' || selected.length > 0);
</script>

<section>
  <div class="head">
    <h2>{i18n.m.dishes.title}</h2>
    <button onclick={() => (editing = 'new')}>{i18n.m.dishes.add}</button>
  </div>

  <!-- dir="auto" once there's text: a Latin search term in the Arabic UI (or vice versa) runs in its own
       direction. Empty, it follows the page, so the Arabic placeholder sits on the right. -->
  <input
    type="search"
    dir={query ? 'auto' : undefined}
    placeholder={i18n.m.dishes.search}
    aria-label={i18n.m.dishes.search}
    bind:value={query}
  />

  <CategoryChips bind:selected label={i18n.m.dishes.filterLabel} />

  {#if dishes.current === undefined}
    <p class="muted">{i18n.m.dishes.loading}</p>
  {:else if dishes.current.length === 0}
    <div class="empty">
      <p>{i18n.m.dishes.empty}</p>
      <button onclick={() => (editing = 'new')}>{i18n.m.dishes.addFirst}</button>
    </div>
  {:else}
    <p class="muted count">
      {filtering
        ? i18n.m.dishes.countFiltered(visible.length, dishes.current.length)
        : i18n.m.dishes.count(dishes.current.length)}
    </p>

    {#if visible.length === 0}
      <p class="muted">{i18n.m.dishes.noMatch}</p>
    {:else}
      <ul>
        {#each visible as dish (dish.id)}
          <li>
            <button class="dish" onclick={() => (editing = dish)}>
              <span class="name" dir="auto">{dish.name}</span>
              <span class="meta">
                <span class="cats" aria-label={dish.categories.map((c) => i18n.m.categories[c]).join(', ')}>
                  {#each dish.categories as c (c)}
                    <span title={i18n.m.categories[c]}>{CATEGORY_ICONS[c]}</span>
                  {/each}
                </span>
                <span class="muted">{i18n.m.cooked(daysSinceCooked(dish.lastCooked))}</span>
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
