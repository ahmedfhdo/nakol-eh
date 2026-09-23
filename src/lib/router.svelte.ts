// Minimal hash-based router.
//
// Why hash routing (#/dishes) instead of path routing (/dishes)?
// GitHub Pages is a static host with no server-side rewrites, so a reload on
// /dishes would 404. With hashes the server always serves index.html and the
// app reads the route from location.hash. It also needs no router library.

export type Route = 'picker' | 'dishes' | 'settings';

// Labels live in i18n (m.nav.<id>).
export const routes: { id: Route; icon: string }[] = [
  { id: 'picker', icon: '🎲' },
  { id: 'dishes', icon: '📋' },
  { id: 'settings', icon: '⚙️' },
];

const DEFAULT_ROUTE: Route = 'picker';

function parseHash(hash: string): Route {
  const id = hash.replace(/^#\/?/, '');
  return routes.some((r) => r.id === id) ? (id as Route) : DEFAULT_ROUTE;
}

export function href(route: Route): string {
  return `#/${route}`;
}

class Router {
  current = $state<Route>(parseHash(location.hash));

  constructor() {
    window.addEventListener('hashchange', () => {
      this.current = parseHash(location.hash);
    });
  }

  go(route: Route) {
    location.hash = href(route);
  }
}

export const router = new Router();
