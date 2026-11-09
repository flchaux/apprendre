import type { Box } from '@/api/types';

/** Intervalle en jours avant la prochaine révision, par boîte (boîtes 1 à 5). */
export const BOX_INTERVALS: Record<Box, number> = { 0: 0, 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

export const BOX_LABELS: Record<Box, string> = {
  0: 'Nouvelles',
  1: 'Boîte 1',
  2: 'Boîte 2',
  3: 'Boîte 3',
  4: 'Boîte 4',
  5: 'Maîtrisées',
};

export const BOXES: Box[] = [0, 1, 2, 3, 4, 5];

export function boxDescription(box: Box): string {
  if (box === 0) return 'Nouvelle question';
  if (box === 5) return 'Boîte 5 sur 5 (maîtrisée)';
  return `Boîte ${box} sur 5`;
}

export function masteryRatio(mastered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, mastered / total));
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n > 1 ? plural : singular}`;
}
