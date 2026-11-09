import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Stockage clé/valeur : expo-secure-store sur téléphone (chiffré),
 * localStorage sur la version web (utilisée seulement pour les essais).
 */
const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // stockage indisponible (navigation privée) : on ignore
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const KEYS = {
  token: 'apprendre.token',
  reminder: 'apprendre.reminder',
} as const;
