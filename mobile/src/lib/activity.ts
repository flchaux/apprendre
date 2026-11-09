import type { ActivityDay } from '@/api/types';
import { lastDays } from './dates';

/** Complète l'activité renvoyée par le serveur avec des jours à zéro, sur les n derniers jours. */
export function fillActivity(activity: readonly ActivityDay[], today: string, n = 14): ActivityDay[] {
  const byDay = new Map(activity.map((a) => [a.day, a]));
  return lastDays(today, n).map((day) => byDay.get(day) ?? { day, answers: 0, correct: 0 });
}
