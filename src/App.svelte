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
    <!-- The wordmark is bilingual on purpose (like a shop sign), whatever the UI language. -->
    <h1 aria-label={i18n.m.appTitle}>
      <span class="wordmark" lang="ar" dir="rtl" aria-hidden="true">ناكل ايه؟</span>
      <span class="latin" lang="en" aria-hidden="true">Nakol Eh</span>
    </h1>
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
  <div class="stripe" aria-hidden="true"></div>

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
    padding: 10px 16px;
    padding-top: calc(10px + env(safe-area-inset-top));
    background: var(--brand-navy);
    color: var(--on-brand);
  }

  h1 {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin: 0;
    line-height: 1.1;
  }

  .wordmark {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 2rem;
    color: var(--brand-saffron);
  }

  .latin {
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.25em;
    text-transform: uppercase;
  }

  /* Red / saffron / navy awning stripe under the header. */
  .stripe {
    height: 10px;
    background: repeating-linear-gradient(
      90deg,
      var(--brand-red) 0 18px,
      var(--brand-saffron) 18px 36px,
      var(--brand-navy) 36px 54px
    );
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

  .install {
    background: var(--brand-saffron);
    color: var(--on-saffron);
  }

  .lang {
    font-weight: 500;
    color: var(--on-brand);
    border-color: color-mix(in srgb, var(--on-brand) 55%, transparent);
  }

  /* Desktop tabs sit on the navy header. */
  .nav-desktop :global(a) {
    color: var(--on-brand);
  }
  .nav-desktop :global(a.active) {
    background: var(--brand-saffron);
    color: var(--on-saffron);
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
