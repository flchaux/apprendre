import { useEffect, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '@/api';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { remindersSupported, REMINDER_URL } from '@/lib/reminder';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Recharge les données quand l'appli revient au premier plan (le quiz change de jour à minuit).
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, err) => {
          if (err instanceof ApiError && (err.isUnauthorized || err.isNotFound || err.status === 400)) return false;
          return count < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export default function RootLayout() {
  const [queryClient] = useState(makeQueryClient);
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function useNotificationNavigation(enabled: boolean) {
  // remindersSupported est une constante : l'ordre des hooks ne change jamais.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const response = remindersSupported ? Notifications.useLastNotificationResponse() : null;
  useEffect(() => {
    if (!enabled || !response) return;
    const url = response.notification.request.content.data?.url;
    if (url === REMINDER_URL) {
      router.push('/quiz');
      Notifications.clearLastNotificationResponse();
    }
  }, [enabled, response]);
}

function RootNavigator() {
  const { status } = useAuth();
  const { dark, colors } = useTheme();
  const signedIn = status === 'signedIn';
  useNotificationNavigation(signedIn);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === 'loading') return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="quiz" options={{ title: 'Quiz du jour' }} />
          <Stack.Screen name="result" options={{ title: 'Résultat', headerBackVisible: false, gestureEnabled: false }} />
          <Stack.Screen name="subject/[id]" options={{ title: 'Sujet' }} />
          <Stack.Screen name="random" options={{ title: 'Question au hasard' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ title: 'Créer un compte' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
