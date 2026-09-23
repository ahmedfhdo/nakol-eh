<script lang="ts" module>
  // Shared by every Snackbar instance: only the most recently shown one is visible,
  // so an app-wide notice ("ready offline") never covers a screen's Undo button.
  // When the newest goes away, the previous one (if still alive) shows again.
  let stack = $state<number[]>([]);
  let nextId = 0;
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  let {
    message,
    actionLabel,
    onaction,
    ondismiss,
    duration = 5000,
  }: {
    message: string;
    actionLabel?: string;
    onaction?: () => void;
    ondismiss: () => void;
    duration?: number;
  } = $props();

  // The parent re-creates this component (via {#key}) for each new message,
  // so a single timer per instance is enough.
  const id = nextId++;
  const visible = $derived(stack.at(-1) === id);

  onMount(() => {
    stack.push(id);
    return () => {
      stack = stack.filter((x) => x !== id);
    };
  });

  onMount(() => {
    if (duration <= 0) return; // 0 = stay until the user acts
    const timer = setTimeout(() => ondismiss(), duration);
    return () => clearTimeout(timer);
  });
</script>

<div class="snackbar" class:hidden={!visible} role="status" transition:fly={{ y: 24, duration: 180 }}>
  <span>{message}</span>
  {#if actionLabel && onaction}
    <button type="button" onclick={onaction}>{actionLabel}</button>
  {/if}
</div>

<style>
  .snackbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    /* sit above the mobile bottom nav (56px + safe area) */
    bottom: calc(72px + env(safe-area-inset-bottom));
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 16px;
    width: max-content;
    max-width: calc(100vw - 32px);
    /* logical padding: the wide side follows the reading direction (right in Arabic) */
    padding-block: 10px;
    padding-inline: 16px 10px;
    border-radius: 12px;
    background: var(--snackbar-bg);
    color: var(--snackbar-text);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
  }

  button {
    background: none;
    color: var(--snackbar-action);
    padding: 6px 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.9rem;
  }

  .hidden {
    display: none;
  }

  @media (min-width: 720px) {
    .snackbar {
      bottom: 24px;
    }
  }
</style>
