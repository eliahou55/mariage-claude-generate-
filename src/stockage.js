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
