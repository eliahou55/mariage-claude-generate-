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
