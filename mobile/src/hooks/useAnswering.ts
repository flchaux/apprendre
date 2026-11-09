import { useCallback, useRef, useState } from 'react';
import { useAnswerMutation, type Question } from '@/api';
import { feedbackHaptic } from '@/lib/haptics';
import { applyServerResult, isCorrectChoice, type AnswerMap } from '@/lib/quizSession';

/**
 * Réponses de la session : correction immédiate (calculée localement avec answer_index),
 * puis envoi au serveur qui renvoie la boîte et la prochaine révision.
 */
export function useAnswering() {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const mutation = useAnswerMutation();
  const inFlight = useRef(new Set<number>());
  const [pendingCount, setPendingCount] = useState(0);

  const send = useCallback(
    (questionId: number, choiceIndex: number) => {
      if (inFlight.current.has(questionId)) return;
      inFlight.current.add(questionId);
      setPendingCount(inFlight.current.size);
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], choice_index: choiceIndex, status: 'pending' } as AnswerMap[number],
      }));
      mutation.mutate(
        { question_id: questionId, choice_index: choiceIndex },
        {
          onSuccess: (result) => setAnswers((prev) => applyServerResult(prev, questionId, result)),
          onError: () =>
            setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], status: 'error' } })),
          onSettled: () => {
            inFlight.current.delete(questionId);
            setPendingCount(inFlight.current.size);
          },
        },
      );
    },
    [mutation],
  );

  const choose = useCallback(
    (question: Question, choiceIndex: number) => {
      const correct = isCorrectChoice(question, choiceIndex);
      feedbackHaptic(correct);
      setAnswers((prev) => {
        if (prev[question.id]) return prev; // déjà répondu : on ignore un double toucher
        return { ...prev, [question.id]: { choice_index: choiceIndex, correct, status: 'pending', progress: null } };
      });
      send(question.id, choiceIndex);
    },
    [send],
  );

  const retry = useCallback(
    (questionId: number) => {
      const a = answers[questionId];
      if (a) send(questionId, a.choice_index);
    },
    [answers, send],
  );

  const reset = useCallback(() => setAnswers({}), []);

  return { answers, choose, retry, reset, pendingCount };
}
