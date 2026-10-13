import type { Cell, FoldOperation, Puzzle } from '../engine/index.ts';
import { LEVEL_DATA, REVERSE_DATA } from './levels.data.ts';

/** A reverse level: the player sees `holes` and has to fold and punch to match. */
export interface ReverseLevel {
  id: string;
  gridSize: number;
  /** The unfolded sheet to reproduce. */
  holes: Cell[];
  /** One way to do it. The number of punches is the player's allowance. */
  folds: FoldOperation[];
  punches: Cell[];
  rating: number;
}

export type LevelMode = 'classic' | 'reverse';

/** The campaign: five tiers of ten fixed levels, played in order. */
export const LEVELS: readonly Puzzle[] = LEVEL_DATA;
/** The same shape of campaign, played backwards. */
export const REVERSE_LEVELS: readonly ReverseLevel[] = REVERSE_DATA;
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
export function tierSummary(
  mode: LevelMode,
  tier: number,
): { grid: number; folds: string; punches: string; diagonals: boolean } {
  const all: readonly Pick<Puzzle, 'gridSize' | 'folds' | 'punches'>[] = mode === 'classic' ? LEVELS : REVERSE_LEVELS;
  const levels = all.slice(tier * LEVELS_PER_TIER, (tier + 1) * LEVELS_PER_TIER);
  return {
    grid: levels[0]!.gridSize,
    folds: range(levels.map((p) => p.folds.length)),
    punches: range(levels.map((p) => p.punches.length)),
    diagonals: levels.some((p) => p.folds.some((f) => f.axis.startsWith('diagonal'))),
  };
}
