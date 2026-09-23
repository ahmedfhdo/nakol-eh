import { liveQuery } from 'dexie';

/**
 * Bridge a Dexie liveQuery into Svelte 5 reactivity.
 *
 * liveQuery re-runs the query whenever the tables it read are written to — from
 * this component, another screen, or another browser tab — so screens never need
 * a manual "reload list" after add/edit/delete.
 *
 * Must be called during component initialisation (it uses $effect, which also
 * unsubscribes automatically when the component is destroyed).
 * `current` is undefined until the first result arrives.
 */
export function live<T>(query: () => T | Promise<T>): { readonly current: T | undefined } {
  let value = $state<T | undefined>(undefined);

  $effect(() => {
    const sub = liveQuery(query).subscribe({
      next: (v) => (value = v),
      error: (err) => console.error('liveQuery failed', err),
    });
    return () => sub.unsubscribe();
  });

  return {
    get current() {
      return value;
    },
  };
}
