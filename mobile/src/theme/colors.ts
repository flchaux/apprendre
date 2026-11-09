/** Palette reprise du site web (public/style.css). */
export const lightColors = {
  bg: '#f6f7fb',
  surface: '#ffffff',
  surface2: '#f1f3f9',
  border: '#e3e6ef',
  text: '#1c2033',
  muted: '#646a82',
  primary: '#4f46e5',
  primaryInk: '#ffffff',
  primarySoft: '#eef0ff',
  /** Indigo des boutons pleins (identique dans les deux thèmes, comme le logo). */
  brand: '#4f46e5',
  ok: '#059669',
  okSoft: '#e7f7f0',
  bad: '#dc2626',
  badSoft: '#fdecec',
  warn: '#b45309',
  warnSoft: '#fff6e5',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  bg: '#0f1220',
  surface: '#171b2e',
  surface2: '#1e2339',
  border: '#2a3050',
  text: '#e7e9f3',
  muted: '#9aa0ba',
  primary: '#818cf8',
  primaryInk: '#0f1220',
  primarySoft: '#232849',
  brand: '#4f46e5',
  ok: '#34d399',
  okSoft: '#12302a',
  bad: '#f87171',
  badSoft: '#3a1c22',
  warn: '#fbbf24',
  warnSoft: '#362b12',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
/** Taille minimale d'une cible tactile. */
export const MIN_TOUCH = 48;
