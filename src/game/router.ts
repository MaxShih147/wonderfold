import { useSyncExternalStore } from 'react';
import { DIFFICULTIES, type Difficulty } from '../engine/index.ts';

export type Route =
  | { name: 'home' }
  | { name: 'play'; difficulty: Difficulty; seed: number | null }
  | { name: 'daily' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'daily') return { name: 'daily' };
  if (parts[0] === 'play' && DIFFICULTIES.includes(parts[1] as Difficulty)) {
    const seed = parts[2] !== undefined && /^\d{1,10}$/.test(parts[2]) ? Number(parts[2]) >>> 0 : null;
    return { name: 'play', difficulty: parts[1] as Difficulty, seed };
  }
  return { name: 'home' };
}

export function routeHash(route: Route): string {
  if (route.name === 'daily') return '#/daily';
  if (route.name === 'play') return `#/play/${route.difficulty}${route.seed === null ? '' : `/${route.seed}`}`;
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
