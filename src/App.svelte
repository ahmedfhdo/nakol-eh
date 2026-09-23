<script lang="ts">
  import NavBar from './components/NavBar.svelte';
  import Snackbar from './components/Snackbar.svelte';
  import Picker from './screens/Picker.svelte';
  import Dishes from './screens/Dishes.svelte';
  import Settings from './screens/Settings.svelte';
  import { router } from './lib/router.svelte';
  import { pwa } from './lib/pwa.svelte';
  import { catalogs, i18n } from './lib/i18n/index.svelte';

  // The header switch shows the language you'd switch TO, written in that language.
  const other = $derived(i18n.locale === 'en' ? 'ar' : 'en');
</script>

<div class="app">
  <header>
    <h1><img src="favicon.svg" alt="" width="24" height="24" /> {i18n.m.appTitle}</h1>
    <div class="header-right">
      {#if pwa.installEvent && !pwa.installed}
        <button class="install" onclick={() => pwa.install()}>{i18n.m.pwa.install}</button>
      {/if}
      <button class="lang secondary" lang={other} onclick={() => i18n.set(other)}>
        {other === 'ar' ? 'عربي' : 'English'}
      </button>
      <div class="nav-desktop"><NavBar /></div>
    </div>
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

<!-- App-wide notices. The update notice stays until acted on (duration 0). -->
{#if pwa.needRefresh}
  <Snackbar
    message={i18n.m.pwa.updateAvailable}
    actionLabel={i18n.m.pwa.reload}
    onaction={() => pwa.applyUpdate()}
    ondismiss={() => (pwa.needRefresh = false)}
    duration={0}
  />
{:else if pwa.offlineReady}
  <Snackbar message={i18n.m.pwa.offlineReady} ondismiss={() => (pwa.offlineReady = false)} duration={3000} />
{/if}

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
    gap: 12px;
    padding: 12px 16px;
    padding-top: calc(12px + env(safe-area-inset-top));
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  h1 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.2rem;
    margin: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .install,
  .lang {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.9rem;
  }

  .lang {
    font-weight: 500;
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
