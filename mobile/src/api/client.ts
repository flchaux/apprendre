import type {
  AnswerInput,
  AnswerResult,
  ApiErrorBody,
  AuthResponse,
  DailyQuiz,
  LoginInput,
  MeResponse,
  MeUpdate,
  Question,
  QuizParams,
  RegisterInput,
  Stats,
  SubjectsResponse,
  User,
} from './types';

export const SITE_URL = 'https://apprendre.chaux.me';
export const API_BASE = `${SITE_URL}/api/v1`;

/** Erreur renvoyée par l'API (statut HTTP + { error, message }) ou par le réseau (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

/** Message lisible pour n'importe quelle erreur (les messages du serveur sont déjà en français). */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Une erreur inattendue est survenue.';
}

type Query = Record<string, string | number | undefined>;

export interface ApiClientOptions {
  baseUrl?: string;
  getToken: () => string | null;
  /** Appelé quand un jeton est refusé (révoqué depuis le web). */
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

function buildQuery(query?: Query): string {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl ?? API_BASE;
  const doFetch = options.fetchImpl ?? ((input, init) => fetch(input, init));

  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const token = options.getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${path}${buildQuery(query)}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'reseau', 'Connexion impossible. Vérifiez votre accès à Internet.');
    }

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      const err = (data ?? {}) as Partial<ApiErrorBody>;
      const apiError = new ApiError(
        res.status,
        err.error ?? 'erreur',
        err.message ?? `Erreur du serveur (HTTP ${res.status}).`,
      );
      // Un 401 avec jeton signifie que le jeton a été révoqué. Sans jeton (connexion), c'est un mauvais mot de passe.
      if (res.status === 401 && token) options.onUnauthorized?.();
      throw apiError;
    }
    return data as T;
  }

  return {
    // Authentification
    login: (input: LoginInput) => request<AuthResponse>('POST', '/auth/login', input),
    register: (input: RegisterInput) => request<AuthResponse>('POST', '/auth/register', input),
    logout: () => request<unknown>('POST', '/auth/logout'),
    me: () => request<MeResponse>('GET', '/me'),
    updateMe: (patch: MeUpdate) => request<{ user: User }>('PATCH', '/me', patch),

    // Révision
    subjects: () => request<SubjectsResponse>('GET', '/subjects'),
    dailyQuiz: (params: QuizParams = {}) =>
      request<DailyQuiz>('GET', '/quiz/daily', undefined, { subject_id: params.subject_id, size: params.size }),
    renewDailyQuiz: (params: QuizParams = {}) => request<DailyQuiz>('POST', '/quiz/daily/renew', params),
    answer: (input: AnswerInput) => request<AnswerResult>('POST', '/answers', input),
    randomSubjectQuestion: (subjectId: number, exclude: number[] = []) =>
      request<Question>('GET', `/subjects/${subjectId}/questions/random`, undefined, {
        exclude: exclude.length ? exclude.join(',') : undefined,
      }),
    randomQuestion: (subjectId?: number) =>
      request<Question>('GET', '/questions/random', undefined, { subject_id: subjectId }),
    stats: (subjectId?: number) => request<Stats>('GET', '/stats', undefined, { subject_id: subjectId }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
