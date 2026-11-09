import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './instance';
import type { AnswerInput, DailyQuiz, MeUpdate, QuizParams } from './types';

export const queryKeys = {
  me: ['me'] as const,
  subjects: ['subjects'] as const,
  stats: (subjectId?: number) => ['stats', subjectId ?? 'all'] as const,
  quiz: (subjectId?: number) => ['quiz', subjectId ?? 'all'] as const,
};

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me });
}

export function useSubjects() {
  return useQuery({ queryKey: queryKeys.subjects, queryFn: api.subjects, select: (d) => d.items });
}

export function useStats(subjectId?: number) {
  return useQuery({ queryKey: queryKeys.stats(subjectId), queryFn: () => api.stats(subjectId) });
}

export function useDailyQuiz(subjectId?: number) {
  return useQuery({ queryKey: queryKeys.quiz(subjectId), queryFn: () => api.dailyQuiz({ subject_id: subjectId }) });
}

/** Rafraîchit compteurs et statistiques après une réponse, sans perturber le quiz en cours. */
export function useAnswerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AnswerInput) => api.answer(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: queryKeys.subjects });
      // Recharge les quiz affichés (accueil, sujet) : l'écran de jeu garde ses réponses locales en priorité.
      void qc.invalidateQueries({ queryKey: ['quiz'] });
    },
  });
}

export function useRenewQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: QuizParams) => api.renewDailyQuiz(params),
    onSuccess: (quiz: DailyQuiz, params) => {
      qc.setQueryData(queryKeys.quiz(params.subject_id), quiz);
      // Un renouvellement global ou par sujet peut changer les autres séries : on les recharge.
      void qc.invalidateQueries({
        queryKey: ['quiz'],
        predicate: (q) => q.queryKey[1] !== (params.subject_id ?? 'all'),
      });
    },
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: MeUpdate) => api.updateMe(patch),
    onSuccess: (res, patch) => {
      qc.setQueryData(queryKeys.me, (old: { user: unknown; today: string } | undefined) =>
        old ? { ...old, user: res.user } : old,
      );
      void qc.invalidateQueries({ queryKey: queryKeys.me });
      if (patch.daily_quiz_size !== undefined || patch.timezone !== undefined) {
        void qc.invalidateQueries({ queryKey: ['quiz'] });
        void qc.invalidateQueries({ queryKey: ['stats'] });
      }
    },
  });
}
