// Reactive current language. Components read `i18n.m.<section>.<key>`; because
// `locale` is $state, every string on screen updates instantly when it changes.
import { detectInitialLocale, saveLocale, type Locale } from '../locale';
import { ar } from './ar';
import { en, type Messages } from './en';

const catalogs: Record<Locale, Messages> = { en, ar };

class I18n {
  locale = $state<Locale>(detectInitialLocale());

  get m(): Messages {
    return catalogs[this.locale];
  }

  set(locale: Locale) {
    this.locale = locale;
    saveLocale(locale);
    this.apply();
  }

  /** Reflect the language on <html> — `dir` flips the whole layout for Arabic. */
  apply() {
    const root = document.documentElement;
    root.lang = this.locale;
    root.dir = this.m.dir;
    document.title = this.m.appTitle;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(this.m.intl, { dateStyle: 'medium' });
  }
}

export const i18n = new I18n();
export { catalogs };
export type { Messages };
