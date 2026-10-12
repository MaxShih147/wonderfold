import { useSyncExternalStore } from 'react';
import { defaultSave, parseSave, type Save } from './save.ts';

const STORAGE_KEY = 'wonderfold:v1';

function read(): Save {
  try {
    return parseSave(localStorage.getItem(STORAGE_KEY));
  } catch {
    return defaultSave();
  }
}

let current: Save = read();
const listeners = new Set<() => void>();

export function getSave(): Save {
  return current;
}

export function updateSave(change: (save: Save) => Save): Save {
  current = change(current);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage can be full or blocked (private mode); the game still works in memory.
  }
  listeners.forEach((listener) => listener());
  return current;
}

export function setGrid(grid: boolean): void {
  updateSave((save) => ({ ...save, settings: { ...save.settings, grid } }));
}

export function resetProgress(): void {
  updateSave((save) => ({ ...defaultSave(), settings: { ...save.settings, seenHowTo: true } }));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Keep several open tabs in step.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    current = read();
    listeners.forEach((listener) => listener());
  });
}

export function useSave(): Save {
  return useSyncExternalStore(subscribe, getSave, getSave);
}
