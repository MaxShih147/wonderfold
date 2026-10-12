import type { AnswerResult } from './save.ts';

export function formatTime(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  if (total < 60) return `${total.toFixed(1)}s`;
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** The spoiler-free result card players paste to friends. */
export function dailyShareText(number: number, results: readonly AnswerResult[], url: string): string {
  const correct = results.filter((r) => r.correct).length;
  const totalMs = results.reduce((sum, r) => sum + r.ms, 0);
  const grid = results.map((r) => (r.correct ? '🟩' : '🟥')).join('');
  return `Wonderfold #${number}  ${correct}/${results.length}  ⏱ ${formatTime(totalMs)}\n${grid}\n${url}`;
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareText(text: string): Promise<ShareOutcome> {
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (touch && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
