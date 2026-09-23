<script lang="ts">
  import { onMount } from 'svelte';
  import CategoryChips from './CategoryChips.svelte';
  import { addDish, deleteDish, setLastCooked, updateDish } from '../lib/db';
  import { cookedLabel, MAX_NAME_LENGTH, validateDish } from '../lib/dishes';
  import type { Category, Dish } from '../lib/types';

  // `dish` null = adding a new dish. `allDishes` is used for the duplicate-name check.
  let { dish, allDishes, onclose }: { dish: Dish | null; allDishes: Dish[]; onclose: () => void } = $props();

  let dialog: HTMLDialogElement;
  // Form state is a copy: nothing touches the DB until Save.
  // (Intentionally reading the prop once — the dialog edits a snapshot.)
  // svelte-ignore state_referenced_locally
  let name = $state(dish?.name ?? '');
  // svelte-ignore state_referenced_locally
  let categories = $state<Category[]>(dish ? [...dish.categories] : []);
  // svelte-ignore state_referenced_locally
  let lastCooked = $state(dish?.lastCooked ?? null);
  let error = $state<string | null>(null);
  let confirmingDelete = $state(false);
  let busy = $state(false);

  onMount(() => dialog.showModal());

  async function save(e: SubmitEvent) {
    e.preventDefault();
    error = validateDish({ id: dish?.id, name, categories }, allDishes);
    if (error) return;
    busy = true;
    try {
      if (dish?.id != null) await updateDish(dish.id, { name, categories });
      else await addDish({ name, categories });
      dialog.close();
    } catch (err) {
      error = 'Could not save. Please try again.';
      console.error(err);
    } finally {
      busy = false;
    }
  }

  // Clearing the cooked date is its own immediate action (not part of Save),
  // so the label next to it is always the truth.
  async function clearCooked() {
    if (dish?.id == null) return;
    await setLastCooked(dish.id, null);
    lastCooked = null;
  }

  async function remove() {
    if (dish?.id == null) return;
    await deleteDish(dish.id);
    dialog.close();
  }
</script>

<!-- Native <dialog>: focus trapping, Esc to close and the backdrop come for free. -->
<dialog bind:this={dialog} onclose={onclose} aria-labelledby="editor-title">
  <form onsubmit={save} novalidate>
    <!-- When editing, focus the heading instead of the input: showModal() would otherwise
         focus the name field and pop up the phone keyboard for a quick "clear"/"delete". -->
    <!-- svelte-ignore a11y_autofocus -->
    <h2 id="editor-title" tabindex="-1" autofocus={!!dish}>{dish ? 'Edit dish' : 'Add dish'}</h2>

    <label class="field">
      <span>Name</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        bind:value={name}
        maxlength={MAX_NAME_LENGTH}
        autocomplete="off"
        autofocus={!dish}
        oninput={() => (error = null)}
      />
    </label>

    <fieldset class="field">
      <legend>Categories</legend>
      <CategoryChips bind:selected={categories} label="Dish categories" />
    </fieldset>

    {#if dish}
      <div class="cooked">
        <span class="muted">{cookedLabel(lastCooked)}</span>
        {#if lastCooked !== null}
          <button type="button" class="link" onclick={clearCooked}>Clear</button>
        {/if}
      </div>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    {#if confirmingDelete}
      <div class="confirm" role="alert">
        <p>Delete <strong>{dish?.name}</strong>? This can't be undone.</p>
        <div class="row">
          <button type="button" class="secondary" onclick={() => (confirmingDelete = false)}>Cancel</button>
          <button type="button" class="danger" onclick={remove}>Delete</button>
        </div>
      </div>
    {:else}
      <div class="row actions">
        {#if dish}
          <button type="button" class="danger-outline" onclick={() => (confirmingDelete = true)}>Delete</button>
        {/if}
        <span class="spacer"></span>
        <button type="button" class="secondary" onclick={() => dialog.close()}>Cancel</button>
        <button type="submit" disabled={busy}>Save</button>
      </div>
    {/if}
  </form>
</dialog>

<style>
  dialog {
    border: none;
    border-radius: 16px;
    padding: 0;
    width: min(480px, calc(100vw - 32px));
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 10px 40px rgb(0 0 0 / 0.25);
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.4);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  h2 {
    margin: 0;
  }

  h2:focus {
    outline: none;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: none;
    padding: 0;
    margin: 0;
  }

  .field > span,
  legend {
    font-weight: 600;
    font-size: 0.9rem;
    padding: 0;
    margin-bottom: 6px;
  }

  .cooked {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .spacer {
    flex: 1;
  }

  .error {
    color: var(--danger);
    margin: 0;
  }

  .confirm {
    background: var(--danger-soft);
    border-radius: 10px;
    padding: 12px;
  }

  .confirm p {
    margin: 0 0 10px;
  }

  .confirm .row {
    justify-content: flex-end;
  }
</style>
