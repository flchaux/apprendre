import { ApiError, createApiClient, errorMessage } from './client';

type Call = { url: string; init: RequestInit };

function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift();
    if (!r) throw new TypeError('Network request failed');
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => (r.body === undefined ? '' : JSON.stringify(r.body)),
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('client API', () => {
  it('envoie le jeton Bearer et les paramètres de requête', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { day: '2026-11-09', questions: [] } }]);
    const api = createApiClient({ baseUrl: 'https://x/api/v1', getToken: () => 'apr_123', fetchImpl: impl });
    await api.dailyQuiz({ subject_id: 3 });
    expect(calls[0].url).toBe('https://x/api/v1/quiz/daily?subject_id=3');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer apr_123');
  });

  it('construit exclude pour la question au hasard', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: {} }, { status: 200, body: {} }]);
    const api = createApiClient({ baseUrl: 'https://x', getToken: () => 't', fetchImpl: impl });
    await api.randomSubjectQuestion(2, [12, 15]);
    await api.randomSubjectQuestion(2);
    expect(calls[0].url).toBe('https://x/subjects/2/questions/random?exclude=12%2C15');
    expect(calls[1].url).toBe('https://x/subjects/2/questions/random');
  });

  it('envoie le corps JSON des réponses', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { correct: true } }]);
    const api = createApiClient({ baseUrl: 'https://x', getToken: () => 't', fetchImpl: impl });
    await api.answer({ question_id: 17, choice_index: 2 });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBe('{"question_id":17,"choice_index":2}');
  });

  it('transforme une erreur du serveur en ApiError avec son message français', async () => {
    const { impl } = fakeFetch([{ status: 400, body: { error: 'requete_invalide', message: 'Fuseau horaire inconnu.' } }]);
    const api = createApiClient({ baseUrl: 'https://x', getToken: () => 't', fetchImpl: impl });
    const err = await api.updateMe({ timezone: 'Mars/Olympus' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('requete_invalide');
    expect(errorMessage(err)).toBe('Fuseau horaire inconnu.');
  });

  it('un 401 avec jeton déclenche la déconnexion (jeton révoqué)', async () => {
    const onUnauthorized = jest.fn();
    const { impl } = fakeFetch([{ status: 401, body: { error: 'non_authentifie', message: 'Authentification requise.' } }]);
    const api = createApiClient({ baseUrl: 'https://x', getToken: () => 't', fetchImpl: impl, onUnauthorized });
    await expect(api.me()).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('un 401 à la connexion (sans jeton) ne déclenche pas la déconnexion', async () => {
    const onUnauthorized = jest.fn();
    const { impl } = fakeFetch([{ status: 401, body: { error: 'non_authentifie', message: 'Email ou mot de passe incorrect.' } }]);
    const api = createApiClient({ baseUrl: 'https://x', getToken: () => null, fetchImpl: impl, onUnauthorized });
    await expect(api.login({ email: 'a', password: 'b', device_name: 'c' })).rejects.toThrow('Email ou mot de passe incorrect.');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('signale une coupure réseau en français', async () => {
    const { impl } = fakeFetch([]);
    const api = createApiClient({ baseUrl: 'https://x', getToken: () => 't', fetchImpl: impl });
    const err = await api.subjects().catch((e) => e);
    expect(err.isNetwork).toBe(true);
    expect(err.message).toMatch(/Connexion impossible/);
  });
});
