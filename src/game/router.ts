import { useSyncExternalStore } from 'react';
import { decodeCustom } from './custom.ts';
import { levelLabel, parseLevelLabel, type LevelMode } from './levels.ts';

export type Route =
  | { name: 'home' }
  | { name: 'levels'; mode: LevelMode }
  | { name: 'level'; index: number }
  | { name: 'reverse'; index: number }
  | { name: 'create' }
  | { name: 'custom'; code: string }
  | { name: 'daily' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'daily') return { name: 'daily' };
  if (parts[0] === 'create') return { name: 'create' };
  if (parts[0] === 'levels') return { name: 'levels', mode: 'classic' };
  if (parts[0] === 'reverse' && parts[1] === undefined) return { name: 'levels', mode: 'reverse' };
  if (parts[0] === 'level' || parts[0] === 'reverse') {
    const index = parseLevelLabel(parts[1] ?? '');
    if (index !== null) return { name: parts[0], index };
  }
  if (parts[0] === 'custom' && parts[1] !== undefined && decodeCustom(parts[1])) {
    return { name: 'custom', code: parts[1] };
  }
  return { name: 'home' };
}

export function routeHash(route: Route): string {
  if (route.name === 'daily') return '#/daily';
  if (route.name === 'create') return '#/create';
  if (route.name === 'levels') return route.mode === 'classic' ? '#/levels' : '#/reverse';
  if (route.name === 'level' || route.name === 'reverse') return `#/${route.name}/${levelLabel(route.index)}`;
  if (route.name === 'custom') return `#/custom/${route.code}`;
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
