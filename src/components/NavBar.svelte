<script lang="ts">
  import { router, routes, href } from '../lib/router.svelte';
  import { i18n } from '../lib/i18n/index.svelte';
</script>

<nav aria-label={i18n.m.nav.label}>
  {#each routes as r (r.id)}
    <a
      href={href(r.id)}
      class:active={router.current === r.id}
      aria-current={router.current === r.id ? 'page' : undefined}
    >
      <span class="icon" aria-hidden="true">{r.icon}</span>
      <span class="label">{i18n.m.nav[r.id]}</span>
    </a>
  {/each}
</nav>

<style>
  nav {
    display: flex;
    justify-content: space-around;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
  }

  a {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    min-height: 56px;
    justify-content: center;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.8rem;
  }

  a.active {
    color: var(--accent);
    font-weight: 600;
  }

  .icon {
    font-size: 1.3rem;
    line-height: 1;
  }

  /* Desktop: nav moves into the header row as horizontal tabs. */
  @media (min-width: 720px) {
    nav {
      border-top: none;
      gap: 4px;
      padding: 0;
      background: transparent;
    }
    a {
      flex-direction: row;
      gap: 6px;
      min-height: 0;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 0.95rem;
    }
    a.active {
      background: var(--accent-soft);
    }
  }
</style>
