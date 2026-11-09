import { fillActivity } from './activity';
import { addDays, daysBetween, formatDayLong, formatDueRelative, lastDays, todayInTimeZone } from './dates';
import { parseReminder } from './reminder';

describe('dates', () => {
  it('ajoute des jours en franchissant les mois et le changement d’heure', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('calcule l’écart en jours', () => {
    expect(daysBetween('2026-11-09', '2026-11-12')).toBe(3);
    expect(daysBetween('2026-11-09', '2026-12-09')).toBe(30);
  });

  it('formate une date en français', () => {
    expect(formatDayLong('2026-11-12')).toBe('jeudi 12 novembre');
  });

  it('formate la prochaine révision', () => {
    expect(formatDueRelative('2026-11-09', '2026-11-09')).toBe("aujourd'hui");
    expect(formatDueRelative('2026-11-09', '2026-11-10')).toBe('demain');
    expect(formatDueRelative('2026-11-09', '2026-11-12')).toBe('dans 3 jours');
    expect(formatDueRelative('2026-11-09', '2026-11-23')).toBe('le lundi 23 novembre');
  });

  it('liste les 14 derniers jours', () => {
    const days = lastDays('2026-11-09', 14);
    expect(days).toHaveLength(14);
    expect(days[0]).toBe('2026-10-27');
    expect(days[13]).toBe('2026-11-09');
  });

  it('complète l’activité avec des zéros', () => {
    const filled = fillActivity([{ day: '2026-11-08', answers: 5, correct: 4 }], '2026-11-09', 3);
    expect(filled).toEqual([
      { day: '2026-11-07', answers: 0, correct: 0 },
      { day: '2026-11-08', answers: 5, correct: 4 },
      { day: '2026-11-09', answers: 0, correct: 0 },
    ]);
  });

  it('donne le jour dans un fuseau', () => {
    const late = new Date('2026-11-09T23:30:00Z');
    expect(todayInTimeZone('Europe/Paris', late)).toBe('2026-11-10');
    expect(todayInTimeZone('America/New_York', late)).toBe('2026-11-09');
  });
});

describe('réglages du rappel', () => {
  it('valeurs par défaut', () => {
    expect(parseReminder(null)).toEqual({ enabled: false, hour: 19, minute: 0 });
    expect(parseReminder('pas du json')).toEqual({ enabled: false, hour: 19, minute: 0 });
  });

  it('relit et valide les réglages enregistrés', () => {
    expect(parseReminder('{"enabled":true,"hour":8,"minute":30}')).toEqual({ enabled: true, hour: 8, minute: 30 });
    expect(parseReminder('{"enabled":true,"hour":42,"minute":-1}')).toEqual({ enabled: true, hour: 19, minute: 0 });
  });
});
