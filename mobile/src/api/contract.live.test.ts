/**
 * Vérifie le contrat contre l'API de production, en lecture seule.
 * Lancé seulement si APPRENDRE_EMAIL et APPRENDRE_PASSWORD sont définis :
 *   APPRENDRE_EMAIL=... APPRENDRE_PASSWORD=... npm run test:live
 */
import { createApiClient } from './client';

const EMAIL = process.env.APPRENDRE_EMAIL;
const PASSWORD = process.env.APPRENDRE_PASSWORD;
const live = EMAIL && PASSWORD ? describe : describe.skip;

function keysOf(o: object): string[] {
  return Object.keys(o).sort();
}

const QUESTION_KEYS = [
  'answer', 'answer_index', 'choices', 'created_at', 'explanation', 'id', 'image_url',
  'progress', 'question', 'source', 'subject_id', 'updated_at',
];

function checkQuestion(q: Record<string, unknown>) {
  expect(keysOf(q)).toEqual(expect.arrayContaining(QUESTION_KEYS));
  expect(Array.isArray(q.choices)).toBe(true);
  const choices = q.choices as string[];
  expect(choices.length).toBeGreaterThanOrEqual(2);
  expect(choices.length).toBeLessThanOrEqual(6);
  expect(choices[q.answer_index as number]).toBe(q.answer);
  if (q.progress !== null) {
    expect(keysOf(q.progress as object)).toEqual(['box', 'correct_count', 'due_day', 'last_day', 'wrong_count']);
  }
}

live('contrat de l’API de production', () => {
  let token: string | null = null;
  const api = createApiClient({ getToken: () => token });

  beforeAll(async () => {
    // Connexion en lecture seule : on révoque le jeton créé à la fin.
    const res = await api.login({ email: EMAIL!, password: PASSWORD!, device_name: 'Test de contrat' });
    expect(keysOf(res)).toEqual(['token', 'user']);
    token = res.token;
  });

  afterAll(async () => {
    if (token) await api.logout();
  });

  it('GET /me', async () => {
    const me = await api.me();
    expect(keysOf(me)).toEqual(['today', 'user']);
    expect(me.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(keysOf(me.user)).toEqual(
      expect.arrayContaining(['daily_quiz_size', 'email', 'id', 'name', 'timezone']),
    );
  });

  it('GET /subjects', async () => {
    const { items } = await api.subjects();
    expect(items.length).toBeGreaterThan(0);
    for (const s of items) {
      expect(keysOf(s)).toEqual(
        expect.arrayContaining(['color', 'description', 'due_count', 'id', 'mastered_count', 'new_count', 'question_count', 'title']),
      );
    }
  });

  it('GET /quiz/daily est stable et porte answered_today', async () => {
    const a = await api.dailyQuiz();
    const b = await api.dailyQuiz();
    expect(keysOf(a)).toEqual(['answered', 'completed', 'correct', 'day', 'questions', 'size', 'subject_id']);
    expect(b.questions.map((q) => q.id)).toEqual(a.questions.map((q) => q.id));
    for (const q of a.questions) {
      checkQuestion(q as unknown as Record<string, unknown>);
      expect(q).toHaveProperty('answered_today');
      if (q.answered_today) expect(keysOf(q.answered_today)).toEqual(['choice_index', 'correct']);
    }
    expect(a.answered).toBe(a.questions.filter((q) => q.answered_today).length);
  });

  it('GET /quiz/daily?subject_id filtre sur le sujet', async () => {
    const { items } = await api.subjects();
    const quiz = await api.dailyQuiz({ subject_id: items[0].id, size: 3 });
    expect(quiz.subject_id).toBe(items[0].id);
    expect(quiz.questions.length).toBeLessThanOrEqual(3);
    for (const q of quiz.questions) expect(q.subject_id).toBe(items[0].id);
  });

  it('questions au hasard, avec exclude et 404 quand il n’en reste plus', async () => {
    const { items } = await api.subjects();
    const subject = items.find((s) => s.question_count > 0)!;
    const first = await api.randomSubjectQuestion(subject.id);
    checkQuestion(first as unknown as Record<string, unknown>);
    expect(first.subject_id).toBe(subject.id);
    const seen = [first.id];
    for (let i = 1; i < subject.question_count; i++) {
      const q = await api.randomSubjectQuestion(subject.id, seen);
      expect(seen).not.toContain(q.id);
      seen.push(q.id);
    }
    await expect(api.randomSubjectQuestion(subject.id, seen)).rejects.toMatchObject({ status: 404 });
    checkQuestion((await api.randomQuestion()) as unknown as Record<string, unknown>);
  });

  it('GET /stats', async () => {
    const s = await api.stats();
    expect(keysOf(s)).toEqual(
      expect.arrayContaining([
        'activity', 'answered_today', 'boxes', 'correct_today', 'due_today', 'hardest_questions',
        'last_30_days', 'mastered', 'new', 'questions', 'streak_days',
      ]),
    );
    expect(keysOf(s.boxes)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(keysOf(s.last_30_days)).toEqual(['answers', 'correct', 'success_rate']);
  });

  it('une erreur renvoie {error, message} en français', async () => {
    const err = await api.updateMe({ daily_quiz_size: 0 }).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.code).toBe('requete_invalide');
    expect(err.message).toMatch(/taille du quiz/i);
  });
});
