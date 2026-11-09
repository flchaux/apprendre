import { choiceSeed, hashSeed, shuffleChoices } from './shuffle';

describe('shuffleChoices', () => {
  const choices = ['Canberra', 'Sydney', 'Melbourne', 'Perth'];

  it('garde toutes les propositions, chacune avec son indice d’origine', () => {
    const out = shuffleChoices(choices, 'graine');
    expect(out).toHaveLength(4);
    expect(out.map((c) => c.index).sort()).toEqual([0, 1, 2, 3]);
    for (const c of out) expect(c.text).toBe(choices[c.index]);
  });

  it('ne modifie pas le tableau d’origine', () => {
    const copy = [...choices];
    shuffleChoices(choices, 1);
    expect(choices).toEqual(copy);
  });

  it('est reproductible avec la même graine (reprise du quiz)', () => {
    expect(shuffleChoices(choices, choiceSeed(42, '2026-11-09'))).toEqual(shuffleChoices(choices, choiceSeed(42, '2026-11-09')));
  });

  it('mélange réellement : la bonne réponse n’est pas toujours en tête', () => {
    const positions = new Set<number>();
    for (let id = 1; id <= 200; id++) {
      positions.add(shuffleChoices(choices, choiceSeed(id, '2026-11-09')).findIndex((c) => c.index === 0));
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });

  it('répartit les positions de façon à peu près uniforme', () => {
    const counts = [0, 0, 0, 0];
    const n = 4000;
    for (let i = 0; i < n; i++) counts[shuffleChoices(choices, `s${i}`).findIndex((c) => c.index === 0)]++;
    for (const c of counts) expect(Math.abs(c / n - 0.25)).toBeLessThan(0.04);
  });

  it('change d’ordre d’un jour à l’autre pour une même question', () => {
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'];
    const orders = new Set(days.map((d) => shuffleChoices(choices, choiceSeed(7, d)).map((c) => c.index).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('gère 2 et 6 propositions', () => {
    expect(shuffleChoices(['Vrai', 'Faux'], 3).map((c) => c.index).sort()).toEqual([0, 1]);
    expect(shuffleChoices(['a', 'b', 'c', 'd', 'e', 'f'], 3).map((c) => c.index).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('hashSeed est stable et non signé', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
    expect(hashSeed('abc')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
  });
});
