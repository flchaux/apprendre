import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';
import { errorMessage, SITE_URL, useDailyQuiz, useMe, useStats, useSubjects } from '@/api';
import { SubjectRow } from '@/components/SubjectRow';
import { Logo } from '@/components/Logo';
import { Body, Button, Card, ErrorView, Heading, Loading, ProgressBar, Row, Screen, StatTile } from '@/components/ui';
import { greeting } from '@/lib/dates';
import { pluralize } from '@/lib/leitner';
import { spacing, useTheme } from '@/theme';

export default function HomeScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const stats = useStats();
  const quiz = useDailyQuiz();
  const subjects = useSubjects();

  const loading = me.isPending || stats.isPending || quiz.isPending || subjects.isPending;
  const firstError = me.error ?? stats.error ?? subjects.error;
  const refreshing = me.isRefetching || stats.isRefetching || quiz.isRefetching || subjects.isRefetching;
  const refresh = () => {
    void me.refetch();
    void stats.refetch();
    void quiz.refetch();
    void subjects.refetch();
  };

  if (loading && !firstError) return <Loading />;
  if (firstError && !me.data) return <ErrorView message={errorMessage(firstError)} onRetry={refresh} />;

  const user = me.data?.user;
  const s = stats.data;
  const q = quiz.data;
  const streak = s?.streak_days ?? 0;
  const firstName = user?.name?.split(' ')[0] ?? '';
  const total = q?.questions.length ?? 0;
  const answered = q?.answered ?? 0;
  const hasQuestions = (s?.questions ?? 0) > 0;

  return (
    <Screen edges={['top']} refreshing={refreshing} onRefresh={refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ flex: 1 }}>
          <Logo size={40} />
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={[styles.hello, { color: colors.text }]} numberOfLines={1}>
              {greeting(new Date().getHours())}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            <Text style={{ color: colors.muted }}>Prêt pour votre révision ?</Text>
          </View>
        </Row>
        <View
          accessible
          accessibilityLabel={`Série de ${pluralize(streak, 'jour')} consécutifs`}
          style={[styles.streak, { backgroundColor: streak > 0 ? colors.warnSoft : colors.surface2 }]}
        >
          <Text style={{ fontSize: 18 }}>🔥</Text>
          <Text style={{ color: streak > 0 ? colors.warn : colors.muted, fontWeight: '800', fontSize: 16 }}>{streak}</Text>
        </View>
      </Row>

      {/* Quiz du jour */}
      <Card style={[styles.quizCard, { backgroundColor: colors.brand, borderColor: colors.brand }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.quizTitle}>Quiz du jour</Text>
          {q?.completed ? <Ionicons name="trophy" size={22} color="#fde68a" /> : null}
        </Row>
        {quiz.error ? (
          <Text style={styles.quizSub}>{errorMessage(quiz.error)}</Text>
        ) : total === 0 ? (
          <Text style={styles.quizSub}>
            {hasQuestions
              ? 'Vous avez répondu à toutes vos questions aujourd’hui 🎉 Revenez demain, ou entraînez-vous avec une question au hasard.'
              : 'Aucune question pour l’instant. Ajoutez-en depuis le site web.'}
          </Text>
        ) : (
          <>
            <Text style={styles.quizSub}>
              {q?.completed
                ? `Terminé : ${q.correct} bonne${q.correct > 1 ? 's' : ''} réponse${q.correct > 1 ? 's' : ''} sur ${total}`
                : `${answered} / ${total} répondue${answered > 1 ? 's' : ''}`}
            </Text>
            <ProgressBar value={total ? answered / total : 0} color="#ffffff" trackColor="rgba(255,255,255,0.25)" label="Avancement du quiz du jour" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={q?.completed ? 'Voir le résultat' : answered > 0 ? 'Continuer le quiz' : 'Commencer le quiz'}
              onPress={() => router.push(q?.completed ? '/result' : '/quiz')}
              style={({ pressed }) => [styles.quizButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 16 }}>
                {q?.completed ? 'Voir le résultat' : answered > 0 ? 'Continuer' : 'Commencer'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.brand} />
            </Pressable>
          </>
        )}
      </Card>

      {/* Tuiles */}
      <Row style={{ alignItems: 'stretch', gap: spacing.sm }}>
        <StatTile icon="time-outline" value={String(s?.due_today ?? 0)} label="À réviser aujourd’hui" color={colors.warn} />
        <StatTile icon="ribbon-outline" value={String(s?.mastered ?? 0)} label="Maîtrisées" color={colors.ok} />
        <StatTile
          icon="trending-up"
          value={s?.last_30_days.success_rate == null ? '–' : `${Math.round(s.last_30_days.success_rate)} %`}
          label="Réussite sur 30 jours"
        />
      </Row>

      {hasQuestions ? (
        <Button
          label="Question au hasard"
          icon="shuffle"
          variant="secondary"
          onPress={() => router.push('/random')}
          accessibilityHint="Une question de n’importe quel sujet"
        />
      ) : null}

      {/* Sujets */}
      <View style={{ gap: spacing.sm }}>
        <Heading>Sujets</Heading>
        {subjects.data && subjects.data.length > 0 ? (
          subjects.data.map((subject) => <SubjectRow key={subject.id} subject={subject} />)
        ) : (
          <Card style={{ gap: spacing.sm }}>
            <Body muted>Vous n’avez pas encore de sujet. Créez-les sur le site, ou demandez à Claude de remplir votre base.</Body>
            <Button label="Ouvrir le site" icon="open-outline" variant="ghost" onPress={() => void WebBrowser.openBrowserAsync(SITE_URL)} />
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 22, fontWeight: '800' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRadius: 999, minHeight: 44 },
  quizCard: { gap: spacing.md, padding: spacing.lg + 4 },
  quizTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  quizSub: { color: '#e0e7ff', fontSize: 15 },
  quizButton: {
    backgroundColor: '#ffffff',
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
