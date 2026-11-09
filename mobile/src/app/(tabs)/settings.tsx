import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Switch, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import { errorMessage, SITE_URL, useMe, useUpdateMe, type User } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { Body, Button, Card, ErrorView, Heading, Loading, Notice, Row, Screen, Stepper, TextField } from '@/components/ui';
import { formatTime, pad2 } from '@/lib/dates';
import { DEFAULT_REMINDER, loadReminder, remindersSupported, saveReminder, type ReminderSettings } from '@/lib/reminder';
import { MIN_TOUCH, spacing, useTheme } from '@/theme';

function deviceTimeZone(): string {
  return Localization.getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Paris';
}

function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function SettingsScreen() {
  const me = useMe();
  if (me.isPending) return <Loading />;
  const user = me.data?.user;
  if (!user) return <ErrorView message={errorMessage(me.error)} onRetry={() => void me.refetch()} />;
  // Le formulaire repart des valeurs du serveur quand elles changent.
  return <SettingsForm key={`${user.id}|${user.name}|${user.daily_quiz_size}|${user.timezone}`} user={user} />;
}

function SettingsForm({ user }: { user: User }) {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const update = useUpdateMe();

  const [name, setName] = useState(user.name);
  const [size, setSize] = useState(user.daily_quiz_size);
  const [timezone, setTimezone] = useState(user.timezone);
  const [saved, setSaved] = useState(false);
  const [reminder, setReminder] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    void loadReminder().then(setReminder);
  }, []);

  const dirty = name.trim() !== user.name || size !== user.daily_quiz_size || timezone.trim() !== user.timezone;
  const phoneTz = deviceTimeZone();

  async function saveProfile() {
    setSaved(false);
    const patch: { name?: string; daily_quiz_size?: number; timezone?: string } = {};
    if (name.trim() !== user.name) patch.name = name.trim();
    if (size !== user.daily_quiz_size) patch.daily_quiz_size = size;
    if (timezone.trim() !== user.timezone) patch.timezone = timezone.trim();
    try {
      await update.mutateAsync(patch);
      setSaved(true);
    } catch {
      // l'erreur est affichée via update.error
    }
  }

  async function changeReminder(next: ReminderSettings) {
    setReminder(next);
    setReminderNotice(null);
    try {
      const applied = await saveReminder(next);
      setReminder(applied);
      if (next.enabled && !applied.enabled) {
        setReminderNotice('Les notifications sont refusées. Autorisez-les dans les réglages Android de l’appli.');
      }
    } catch (e) {
      setReminderNotice(errorMessage(e));
    }
  }

  async function handleSignOut() {
    const ok = await confirmAsync('Se déconnecter ?', 'Le jeton de ce téléphone sera révoqué.', 'Se déconnecter');
    if (!ok) return;
    setSigningOut(true);
    await signOut();
  }

  return (
    <Screen>
      <Card style={{ gap: spacing.xs }}>
        <Heading style={{ marginBottom: spacing.sm }}>Profil</Heading>
        <TextField label="Nom" value={name} onChangeText={(v) => (setName(v), setSaved(false))} autoComplete="name" />
        <Body muted style={{ marginBottom: spacing.md }}>
          Compte : {user.email}
        </Body>

        <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 14 }}>Questions par quiz du jour</Text>
        <View style={{ marginVertical: spacing.sm }}>
          <Stepper
            label="Taille du quiz"
            value={size}
            min={1}
            max={100}
            onChange={(v) => (setSize(v), setSaved(false))}
            format={(v) => `${v}`}
          />
        </View>
        <Row style={{ flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {[5, 10, 15, 20, 30].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n} questions`}
              accessibilityState={{ selected: size === n }}
              onPress={() => (setSize(n), setSaved(false))}
              style={{
                minWidth: MIN_TOUCH,
                minHeight: 44,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: size === n ? colors.primarySoft : colors.surface2,
                borderWidth: 1,
                borderColor: size === n ? colors.primary : 'transparent',
              }}
            >
              <Text style={{ color: size === n ? colors.primary : colors.text, fontWeight: '700' }}>{n}</Text>
            </Pressable>
          ))}
        </Row>

        <TextField
          label="Fuseau horaire (début de la journée de quiz)"
          value={timezone}
          onChangeText={(v) => (setTimezone(v), setSaved(false))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Europe/Paris"
        />
        {timezone.trim() !== phoneTz ? (
          <Button
            label={`Utiliser celui du téléphone (${phoneTz})`}
            variant="ghost"
            icon="locate-outline"
            onPress={() => (setTimezone(phoneTz), setSaved(false))}
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        {update.error ? (
          <View style={{ marginBottom: spacing.md }}>
            <Notice tone="bad">{errorMessage(update.error)}</Notice>
          </View>
        ) : null}
        {saved && !dirty ? (
          <View style={{ marginBottom: spacing.md }}>
            <Notice tone="ok">Réglages enregistrés.</Notice>
          </View>
        ) : null}
        <Button label="Enregistrer" icon="checkmark" onPress={saveProfile} disabled={!dirty} loading={update.isPending} />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Heading>Rappel quotidien</Heading>
        {remindersSupported ? (
          <>
            <Row style={{ justifyContent: 'space-between', minHeight: MIN_TOUCH }}>
              <Body style={{ flex: 1 }}>Me rappeler de faire le quiz</Body>
              <Switch
                accessibilityLabel="Rappel quotidien"
                value={reminder.enabled}
                onValueChange={(enabled) => void changeReminder({ ...reminder, enabled })}
                trackColor={{ true: colors.brand, false: colors.border }}
                thumbColor="#ffffff"
              />
            </Row>
            {reminder.enabled ? (
              <>
                <Body muted>Chaque jour à {formatTime(reminder.hour, reminder.minute)}. Touchez la notification pour ouvrir le quiz.</Body>
                <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.muted, fontWeight: '600', width: 70 }}>Heure</Text>
                  <Stepper
                    label="Heure du rappel"
                    value={reminder.hour}
                    min={0}
                    max={23}
                    format={(v) => `${pad2(v)} h`}
                    onChange={(hour) => void changeReminder({ ...reminder, hour })}
                  />
                </Row>
                <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.muted, fontWeight: '600', width: 70 }}>Minutes</Text>
                  <Stepper
                    label="Minutes du rappel"
                    value={reminder.minute}
                    min={0}
                    max={55}
                    step={5}
                    format={(v) => pad2(v)}
                    onChange={(minute) => void changeReminder({ ...reminder, minute })}
                  />
                </Row>
              </>
            ) : null}
            {reminderNotice ? <Notice tone="warn">{reminderNotice}</Notice> : null}
          </>
        ) : (
          <Body muted>Les rappels sont disponibles dans l’appli Android, pas dans la version web.</Body>
        )}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Heading>Compte</Heading>
        <Button
          label="Gérer ma base sur le site"
          variant="ghost"
          icon="open-outline"
          onPress={() => void WebBrowser.openBrowserAsync(SITE_URL)}
          accessibilityHint="Sujets, questions et illustrations se gèrent sur le site web"
        />
        <Button label="Se déconnecter" variant="danger" icon="log-out-outline" onPress={handleSignOut} loading={signingOut} />
      </Card>

      <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>
        Apprendre {Constants.expoConfig?.version ?? ''} · apprendre.chaux.me
      </Text>
    </Screen>
  );
}
