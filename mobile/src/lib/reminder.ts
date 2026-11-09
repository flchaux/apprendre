import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { getItem, KEYS, setItem } from './storage';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 19, minute: 0 };
const CHANNEL_ID = 'rappel-quotidien';
/** Lien ouvert au toucher de la notification. */
export const REMINDER_URL = '/quiz';

export const remindersSupported = Platform.OS !== 'web';

export function parseReminder(raw: string | null): ReminderSettings {
  if (!raw) return DEFAULT_REMINDER;
  try {
    const v = JSON.parse(raw) as Partial<ReminderSettings>;
    const hour = Number.isInteger(v.hour) && v.hour! >= 0 && v.hour! < 24 ? v.hour! : DEFAULT_REMINDER.hour;
    const minute = Number.isInteger(v.minute) && v.minute! >= 0 && v.minute! < 60 ? v.minute! : DEFAULT_REMINDER.minute;
    return { enabled: v.enabled === true, hour, minute };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export async function loadReminder(): Promise<ReminderSettings> {
  return parseReminder(await getItem(KEYS.reminder));
}

export async function cancelReminder(): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Demande l'autorisation d'afficher des notifications. Renvoie false si refusée. */
export async function ensurePermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappel quotidien',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Enregistre les réglages et (re)programme la notification locale quotidienne.
 * Renvoie les réglages effectivement appliqués (désactivés si la permission est refusée).
 */
export async function saveReminder(settings: ReminderSettings): Promise<ReminderSettings> {
  let applied = settings;
  if (remindersSupported) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (settings.enabled) {
      const ok = await ensurePermission();
      if (!ok) {
        applied = { ...settings, enabled: false };
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Votre quiz du jour vous attend',
            body: 'Quelques minutes pour réviser et garder votre série 🔥',
            data: { url: REMINDER_URL },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: settings.hour,
            minute: settings.minute,
            channelId: CHANNEL_ID,
          },
        });
      }
    }
  }
  await setItem(KEYS.reminder, JSON.stringify(applied));
  return applied;
}
