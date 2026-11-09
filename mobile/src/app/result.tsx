import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { errorMessage, useDailyQuiz, useRenewQuiz, useSubjects } from '@/api';
import { Body, Button, Card, ErrorView, Heading, Loading, Notice, Screen } from '@/components/ui';
import { parseId } from '@/lib/params';
import { spacing, useTheme } from '@/theme';

function verdict(pct: number): string {
  if (pct === 100) return 'Sans faute, bravo !';
  if (pct >= 80) return 'Excellent travail !';
  if (pct >= 50) return 'Bien joué, continuez comme ça.';
  return 'Les révisions vont payer, on s’accroche !';
}

export default function ResultScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ subject_id?: string }>();
  const subjectId = parseId(params.subject_id);
  const quiz = useDailyQuiz(subjectId);
  const subjects = useSubjects();
  const renew = useRenewQuiz();
  const [renewMessage, setRenewMessage] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);

  // Les réponses viennent d'être envoyées : on recharge le quiz pour avoir answered_today à jour
  // avant d'afficher le score (le cache peut dater d'avant le quiz).
  useEffect(() => {
    void quiz.refetch().finally(() => setFresh(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (quiz.isPending || (!fresh && quiz.isFetching)) return <Loading />;
  if (!quiz.data) return <ErrorView message={errorMessage(quiz.error)} onRetry={() => void quiz.refetch()} />;

  const q = quiz.data;
  const total = q.questions.length;
  if (total === 0) {
    return (
      <Screen>
        <Card style={[styles.hero, { backgroundColor: colors.brand, borderColor: colors.brand }]}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
          <Text style={styles.verdict}>Vous avez répondu à toutes vos questions aujourd’hui.</Text>
          <Text style={[styles.sub, { textAlign: 'center' }]}>Revenez demain pour la suite de vos révisions.</Text>
        </Card>
        <Button label="Question au hasard" icon="shuffle" variant="secondary" onPress={() => router.replace('/random')} />
        <Button label="Retour à l’accueil" icon="home-outline" variant="ghost" onPress={() => router.dismissAll()} />
      </Screen>
    );
  }
  const pct = q.answered ? Math.round((q.correct / q.answered) * 100) : 0;
  const subjectTitle = subjectId ? subjects.data?.find((s) => s.id === subjectId)?.title : undefined;
  const quizParams = subjectId ? { subject_id: String(subjectId) } : {};

  async function again() {
    setRenewMessage(null);
    try {
      const fresh = await renew.mutateAsync({ subject_id: subjectId });
      // Série vide : l'écran affiche « toutes vos questions sont faites » (le cache du quiz est à jour).
      if (fresh.questions.length > 0) router.replace({ pathname: '/quiz', params: quizParams });
    } catch (e) {
      setRenewMessage(errorMessage(e));
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: subjectTitle ? `Résultat : ${subjectTitle}` : 'Résultat' }} />
      <Card style={[styles.hero, { backgroundColor: colors.brand, borderColor: colors.brand }]}>
        <Ionicons name={pct >= 50 ? 'trophy' : 'barbell'} size={40} color="#fde68a" />
        <Text style={styles.score} accessibilityLabel={`Score : ${q.correct} sur ${q.answered}`}>
          {q.correct} / {q.answered}
        </Text>
        <Text style={styles.verdict}>{verdict(pct)}</Text>
        {q.answered < total ? (
          <Text style={styles.sub}>
            {total - q.answered} question{total - q.answered > 1 ? 's' : ''} sans réponse
          </Text>
        ) : null}
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button label="Encore une série" icon="refresh" onPress={again} loading={renew.isPending} />
        {q.answered < total ? (
          <Button
            label="Finir le quiz"
            icon="play"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/quiz', params: quizParams })}
          />
        ) : null}
        <Button label="Retour à l’accueil" icon="home-outline" variant="ghost" onPress={() => router.dismissAll()} />
        {renewMessage ? <Notice tone="info">{renewMessage}</Notice> : null}
      </View>

      <Card style={{ gap: spacing.md }}>
        <Heading>Vos réponses</Heading>
        {q.questions.map((question, i) => {
          const a = question.answered_today;
          const ok = a?.correct === true;
          const yourAnswer = a ? question.choices[a.choice_index] : undefined;
          return (
            <View
              key={question.id}
              accessible
              accessibilityLabel={`${question.question}. ${
                !a ? 'Sans réponse.' : ok ? 'Juste.' : `Faux, vous avez répondu ${yourAnswer}.`
              } Bonne réponse : ${question.answer}.`}
              style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <Ionicons
                name={!a ? 'remove-circle-outline' : ok ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={!a ? colors.muted : ok ? colors.ok : colors.bad}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15, lineHeight: 21 }}>{question.question}</Text>
                <Body style={{ fontSize: 14, color: colors.ok }}>{question.answer}</Body>
                {a && !ok ? (
                  <Body style={{ fontSize: 14, color: colors.bad, textDecorationLine: 'line-through' }}>{yourAnswer}</Body>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  score: { color: '#ffffff', fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  verdict: { color: '#ffffff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sub: { color: '#e0e7ff' },
  item: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md, alignItems: 'flex-start' },
});
