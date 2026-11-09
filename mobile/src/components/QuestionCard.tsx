import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Question } from '@/api';
import { choiceSeed, shuffleChoices } from '@/lib/shuffle';
import type { LocalAnswer } from '@/lib/quizSession';
import { boxDescription } from '@/lib/leitner';
import { formatDueRelative } from '@/lib/dates';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';
import { Body, Button, Card, Notice } from './ui';
import { QuestionImage } from './QuestionImage';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuestionCard({
  question,
  day,
  seedSalt,
  answer,
  onChoose,
  onRetrySend,
  subjectTitle,
  subjectColor,
}: {
  question: Question;
  /** Jour du quiz (AAAA-MM-JJ) : sert de graine au mélange et de référence pour la prochaine révision. */
  day: string;
  seedSalt?: string;
  answer: LocalAnswer | undefined;
  onChoose: (choiceIndex: number) => void;
  onRetrySend?: () => void;
  subjectTitle?: string;
  subjectColor?: string;
}) {
  const { colors } = useTheme();
  const displayed = useMemo(
    () => shuffleChoices(question.choices, choiceSeed(question.id, day, seedSalt)),
    [question.id, question.choices, day, seedSalt],
  );
  const answered = !!answer;

  return (
    <View style={{ gap: spacing.lg }}>
      {subjectTitle ? (
        <View style={styles.subjectRow}>
          <View style={[styles.dot, { backgroundColor: subjectColor ?? colors.primary }]} />
          <Text style={{ color: colors.muted, fontWeight: '600' }} numberOfLines={1}>
            {subjectTitle}
          </Text>
        </View>
      ) : null}

      {question.image_url ? <QuestionImage uri={question.image_url} /> : null}

      <Text accessibilityRole="header" style={[styles.question, { color: colors.text }]}>
        {question.question}
      </Text>

      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
        {displayed.map((choice, pos) => {
          const isAnswer = choice.index === question.answer_index;
          const isChosen = answer?.choice_index === choice.index;
          let bg = colors.surface;
          let border = colors.border;
          let fg = colors.text;
          let icon: 'checkmark-circle' | 'close-circle' | null = null;
          if (answered && isAnswer) {
            bg = colors.okSoft;
            border = colors.ok;
            fg = colors.ok;
            icon = 'checkmark-circle';
          } else if (answered && isChosen) {
            bg = colors.badSoft;
            border = colors.bad;
            fg = colors.bad;
            icon = 'close-circle';
          }
          const state = answered ? (isAnswer ? ', bonne réponse' : isChosen ? ', votre réponse, fausse' : '') : '';
          return (
            <Pressable
              key={choice.index}
              accessibilityRole="radio"
              accessibilityLabel={`${LETTERS[pos]}. ${choice.text}${state}`}
              accessibilityState={{ checked: isChosen, disabled: answered }}
              disabled={answered}
              onPress={() => onChoose(choice.index)}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: bg,
                  borderColor: border,
                  opacity: answered && !isAnswer && !isChosen ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={[styles.letter, { backgroundColor: answered ? 'transparent' : colors.primarySoft }]}>
                {icon ? (
                  <Ionicons name={icon} size={26} color={fg} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{LETTERS[pos]}</Text>
                )}
              </View>
              <Text style={[styles.choiceText, { color: fg }]}>{choice.text}</Text>
            </Pressable>
          );
        })}
      </View>

      {answer ? <Feedback question={question} answer={answer} day={day} onRetrySend={onRetrySend} /> : null}
    </View>
  );
}

function Feedback({
  question,
  answer,
  day,
  onRetrySend,
}: {
  question: Question;
  answer: LocalAnswer;
  day: string;
  onRetrySend?: () => void;
}) {
  const { colors } = useTheme();
  const explanation = question.explanation?.trim();
  return (
    <Card style={{ gap: spacing.sm, borderColor: answer.correct ? colors.ok : colors.bad, borderWidth: 1.5 }}>
      <View style={styles.subjectRow} accessibilityLiveRegion="assertive">
        <Ionicons
          name={answer.correct ? 'checkmark-circle' : 'close-circle'}
          size={24}
          color={answer.correct ? colors.ok : colors.bad}
        />
        <Text style={{ fontSize: 18, fontWeight: '800', color: answer.correct ? colors.ok : colors.bad }}>
          {answer.correct ? 'Bonne réponse !' : 'Raté'}
        </Text>
      </View>
      {!answer.correct ? (
        <Body>
          La bonne réponse était : <Text style={{ fontWeight: '700' }}>{question.answer}</Text>
        </Body>
      ) : null}
      {explanation ? <Body muted>{explanation}</Body> : null}
      {answer.status === 'sent' && answer.progress ? (
        <View style={[styles.progressRow, { backgroundColor: colors.surface2 }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, flex: 1 }}>
            {boxDescription(answer.progress.box)} · prochaine révision {formatDueRelative(day, answer.progress.due_day)}
          </Text>
        </View>
      ) : null}
      {answer.status === 'pending' ? <Body muted>Enregistrement…</Body> : null}
      {answer.status === 'error' ? (
        <View style={{ gap: spacing.sm }}>
          <Notice tone="bad">La réponse n’a pas pu être enregistrée. Vérifiez la connexion.</Notice>
          {onRetrySend ? <Button label="Renvoyer la réponse" icon="refresh" variant="danger" onPress={onRetrySend} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  question: { fontSize: 22, fontWeight: '700', lineHeight: 30 },
  choice: {
    minHeight: 60,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  letter: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1, fontSize: 17, fontWeight: '600', lineHeight: 23 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minHeight: MIN_TOUCH - 8,
  },
});
