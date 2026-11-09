// Parcours de l'appli web (Expo) avec Playwright et captures à largeur téléphone.
// Usage : APPRENDRE_EMAIL=... APPRENDRE_PASSWORD=... node tools/screens.js <dossier> [light|dark] [étapes]
const { chromium } = require('playwright');
const path = require('path');

const OUT = process.argv[2] || 'captures';
const SCHEME = process.argv[3] || 'light';
const STEPS = (process.argv[4] || 'login,home,quiz,progress,settings,subject,random').split(',');
const URL = process.env.APP_URL || 'http://localhost:8081';
const EMAIL = process.env.APPRENDRE_EMAIL;
const PASSWORD = process.env.APPRENDRE_PASSWORD;

(async () => {
  const launch = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {};
  const browser = await chromium.launch(launch);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: Number(process.env.DSF || 1),
    colorScheme: SCHEME,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = async (name, full = true) => {
    await page.waitForTimeout(600);
    // Les écrans défilent dans un ScrollView interne : on agrandit la fenêtre pour tout capturer.
    if (full) {
      const h = await page.evaluate(() =>
        Math.max(...Array.from(document.querySelectorAll('div')).map((d) => d.scrollHeight - d.clientHeight)),
      );
      await page.setViewportSize({ width: 390, height: Math.min(4000, 844 + Math.max(0, h)) });
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(OUT, `${SCHEME}-${name}.png`) });
    if (full) await page.setViewportSize({ width: 390, height: 844 });
    console.log('capture', `${SCHEME}-${name}.png`);
  };
  const tap = (role, name) => page.getByRole(role, { name, exact: false }).first().click();

  await page.goto(URL);
  await page.getByLabel('E-mail').first().waitFor({ timeout: 60000 });
  if (STEPS.includes('login')) {
    await shot('01-connexion');
    await tap('button', 'Se connecter');
    await shot('01b-connexion-vide', false);
  }
  await page.getByLabel('E-mail').first().fill(EMAIL);
  await page.getByLabel('Mot de passe').first().fill(PASSWORD);
  await tap('button', 'Se connecter');
  await page.getByText('Sujets', { exact: true }).first().waitFor({ timeout: 30000 });
  if (STEPS.includes('home')) await shot('02-accueil');

  const answerCurrent = async (n) => {
    await page.getByRole('radio').nth(n).click();
    await page.getByText(/Bonne réponse|Raté/).first().waitFor();
    await page.getByText(/Boîte \d sur 5|Nouvelle question/).first().waitFor({ timeout: 15000 }).catch(() => {});
  };

  if (STEPS.includes('quiz')) {
    await page.getByRole('button', { name: /Commencer le quiz|Continuer le quiz|Voir le résultat/ }).first().click();
    await page.waitForTimeout(1500);
    if (await page.getByText('Vos réponses').count()) {
      await shot('03a-resultat-deja-fait');
      await page.getByRole('button', { name: 'Encore une série' }).click();
      await page.getByText(/Question \d+ sur \d+/).first().waitFor({ timeout: 15000 });
    }
    await page.getByText(/Question \d+ sur \d+/).first().waitFor({ timeout: 15000 });
    await shot('03-quiz-question', false);
    await answerCurrent(0);
    await shot('04-quiz-correction', false);

    if (STEPS.includes('resume')) {
      // Reprise : une deuxième réponse, retour à l'accueil, puis « Continuer ».
      await page.getByRole('button', { name: /^Suivant$/ }).click();
      await answerCurrent(1);
      const before = await page.getByText(/Question \d+ sur \d+/).first().textContent();
      const expected = `Question ${Number(before.match(/\d+/)[0]) + 1} `;
      await page.goBack();
      await page.getByText('Sujets', { exact: true }).first().waitFor();
      await shot('04c-accueil-quiz-en-cours', false);
      await page.getByRole('button', { name: 'Continuer le quiz' }).click();
      await page.getByText(/Question \d+ sur \d+/).first().waitFor({ timeout: 15000 });
      const label = await page.getByText(/Question \d+ sur \d+/).first().textContent();
      console.log('REPRISE :', before, '->', label, label.startsWith(expected) ? 'OK' : 'INATTENDU');
      await shot('04d-quiz-repris', false);
    }

    let guard = 0;
    while (guard++ < 40) {
      if (!(await page.getByText(/Bonne réponse !|Raté/).count())) await answerCurrent(guard % 3);
      const next = page.getByRole('button', { name: /^Suivant$|Voir le résultat/ }).first();
      await next.waitFor({ timeout: 15000 });
      await page.waitForTimeout(300);
      const label = await next.getAttribute('aria-label');
      await next.click();
      if (label && label.includes('résultat')) break;
      await page.waitForTimeout(400);
    }
    await page.getByText('Vos réponses').first().waitFor({ timeout: 20000 });
    await shot('05-resultat');
    if (STEPS.includes('empty')) {
      // Plus aucune question disponible aujourd'hui : « Encore une série » renvoie une série vide.
      await page.getByRole('button', { name: 'Encore une série' }).click();
      await page.getByText(/Revenez demain pour la suite|Question \d+ sur/).filter({ visible: true }).first().waitFor({ timeout: 15000 });
      await shot('05c-plus-rien-aujourdhui', false);
    }
    await page.getByRole('button', { name: 'Retour à l’accueil' }).click();
    await page.getByText('Sujets', { exact: true }).first().waitFor();
    await shot('05b-accueil-apres-quiz', false);
  }

  if (STEPS.includes('progress')) {
    await page.getByRole('tab', { name: /Progression/ }).first().click().catch(() => page.getByText('Progression').last().click());
    await page.getByText('Répartition par boîte').first().waitFor({ timeout: 15000 });
    await shot('06-progression');
  }
  if (STEPS.includes('settings')) {
    await page.getByRole('tab', { name: /Réglages/ }).first().click().catch(() => page.getByText('Réglages').last().click());
    await page.getByText('Rappel quotidien').first().waitFor({ timeout: 15000 });
    await shot('07-reglages');
  }
  if (STEPS.includes('subject')) {
    await page.getByRole('tab', { name: /Accueil/ }).first().click().catch(() => page.getByText('Accueil').last().click());
    await page.getByRole('button', { name: /Géographie/ }).first().click();
    await page.getByText('Maîtrise').first().waitFor({ timeout: 15000 });
    await shot('08-sujet');
  }
  if (STEPS.includes('random')) {
    await page.getByRole('button', { name: 'Question au hasard' }).first().click();
    await page.getByRole('radio').first().waitFor({ timeout: 15000 });
    await answerCurrent(1);
    await shot('09-hasard', false);
    await page.getByRole('button', { name: 'Question suivante' }).click();
    await page.getByRole('radio').first().waitFor({ timeout: 15000 });
    await shot('09b-hasard-suivante', false);
  }
  if (STEPS.includes('image')) {
    // Question illustrée : on parcourt « Culture générale » au hasard jusqu'à trouver l'illustration.
    await page.goto(URL + '/subject/2');
    await page.getByRole('button', { name: 'Question au hasard' }).first().click();
    for (let i = 0; i < 12; i++) {
      await page.getByRole('radio').first().waitFor({ timeout: 15000 });
      if (await page.getByLabel('Illustration de la question').count()) break;
      await answerCurrent(0);
      await page.getByRole('button', { name: 'Question suivante' }).click();
      await page.waitForTimeout(500);
    }
    if (await page.getByLabel('Illustration de la question').count()) {
      await page.waitForTimeout(1500);
      await shot('10-illustration', false);
      await page.getByLabel('Illustration de la question').click();
      await page.waitForTimeout(1200);
      await shot('10b-illustration-zoom', false);
      await page.getByLabel('Fermer l’illustration').first().click().catch(() => page.keyboard.press('Escape'));
    } else console.log('ILLUSTRATION NON TROUVÉE');
  }
  if (errors.length) console.log('ERREURS CONSOLE:\n' + errors.slice(0, 20).join('\n'));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
