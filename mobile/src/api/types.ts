/**
 * Types du contrat de l'API Apprendre (https://apprendre.chaux.me/api/v1).
 * Ils reprennent exactement les réponses du serveur ; les champs non utilisés
 * par l'appli (created_at, updated_at...) sont déclarés pour rester fidèles au contrat.
 */

/** Jour calendaire au format AAAA-MM-JJ, dans le fuseau de l'utilisateur. */
export type Day = string;

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  daily_quiz_size: number;
  timezone: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
  device_name: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export interface MeResponse {
  user: User;
  today: Day;
}

export interface MeUpdate {
  name?: string;
  daily_quiz_size?: number;
  timezone?: string;
}

export interface Subject {
  id: number;
  title: string;
  description: string;
  color: string;
  question_count: number;
  new_count: number;
  due_count: number;
  mastered_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubjectsResponse {
  items: Subject[];
}

/** Boîte de Leitner : 0 (nouvelle) à 5 (maîtrisée). */
export type Box = 0 | 1 | 2 | 3 | 4 | 5;

export interface Progress {
  box: Box;
  due_day: Day;
  last_day: Day;
  correct_count: number;
  wrong_count: number;
}

export interface Question {
  id: number;
  subject_id: number;
  question: string;
  /** 2 à 6 propositions, dans l'ordre de stockage (l'appli mélange l'affichage). */
  choices: string[];
  answer_index: number;
  answer: string;
  /** Chaîne vide quand il n'y a pas d'explication. */
  explanation: string | null;
  /** URL publique, affichable sans authentification. */
  image_url: string | null;
  source: string;
  created_at?: string;
  updated_at?: string;
  progress: Progress | null;
}

export interface AnsweredToday {
  choice_index: number;
  correct: boolean;
}

export interface QuizQuestion extends Question {
  answered_today: AnsweredToday | null;
}

export interface DailyQuiz {
  day: Day;
  subject_id: number | null;
  size: number;
  answered: number;
  correct: number;
  completed: boolean;
  questions: QuizQuestion[];
}

export interface QuizParams {
  subject_id?: number;
  size?: number;
}

export interface AnswerInput {
  question_id: number;
  choice_index: number;
}

export interface AnswerResult {
  correct: boolean;
  choice_index: number;
  answer_index: number;
  answer: string;
  explanation: string | null;
  progress: Progress;
}

export type Boxes = Record<`${Box}`, number>;

export interface ActivityDay {
  day: Day;
  answers: number;
  correct: number;
}

export interface HardQuestion {
  id: number;
  subject_id: number;
  question: string;
  correct_count: number;
  wrong_count: number;
  box: Box;
}

export interface Stats {
  day: Day;
  questions: number;
  new: number;
  due_today: number;
  mastered: number;
  boxes: Boxes;
  answered_today: number;
  correct_today: number;
  last_30_days: {
    answers: number;
    correct: number;
    /** Pourcentage de 0 à 100, null sans réponse sur la période. */
    success_rate: number | null;
  };
  streak_days: number;
  activity: ActivityDay[];
  hardest_questions: HardQuestion[];
}

export interface ApiErrorBody {
  error: string;
  message: string;
}
