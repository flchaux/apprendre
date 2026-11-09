import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError, errorMessage, useMe, useSubjects, type Question } from '@/api';
import { QuestionCard } from '@/components/QuestionCard';
import { Body, Button, ErrorView, Loading } from '@/components/ui';
import { useAnswering } from '@/hooks/useAnswering';
import { parseId } from '@/lib/params';
import { spacing, useTheme } from '@/theme';

async function fetchRandom(subjectId: number | undefined, exclude: number[]): Promise<Question> {
  if (subjectId) return api.randomSubjectQuestion(subjectId, exclude);
  // Tous sujets : la route n'accepte pas exclude, on retente quelques fois pour éviter une question déjà vue.
  let question = await api.randomQuestion();
  for (let attempt = 0; attempt < 6 && exclude.includes(question.id); attempt++) {
    question = await api.randomQuestion();
  }
  return question;
}

/** Questions au hasard enchaînées : exclut celles déjà vues dans la session (paramètre exclude). */
export default function RandomScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subject_id?: string }>();
  const subjectId = parseId(params.subject_id);
  const me = useMe();
  const subjects = useSubjects();
  const { answers, choose, retry } = useAnswering();
  const [seen, setSeen] = useState<number[]>([]);
  const [round, setRound] = useState(0);

  const random = useQuery({
    queryKey: ['random', subjectId ?? 'all', round, seen.join(',')],
    queryFn: () => fetchRandom(subjectId, seen),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const subjectTitle = subjectId ? subjects.data?.find((s) => s.id === subjectId)?.title : undefined;
  const header = <Stack.Screen options={{ title: subjectTitle ? `Au hasard : ${subjectTitle}` : 'Question au hasard' }} />;
  const answeredIds = Object.keys(answers).map(Number);
  const correct = answeredIds.filter((id) => answers[id].correct).length;
  const exhausted = random.error instanceof ApiError && random.error.isNotFound;

  if (exhausted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        {header}
        <Text style={{ fontSize: 40 }}>🎉</Text>
        <Body style={{ textAlign: 'center' }}>
          {seen.length ? 'Vous avez vu toutes les questions de ce sujet.' : 'Ce sujet ne contient aucune question.'}
        </Body>
        {seen.length ? <Button label="Recommencer" icon="refresh" onPress={() => (setSeen([]), setRound((r) => r + 1))} /> : null}
      </View>
    );
  }
  if (random.error) {
    return (
      <>
        {header}
        <ErrorView message={errorMessage(random.error)} onRetry={() => void random.refetch()} />
      </>
    );
  }
  if (!random.data || !me.data) {
    return (
      <>
        {header}
        <Loading />
      </>
    );
  }

  const question = random.data;
  const answer = answers[question.id];
  const subject = subjects.data?.find((s) => s.id === question.subject_id);

  function next() {
    setSeen((prev) => (prev.includes(question.id) ? prev : [...prev, question.id]));
    setRound((r) => r + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      {answeredIds.length > 0 ? (
        <View style={[styles.top, { borderBottomColor: colors.border }]}>
          <Text style={{ color: colors.muted, fontWeight: '600' }}>
            {correct} juste{correct > 1 ? 's' : ''} sur {answeredIds.length}
          </Text>
        </View>
      ) : null}
      <ScrollView key={`${question.id}-${round}`} contentContainerStyle={styles.content}>
        <QuestionCard
          question={question}
          day={me.data.today}
          seedSalt={`hasard-${round}`}
          answer={answer}
          onChoose={(choiceIndex) => choose(question, choiceIndex)}
          onRetrySend={() => retry(question.id)}
          subjectTitle={subjectId ? undefined : subject?.title}
          subjectColor={subject?.color}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {answer ? (
          <Button label="Question suivante" icon="shuffle" onPress={next} disabled={answer.status === 'error'} />
        ) : (
          <Body muted style={{ textAlign: 'center', paddingVertical: spacing.sm }}>
            Touchez la bonne réponse
          </Body>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  top: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
