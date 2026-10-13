import { useSyncExternalStore } from 'react';
import { levelLabel, parseLevelLabel } from './levels.ts';

export type Route =
  | { name: 'home' }
  | { name: 'level'; index: number }
  | { name: 'daily' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'daily') return { name: 'daily' };
  if (parts[0] === 'level') {
    const index = parseLevelLabel(parts[1] ?? '');
    if (index !== null) return { name: 'level', index };
  }
  return { name: 'home' };
}

export function routeHash(route: Route): string {
  if (route.name === 'daily') return '#/daily';
  if (route.name === 'level') return `#/level/${levelLabel(route.index)}`;
  return '#/';
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const hash = routeHash(route);
  if (options.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

export function useRouteHash(): string {
  return useSyncExternalStore(subscribe, () => location.hash);
}
