// Génère les icônes et l'écran de démarrage à partir du logo du site (assets/logo.svg).
// Usage : node tools/make-icons.js  (nécessite Playwright avec Chromium)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'assets', 'images');
const INDIGO = '#4f46e5';
// Chapeau seul (sans le fond), coordonnées du viewBox 64×64 du favicon.
const HAT = (mono) => `
  <path d="M14 22l18-8 18 8-18 8z" fill="#fff"/>
  <path d="M22 27v9c0 4 5 7 10 7s10-3 10-7v-9l-10 4.5z" fill="${mono ? '#fff' : '#c7d2fe'}"/>
  <path d="M48 23v12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  <circle cx="48" cy="38" r="3" fill="${mono ? '#fff' : '#fbbf24'}"/>`;

// Le chapeau est centré sur (32.5, 28.5) ; `scale` règle sa taille relative.
function svg({ size, bg, rounded, scale, mono }) {
  const s = (size / 64) * scale;
  const tx = size / 2 - 32.5 * s;
  const ty = size / 2 - 28.5 * s;
  const rect = bg ? `<rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rect}<g transform="translate(${tx} ${ty}) scale(${s})">${HAT(mono)}</g></svg>`;
}

const targets = [
  ['icon.png', { size: 1024, bg: INDIGO, rounded: false, scale: 1.25 }],
  ['android-icon-foreground.png', { size: 1024, bg: null, scale: 0.95 }],
  ['android-icon-background.png', { size: 1024, bg: INDIGO, rounded: false, scale: 0 }],
  ['android-icon-monochrome.png', { size: 1024, bg: null, scale: 0.95, mono: true }],
  ['splash-icon.png', { size: 1024, bg: null, scale: 1.6 }],
  ['logo.png', { size: 256, bg: INDIGO, rounded: true, scale: 1 }],
  ['favicon.png', { size: 64, bg: INDIGO, rounded: true, scale: 1 }],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, opts] of targets) {
    const markup = opts.scale === 0
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size}" height="${opts.size}"><rect width="100%" height="100%" fill="${opts.bg}"/></svg>`
      : svg(opts);
    await page.setViewportSize({ width: opts.size, height: opts.size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await page.locator('svg').screenshot({ path: path.join(OUT, name), omitBackground: true });
    console.log('écrit', name);
  }
  await browser.close();
  fs.mkdirSync(OUT, { recursive: true });
})();
