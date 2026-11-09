import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { useQueryClient } from '@tanstack/react-query';
import { api, setApiToken, setUnauthorizedHandler, type User } from '@/api';
import { deleteItem, getItem, KEYS, setItem } from '@/lib/storage';
import { cancelReminder } from '@/lib/reminder';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  /** Message affiché sur l'écran de connexion (par exemple après une révocation du jeton). */
  notice: string | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, name: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Nom de l'appareil envoyé au serveur (visible dans la liste des jetons sur le web). */
export function deviceName(): string {
  if (Platform.OS === 'web') return 'Navigateur web';
  return Device.modelName ?? Device.deviceName ?? (Platform.OS === 'android' ? 'Android' : 'iPhone');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [notice, setNotice] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    setApiToken(null);
    await deleteItem(KEYS.token);
    await cancelReminder().catch(() => undefined);
    queryClient.clear();
    setStatus('signedOut');
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setNotice('Votre session a été fermée depuis le site. Reconnectez-vous.');
      void clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let alive = true;
    getItem(KEYS.token)
      .then((token) => {
        if (!alive) return;
        setApiToken(token);
        setStatus(token ? 'signedIn' : 'signedOut');
      })
      .catch(() => alive && setStatus('signedOut'));
    return () => {
      alive = false;
    };
  }, []);

  const finishAuth = useCallback(
    async (token: string, user: User) => {
      await setItem(KEYS.token, token);
      setApiToken(token);
      queryClient.clear();
      setNotice(null);
      setStatus('signedIn');
      return user;
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      notice,
      signIn: async (email, password) => {
        const res = await api.login({ email: email.trim(), password, device_name: deviceName() });
        return finishAuth(res.token, res.user);
      },
      signUp: async (email, name, password) => {
        const res = await api.register({ email: email.trim(), name: name.trim(), password, device_name: deviceName() });
        return finishAuth(res.token, res.user);
      },
      signOut: async () => {
        try {
          await api.logout();
        } catch {
          // jeton déjà révoqué ou réseau absent : on déconnecte quand même localement
        }
        setNotice(null);
        await clearSession();
      },
    }),
    [status, notice, finishAuth, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
