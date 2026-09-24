<script lang="ts">
  import { i18n } from '../lib/i18n/index.svelte';
  import type { Category } from '../lib/types';

  let { category }: { category: Category } = $props();
</script>

<!-- Small filled label in the category's colour (--cat-<id> in app.css). -->
<span class="tag" style="--cat: var(--cat-{category}); --on-cat: var(--on-cat-{category})">
  {i18n.m.categories[category]}
</span>

<style>
  .tag {
    display: inline-block;
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1.5;
    padding: 1px 10px;
    border-radius: 6px;
    background: var(--cat);
    color: var(--on-cat);
    white-space: nowrap;
  }
</style>
