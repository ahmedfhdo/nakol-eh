<script lang="ts">
  import { onMount } from 'svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import Snackbar from '../components/Snackbar.svelte';
  import {
    backupFilename,
    createBackup,
    isValidCooldown,
    MAX_COOLDOWN_DAYS,
    parseBackup,
    type BackupError,
    type BackupFile,
  } from '../lib/backup';
  import { db, exportData, getSettings, replaceAllData, requestPersistentStorage, restoreDefaultDishes, saveSettings } from '../lib/db';
  import { DEFAULT_DISHES } from '../lib/defaultDishes';
  import { catalogs, i18n } from '../lib/i18n/index.svelte';
  import { live } from '../lib/live.svelte';
  import { LOCALES } from '../lib/locale';
  import { isInCooldown } from '../lib/picker';
  import { pwa } from '../lib/pwa.svelte';

  const settings = live(() => getSettings());
  const dishes = live(() => db.dishes.toArray());
  const m = $derived(i18n.m.settings);

  // ---- Cooldown -------------------------------------------------------------
  // The input keeps its own text so the user can clear it and type; we only
  // write to the DB when the value is valid.
  let cooldownText = $state('');
  let cooldownTouched = false;
  $effect(() => {
    if (settings.current && !cooldownTouched) cooldownText = String(settings.current.cooldownDays);
  });

  /** Arabic keyboards often type Arabic-Indic digits (٠١٢…) or Persian ones (۰۱۲…); treat them as 0–9. */
  function toLatinDigits(s: string): string {
    return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  }

  // type="text" + inputmode="numeric" (not type="number"): gives the phone number pad,
  // keeps the value a plain string, and avoids browsers silently accepting "1e2" or "-".
  const cooldownValue = $derived.by(() => {
    const t = toLatinDigits(cooldownText.trim());
    return /^\d+$/.test(t) ? Number(t) : NaN;
  });
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
  // Messages are stored as functions so they re-translate if you switch language while one is showing.
  let snack = $state<{ id: number; message: () => string } | null>(null);
  let snackId = 0;
  const notify = (message: () => string) => (snack = { id: ++snackId, message });

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
    const n = dishes.length;
    notify(() => i18n.m.settings.exported(n));
  }

  // ---- Import ---------------------------------------------------------------
  let fileInput: HTMLInputElement;
  let importError = $state<{ file: string; error: BackupError } | null>(null);
  let pendingImport = $state<{ fileName: string; data: BackupFile; skipped: string[] } | null>(null);

  async function onFileChosen() {
    const file = fileInput.files?.[0];
    fileInput.value = ''; // allow choosing the same file again later
    if (!file) return;
    importError = null;
    const result = parseBackup(await file.text());
    if (!result.ok) {
      importError = { file: file.name, error: result.error };
      return;
    }
    pendingImport = { fileName: file.name, data: result.data, skipped: result.skipped };
  }

  async function confirmImport() {
    if (!pendingImport) return;
    const { dishes, settings } = pendingImport.data;
    await replaceAllData(dishes, settings);
    cooldownTouched = false; // show the imported cooldown
    const n = dishes.length;
    notify(() => i18n.m.settings.imported(n));
  }

  // ---- Restore defaults -----------------------------------------------------
  let confirmingRestore = $state(false);
  const defaultCount = $derived(DEFAULT_DISHES[i18n.locale].length);

  async function confirmRestore() {
    await restoreDefaultDishes(i18n.locale);
    notify(() => i18n.m.settings.restored);
  }

  // ---- Storage status -------------------------------------------------------
  let persisted = $state<boolean | null>(null);
  onMount(async () => {
    persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  });
  async function askPersist() {
    persisted = await requestPersistentStorage();
    if (!persisted) notify(() => i18n.m.settings.persistDeclined);
  }
</script>

<section>
  <h2>{m.title}</h2>

  <div class="group">
    <h3>{m.languageTitle}</h3>
    <div class="segmented" role="radiogroup" aria-label={m.languageTitle}>
      {#each LOCALES as l (l)}
        <!-- Each option is written in its own language, so you can find yours in either UI. -->
        <button
          type="button"
          role="radio"
          aria-checked={i18n.locale === l}
          class:on={i18n.locale === l}
          lang={l}
          onclick={() => i18n.set(l)}
        >
          {catalogs[l].languageName}
        </button>
      {/each}
    </div>
  </div>

  <div class="group">
    <h3>{m.cooldownTitle}</h3>
    <p class="muted">{m.cooldownHelp}</p>
    <div class="stepper">
      <button
        type="button"
        class="secondary"
        aria-label={m.fewer}
        onclick={() => setCooldown(cooldownValue - 1)}
        disabled={!cooldownValid || cooldownValue <= 0}>−</button
      >
      <input
        type="text"
        inputmode="numeric"
        maxlength="3"
        autocomplete="off"
        aria-label={m.cooldownInput}
        aria-invalid={!cooldownValid}
        bind:value={cooldownText}
        oninput={onCooldownInput}
      />
      <button
        type="button"
        class="secondary"
        aria-label={m.more}
        onclick={() => setCooldown(cooldownValue + 1)}
        disabled={!cooldownValid || cooldownValue >= MAX_COOLDOWN_DAYS}>+</button
      >
      <span>{m.daysUnit(cooldownValid ? cooldownValue : 0)}</span>
    </div>
    {#if !cooldownValid}
      <p class="error">{m.cooldownInvalid(MAX_COOLDOWN_DAYS)}</p>
    {:else}
      <p class="muted small">
        {cooldownValue === 0 ? m.cooldownOff : m.inCooldown(inCooldownCount)}
      </p>
    {/if}
  </div>

  <div class="group">
    <h3>{m.backupTitle}</h3>
    <p class="muted">{m.backupHelp}</p>
    <div class="buttons">
      <button type="button" onclick={doExport}>{m.export}</button>
      <button type="button" class="secondary" onclick={() => fileInput.click()}>{m.import}</button>
    </div>
    <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={onFileChosen} />
    {#if importError}
      <p class="error" role="alert">{m.importFailed(importError.file, m.backupError(importError.error))}</p>
    {/if}
    {#if persisted === true}
      <p class="muted small">{m.persisted}</p>
    {:else if persisted === false}
      <p class="muted small">
        {m.notPersisted}
        <button type="button" class="link" onclick={askPersist}>{m.askPersist}</button>
      </p>
    {/if}
  </div>

  <div class="group">
    <h3>{m.appTitle}</h3>
    {#if pwa.installed}
      <p class="muted">{m.installed}</p>
    {:else if pwa.installEvent}
      <p class="muted">{m.installHelp}</p>
      <div class="buttons">
        <button type="button" onclick={() => pwa.install()}>{m.install}</button>
      </div>
    {:else if pwa.ios}
      <p class="muted">{m.iosInstall}</p>
    {:else}
      <p class="muted">{m.otherInstall}</p>
    {/if}
  </div>

  <div class="group">
    <h3>{m.resetTitle}</h3>
    <p class="muted">{m.resetHelp(defaultCount)}</p>
    <div class="buttons">
      <button type="button" class="danger-outline" onclick={() => (confirmingRestore = true)}>{m.reset}</button>
    </div>
  </div>
</section>

{#if pendingImport}
  <ConfirmDialog
    title={m.importTitle}
    confirmLabel={m.importConfirm}
    cancelLabel={m.cancel}
    danger
    onconfirm={confirmImport}
    oncancel={() => (pendingImport = null)}
  >
    <p>
      {m.importBody(pendingImport.data.dishes.length, pendingImport.fileName, i18n.formatDate(pendingImport.data.exportedAt))}
    </p>
    <p>{m.importReplaces(dishes.current?.length ?? 0, pendingImport.data.settings.cooldownDays)}</p>
    {#if pendingImport.skipped.length > 0}
      <p class="muted">{m.importSkipped(pendingImport.skipped)}</p>
    {/if}
  </ConfirmDialog>
{/if}

{#if confirmingRestore}
  <ConfirmDialog
    title={m.resetConfirmTitle}
    confirmLabel={m.resetConfirm}
    cancelLabel={m.cancel}
    danger
    onconfirm={confirmRestore}
    oncancel={() => (confirmingRestore = false)}
  >
    <p>{m.resetBody(dishes.current?.length ?? 0, defaultCount)}</p>
    <p class="muted">{m.resetTip}</p>
  </ConfirmDialog>
{/if}

{#if snack}
  {#key snack.id}
    <Snackbar message={snack.message()} ondismiss={() => (snack = null)} duration={3000} />
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

  .segmented {
    display: inline-flex;
    align-self: flex-start;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 3px;
    gap: 3px;
  }

  .segmented button {
    background: transparent;
    color: var(--text);
    border-radius: 999px;
    padding: 8px 16px;
    font-weight: 500;
  }

  .segmented button.on {
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
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
