/**
 * Espace client : logique commune aux 3 pages (accueil, configurateur,
 * formulaire). Script classique (pas de module ES, compatible file://).
 * Charge APRES stockage.js (CLE_STOCKAGE_BROUILLON / CLE_STOCKAGE_DONNEES).
 *
 * Etat persistant : un "brouillon" JSON simple dans localStorage, relu/
 * reecrit par chaque page au fur et a mesure de la saisie. Au clic final
 * sur "Voir mon invitation", on calcule le JSON complet (meme forme que
 * celui produit par scripts/build.mjs depuis l'Excel) et on l'ecrit dans
 * CLE_STOCKAGE_DONNEES -- src/app.js saura alors le lire et l'afficher
 * exactement comme une invitation generee depuis l'Excel.
 */
var ClientInvitation = (function () {
  'use strict';

  /* ---------------------------------------------------------------- *
   * Catalogue fixe des evenements proposes (v1). "chabbat" n'a pas
   * d'heure. Un seul de chaque type peut etre ajoute.
   * ---------------------------------------------------------------- */
  var CATALOGUE = [
    { cle: 'henne', titre: 'Henné', titreHe: 'חינה', heure: true, obligatoire: false },
    { cle: 'mairie', titre: 'Mairie', titreHe: '', heure: true, obligatoire: false },
    { cle: 'chabbat', titre: "Chabbat 'Hatan", titreHe: 'שבת חתן', heure: false, obligatoire: false },
    { cle: 'houppa', titre: 'Houppa', titreHe: 'חופה', heure: true, obligatoire: true },
    { cle: 'reception', titre: 'Réception', titreHe: 'סעודה', heure: true, obligatoire: false },
  ];

  var THEMES = [
    { nom: 'Marbre & Or', slug: 'marbre-or' },
    { nom: 'Botanique sauge', slug: 'botanique-sauge' },
    { nom: 'Nuit étoilée', slug: 'nuit-etoilee' },
    { nom: 'Méditerranée (olivier & citrons)', slug: 'mediterranee' },
    { nom: 'Rosé poudré', slug: 'rose-poudre' },
    { nom: 'Jardin blanc', slug: 'jardin-blanc' },
    { nom: 'Esquisse illustrée', slug: 'esquisse-illustree' },
    { nom: 'Dîner aux chandelles', slug: 'diner-chandelles' },
    { nom: 'Épuré minimaliste', slug: 'epure-minimaliste' },
    { nom: 'Bohème terracotta', slug: 'boheme-terracotta' },
  ];

  var COULEURS = [
    ['Or', '#C9A44C'], ['Blanc cassé', '#F7F3EA'], ['Crème', '#F1E7D3'], ['Ivoire', '#FFFDF4'],
    ['Vert sauge', '#9CAF88'], ['Vert olive', '#6B7A3A'], ['Bleu nuit', '#1B2A4A'], ['Bleu cobalt', '#1F4FA3'],
    ['Rosé poudré', '#E8C4C4'], ['Bordeaux', '#6D1F2F'], ['Taupe', '#8B7D6B'], ['Terracotta', '#C46A45'],
    ['Noir', '#1A1A1A'], ['Blanc', '#FFFFFF'],
  ];

  var VERSETS_PROPOSES = [
    'קול ששון וקול שמחה קול חתן וקול כלה',
    'בסימן טוב ובמזל טוב',
    'מצא אשה מצא טוב',
    'אני לדודי ודודי לי',
    'דודי לי ואני לו',
    'מצאתי את שאהבה נפשי',
    'שימני כחותם על לבך כחותם על זרועך',
    'כי עזה כמוות אהבה',
    'מים רבים לא יוכלו לכבות את האהבה',
    'הנך יפה רעיתי',
    'קומי לך רעיתי יפתי ולכי לך',
    'וארשתיך לי לעולם',
    'ומשוש חתן על כלה ישיש עליך אלהיך',
  ];

  /* ---------------------------------------------------------------- *
   * Brouillon : lecture / ecriture / valeurs par defaut
   * ---------------------------------------------------------------- */

  function brouillonParDefaut() {
    return {
      couple: {
        marie: { prenom: '', nom: '', hebreu: '' },
        mariee: { prenom: '', nom: '', hebreu: '' },
      },
      familles: {
        parentsMarie: '', parentsMariee: '',
        grandsParentsMarie: '', grandsParentsMariee: '',
        memoire: '',
      },
      site: {
        themeSlug: 'marbre-or',
        couleurNom: 'Or',
        verset: VERSETS_PROPOSES[0],
        lien: '',
      },
      // Chaque "groupe" est une carte sur l'invitation finale : un tableau
      // d'une ou plusieurs cles d'evenements. [['houppa']] par defaut (une
      // carte, un evenement). Deposer un groupe sur un autre les fusionne
      // en UN tableau (n'importe quelle paire, pas seulement houppa/reception).
      groupes: [['houppa']],
      evenementsDonnees: {},   // { cle: { date, heure, dateHe, lieu, adresse } }
    };
  }

  /** Toutes les cles presentes, tous groupes confondus, dans l'ordre. */
  function toutesLesCles(brouillon) {
    return brouillon.groupes.reduce(function (a, g) { return a.concat(g); }, []);
  }

  function lireBrouillon() {
    try {
      var brut = window.localStorage.getItem(CLE_STOCKAGE_BROUILLON);
      if (brut) {
        var d = JSON.parse(brut);
        // Fusion defensive : un brouillon plus ancien pourrait manquer un champ
        // si de nouvelles sections sont ajoutees plus tard.
        var def = brouillonParDefaut();
        d.couple = d.couple || def.couple;
        d.familles = d.familles || def.familles;
        d.site = Object.assign({}, def.site, d.site || {});
        if (!Array.isArray(d.groupes) || !d.groupes.length) {
          // Ancien format (ordreEvenements a plat) ou brouillon vide : on migre.
          var plat = Array.isArray(d.ordreEvenements) && d.ordreEvenements.length ? d.ordreEvenements : null;
          d.groupes = plat ? plat.map(function (c) { return [c]; }) : def.groupes;
        }
        delete d.ordreEvenements;
        delete d.fusionnerHouppaReception;
        d.evenementsDonnees = d.evenementsDonnees || {};
        return d;
      }
    } catch (e) { /* ignore */ }
    return brouillonParDefaut();
  }

  function ecrireBrouillon(brouillon) {
    try { window.localStorage.setItem(CLE_STOCKAGE_BROUILLON, JSON.stringify(brouillon)); } catch (e) { /* ignore */ }
  }

  function reinitialiser() {
    try {
      window.localStorage.removeItem(CLE_STOCKAGE_BROUILLON);
      window.localStorage.removeItem(CLE_STOCKAGE_DONNEES);
    } catch (e) { /* ignore */ }
  }

  function infoEvenement(cle) {
    for (var i = 0; i < CATALOGUE.length; i++) if (CATALOGUE[i].cle === cle) return CATALOGUE[i];
    return null;
  }

  /* ---------------------------------------------------------------- *
   * Formatage dates / heures (equivalent cote navigateur de build.mjs)
   * ---------------------------------------------------------------- */

  var FMT_FR = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  function dateFr(isoDate) {
    if (!isoDate) return '';
    var p = isoDate.split('-').map(Number);
    if (p.length !== 3 || !p[0]) return '';
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    var s = FMT_FR.format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function heureFr(hhmm) {
    if (!hhmm) return '';
    var p = hhmm.split(':');
    return p[0] + 'h' + (p[1] || '00');
  }

  function urlMaps(adresse) {
    return adresse ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(adresse) : '';
  }
  function urlWaze(adresse) {
    return adresse ? 'https://waze.com/ul?q=' + encodeURIComponent(adresse) : '';
  }

  /* Conversion heure de Paris -> instant UTC (identique a build.mjs). */
  function decalageMs(ts, tz) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    var p = {};
    dtf.formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ts;
  }
  function parisVersUtc(y, m, d, h, min) {
    var naif = Date.UTC(y, m - 1, d, h, min, 0);
    var ts = naif;
    for (var i = 0; i < 4; i++) {
      var suivant = naif - decalageMs(ts, 'Europe/Paris');
      if (suivant === ts) break;
      ts = suivant;
    }
    return ts;
  }

  /* ---------------------------------------------------------------- *
   * Construction du JSON final (meme forme que le payload de build.mjs)
   * ---------------------------------------------------------------- */

  function construireEvenement(cle, saisie) {
    var def = infoEvenement(cle);
    if (!def || !saisie || !saisie.date) return null;
    return {
      cle: cle,
      titre: def.titre,
      titreHe: def.titreHe,
      dateFr: dateFr(saisie.date),
      dateHe: saisie.dateHe || '',
      heure: def.heure ? heureFr(saisie.heure) : '',
      lieu: saisie.lieu || '',
      adresse: saisie.adresse || '',
      itineraire: urlMaps(saisie.adresse),
      waze: urlWaze(saisie.adresse),
    };
  }

  function construireDonnees(brouillon) {
    var theme = null;
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].slug === brouillon.site.themeSlug) theme = THEMES[i];
    if (!theme) theme = THEMES[0];

    var couleurHex = '#C9A44C';
    for (var j = 0; j < COULEURS.length; j++) if (COULEURS[j][0] === brouillon.site.couleurNom) couleurHex = COULEURS[j][1];

    // groupes : une carte par groupe (1 evenement, ou plusieurs fusionnes).
    // evenements : la meme chose a plat (compat RSVP, compte a rebours, etc.).
    var groupes = brouillon.groupes
      .map(function (groupe) {
        return groupe.map(function (cle) { return construireEvenement(cle, brouillon.evenementsDonnees[cle]); }).filter(Boolean);
      })
      .filter(function (g) { return g.length > 0; });
    var evenements = groupes.reduce(function (a, g) { return a.concat(g); }, []);

    var houppa = evenements.filter(function (e) { return e.cle === 'houppa'; })[0];
    var cible = brouillon.evenementsDonnees.houppa || {};
    var pDate = cible.date ? cible.date.split('-').map(Number) : null;
    var pHeure = cible.heure ? cible.heure.split(':').map(Number) : [0, 0];
    var ts = pDate ? parisVersUtc(pDate[0], pDate[1], pDate[2], pHeure[0] || 0, pHeure[1] || 0) : Date.now();

    return {
      id: 'client',
      genere: new Date().toISOString(),
      couple: brouillon.couple,
      familles: brouillon.familles,
      site: {
        lien: brouillon.site.lien || '',
        theme: theme.nom,
        themeSlug: theme.slug,
        couleurNom: brouillon.site.couleurNom,
        couleurHex: couleurHex,
        verset: brouillon.site.verset || '',
        musique: null,     // pas d'upload audio en v1 (voir notes projet)
        image: null,       // idem pour l'image de couverture
      },
      compteARebours: {
        iso: new Date(ts).toISOString(),
        timestamp: ts,
        fuseau: 'Europe/Paris',
        dateFr: houppa ? houppa.dateFr : '',
        dateHe: houppa ? houppa.dateHe : '',
        heure: houppa ? houppa.heure : '',
      },
      groupes: groupes,
      evenements: evenements,
    };
  }

  return {
    CATALOGUE: CATALOGUE,
    THEMES: THEMES,
    COULEURS: COULEURS,
    VERSETS_PROPOSES: VERSETS_PROPOSES,
    lireBrouillon: lireBrouillon,
    ecrireBrouillon: ecrireBrouillon,
    reinitialiser: reinitialiser,
    infoEvenement: infoEvenement,
    toutesLesCles: toutesLesCles,
    dateFr: dateFr,
    construireDonnees: construireDonnees,
  };
})();
