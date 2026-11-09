import type { QuizQuestion } from '@/api/types';
import {
  answersFromQuiz,
  applyServerResult,
  firstUnansweredIndex,
  isCorrectChoice,
  mergeAnswers,
  nextUnansweredIndex,
  resumeIndex,
  score,
  type AnswerMap,
} from './quizSession';

function q(id: number, answered: { choice_index: number; correct: boolean } | null = null): QuizQuestion {
  return {
    id,
    subject_id: 1,
    question: `Question ${id}`,
    choices: ['bonne', 'fausse', 'autre'],
    answer_index: 0,
    answer: 'bonne',
    explanation: '',
    image_url: null,
    source: 'manuel',
    progress: answered ? { box: 2, due_day: '2026-11-12', last_day: '2026-11-09', correct_count: 1, wrong_count: 0 } : null,
    answered_today: answered,
  };
}

describe('reprise du quiz', () => {
  it('démarre à la première question quand rien n’est répondu', () => {
    expect(resumeIndex([q(1), q(2), q(3)])).toBe(0);
  });

  it('reprend à la première question sans réponse (answered_today)', () => {
    const quiz = [q(1, { choice_index: 0, correct: true }), q(2, { choice_index: 1, correct: false }), q(3), q(4)];
    expect(resumeIndex(quiz)).toBe(2);
  });

  it('reprend sur un « trou » si une question au milieu est restée sans réponse', () => {
    const quiz = [q(1, { choice_index: 0, correct: true }), q(2), q(3, { choice_index: 0, correct: true })];
    expect(resumeIndex(quiz)).toBe(1);
  });

  it('renvoie -1 quand tout est répondu (aller au résultat)', () => {
    expect(resumeIndex([q(1, { choice_index: 0, correct: true })])).toBe(-1);
  });

  it('reprend les réponses du serveur avec leur progression', () => {
    const map = answersFromQuiz([q(1, { choice_index: 2, correct: false }), q(2)]);
    expect(map[1]).toEqual({
      choice_index: 2,
      correct: false,
      status: 'sent',
      progress: { box: 2, due_day: '2026-11-12', last_day: '2026-11-09', correct_count: 1, wrong_count: 0 },
    });
    expect(map[2]).toBeUndefined();
  });

  it('un quiz complété ensuite (base enrichie) reprend sur les nouvelles questions', () => {
    const quiz = [q(1, { choice_index: 0, correct: true }), q(2, { choice_index: 0, correct: true }), q(9)];
    expect(resumeIndex(quiz)).toBe(2);
  });
});

describe('enchaînement des questions', () => {
  const questions = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  const sent = (correct = true) => ({ choice_index: 0, correct, status: 'sent' as const });

  it('passe à la suivante sans réponse', () => {
    expect(nextUnansweredIndex(questions, { 1: sent() }, 0)).toBe(1);
  });

  it('saute les questions déjà répondues', () => {
    expect(nextUnansweredIndex(questions, { 1: sent(), 2: sent(), 3: sent() }, 0)).toBe(3);
  });

  it('revient à une question oubliée plus haut', () => {
    expect(nextUnansweredIndex(questions, { 1: sent(), 3: sent(), 4: sent() }, 3)).toBe(1);
  });

  it('renvoie -1 à la fin', () => {
    expect(nextUnansweredIndex(questions, { 1: sent(), 2: sent(), 3: sent(), 4: sent() }, 3)).toBe(-1);
    expect(firstUnansweredIndex(questions, { 1: sent(), 2: sent(), 3: sent(), 4: sent() })).toBe(-1);
  });

  it('compte le score', () => {
    expect(score(questions, { 1: sent(true), 2: sent(false), 3: sent(true) })).toEqual({ answered: 3, correct: 2, total: 4 });
  });

  it('les réponses locales priment sur celles du serveur', () => {
    const server: AnswerMap = { 1: sent(true) };
    const local: AnswerMap = { 1: { choice_index: 1, correct: false, status: 'pending' }, 2: sent() };
    expect(mergeAnswers(server, local)).toEqual(local);
  });

  it('corrige localement avec answer_index', () => {
    expect(isCorrectChoice({ answer_index: 2 }, 2)).toBe(true);
    expect(isCorrectChoice({ answer_index: 2 }, 0)).toBe(false);
  });

  it('applique le résultat renvoyé par le serveur', () => {
    const progress = { box: 1 as const, due_day: '2026-11-10', last_day: '2026-11-09', correct_count: 0, wrong_count: 1 };
    const map = applyServerResult({ 5: { choice_index: 1, correct: false, status: 'pending' } }, 5, {
      correct: false,
      choice_index: 1,
      answer_index: 0,
      answer: 'bonne',
      explanation: '',
      progress,
    });
    expect(map[5]).toEqual({ choice_index: 1, correct: false, status: 'sent', progress });
  });
});
