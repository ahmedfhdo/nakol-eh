<script lang="ts">
  import NavBar from './components/NavBar.svelte';
  import Picker from './screens/Picker.svelte';
  import Dishes from './screens/Dishes.svelte';
  import Settings from './screens/Settings.svelte';
  import { router } from './lib/router.svelte';
</script>

<div class="app">
  <header>
    <h1><span aria-hidden="true">🍽️</span> Dinner Picker</h1>
    <div class="nav-desktop"><NavBar /></div>
  </header>

  <main>
    {#if router.current === 'picker'}
      <Picker />
    {:else if router.current === 'dishes'}
      <Dishes />
    {:else}
      <Settings />
    {/if}
  </main>

  <div class="nav-mobile"><NavBar /></div>
</div>

<style>
  .app {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    padding-top: calc(12px + env(safe-area-inset-top));
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  h1 {
    font-size: 1.2rem;
    margin: 0;
  }

  main {
    flex: 1;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    padding: 16px;
  }

  /* Mobile: bottom tab bar, pinned. Desktop: tabs live in the header. */
  .nav-desktop {
    display: none;
  }
  .nav-mobile {
    position: sticky;
    bottom: 0;
  }

  @media (min-width: 720px) {
    .nav-desktop {
      display: block;
    }
    .nav-mobile {
      display: none;
    }
  }
</style>
