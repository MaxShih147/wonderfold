import type { Puzzle } from '../engine/index.ts';
import { LEVEL_DATA } from './levels.data.ts';

/** The campaign: five tiers of ten fixed levels, played in order. */
export const LEVELS: readonly Puzzle[] = LEVEL_DATA;
export const LEVELS_PER_TIER = 10;
export const LEVEL_COUNT = LEVELS.length;
export const TIER_COUNT = LEVEL_COUNT / LEVELS_PER_TIER;

export function tierOf(index: number): number {
  return Math.floor(index / LEVELS_PER_TIER);
}

/** `1-0` … `5-9`: tier counted from one, level within the tier from zero. */
export function levelLabel(index: number): string {
  return `${tierOf(index) + 1}-${index % LEVELS_PER_TIER}`;
}

export function parseLevelLabel(label: string): number | null {
  const match = /^(\d+)-(\d+)$/.exec(label);
  if (!match) return null;
  const tier = Number(match[1]) - 1;
  const step = Number(match[2]);
  if (tier < 0 || tier >= TIER_COUNT || step >= LEVELS_PER_TIER) return null;
  return tier * LEVELS_PER_TIER + step;
}

function range(values: readonly number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? String(min) : `${min}–${max}`;
}

/** What a tier asks of the player, read off its levels. */
export function tierSummary(tier: number): { grid: number; folds: string; punches: string; diagonals: boolean } {
  const levels = LEVELS.slice(tier * LEVELS_PER_TIER, (tier + 1) * LEVELS_PER_TIER);
  return {
    grid: levels[0]!.gridSize,
    folds: range(levels.map((p) => p.folds.length)),
    punches: range(levels.map((p) => p.punches.length)),
    diagonals: levels.some((p) => p.folds.some((f) => f.axis.startsWith('diagonal'))),
  };
}
