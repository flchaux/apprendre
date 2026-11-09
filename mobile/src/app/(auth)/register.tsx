import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { errorMessage } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { Body, Button, Card, Notice, Screen, TextField } from '@/components/ui';
import { spacing } from '@/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUp(email, name, password);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Body muted>Votre compte sert aussi sur le site web, pour gérer votre base de connaissances.</Body>
        <Card>
          <TextField label="Prénom ou nom" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={submit}
          />
          {error ? (
            <View style={{ marginBottom: spacing.md }}>
              <Notice tone="bad">{error}</Notice>
            </View>
          ) : null}
          <Button label="Créer mon compte" onPress={submit} loading={busy} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
