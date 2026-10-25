/**
 * Conversion de date du calendrier gregorien vers le calendrier hebraique,
 * en JS pur (algorithme standard de calcul calendaire -- base sur les
 * molad et les regles de report de Roch Hachana, cf. Dershowitz & Reingold,
 * "Calendrical Calculations"). Aucune dependance externe.
 *
 * Utilise un jour "RD" (Rata Die, jour 0 = 1er janvier an 1 du calendrier
 * gregorien proleptique) comme pivot entre les deux calendriers.
 *
 * Variable globale CalendrierHebreu, chargee en script classique (avant
 * formulaire.js), compatible file://.
 */
var CalendrierHebreu = (function () {
  'use strict';

  function mod(a, b) { return a - b * Math.floor(a / b); }

  /* ---------------------------------------------------------------- *
   * Gregorien -> RD
   * ---------------------------------------------------------------- */

  function anneeBissextileGregorienne(annee) {
    return mod(annee, 4) === 0 && (mod(annee, 100) !== 0 || mod(annee, 400) === 0);
  }

  function gregorienVersRD(annee, mois, jour) {
    return 365 * (annee - 1)
      + Math.floor((annee - 1) / 4)
      - Math.floor((annee - 1) / 100)
      + Math.floor((annee - 1) / 400)
      + Math.floor((367 * mois - 362) / 12)
      + (mois <= 2 ? 0 : (anneeBissextileGregorienne(annee) ? -1 : -2))
      + jour;
  }

  /* ---------------------------------------------------------------- *
   * Calendrier hebraique
   * ---------------------------------------------------------------- */

  var EPOQUE_HEBRAIQUE = -1373427;   // RD du 1 Tishrei de l'an 1 (convention standard)

  function anneeEmbolismique(annee) {
    return mod(7 * annee + 1, 19) < 7;
  }

  function dernierMoisDeLAnnee(annee) {
    return anneeEmbolismique(annee) ? 13 : 12;
  }

  /** Nombre de jours ecoules depuis l'epoque jusqu'au 1 Tishrei de `annee`. */
  function joursEcoules(annee) {
    var moisEcoules = Math.floor((235 * annee - 234) / 19);
    var partsEcoulees = 12084 + 13753 * moisEcoules;
    var jour = 29 * moisEcoules + Math.floor(partsEcoulees / 25920);
    if (mod(3 * (jour + 1), 7) < 3) jour += 1;
    return jour;
  }

  function joursDansLAnnee(annee) {
    return joursEcoules(annee + 1) - joursEcoules(annee);
  }

  function heshvanLong(annee) { return mod(joursDansLAnnee(annee), 10) === 5; }
  function kislevCourt(annee) { return mod(joursDansLAnnee(annee), 10) === 3; }

  function dernierJourDuMois(mois, annee) {
    if (mois === 2 || mois === 4 || mois === 6
      || (mois === 8 && !heshvanLong(annee))
      || (mois === 9 && kislevCourt(annee))
      || mois === 10
      || (mois === 12 && !anneeEmbolismique(annee))
      || mois === 13) return 29;
    return 30;
  }

  function hebraiqueVersRD(annee, mois, jour) {
    var total = 0, m;
    if (mois < 7) {
      for (m = 7; m <= dernierMoisDeLAnnee(annee); m++) total += dernierJourDuMois(m, annee);
      for (m = 1; m < mois; m++) total += dernierJourDuMois(m, annee);
    } else {
      for (m = 7; m < mois; m++) total += dernierJourDuMois(m, annee);
    }
    return EPOQUE_HEBRAIQUE + joursEcoules(annee) + total + jour - 1;
  }

  function rdVersHebraique(rd) {
    // Sous-estimation sure de l'annee (une annee hebraique fait au moins 353
    // jours) : la boucle qui suit corrige ensuite vers la bonne valeur.
    var annee = Math.floor((rd - EPOQUE_HEBRAIQUE) / 366) + 1;
    while (EPOQUE_HEBRAIQUE + joursEcoules(annee + 1) <= rd) annee++;
    while (EPOQUE_HEBRAIQUE + joursEcoules(annee) > rd) annee--;

    var mois = (rd < hebraiqueVersRD(annee, 1, 1)) ? 7 : 1;
    while (rd > hebraiqueVersRD(annee, mois, dernierJourDuMois(mois, annee))) mois++;

    var jour = rd - hebraiqueVersRD(annee, mois, 1) + 1;
    return { annee: annee, mois: mois, jour: jour };
  }

  /* ---------------------------------------------------------------- *
   * Mise en forme : noms de mois + numerotation hebraique (guematria)
   * ---------------------------------------------------------------- */

  var NOMS_MOIS = {
    1: 'ניסן', 2: 'אייר', 3: 'סיון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
    7: 'תשרי', 8: 'חשון', 9: 'כסלו', 10: 'טבת', 11: 'שבט',
  };

  function nomMois(mois, embolismique) {
    if (NOMS_MOIS[mois]) return NOMS_MOIS[mois];
    if (mois === 12) return embolismique ? 'אדר א׳' : 'אדר';
    if (mois === 13) return 'אדר ב׳';
    return '';
  }

  var GUEMATRIA_UNITES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  var GUEMATRIA_DIZAINES = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  var GUEMATRIA_CENTAINES = ['', 'ק', 'ר', 'ש', 'ת'];

  /** Nombre -> lettres hebraiques (guematria), avec guillemets hebreux
   *  (gershayim/geresh) et les deux exceptions traditionnelles 15/16. */
  function versGuematria(n) {
    if (n === 15) return 'ט״ו';
    if (n === 16) return 'ט״ז';
    var reste = n, lettres = '';
    while (reste >= 400) { lettres += 'ת'; reste -= 400; }
    if (reste >= 100) { lettres += GUEMATRIA_CENTAINES[Math.floor(reste / 100)]; reste %= 100; }
    if (reste >= 10) { lettres += GUEMATRIA_DIZAINES[Math.floor(reste / 10)]; reste %= 10; }
    if (reste > 0) { lettres += GUEMATRIA_UNITES[reste]; }
    if (!lettres) return '';
    if (lettres.length === 1) return lettres + '׳';
    return lettres.slice(0, -1) + '״' + lettres.slice(-1);
  }

  /** Annee hebraique (ex. 5787) -> "תשפ״ז" (seuls les 3 derniers chiffres
   *  sont ecrits traditionnellement, le millier "5" est sous-entendu). */
  function anneeEnGuematria(anneeHebraique) {
    return versGuematria(mod(anneeHebraique, 1000));
  }

  /**
   * Convertit une date gregorienne (annee, mois 1-12, jour) en date
   * hebraique complete, textuelle (meme forme que l'Excel, ex.
   * "ט״ו סיון תשפ״ז") et structuree.
   */
  function versHebreu(anneeGreg, moisGreg, jourGreg) {
    var rd = gregorienVersRD(anneeGreg, moisGreg, jourGreg);
    var h = rdVersHebraique(rd);
    var embolismique = anneeEmbolismique(h.annee);
    var texte = versGuematria(h.jour) + ' ' + nomMois(h.mois, embolismique) + ' ' + anneeEnGuematria(h.annee);
    return { jour: h.jour, mois: h.mois, annee: h.annee, embolismique: embolismique, texte: texte };
  }

  return { versHebreu: versHebreu, versGuematria: versGuematria };
})();
