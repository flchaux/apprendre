import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { errorMessage, useDailyQuiz, useStats, useSubjects } from '@/api';
import { ActivityChart, BoxesChart, HardestList } from '@/components/StatsCharts';
import { Body, Button, Card, ErrorView, Loading, ProgressBar, Row, Screen, StatTile } from '@/components/ui';
import { masteryRatio } from '@/lib/leitner';
import { parseId } from '@/lib/params';
import { spacing, useTheme } from '@/theme';

export default function SubjectScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = parseId(id);
  const subjects = useSubjects();
  const stats = useStats(subjectId);
  const quiz = useDailyQuiz(subjectId);
  const subject = subjects.data?.find((s) => s.id === subjectId);

  if (!subjectId) return <ErrorView message="Sujet introuvable." />;
  if (subjects.isPending || stats.isPending) return <Loading />;
  if (!subject || !stats.data) {
    return (
      <ErrorView
        message={stats.error ? errorMessage(stats.error) : 'Sujet introuvable.'}
        onRetry={() => (void subjects.refetch(), void stats.refetch())}
      />
    );
  }
  const s = stats.data;
  const params = { subject_id: String(subjectId) };
  const q = quiz.data;
  const reviseLabel = q?.completed
    ? 'Voir le résultat du sujet'
    : q && q.answered > 0
      ? `Continuer la révision (${q.answered}/${q.questions.length})`
      : 'Réviser ce sujet';
  const ratio = masteryRatio(s.mastered, s.questions);

  return (
    <Screen
      refreshing={stats.isRefetching}
      onRefresh={() => (void stats.refetch(), void subjects.refetch(), void quiz.refetch())}
    >
      <Stack.Screen options={{ title: subject.title }} />
      <Card style={{ gap: spacing.md, borderLeftWidth: 6, borderLeftColor: subject.color || colors.primary }}>
        {subject.description ? <Body muted>{subject.description}</Body> : null}
        <Row style={{ justifyContent: 'space-between' }}>
          <Body style={{ fontWeight: '700' }}>Maîtrise</Body>
          <Body muted>
            {s.mastered} / {s.questions}
          </Body>
        </Row>
        <ProgressBar value={ratio} color={subject.color || colors.brand} label="Maîtrise du sujet" />
        <Button
          label={reviseLabel}
          icon="school-outline"
          disabled={s.questions === 0}
          onPress={() => router.push({ pathname: q?.completed ? '/result' : '/quiz', params })}
        />
        <Button
          label="Question au hasard"
          icon="shuffle"
          variant="secondary"
          disabled={s.questions === 0}
          onPress={() => router.push({ pathname: '/random', params })}
        />
      </Card>

      <Row style={{ alignItems: 'stretch', gap: spacing.sm }}>
        <StatTile icon="sparkles-outline" value={String(s.new)} label="Nouvelles" />
        <StatTile icon="time-outline" value={String(s.due_today)} label="À réviser" color={colors.warn} />
        <StatTile
          icon="trending-up"
          value={s.last_30_days.success_rate == null ? '–' : `${Math.round(s.last_30_days.success_rate)} %`}
          label="Réussite 30 j"
          color={colors.ok}
        />
      </Row>
      <View style={{ gap: spacing.lg }}>
        <BoxesChart stats={s} />
        <ActivityChart stats={s} />
        <HardestList stats={s} />
      </View>
    </Screen>
  );
}
