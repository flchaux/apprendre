const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const SHORT_WEEKDAYS = ['di', 'lu', 'ma', 'me', 'je', 've', 'sa'];

/** Jour AAAA-MM-JJ vers une date UTC à midi (évite les décalages de fuseau). */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setUTCDate(d.getUTCDate() + n);
  return formatDayKey(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** « jeudi 12 novembre » */
export function formatDayLong(day: string): string {
  const d = parseDay(day);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** « je 12 » pour les axes de graphiques. */
export function formatDayShort(day: string): { weekday: string; date: number } {
  const d = parseDay(day);
  return { weekday: SHORT_WEEKDAYS[d.getUTCDay()], date: d.getUTCDate() };
}

/** Prochaine révision relative à aujourd'hui : « aujourd'hui », « demain », « dans 3 jours ». */
export function formatDueRelative(today: string, due: string): string {
  const n = daysBetween(today, due);
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n < 7) return `dans ${n} jours`;
  return `le ${formatDayLong(due)}`;
}

/** Les n derniers jours jusqu'à `today` inclus, du plus ancien au plus récent. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

/** Date du jour dans un fuseau horaire IANA, au format AAAA-MM-JJ. */
export function todayInTimeZone(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return parts;
  } catch {
    return formatDayKey(now);
  }
}

export function greeting(hour: number): string {
  if (hour < 5) return 'Bonsoir';
  if (hour < 18) return 'Bonjour';
  return 'Bonsoir';
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatTime(hour: number, minute: number): string {
  return `${pad2(hour)} h ${pad2(minute)}`;
}
