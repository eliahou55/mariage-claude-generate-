# Sasson — notes pour Claude Code

Site de faire-part de mariage juif en ligne (sasson-invit.fr), hébergé sur
Netlify, domaine acheté chez Hostinger. Tout est en français (code, commentaires,
commits).

## À savoir avant de travailler

- **Netlify publie la branche `main`, dossier `dist/`, sans étape de build**
  (voir `netlify.toml`). Une modification n'est en ligne qu'une fois dans `main`.
- **`dist/` est commité.** Il est généré par `npm run build`
  (`scripts/build.mjs`) à partir de `../invitation_mariage.xlsx`, un fichier
  privé qui n'est PAS dans le dépôt (il est sur l'ordinateur, à côté du dossier
  du dépôt). Après une modification dans `src/`, `themes/` ou `scripts/build.mjs`,
  lancer `npm run build`. Sans l'Excel, il faut copier à la main les fichiers
  modifiés vers `dist/` (ex. `src/client/*` → `dist/client/`, `src/app.js` →
  `dist/app.js`) et reporter dans `dist/apercu/index.html` les changements de
  `pageIndexApercus()`.
- Le parcours client est décrit dans `docs/parcours-client.md`.

## Parcours client

Accueil (`src/client/index.html`) → 1. Événements (`configurateur.html`) →
2. Informations (`formulaire.html`) → 3. Thème & musique (`dist/apercu/index.html`,
généré par `pageIndexApercus()`), puis la page d'un thème (`apercu/<slug>/`, rendue
par `src/app.js`) → 4. Publication (`publication.html`, paiement Stripe).
Les données circulent par `localStorage` (clés dans `src/stockage.js`).

## Dernière session (novembre 2026, Claude Code dans le navigateur)

Branche `claude/adoring-brahmagupta-rgw7ew`, fusionnée dans `main`.

1. **Exemples** : « Essayer des exemples » ne propose plus de créer un logo
   (l'encart logo de la galerie est masqué quand `D.exemple`).
2. **Logo, en trois temps** :
   - *Formulaire* : la section « Votre logo » explique qu'un logo par défaut
     (initiales en monogramme) est créé automatiquement, avec son aperçu
     (`rendreLogoAuto()` dans `formulaire.js`).
   - *Page du thème* : après que les cartes d'événements ont été vues, un
     bandeau « Vous aimez votre logo ? » apparaît (`avisLogo()` dans
     `src/app.js`, styles `.avis-logo` dans `src/base.css`). « Oui » →
     retenu dans `localStorage` (`invitation-client:avis-logo`). « Pas
     tellement » → `client/logo.html?retour=apercu&theme=<slug>`. Une seule fois,
     jamais pour l'exemple ni si un logo perso ou « aucun » est déjà choisi.
   - *Allers-retours* : après « Choisir ce logo », retour automatique sur le
     thème (`?logo=maj`), le nouveau logo apparaît en douceur
     (`.logo-site--nouveau`). Un lien discret « Modifier le logo » sous le logo
     (`retoursLogo()` dans `app.js`) permet de revenir. **Consigne du
     propriétaire : ne jamais reposer de question ni donner l'impression qu'on
     cherche à tout prix sa satisfaction. Rester subtil et neutre.**
     Ces éléments n'existent que dans l'aperçu des mariés (jamais sur
     l'invitation publiée `/i/…`).
3. **Thèmes vedettes** : Toile de Jouy vert et bleu (les plus vendus) sont en
   premier partout (ordre de `THEMES` dans `build.mjs` et `client.js`, accueil,
   carrousel, galerie), avec la pastille « Le plus choisi ». Le thème par défaut
   est `toile-de-jouy-vert`.
4. **Configurateur** : nouveau titre « Composez le déroulé de votre mariage »,
   explication en 4 étapes et vidéo démo de 30 s
   (`src/client/demo/composition.mp4` + `.jpg`). Pour la régénérer : servir
   `dist/` sur le port 8765 (`python3 -m http.server 8765 -d dist`), puis
   `node scripts/video-demo.cjs` (Playwright + ffmpeg).

À vérifier au prochain `npm run build` avec l'Excel : que `dist/apercu/index.html`
régénéré garde bien l'ordre des thèmes, les pastilles « Le plus choisi » et le
masquage de l'encart logo pour l'exemple (normalement oui, `build.mjs` est à jour).
