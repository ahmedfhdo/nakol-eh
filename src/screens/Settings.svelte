<script lang="ts">
  import { onMount } from 'svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import Snackbar from '../components/Snackbar.svelte';
  import { backupFilename, createBackup, isValidCooldown, MAX_COOLDOWN_DAYS, parseBackup, type BackupFile } from '../lib/backup';
  import { db, exportData, getSettings, replaceAllData, requestPersistentStorage, restoreDefaultDishes, saveSettings } from '../lib/db';
  import { DEFAULT_DISHES } from '../lib/defaultDishes';
  import { live } from '../lib/live.svelte';
  import { isInCooldown } from '../lib/picker';
  import { pwa } from '../lib/pwa.svelte';

  const settings = live(() => getSettings());
  const dishes = live(() => db.dishes.toArray());

  // ---- Cooldown -------------------------------------------------------------
  // The input keeps its own text so the user can clear it and type; we only
  // write to the DB when the value is valid.
  let cooldownText = $state('');
  let cooldownTouched = false;
  $effect(() => {
    if (settings.current && !cooldownTouched) cooldownText = String(settings.current.cooldownDays);
  });
  // type="text" + inputmode="numeric" (not type="number"): gives the phone number pad,
  // keeps the value a plain string, and avoids browsers silently accepting "1e2" or "-".
  const cooldownValue = $derived(/^\d+$/.test(cooldownText.trim()) ? Number(cooldownText) : NaN);
  const cooldownValid = $derived(isValidCooldown(cooldownValue));
  const inCooldownCount = $derived(
    dishes.current && cooldownValid
      ? dishes.current.filter((d) => isInCooldown(d, cooldownValue, Date.now())).length
      : 0,
  );

  async function setCooldown(n: number) {
    cooldownTouched = true;
    cooldownText = String(n);
    if (isValidCooldown(n)) await saveSettings({ cooldownDays: n });
  }

  function onCooldownInput() {
    cooldownTouched = true;
    if (cooldownValid) saveSettings({ cooldownDays: cooldownValue });
  }

  // ---- Feedback -------------------------------------------------------------
  let snack = $state<{ id: number; message: string } | null>(null);
  let snackId = 0;
  const notify = (message: string) => (snack = { id: ++snackId, message });

  // ---- Export ---------------------------------------------------------------
  async function doExport() {
    const { dishes, settings } = await exportData();
    const blob = new Blob([JSON.stringify(createBackup(dishes, settings), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename();
    a.click();
    // Give the browser a moment to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${dishes.length} dishes`);
  }

  // ---- Import ---------------------------------------------------------------
  let fileInput: HTMLInputElement;
  let importError = $state<string | null>(null);
  let pendingImport = $state<{ fileName: string; data: BackupFile } | null>(null);

  async function onFileChosen() {
    const file = fileInput.files?.[0];
    fileInput.value = ''; // allow choosing the same file again later
    if (!file) return;
    importError = null;
    const result = parseBackup(await file.text());
    if (!result.ok) {
      importError = `Couldn't import ${file.name}: ${result.error}`;
      return;
    }
    pendingImport = { fileName: file.name, data: result.data };
  }

  async function confirmImport() {
    if (!pendingImport) return;
    const { dishes, settings } = pendingImport.data;
    await replaceAllData(dishes, settings);
    cooldownTouched = false; // show the imported cooldown
    notify(`Imported ${dishes.length} dishes`);
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  }

  // ---- Restore defaults -----------------------------------------------------
  let confirmingRestore = $state(false);

  async function confirmRestore() {
    await restoreDefaultDishes();
    notify('Default dishes restored');
  }

  // ---- Storage status -------------------------------------------------------
  let persisted = $state<boolean | null>(null);
  onMount(async () => {
    persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  });
  async function askPersist() {
    persisted = await requestPersistentStorage();
    if (!persisted) notify('The browser declined — installing the app usually helps');
  }
</script>

<section>
  <h2>Settings</h2>

  <div class="group">
    <h3>Cooldown</h3>
    <p class="muted">After you cook a dish, it won't be suggested again for this many days.</p>
    <div class="stepper">
      <button type="button" class="secondary" aria-label="Fewer days" onclick={() => setCooldown(cooldownValue - 1)} disabled={!cooldownValid || cooldownValue <= 0}>−</button>
      <input
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength="3"
        autocomplete="off"
        aria-label="Cooldown in days"
        aria-invalid={!cooldownValid}
        bind:value={cooldownText}
        oninput={onCooldownInput}
      />
      <button type="button" class="secondary" aria-label="More days" onclick={() => setCooldown(cooldownValue + 1)} disabled={!cooldownValid || cooldownValue >= MAX_COOLDOWN_DAYS}>+</button>
      <span>days</span>
    </div>
    {#if !cooldownValid}
      <p class="error">Enter a whole number from 0 to {MAX_COOLDOWN_DAYS}.</p>
    {:else}
      <p class="muted small">
        {cooldownValue === 0 ? 'No cooldown — every dish can come up any time.' : `${inCooldownCount} ${inCooldownCount === 1 ? 'dish is' : 'dishes are'} in cooldown right now.`}
      </p>
    {/if}
  </div>

  <div class="group">
    <h3>Backup</h3>
    <p class="muted">
      Your dishes are stored only in this browser. Clearing browsing data deletes them — export a backup now and then.
    </p>
    <div class="buttons">
      <button type="button" onclick={doExport}>Export to file</button>
      <button type="button" class="secondary" onclick={() => fileInput.click()}>Import from file…</button>
    </div>
    <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={onFileChosen} />
    {#if importError}
      <p class="error" role="alert">{importError}</p>
    {/if}
    {#if persisted === true}
      <p class="muted small">✓ Storage is marked as persistent — the browser won't clear it on its own.</p>
    {:else if persisted === false}
      <p class="muted small">
        The browser may clear this data when it runs low on space.
        <button type="button" class="link" onclick={askPersist}>Ask to keep it</button>
      </p>
    {/if}
  </div>

  <div class="group">
    <h3>App</h3>
    {#if pwa.installed}
      <p class="muted">✓ Installed. Works offline — your dishes never leave this device.</p>
    {:else if pwa.installEvent}
      <p class="muted">Install Dinner Picker to open it from your home screen, full-screen and offline.</p>
      <div class="buttons">
        <button type="button" onclick={() => pwa.install()}>Install app</button>
      </div>
    {:else if pwa.ios}
      <p class="muted">
        To install on iPhone or iPad: open this page in Safari, tap <strong>Share</strong>
        <span aria-hidden="true">⎋</span>, then <strong>Add to Home Screen</strong>.
      </p>
    {:else}
      <p class="muted">
        Works offline once loaded. To install, use your browser's menu (“Install app” or “Add to Home screen”).
      </p>
    {/if}
  </div>

  <div class="group">
    <h3>Reset</h3>
    <p class="muted">Replace your dish list with the {DEFAULT_DISHES.length} default dishes. Your cooldown setting is kept.</p>
    <div class="buttons">
      <button type="button" class="danger-outline" onclick={() => (confirmingRestore = true)}>Restore default dishes…</button>
    </div>
  </div>
</section>

{#if pendingImport}
  <ConfirmDialog
    title="Replace all data?"
    confirmLabel="Replace"
    danger
    onconfirm={confirmImport}
    oncancel={() => (pendingImport = null)}
  >
    <p>
      Import <strong>{pendingImport.data.dishes.length} dishes</strong> from <strong>{pendingImport.fileName}</strong>{#if formatDate(pendingImport.data.exportedAt)}&nbsp;(exported {formatDate(pendingImport.data.exportedAt)}){/if}?
    </p>
    <p>
      This replaces your current {dishes.current?.length ?? ''} dishes and sets the cooldown to
      {pendingImport.data.settings.cooldownDays} days. It can't be undone.
    </p>
  </ConfirmDialog>
{/if}

{#if confirmingRestore}
  <ConfirmDialog
    title="Restore default dishes?"
    confirmLabel="Restore"
    danger
    onconfirm={confirmRestore}
    oncancel={() => (confirmingRestore = false)}
  >
    <p>
      Your {dishes.current?.length ?? ''} current dishes, including ones you added and all cooked dates, will be
      replaced by the {DEFAULT_DISHES.length} defaults. It can't be undone.
    </p>
    <p class="muted">Tip: export a backup first.</p>
  </ConfirmDialog>
{/if}

{#if snack}
  {#key snack.id}
    <Snackbar message={snack.message} ondismiss={() => (snack = null)} duration={3000} />
  {/key}
{/if}

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 72px;
  }

  h2 {
    margin: 0;
  }

  .group {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h3 {
    margin: 0;
    font-size: 1.05rem;
  }

  p {
    margin: 0;
  }

  .small {
    font-size: 0.85rem;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stepper button {
    width: 44px;
    height: 44px;
    padding: 0;
    font-size: 1.3rem;
  }

  .stepper input {
    width: 80px;
    text-align: center;
    font-size: 1.1rem;
  }

  .stepper input[aria-invalid='true'] {
    border-color: var(--danger);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .error {
    color: var(--danger);
  }
</style>
