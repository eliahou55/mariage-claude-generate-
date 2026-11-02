# Parcours client — étude (octobre 2026)

## Objectif du produit

Un couple crée en ligne le faire-part de son mariage juif (henné, mairie,
Chabbat 'Hatan, houppa, réception), le personnalise (thème, musique, logo),
paie, puis le partage par un lien. Après paiement, il dispose d'un espace
(tableau de bord) avec les réponses de ses invités.

## Parcours actuel (avant refonte)

| # | Page | Rôle | Points de friction |
|---|------|------|--------------------|
| 0 | `client/index.html` | accueil | colonne étroite de 560 px même sur ordinateur ; aucun visuel du résultat ; pas de navigation ; logo « essai » mis au même niveau que l'appel principal |
| 1 | `client/configurateur.html` | déroulé des événements | « Étape 1 sur 2 » alors que le parcours compte 3 étapes réelles |
| 2 | `client/formulaire.html` | informations | idem « Étape 2 sur 2 » ; colonne étroite sur ordinateur |
| 3 | `apercu/index.html` | musique + choix du thème | page sombre au style « outil de développement », sans en-tête ni étape : rupture visuelle au moment le plus important (le choix) |
| 4 | `apercu/<thème>/` | rendu final | pas d'étape suivante (publier / payer) : le parcours s'arrête net |
| — | `client/logo.html` | générateur de logo | accessible seulement par un bouton « essai » |

Constat principal : le visiteur ne voit jamais à quoi ressemblera son
invitation avant d'avoir rempli tout le formulaire, et il ne sait pas où il en
est (nombre d'étapes faux, dernière page sans suite).

## Parcours cible

```
Accueil ──► 1. Événements ──► 2. Informations ──► 3. Thème, musique, logo ──► 4. Publication
   │                                                                          (paiement — bientôt)
   ├── Voir un exemple (mariage fictif, sans rien saisir) ──► étape 3                 │
   └── Connexion / Inscription (factices pour l'instant)                              ▼
                                                                       Espace des mariés (bientôt)
                                                                       tableau de bord, réponses
                                                                       des invités, modifications
```

Principes retenus :

1. **Montrer le résultat dès l'accueil** : téléphones affichant de vrais
   thèmes (rendus en direct, pas des captures figées).
2. **Commencer sans compte** : le compte n'est demandé qu'au moment de publier
   (paiement). La connexion reste disponible dans l'en-tête pour revenir.
3. **Une barre d'étapes commune** (1 → 4) sur toutes les pages du parcours ;
   l'étape 4 est affichée mais verrouillée tant que le paiement n'existe pas.
4. **Un seul en-tête partout** (marque, navigation, compte), sauf sur les
   pages de rendu d'un thème, qui restent plein écran comme l'invitation
   réelle que verront les invités.
5. **Pages larges sur ordinateur** (formulaire en deux colonnes, galerie des
   thèmes en grille) ; les pages de thème restent au format téléphone.

## À faire plus tard

- Inscription / connexion réelles (backend), données liées au compte au lieu
  du navigateur.
- Étape 4 : récapitulatif, paiement, génération du lien définitif.
- Espace des mariés : tableau de bord, réponses RSVP (export), modifications.

## Révision (novembre 2026) : logo, thèmes vedettes, démo

- **Exemples** : « Essayer des exemples » ne propose plus de créer un logo
  (l'encart « Votre logo » de la galerie est masqué pour le mariage d'exemple).
- **Logo, en trois temps** :
  1. *Formulaire* : la section « Votre logo » explique qu'un logo par défaut
     (initiales en monogramme) est créé automatiquement, avec son aperçu.
  2. *Invitation* : le client voit son logo par défaut sur le thème ouvert.
  3. *Après les cartes* : un bandeau « Vous aimez votre logo ? » apparaît
     (`src/app.js`, `avisLogo`). « Oui » le garde ; « Pas tellement » ouvre
     `client/logo.html?retour=apercu&theme=<slug>`, qui ramène sur le thème une
     fois le logo choisi. Jamais affiché pour l'exemple, ni si un logo
     personnalisé ou « aucun logo » est déjà choisi.
- **Thèmes vedettes** : Toile de Jouy vert et bleu (les plus vendus) passent en
  premier partout (accueil, carrousel, galerie, thème par défaut), avec la
  pastille « Le plus choisi ».
- **Démo du configurateur** : vidéo de 30 s (`client/demo/composition.mp4`)
  et explication en 4 points sur la page « Composez le déroulé ». La vidéo se
  régénère avec `node scripts/video-demo.cjs` (dist/ servi sur le port 8765).

## Révision (2 novembre 2026) : évaluation « premier visiteur » et corrections

Évaluation sur iPhone simulé, en se mettant à la place d'un visiteur pressé :
l'outil du configurateur arrivait après 2,5 écrans d'explications, le
formulaire faisait 3 écrans avec les seuls champs obligatoires en bas, la
galerie montrait des motifs sans les prénoms, l'exemple affichait des étapes
« faites » et un Chabbat 'Hatan avant la houppa. Corrigé : outil d'abord,
essentiel d'abord, prénoms sur chaque vignette, exemple réaliste (houppa à la
synagogue et réception en salle séparées), logo selon l'origine du visiteur
(exemple → section Logo au formulaire puis sa carte ; « Créer gratuitement » →
pastille « Changer le logo » sur les thèmes), en-tête allégé sur mobile.
