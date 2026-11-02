/**
 * Cle localStorage partagee entre l'espace client (src/client/*) et le
 * moteur de rendu (src/app.js). Script classique charge en premier partout
 * (variable globale simple, compatible file://, pas de modules ES).
 *
 * - CLE_BROUILLON : etat de saisie en cours (entre les etapes du configurateur
 *   et du formulaire), au format libre defini par src/client/client.js.
 * - CLE_DONNEES   : le JSON final, exactement au format attendu par app.js
 *   (le meme que celui que scripts/build.mjs injecte pour l'Excel).
 */
var CLE_STOCKAGE_BROUILLON = 'invitation-client:brouillon';
var CLE_STOCKAGE_DONNEES = 'invitation-client:donnees';
// Logo choisi dans le generateur (src/client/logo.html) : { choisi: {...} }.
var CLE_STOCKAGE_LOGO = 'invitation-client:logo';
// Compte FACTICE (connexion / inscription de demonstration, src/client/entete.js).
var CLE_STOCKAGE_COMPTE = 'invitation-client:compte';
// Invitation enregistree dans le compte (Firestore) pour cette saisie.
var CLE_STOCKAGE_INVITATION = 'invitation-client:id';
// D'ou vient le visiteur : { origine: 'exemple', theme: '<slug>' } s'il a
// clique « Choisir ce theme pour ma carte » sur un theme d'exemple ; absent
// s'il est parti de « Creer gratuitement » (cf. formulaire.js, logo.js).
var CLE_STOCKAGE_PARCOURS = 'invitation-client:parcours';
// Modification d'une invitation existante depuis l'espace des maries (id de
// l'invitation) : le formulaire et les themes s'adaptent (« Conserver ce
// theme », « Enregistrer et voir ma carte »). Efface apres l'enregistrement.
var CLE_STOCKAGE_MODIF = 'invitation-client:modification';
