/** Lit un identifiant numérique dans les paramètres de route (undefined si absent ou invalide). */
export function parseId(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}
