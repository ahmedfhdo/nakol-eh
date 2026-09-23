<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  let {
    title,
    confirmLabel,
    cancelLabel,
    danger = false,
    onconfirm,
    oncancel,
    children,
  }: {
    title: string;
    confirmLabel: string;
    cancelLabel: string;
    danger?: boolean;
    onconfirm: () => void | Promise<void>;
    oncancel: () => void;
    children: Snippet;
  } = $props();

  let dialog: HTMLDialogElement;
  let busy = $state(false);
  let confirmed = false;

  onMount(() => dialog.showModal());

  async function confirm() {
    busy = true;
    try {
      await onconfirm();
      confirmed = true;
    } finally {
      busy = false;
      dialog.close();
    }
  }
</script>

<!-- Esc / backdrop close counts as cancel. -->
<dialog bind:this={dialog} onclose={() => !confirmed && oncancel()} aria-labelledby="confirm-title">
  <div class="body">
    <h2 id="confirm-title">{title}</h2>
    <div class="msg">{@render children()}</div>
    <div class="row">
      <!-- Cancel gets focus first: the safe choice for destructive actions. -->
      <!-- svelte-ignore a11y_autofocus -->
      <button type="button" class="secondary" autofocus onclick={() => dialog.close()} disabled={busy}>{cancelLabel}</button>
      <button type="button" class:danger onclick={confirm} disabled={busy}>{confirmLabel}</button>
    </div>
  </div>
</dialog>

<style>
  dialog {
    border: none;
    border-radius: 16px;
    padding: 0;
    width: min(440px, calc(100vw - 32px));
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 10px 40px rgb(0 0 0 / 0.25);
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.4);
  }

  .body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .msg :global(p) {
    margin: 0 0 8px;
  }

  .row {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
</style>
