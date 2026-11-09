import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { errorMessage, SITE_URL } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/Logo';
import { Body, Button, Card, Notice, Screen, TextField, Title } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

export default function LoginScreen() {
  const { signIn, notice } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Saisissez votre e-mail et votre mot de passe.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: 48 }}>
        <View style={styles.brand}>
          <Logo size={72} />
          <Title>Apprendre</Title>
          <Body muted style={{ textAlign: 'center' }}>
            Votre quiz du jour, tiré de votre base de connaissances.
          </Body>
        </View>

        {notice ? <Notice tone="warn">{notice}</Notice> : null}

        <Card>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {error ? (
            <View style={{ marginBottom: spacing.md }}>
              <Notice tone="bad">{error}</Notice>
            </View>
          ) : null}
          <Button label="Se connecter" onPress={submit} loading={busy} />
        </Card>

        <Link href="/register" asChild>
          <Pressable accessibilityRole="link" style={styles.link}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>Pas encore de compte ? S’inscrire</Text>
          </Pressable>
        </Link>

        <Pressable
          accessibilityRole="link"
          accessibilityHint="Ouvre le site web dans le navigateur"
          style={styles.link}
          onPress={() => void WebBrowser.openBrowserAsync(SITE_URL)}
        >
          <Text style={{ color: colors.muted, textAlign: 'center' }}>
            Gérer la base (sujets, questions, illustrations) sur{' '}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>apprendre.chaux.me</Text>
          </Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  link: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
});
