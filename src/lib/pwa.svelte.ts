// Service worker registration + install prompt, as reactive state for the UI.
import { registerSW } from 'virtual:pwa-register';
import { requestPersistentStorage } from './db';

/** Chromium-only event; not in TypeScript's DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag for home-screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  // iPadOS reports itself as "Macintosh", so also check for touch.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

class Pwa {
  /** A new version has been downloaded and is waiting. */
  needRefresh = $state(false);
  /** First install of the service worker finished: the app now works offline. */
  offlineReady = $state(false);
  /** Set when the browser offers installation (Chrome, Edge, Android). */
  installEvent = $state<BeforeInstallPromptEvent | null>(null);
  installed = $state(false);
  readonly ios = isIOS();

  private updateSW: ((reload?: boolean) => Promise<void>) | null = null;

  init() {
    this.installed = isStandalone();

    // Must be listened for early — the browser fires it once, soon after load.
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // suppress the mini-infobar; we show our own button
      this.installEvent = e as BeforeInstallPromptEvent;
    });

    window.addEventListener('appinstalled', () => {
      this.installed = true;
      this.installEvent = null;
      // Installed apps are much more likely to be granted persistent storage.
      requestPersistentStorage().catch(() => {});
    });

    this.updateSW = registerSW({
      onNeedRefresh: () => (this.needRefresh = true),
      onOfflineReady: () => (this.offlineReady = true),
    });
  }

  async install() {
    const e = this.installEvent;
    if (!e) return;
    await e.prompt();
    await e.userChoice;
    this.installEvent = null; // the event can only be used once
  }

  /** Activate the waiting service worker and reload into the new version. */
  async applyUpdate() {
    this.needRefresh = false;
    await this.updateSW?.(true);
  }
}

export const pwa = new Pwa();
