<script lang="ts">
  import { i18n } from '../lib/i18n/index.svelte';
  import { CATEGORIES, type Category } from '../lib/types';

  let {
    selected = $bindable([]),
    label,
    variant = 'chips',
  }: {
    selected?: Category[];
    label: string;
    /** 'tiles': big sign tiles (picker). 'chips': compact version (dish list filter, editor). */
    variant?: 'chips' | 'tiles';
  } = $props();

  function toggle(c: Category) {
    selected = selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c];
  }
</script>

<div class="chips" class:tiles={variant === 'tiles'} role="group" aria-label={label}>
  {#each CATEGORIES as c (c)}
    <!-- Each category's colour comes from --cat-<id> in app.css. -->
    <button
      type="button"
      class="chip"
      class:on={selected.includes(c)}
      style="--cat: var(--cat-{c}); --on-cat: var(--on-cat-{c})"
      aria-pressed={selected.includes(c)}
      onclick={() => toggle(c)}
    >
      <span class="label">{i18n.m.categories[c]}</span>
    </button>
  {/each}
</div>

<style>
  /* Same sign-tile look everywhere: ink outline, a band in the category colour
     across the top, filled with that colour when selected. 'tiles' is just bigger. */
  .chips {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
  }

  .chip {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 10px 4px 4px;
    border-radius: 10px;
    border: 2px solid var(--ink);
    background: var(--bg);
    color: var(--text);
    box-shadow: inset 0 6px 0 var(--cat);
  }

  .chip.on {
    border-color: var(--cat);
    background: var(--cat);
    color: var(--on-cat);
    box-shadow: none;
  }

  .label {
    font-size: 0.9rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .tiles .chip {
    min-height: 72px;
    padding: 14px 4px 6px;
    box-shadow: inset 0 10px 0 var(--cat);
  }

  .tiles .chip.on {
    box-shadow: none;
  }

  .tiles .label {
    font-size: 1rem;
  }

  :global(:lang(ar)) .tiles .label {
    font-family: var(--font-display);
    font-size: 1.2rem;
  }
</style>
