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

## Dernière session (2 novembre 2026, Claude Code sur l'ordinateur, avec l'Excel)

Évaluation du parcours sur iPhone simulé (Playwright), puis 6 commits sur `main` :

1. **Houppa / réception** : deux cartes séparées par défaut (houppa l'après-midi
   à la synagogue, réception le soir en salle) ; la date de la houppa est
   reprise pour la réception. Exemple corrigé (cartes séparées, Chabbat 'Hatan
   le samedi suivant). Mémoire des grands-parents : police de titre du thème,
   hébreu en police hébraïque, phrase masquée sans vrai nom (`nomMemoire()`).
2. **Logo, deux parcours** (clé `CLE_STOCKAGE_PARCOURS` dans `stockage.js`) :
   - *Depuis un exemple* : « Choisir ce thème pour ma carte » retient le thème ;
     le formulaire montre la section Logo (en fin de formulaire) et mène
     directement à la carte ; sur le générateur, « Choisir ce logo et découvrir
     ma carte » ouvre l'invitation.
   - *Depuis « Créer gratuitement »* (efface la clé) : pas de section Logo ;
     pastille flottante neutre « ✎ Changer le logo » sur chaque thème
     (`pastilleLogo()` dans `app.js`). L'ancien bandeau « Vous aimez votre
     logo ? » est supprimé. **Consigne : rester neutre, ne jamais demander d'avis.**
3. **Configurateur** : l'outil d'abord, explication + démo repliées (`<details>`).
4. **Formulaire** : mariés → événements → familles / verset et musique repliés
   → logo ; l'erreur dit quel champ manque et y amène.
5. **Galerie** : prénoms du couple sur chaque vignette dans la police/couleur du
   thème (`identite()` dans `build.mjs`), thèmes avant musique et logo.
6. **En-tête** : plus de bouton noir ; sur mobile, connexion et inscription dans
   le burger. Pas de barre d'étapes pour l'exemple. **Favicon Sasson**
   (`src/client/icones/`, copie à la racine : `sasson-favicon.png`, et
   `dist/favicon.ico` écrit par le build).

Pour tester en local sans Python : un petit serveur statique Node sur `dist/`
(`serve` réécrit les URL et casse les chemins relatifs de `client/`).
