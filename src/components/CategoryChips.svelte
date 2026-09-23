<script lang="ts">
  import { CATEGORIES, CATEGORY_LABELS, type Category } from '../lib/types';

  let {
    selected = $bindable([]),
    label = 'Categories',
  }: { selected?: Category[]; label?: string } = $props();

  function toggle(c: Category) {
    selected = selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c];
  }
</script>

<div class="chips" role="group" aria-label={label}>
  {#each CATEGORIES as c (c)}
    <button
      type="button"
      class="chip"
      class:on={selected.includes(c)}
      aria-pressed={selected.includes(c)}
      onclick={() => toggle(c)}
    >
      <span aria-hidden="true">{CATEGORY_LABELS[c].icon}</span>
      {CATEGORY_LABELS[c].label}
    </button>
  {/each}
</div>

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-weight: 500;
  }

  .chip.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
</style>
