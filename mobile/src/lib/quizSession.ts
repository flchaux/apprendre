import type { AnswerResult, Progress, QuizQuestion } from '@/api/types';

/** Réponse connue localement pour une question du quiz. */
export interface LocalAnswer {
  choice_index: number;
  correct: boolean;
  /** Progression renvoyée par le serveur après l'envoi (absente pour une réponse d'un passage précédent). */
  progress?: Progress | null;
  /** 'sent' : enregistrée par le serveur ; 'pending' : en cours d'envoi ; 'error' : envoi échoué. */
  status: 'sent' | 'pending' | 'error';
}

export type AnswerMap = Record<number, LocalAnswer>;

/** Réponses déjà données aujourd'hui (answered_today), pour reprendre le quiz là où on s'était arrêté. */
export function answersFromQuiz(questions: readonly QuizQuestion[]): AnswerMap {
  const map: AnswerMap = {};
  for (const q of questions) {
    if (q.answered_today) {
      map[q.id] = {
        choice_index: q.answered_today.choice_index,
        correct: q.answered_today.correct,
        progress: q.progress,
        status: 'sent',
      };
    }
  }
  return map;
}

/** Fusionne les réponses du serveur avec celles de la session, sans écraser une réponse locale plus récente. */
export function mergeAnswers(fromServer: AnswerMap, local: AnswerMap): AnswerMap {
  return { ...fromServer, ...local };
}

/** Indice de la première question sans réponse, ou -1 si tout est répondu. */
export function firstUnansweredIndex(questions: readonly { id: number }[], answers: AnswerMap): number {
  return questions.findIndex((q) => !answers[q.id]);
}

/**
 * Question suivante après `from` : la prochaine sans réponse plus loin dans la série,
 * sinon la première sans réponse depuis le début, sinon -1 (quiz terminé).
 */
export function nextUnansweredIndex(
  questions: readonly { id: number }[],
  answers: AnswerMap,
  from: number,
): number {
  for (let i = from + 1; i < questions.length; i++) {
    if (!answers[questions[i].id]) return i;
  }
  return firstUnansweredIndex(questions, answers);
}

/** Indice à afficher à l'ouverture : la première question sans réponse, sinon -1 (aller au résultat). */
export function resumeIndex(questions: readonly QuizQuestion[]): number {
  return firstUnansweredIndex(questions, answersFromQuiz(questions));
}

export function isCorrectChoice(question: { answer_index: number }, choiceIndex: number): boolean {
  return question.answer_index === choiceIndex;
}

export interface QuizScore {
  answered: number;
  correct: number;
  total: number;
}

export function score(questions: readonly { id: number }[], answers: AnswerMap): QuizScore {
  let answered = 0;
  let correct = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (a) {
      answered++;
      if (a.correct) correct++;
    }
  }
  return { answered, correct, total: questions.length };
}

/** Applique la réponse du serveur à la réponse locale. */
export function applyServerResult(answers: AnswerMap, questionId: number, result: AnswerResult): AnswerMap {
  return {
    ...answers,
    [questionId]: {
      choice_index: result.choice_index,
      correct: result.correct,
      progress: result.progress,
      status: 'sent',
    },
  };
}
