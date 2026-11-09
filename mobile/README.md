# Apprendre, application mobile

Application Android (Expo / React Native) pour réviser chaque jour sa base de connaissances Apprendre :
quiz du jour, révision d'un sujet, question au hasard et progression.

La gestion de la base (sujets, questions, illustrations, remplissage par Claude via MCP) reste sur le site
web https://apprendre.chaux.me. L'appli utilise uniquement l'API REST existante (`/api/v1`) : aucun
serveur supplémentaire, aucune modification du serveur.

## Fonctionnalités

- **Connexion et inscription** : jeton Bearer stocké dans `expo-secure-store`, `device_name` = modèle du
  téléphone (visible et révocable dans les Réglages du site). Un jeton révoqué (réponse 401) renvoie à
  l'écran de connexion avec un message.
- **Accueil** : salutation, série de jours 🔥, carte « Quiz du jour » (x/y, Commencer, Continuer ou Voir le
  résultat), tuiles à réviser, maîtrisées et réussite sur 30 jours, liste des sujets avec barre de maîtrise.
- **Quiz** : une question par écran, illustration zoomable au toucher, propositions mélangées en gros
  boutons. Correction immédiate (vert/rouge) et retour haptique, puis explication, boîte de Leitner et date
  de prochaine révision renvoyées par le serveur. Barre de progression et reprise à la première question
  sans réponse (`answered_today`).
- **Résultat** : score, liste des questions avec la bonne réponse (et la vôtre si elle était fausse),
  « Encore une série » (`POST /quiz/daily/renew`), retour à l'accueil.
- **Sujet** : statistiques du sujet, « Réviser ce sujet » (quiz du jour filtré), « Question au hasard »
  enchaînable (paramètre `exclude`).
- **Progression** : répartition par boîte, activité des 14 derniers jours, questions les plus difficiles,
  filtre par sujet.
- **Réglages** : nom, taille du quiz, fuseau horaire, rappel quotidien en notification locale (le toucher
  ouvre le quiz), lien vers le site, déconnexion (révoque le jeton du téléphone).
- Thème clair et sombre selon le système, palette du site (indigo `#4f46e5`), cibles tactiles d'au moins
  44 px, libellés pour les lecteurs d'écran.

## Installation

Prérequis : Node.js 20 ou plus récent.

```bash
git clone https://github.com/flchaux/apprendre.git
cd apprendre/mobile
npm install
```

## Ouvrir l'appli sur le téléphone avec Expo Go

1. Sur le téléphone Android, installer **Expo Go** depuis le Play Store.
2. Sur l'ordinateur, dans `apprendre/mobile` :
   ```bash
   npx expo start --tunnel
   ```
   La première fois, Expo propose d'installer `@expo/ngrok` : répondre oui. Le mode tunnel fonctionne
   même si le téléphone n'est pas sur le même Wi-Fi que l'ordinateur.
3. Dans Expo Go, toucher « Scan QR code » et scanner le QR code affiché dans le terminal.
4. Se connecter avec son compte Apprendre.

Sans `--tunnel` (`npm start`), le téléphone et l'ordinateur doivent être sur le même réseau Wi-Fi.

Remarques sur Expo Go : Expo Go affiche un avertissement au sujet des notifications *push* (retirées
d'Expo Go depuis le SDK 53). L'appli n'utilise que des notifications **locales**, qui fonctionnent.
Le nom et l'icône affichés sont ceux d'Expo Go ; l'APK ci-dessous a son propre nom et sa propre icône.

## Générer un APK Android

La configuration est prête dans `eas.json` (profil `preview` : APK installable directement).

### Option 1 : EAS Build (service d'Expo, compte gratuit nécessaire)

```bash
npx eas-cli@latest login            # crée ou utilise un compte Expo (gratuit)
npx eas-cli@latest build:configure  # associe le projet au compte (une seule fois)
npm run build:apk                   # = eas build --platform android --profile preview
```

EAS génère et conserve la clé de signature, puis fournit un lien de téléchargement de l'APK.
L'offre gratuite d'Expo comprend un quota mensuel de builds Android (file d'attente plus lente).

### Option 2 : build local, sans compte (Android Studio requis)

Prérequis : **JDK 17** (Gradle l'exige, même si un JDK plus récent est installé) et le SDK Android
(installé avec Android Studio, variable `ANDROID_HOME`) avec la plateforme 37, les build-tools 37.0.0,
le NDK 27.1.12297006 et CMake 3.22.1.

```bash
npx expo prebuild --platform android   # génère le dossier android/ (ignoré par git)
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
# APK : android/app/build/outputs/apk/release/app-release.apk
```

`-PreactNativeArchitectures=arm64-v8a` limite la compilation aux téléphones 64 bits (quasiment tous les
téléphones Android récents) : le build est plus rapide et l'APK plus léger. Sans cette option, l'APK
contient aussi les architectures 32 bits et x86.

Si Maven Central répond « 429 Too Many Requests », relancer la commande : les dépendances déjà
téléchargées restent en cache et le build reprend où il s'était arrêté.

Cet APK est signé avec la clé de débogage générée localement : il convient pour un usage personnel
(installation directe sur son téléphone), pas pour le Play Store.

Pour installer l'APK : le copier sur le téléphone et l'ouvrir (autoriser « Installer des applis
inconnues » pour le gestionnaire de fichiers), ou `adb install app-release.apk`.

## Version web (essais)

```bash
npm run web       # http://localhost:8081
```

La version web sert aux essais et aux captures d'écran. Les rappels n'y sont pas disponibles et le jeton
y est stocké dans `localStorage`.

## Tests et vérifications

```bash
npm test            # tests unitaires (mélange, reprise du quiz, client API, dates, rappel)
npm run typecheck   # TypeScript strict
npm run lint        # ESLint (règles Expo et React Compiler)

# Test de contrat contre l'API de production, en lecture seule (connexion, lectures, puis déconnexion) :
APPRENDRE_EMAIL=... APPRENDRE_PASSWORD=... npm run test:live

# Parcours complet de l'interface web avec captures (serveur web lancé, Playwright installé) :
APPRENDRE_EMAIL=... APPRENDRE_PASSWORD=... node tools/screens.js captures light
APPRENDRE_EMAIL=... APPRENDRE_PASSWORD=... node tools/screens.js captures dark
```

`tools/screens.js` répond réellement aux questions : à lancer avec un compte de test.

## Architecture

```
mobile/
├── app.json                 configuration Expo (nom, icônes, écran de démarrage, notifications)
├── eas.json                 profils de build EAS (APK « preview »)
├── assets/                  logo.svg (repris de public/favicon.svg) et icônes générées
├── tools/
│   ├── make-icons.js        génère icônes et écran de démarrage depuis le logo (Playwright)
│   └── screens.js           parcours automatisé et captures de la version web
└── src/
    ├── api/
    │   ├── types.ts         types exacts du contrat de l'API
    │   ├── client.ts        client unique (fetch, Bearer, erreurs ApiError, 401)
    │   ├── instance.ts      instance partagée et gestion du jeton
    │   ├── queries.ts       hooks TanStack Query (cache, invalidations)
    │   └── *.test.ts        tests du client et test de contrat en production
    ├── auth/AuthProvider.tsx   connexion, inscription, déconnexion, révocation
    ├── lib/
    │   ├── shuffle.ts       mélange reproductible des propositions (indice d'origine conservé)
    │   ├── quizSession.ts   reprise du quiz, enchaînement, score
    │   ├── reminder.ts      rappel quotidien (notification locale)
    │   ├── storage.ts       secure-store (téléphone) ou localStorage (web)
    │   └── dates.ts, leitner.ts, activity.ts, haptics.ts, params.ts
    ├── components/          interface commune (QuestionCard, StatsCharts, ui.tsx...)
    ├── hooks/useAnswering.ts   correction immédiate puis envoi de la réponse
    ├── theme/               couleurs du site, clair et sombre
    └── app/                 écrans (expo-router)
        ├── _layout.tsx      fournisseurs, garde d'authentification, notifications
        ├── (auth)/login.tsx, register.tsx
        ├── (tabs)/index.tsx (Accueil), progress.tsx, settings.tsx
        ├── quiz.tsx, result.tsx, random.tsx
        └── subject/[id].tsx
```

### Choix principaux

- **Mélange des propositions** : les propositions sont stockées dans un ordre fixe. L'appli les mélange
  avec une graine `jour + identifiant de question` : l'ordre reste le même si l'on quitte puis reprend le
  quiz dans la journée, et change d'un jour à l'autre. L'appli renvoie toujours l'indice d'origine
  (`choice_index`).
- **Correction immédiate** : la question contient `answer_index`, la correction s'affiche donc sans
  attendre le réseau. La réponse est envoyée en parallèle ; la boîte et la prochaine révision s'affichent
  au retour du serveur. En cas d'échec, un bouton « Renvoyer la réponse » apparaît et « Suivant » reste
  bloqué tant que la réponse n'est pas enregistrée.
- **Reprise** : à l'ouverture, le quiz démarre à la première question sans `answered_today`. Le quiz
  est identifié par son jour : s'il change (minuit dans le fuseau de l'utilisateur), la session repart de
  zéro.
- **Pas de mode hors ligne** (décision du 9 novembre 2026) : une connexion est nécessaire pour jouer.
  Le serveur date une réponse au jour où il la reçoit ; comme les réponses sont envoyées immédiatement,
  elles sont comptées le bon jour.
- **Tout répondu aujourd'hui** : si « Encore une série » ne trouve plus de question non répondue, le
  serveur renvoie une série vide qui devient le quiz du jour ; l'appli affiche alors « Vous avez répondu à
  toutes vos questions aujourd'hui » et propose une question au hasard.

## Limites connues

- Les rappels quotidiens et le retour haptique n'ont pas pu être essayés sur un vrai téléphone pendant le
  développement (APK compilé et vérifié, mais pas d'émulateur Android disponible).
- `app.json` bloque les permissions Android inutiles ajoutées par défaut (superposition, stockage,
  biométrie) : l'appli ne demande que l'accès Internet, la vibration et les notifications.
- « Question au hasard » tous sujets confondus : la route `/questions/random` n'accepte pas `exclude`.
  L'appli retente quelques tirages pour éviter une question déjà vue, sans garantie absolue.
