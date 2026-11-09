import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage, useDailyQuiz, useSubjects, type DailyQuiz } from '@/api';
import { QuestionCard } from '@/components/QuestionCard';
import { Body, Button, ErrorView, Loading, ProgressBar } from '@/components/ui';
import { useAnswering } from '@/hooks/useAnswering';
import { parseId } from '@/lib/params';
import { answersFromQuiz, firstUnansweredIndex, mergeAnswers, nextUnansweredIndex, score } from '@/lib/quizSession';
import { spacing, useTheme } from '@/theme';

export default function QuizScreen() {
  const params = useLocalSearchParams<{ subject_id?: string }>();
  const subjectId = parseId(params.subject_id);
  const quiz = useDailyQuiz(subjectId);

  if (quiz.isPending) return <Loading />;
  if (quiz.error && !quiz.data) return <ErrorView message={errorMessage(quiz.error)} onRetry={() => void quiz.refetch()} />;
  if (!quiz.data || quiz.data.questions.length === 0) {
    return (
      <ErrorView message="Plus aucune question à proposer aujourd’hui : vous avez répondu à toutes celles disponibles. Revenez demain, ou ajoutez des questions depuis le site web." />
    );
  }
  // Un nouveau jour (fuseau de l'utilisateur) donne un nouveau quiz : la clé remet la session à zéro.
  return <QuizSession key={quiz.data.day} quiz={quiz.data} subjectId={subjectId} />;
}

function QuizSession({ quiz: data, subjectId }: { quiz: DailyQuiz; subjectId?: number }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const subjects = useSubjects();
  const { answers: localAnswers, choose, retry, pendingCount } = useAnswering();

  // Reprise : on démarre à la première question sans réponse (answered_today).
  const [index, setIndex] = useState(() => firstUnansweredIndex(data.questions, answersFromQuiz(data.questions)));

  const questions = data.questions;
  const answers = useMemo(() => mergeAnswers(answersFromQuiz(questions), localAnswers), [questions, localAnswers]);
  const subjectById = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s])), [subjects.data]);
  const resultParams = subjectId ? { subject_id: String(subjectId) } : {};
  const alreadyDone = index === -1;

  useEffect(() => {
    if (alreadyDone) router.replace({ pathname: '/result', params: resultParams });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyDone]);

  if (alreadyDone) return <Loading />;

  const i = Math.min(index, questions.length - 1);
  const question = questions[i];
  const current = answers[question.id];
  const { answered, total } = score(questions, answers);
  const next = nextUnansweredIndex(questions, answers, i);
  const finished = next === -1;
  const subjectTitle = subjectId ? subjectById.get(subjectId)?.title : undefined;

  function goNext() {
    if (finished) {
      router.replace({ pathname: '/result', params: resultParams });
    } else {
      setIndex(next);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: subjectTitle ? `Quiz : ${subjectTitle}` : 'Quiz du jour' }} />
      <View style={[styles.top, { borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <Text style={{ color: colors.muted, fontWeight: '600' }}>
            Question {i + 1} sur {total}
          </Text>
          <Text style={{ color: colors.muted }}>
            {answered} répondue{answered > 1 ? 's' : ''}
          </Text>
        </View>
        <ProgressBar value={total ? answered / total : 0} label={`${answered} questions répondues sur ${total}`} />
      </View>

      <ScrollView
        key={question.id}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl }]}
        style={{ flex: 1 }}
      >
        <QuestionCard
          question={question}
          day={data.day}
          answer={current}
          onChoose={(choiceIndex) => choose(question, choiceIndex)}
          onRetrySend={() => retry(question.id)}
          subjectTitle={subjectId ? undefined : subjectById.get(question.subject_id)?.title}
          subjectColor={subjectById.get(question.subject_id)?.color}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {current ? (
          <Button
            label={finished ? 'Voir le résultat' : 'Suivant'}
            icon={finished ? 'trophy-outline' : 'arrow-forward'}
            onPress={goNext}
            disabled={current.status === 'error' || (finished && pendingCount > 0)}
            loading={finished && pendingCount > 0}
          />
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
  top: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 640, alignSelf: 'center' },
  content: { padding: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
