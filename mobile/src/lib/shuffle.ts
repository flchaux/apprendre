/** Une proposition affichée, avec son indice d'origine à renvoyer au serveur (choice_index). */
export interface DisplayedChoice {
  text: string;
  index: number;
}

/** Hachage FNV-1a 32 bits d'une chaîne, pour graine de mélange. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Générateur pseudo-aléatoire Mulberry32 : rapide et reproductible à partir d'une graine. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mélange les propositions (Fisher-Yates) sans modifier le tableau d'origine.
 * Avec la même graine, l'ordre est identique : l'affichage reste stable quand
 * on quitte puis reprend le quiz dans la journée.
 */
export function shuffleChoices(choices: readonly string[], seed: string | number): DisplayedChoice[] {
  const rand = mulberry32(typeof seed === 'number' ? seed : hashSeed(seed));
  const out: DisplayedChoice[] = choices.map((text, index) => ({ text, index }));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Graine d'une question pour un jour donné : l'ordre change d'un jour à l'autre. */
export function choiceSeed(questionId: number, day: string, salt = ''): string {
  return `${day}:${questionId}:${salt}`;
}
