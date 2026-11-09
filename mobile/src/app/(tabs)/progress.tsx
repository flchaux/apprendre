import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { errorMessage, useStats, useSubjects } from '@/api';
import { ActivityChart, BoxesChart, HardestList } from '@/components/StatsCharts';
import { Chip, ErrorView, Loading, Row, Screen, StatTile } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

export default function ProgressScreen() {
  const { colors } = useTheme();
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const subjects = useSubjects();
  const stats = useStats(subjectId);

  if (stats.isPending) return <Loading />;
  if (stats.error && !stats.data) return <ErrorView message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} />;
  const s = stats.data;

  return (
    <Screen refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()}>
      {subjects.data && subjects.data.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip label="Tous les sujets" selected={subjectId === undefined} onPress={() => setSubjectId(undefined)} />
          {subjects.data.map((sub) => (
            <Chip
              key={sub.id}
              label={sub.title}
              color={sub.color}
              selected={subjectId === sub.id}
              onPress={() => setSubjectId(sub.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Row style={{ alignItems: 'stretch', gap: spacing.sm }}>
        <StatTile icon="layers-outline" value={String(s.questions)} label="Questions" />
        <StatTile icon="time-outline" value={String(s.due_today)} label="À réviser" color={colors.warn} />
        <StatTile icon="flame-outline" value={String(s.streak_days)} label="Jours de série" color={colors.bad} />
      </Row>
      <View style={{ gap: spacing.lg }}>
        <BoxesChart stats={s} />
        <ActivityChart stats={s} />
        <HardestList stats={s} subjects={subjects.data} />
      </View>
    </Screen>
  );
}
