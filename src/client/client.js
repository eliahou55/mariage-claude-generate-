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
    { nom: 'Méditerranée', slug: 'mediterranee' },
    { nom: 'Rosé poudré', slug: 'rose-poudre' },
    { nom: 'Jardin blanc', slug: 'jardin-blanc' },
    { nom: 'Esquisse illustrée', slug: 'esquisse-illustree' },
    { nom: 'Dîner aux chandelles', slug: 'diner-chandelles' },
    { nom: 'Épuré minimaliste', slug: 'epure-minimaliste' },
    { nom: 'Bohème terracotta', slug: 'boheme-terracotta' },
    { nom: 'Toile de Jouy vert', slug: 'toile-de-jouy-vert' },
    { nom: 'Toile de Jouy bleu', slug: 'toile-de-jouy-bleu' },
  ];

  var COULEURS = [
    ['Or', '#C9A44C'], ['Blanc cassé', '#F7F3EA'], ['Crème', '#F1E7D3'], ['Ivoire', '#FFFDF4'],
    ['Vert sauge', '#9CAF88'], ['Vert olive', '#6B7A3A'], ['Bleu nuit', '#1B2A4A'], ['Bleu cobalt', '#1F4FA3'],
    ['Rosé poudré', '#E8C4C4'], ['Bordeaux', '#6D1F2F'], ['Taupe', '#8B7D6B'], ['Terracotta', '#C46A45'],
    ['Noir', '#1A1A1A'], ['Blanc', '#FFFFFF'],
  ];

  /* Musiques proposees (fichiers dans src/client/musique/, copies tels
   * quels vers dist/client/musique/ par le build). Si le client n'en
   * choisit aucune, MUSIQUE_DEFAUT joue automatiquement. */
  var MUSIQUES = [
    { fichier: 'bereshit-olam.mp3', nom: 'Bereshit Olam — Shlomi Shabbat' },
    { fichier: 'im-eshkakhekh.mp3', nom: 'Im Eshkakhekh — Ben Snouf' },
    { fichier: 'im-eshkachech-yerushalaim.mp3', nom: 'Im Eshkachech Yerouchalaïm' },
    { fichier: 'shaarei-houpa.mp3', nom: "Chaarei Houpa — Ben Snouf" },
    { fichier: 'ishti.mp3', nom: 'Ichti — Maor Edri' },
    { fichier: 'eze-mazal.mp3', nom: 'Eyzé Mazal' },
    { fichier: 'haim-sheli.mp3', nom: 'Haim Cheli — Eden Ben Zaken' },
    { fichier: 'ten-li-tefila.mp3', nom: 'Ten Li Tefila — Shmuel' },
  ];
  var MUSIQUE_DEFAUT = 'bereshit-olam.mp3';

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
   * Prenoms francais -> suggestion(s) d'ecriture en hebreu. Une
   * PROPOSITION seulement (chacun a sa propre facon d'ecrire) : le champ
   * reste vide tant que le client n'a pas clique sur une suggestion.
   * Grande liste (equivalences bibliques/traditionnelles quand elles
   * existent, sinon simple transliteration phonetique -- les deux
   * usages coexistent deja plus bas, ex. "maurice"->Moshe (equivalence)
   * et "charles"->Karl (transliteration) ) : une entree par prenom
   * francais (en minuscules, sans accent), un tableau d'une ou plusieurs
   * graphies hebraiques possibles.
   * ---------------------------------------------------------------- */
  var PRENOMS_HEBREU = {
    // -- masculins (bibliques / traditionnels) --
    david: ['דוד'], ilan: ['אילן'], yonathan: ['יונתן'], jonathan: ['יונתן'],
    avraham: ['אברהם'], abraham: ['אברהם'], isaac: ['יצחק'], itzhak: ['יצחק'],
    jacob: ['יעקב'], yaakov: ['יעקב'], moise: ['משה'], moshe: ['משה'],
    shalom: ['שלום'], chalom: ['שלום'], eliahou: ['אליהו'], elie: ['אליהו'], elias: ['אליהו'],
    simon: ['שמעון'], shimon: ['שמעון'], raphael: ['רפאל'], daniel: ['דניאל'],
    michael: ['מיכאל'], mickael: ['מיכאל'], gabriel: ['גבריאל'],
    nathan: ['נתן'], natan: ['נתן'], samuel: ['שמואל'], shmuel: ['שמואל'],
    joseph: ['יוסף'], yossef: ['יוסף'], yossi: ['יוסי'], benjamin: ['בנימין'],
    haim: ['חיים'], chaim: ['חיים'], meir: ['מאיר'], ariel: ['אריאל'],
    noam: ['נועם'], eytan: ['איתן'], eitan: ['איתן'], ethan: ['איתן'],
    yehouda: ['יהודה'], juda: ['יהודה'], judah: ['יהודה'],
    reuben: ['ראובן'], reouven: ['ראובן'], aaron: ['אהרון'], aharon: ['אהרון'],
    emmanuel: ['עמנואל'], mardochee: ['מרדכי'], mordekhai: ['מרדכי'],
    josue: ['יהושע'], asher: ['אשר'], boaz: ['בועז'], netanel: ['נתנאל'],
    ezra: ['עזרא'], salomon: ['שלמה'], shlomo: ['שלמה'], jeremie: ['ירמיהו'],
    adam: ['אדם'], noe: ['נח'], noah: ['נח'], caleb: ['כלב'], kaleb: ['כלב'],
    elisee: ['אלישע'], ezechiel: ['יחזקאל'], gad: ['גד'], gedeon: ['גדעון'],
    gideon: ['גדעון'], ismael: ['ישמעאל'], jonas: ['יונה'], yona: ['יונה'],
    lazare: ['אליעזר'], eliezer: ['אליעזר'], levi: ['לוי'], malachie: ['מלאכי'],
    nahum: ['נחום'], nessim: ['נסים'], nissim: ['נסים'], osee: ['הושע'],
    samson: ['שמשון'], saul: ['שאול'], shaoul: ['שאול'], seth: ['שת'],
    tobie: ['טוביה'], tobias: ['טוביה'], zacharie: ['זכריה'], zacharia: ['זכריה'],
    baruch: ['ברוך'], yehiel: ['יחיאל'], yoel: ['יואל'], joel: ['יואל'],
    yoram: ['יורם'], yoav: ['יואב'], pinhas: ['פנחס'], pinchas: ['פנחס'],
    zevouloun: ['זבולון'], nephtali: ['נפתלי'], dan: ['דן'], jean: ['יוחנן'],
    leon: ['אריה'], lion: ['אריה'],
    // -- masculins (prenoms francais courants, transliteration phonetique) --
    sacha: ['אלכסנדר'], alexandre: ['אלכסנדר'], charles: ['קרל'],
    albert: ['אברהם'], maurice: ['משה'], andre: ['אנדרה'], henri: ['צבי'],
    robert: ['ראובן'], marcel: ['מרדכי'], jules: ['יהודה'],
    paul: ['פול'], pierre: ['פייר'], georges: ['ז\'ורז\''], bernard: ['ברנאר'],
    gerard: ['ג\'רר'], michel: ['מישל'], patrick: ['פטריק'], stephane: ['סטפן'],
    julien: ['ז\'וליאן'], thomas: ['תומאס'], vincent: ['וינסן'], nicolas: ['ניקולא'],
    philippe: ['פיליפ'], laurent: ['לוראן'], frederic: ['פרדריק'], olivier: ['אוליבייה'],
    claude: ['קלוד'], marc: ['מרק'], luc: ['לוק'], guy: ['גי'], roger: ['רוג\'ה'],
    rene: ['רנה'], armand: ['ארמאן'], edouard: ['אדוארד'], fernand: ['פרנאן'],
    raymond: ['ריימונד'], gilbert: ['ז\'ילבר'], lucien: ['לוסיאן'], maxime: ['מקסים'],
    yves: ['איב'], francois: ['פרנסואה'], felix: ['פליקס'], leo: ['ליאו'],
    oscar: ['אוסקר'], victor: ['ויקטור'], gustave: ['גוסטב'], eugene: ['אוז\'ן'],
    leonard: ['לאונרד'], lucas: ['לוקאס'], hugo: ['הוגו'], liam: ['ליאם'],
    theo: ['תאו'], enzo: ['אנצו'], louis: ['לואי'], tom: ['תום'],
    antoine: ['אנטואן'], maxence: ['מקסנס'], clement: ['קלמנט'], valentin: ['ולנטין'],
    quentin: ['קנטן'], baptiste: ['בטיסט'], jacques: ['יעקב'],
    // -- feminins (bibliques / traditionnels) --
    sarah: ['שרה'], sara: ['שרה'], yael: ['יעל'], jael: ['יעל'],
    rachel: ['רחל'], rebecca: ['רבקה'], rivka: ['רבקה'], myriam: ['מרים'],
    miriam: ['מרים'], marie: ['מרים'], esther: ['אסתר'], hannah: ['חנה'], anna: ['חנה'],
    lea: ['לאה'], noemie: ['נעמי'], naomi: ['נעמי'], dina: ['דינה'],
    tamar: ['תמר'], shira: ['שירה'], abigael: ['אביגיל'], avigail: ['אביגיל'],
    michal: ['מיכל'], ora: ['אורה'], yocheved: ['יוכבד'],
    adina: ['עדינה'], liora: ['ליאורה'], aviva: ['אביבה'], talia: ['טליה'],
    deborah: ['דבורה'], judith: ['יהודית'], yehoudith: ['יהודית'],
    elisheva: ['אלישבע'], simone: ['שמחה'], simha: ['שמחה'],
    estelle: ['אסתר'], jeanne: ['חנה'], paulette: ['פנינה'],
    annette: ['חנה'], germaine: ['גילה'], colette: ['רחל'],
    suzanne: ['שושנה'], fortunee: ['מזל'], blanche: ['לבנה'], zoe: ['חיה'],
    rosette: ['ורדה'], marguerite: ['מרגריט', 'פנינה'],
    // -- feminins (prenoms francais courants, transliteration phonetique) --
    charlotte: ['שרלוט'], sophie: ['סופי'], julie: ['ז\'ולי'], camille: ['קמיל'],
    emma: ['אמה'], chloe: ['קלואה'], nathalie: ['נטלי'], laurence: ['לורנס'],
    sylvie: ['סילבי'], monique: ['מוניק'], danielle: ['דניאלה'], francine: ['פרנסין'],
    nicole: ['ניקול'], josiane: ['ז\'וזיאן'], liliane: ['ליליאן'], arlette: ['ארלט'],
    yvette: ['יבט'], henriette: ['הנרייט'], georgette: ['ז\'ורז\'ט'],
    claire: ['קלייר'], caroline: ['קרולין'], valerie: ['ולרי'], isabelle: ['איזבל'],
    christine: ['קריסטין'], veronique: ['ורוניק'], brigitte: ['בריז\'יט'],
    martine: ['מרטין'], dominique: ['דומיניק'], corinne: ['קורין'], patricia: ['פטרישה'],
    sandrine: ['סנדרין'], celine: ['סלין'], virginie: ['וירז\'יני'], aurelie: ['אורלי'],
    stephanie: ['סטפני'], elodie: ['אלודי'], marion: ['מריון'], clemence: ['קלמנס'],
    leonie: ['לאוני'], lucie: ['לוסי'], odette: ['אודט'], gisele: ['ז\'יזל'],
    renee: ['רנה'], regine: ['רג\'ין'], mireille: ['מיראיי'], michele: ['מישל'],
    nadine: ['נדין'], francoise: ['פרנסואז'], chantal: ['שנטל'], annick: ['אניק'],
    berthe: ['ברת'], alice: ['אליס'], helene: ['הלנה'], yvonne: ['יבון'],
    ines: ['אינס'], jade: ['ג\'ייד'], louise: ['לואיז'], lina: ['לינה'],
    mia: ['מיה'], clara: ['קלרה'], juliette: ['ז\'ולייט'], margaux: ['מרגו'],
  };

  /** Normalise "Déborah", "deborah " etc. pour chercher dans PRENOMS_HEBREU. */
  function normaliserPrenom(texte) {
    return (texte || '')
      .trim()
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');   // retire les accents (diacritiques combinants)
  }

  /** Distance de Levenshtein, pour tolerer une faute de frappe ou une
   *  variante orthographique tres proche d'un prenom connu. */
  function distanceEdition(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var prec = [];
    for (var j = 0; j <= n; j++) prec[j] = j;
    for (var i = 1; i <= m; i++) {
      var cour = [i];
      for (var j2 = 1; j2 <= n; j2++) {
        var cout = a.charAt(i - 1) === b.charAt(j2 - 1) ? 0 : 1;
        cour[j2] = Math.min(prec[j2] + 1, cour[j2 - 1] + 1, prec[j2 - 1] + cout);
      }
      prec = cour;
    }
    return prec[n];
  }

  var CLES_PRENOMS_HEBREU = Object.keys(PRENOMS_HEBREU);

  /** Cherche les correspondances d'UN mot (pas de prenom compose) :
   *  1) correspondance exacte, 2) prefixe partage avec un prenom connu
   *  (remonte des suggestions "en direct" pendant la frappe, et couvre
   *  aussi les diminutifs type "Gabi" -> "Gabriel"), 3) faute de frappe
   *  / variante tres proche (distance d'edition courte). */
  function suggestionsPourMot(mot) {
    var cle = normaliserPrenom(mot);
    if (!cle) return [];
    if (PRENOMS_HEBREU[cle]) return PRENOMS_HEBREU[cle].slice();

    if (cle.length >= 2) {
      var parPrefixe = [];
      CLES_PRENOMS_HEBREU.forEach(function (c) {
        if (parPrefixe.length >= 4) return;
        var correspond = (c.length >= 3 && c.indexOf(cle) === 0) || (cle.length >= 3 && cle.indexOf(c) === 0);
        if (!correspond) return;
        PRENOMS_HEBREU[c].forEach(function (h) { if (parPrefixe.indexOf(h) === -1) parPrefixe.push(h); });
      });
      if (parPrefixe.length) return parPrefixe;
    }

    var meilleure = null, meilleurScore = 3;
    CLES_PRENOMS_HEBREU.forEach(function (c) {
      if (Math.abs(c.length - cle.length) > 2) return;
      var score = distanceEdition(cle, c);
      if (score < meilleurScore) { meilleurScore = score; meilleure = c; }
    });
    return meilleure ? PRENOMS_HEBREU[meilleure].slice() : [];
  }

  /** Prenom compose ("Jean-Claude", "Marie Jeanne") : on cherche chaque
   *  partie separement et on combine (le client assemble lui-meme). */
  function suggestionsHebreu(prenomFrancais) {
    var brut = (prenomFrancais || '').trim();
    if (!brut) return [];
    var parties = brut.split(/[\s-]+/).filter(Boolean);
    if (parties.length > 1) {
      var combine = [];
      parties.forEach(function (p) {
        suggestionsPourMot(p).forEach(function (h) { if (combine.indexOf(h) === -1) combine.push(h); });
      });
      if (combine.length) return combine;
    }
    return suggestionsPourMot(brut);
  }

  /* ---------------------------------------------------------------- *
   * Brouillon : lecture / ecriture / valeurs par defaut
   * ---------------------------------------------------------------- */

  function brouillonParDefaut() {
    return {
      couple: {
        marie: { prenom: '', hebreu: '' },
        mariee: { prenom: '', hebreu: '' },
      },
      familles: {
        parentsMarie: '', parentsMariee: '',
        // Les 4 couples de grands-parents (cote maman / cote papa, de
        // chaque marie) plutot que 2 champs combines -- chacun sa propre
        // ligne sur l'invitation.
        grandsParentsMarieMaman: '', grandsParentsMariePapa: '',
        grandsParentsMarieeMaman: '', grandsParentsMarieePapa: '',
        memoire: '',
      },
      site: {
        // Le theme et la couleur se choisissent desormais sur la page des
        // 12 apercus (etape suivante), pas dans ce formulaire -- ces deux
        // valeurs par defaut restent utilisees en interne (accent par
        // defaut) mais ne sont plus demandees au client.
        themeSlug: 'marbre-or',
        couleurNom: 'Or',
        verset: VERSETS_PROPOSES[0],
        lien: '',
        musique: '',   // vide = MUSIQUE_DEFAUT (Bereshit Olam) a la construction
      },
      // Chaque "groupe" est une carte sur l'invitation finale : un tableau
      // d'une ou plusieurs cles d'evenements. [['houppa']] par defaut (une
      // carte, un evenement). Deposer un groupe sur un autre les fusionne
      // en UN tableau (n'importe quelle paire, pas seulement houppa/reception).
      groupes: [['houppa']],
      evenementsDonnees: {},   // { cle: { date, heure, dateHe, lieu, adresse } }
    };
  }

  /** Brouillon factice complet (couple, familles et les 5 evenements,
   *  houppa+reception fusionnes) pour le bouton "Voir un exemple" de la
   *  page d'accueil -- genere entierement ici, jamais lu depuis l'Excel
   *  (qui contient les vraies donnees d'un client). Permet de visiter
   *  directement la galerie des 12 themes sans remplir le formulaire. */
  function exempleDateHe(iso) {
    if (typeof CalendrierHebreu === 'undefined') return '';
    var p = iso.split('-').map(Number);
    try { return CalendrierHebreu.versHebreu(p[0], p[1], p[2]).texte; } catch (e) { return ''; }
  }

  function exempleBrouillon() {
    return {
      couple: {
        marie: { prenom: 'Ruben', hebreu: 'ראובן' },
        mariee: { prenom: 'Léa', hebreu: 'לאה' },
      },
      familles: {
        parentsMarie: 'M. et Mme Jacques Attali',
        parentsMariee: 'M. et Mme Henri Touitou',
        grandsParentsMarieMaman: 'Papi Simon & Mami Alice',
        grandsParentsMariePapa: 'Papi Max & Mami Rosette',
        grandsParentsMarieeMaman: 'Papi Albert & Mami Suzanne',
        grandsParentsMarieePapa: 'Papi Léon & Mami Paulette',
        memoire: '',
      },
      site: {
        themeSlug: 'marbre-or',
        couleurNom: 'Or',
        verset: VERSETS_PROPOSES[0],
        lien: '',
        musique: '',   // aucune choisie -> MUSIQUE_DEFAUT (Bereshit Olam)
      },
      groupes: [['mairie'], ['henne'], ['houppa', 'reception'], ['chabbat']],
      evenementsDonnees: {
        mairie: { date: '2027-06-15', heure: '10:00', dateHe: exempleDateHe('2027-06-15'), lieu: 'Mairie de Vincennes', adresse: '53 Rue de Fontenay, 94300 Vincennes' },
        henne: { date: '2027-06-17', heure: '20:00', dateHe: exempleDateHe('2027-06-17'), lieu: 'Salle Les Orangers', adresse: '12 Avenue des Palmiers, 94100 Saint-Maur-des-Fossés' },
        houppa: { date: '2027-06-20', heure: '19:00', dateHe: exempleDateHe('2027-06-20'), lieu: 'Domaine de la Roseraie', adresse: '4 Allée des Tilleuls, 78000 Versailles' },
        reception: { date: '2027-06-20', heure: '', dateHe: exempleDateHe('2027-06-20'), lieu: 'Domaine de la Roseraie', adresse: '4 Allée des Tilleuls, 78000 Versailles' },
        chabbat: { date: '2027-06-19', heure: '', dateHe: exempleDateHe('2027-06-19'), lieu: "Synagogue Or 'Haïm", adresse: '8 Rue du Chabbat, 75011 Paris' },
      },
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
        d.familles = Object.assign({}, def.familles, d.familles || {});
        // Ancien format (grands-parents combines en 2 champs) -> on les
        // reverse dans la case "cote maman" des 4 nouveaux champs.
        if (d.familles.grandsParentsMarie && !d.familles.grandsParentsMarieMaman) {
          d.familles.grandsParentsMarieMaman = d.familles.grandsParentsMarie;
        }
        if (d.familles.grandsParentsMariee && !d.familles.grandsParentsMarieeMaman) {
          d.familles.grandsParentsMarieeMaman = d.familles.grandsParentsMariee;
        }
        delete d.familles.grandsParentsMarie;
        delete d.familles.grandsParentsMariee;
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

  function logoChoisi() {
    try {
      var e = JSON.parse(window.localStorage.getItem(CLE_STOCKAGE_LOGO) || 'null');
      return e && e.choisi ? e.choisi : null;
    } catch (err) { return null; }
  }
  function logoDuBrouillon(brouillon) {
    var mode = brouillon.site.logoMode || 'auto';
    if (mode === 'aucun') return 'aucun';
    if (mode === 'perso') return logoChoisi();
    return null;
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
        // Chemin relatif a la racine de dist/, resolu par app.js via
        // BASE + musique (meme mecanisme que medias/<id>_musique.mp3 cote
        // Excel). Aucun choix -> MUSIQUE_DEFAUT (Bereshit Olam) : il y a
        // toujours une musique, jamais de silence par defaut.
        musique: 'client/musique/' + (brouillon.site.musique || MUSIQUE_DEFAUT),
        // Logo : 'aucun', le logo choisi dans le generateur ('perso'), ou
        // null = logo automatique du theme (initiales des maries).
        logo: logoDuBrouillon(brouillon),
        image: null,       // pas d'upload d'image en v1 (voir notes projet)
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
    MUSIQUES: MUSIQUES,
    MUSIQUE_DEFAUT: MUSIQUE_DEFAUT,
    lireBrouillon: lireBrouillon,
    ecrireBrouillon: ecrireBrouillon,
    reinitialiser: reinitialiser,
    infoEvenement: infoEvenement,
    toutesLesCles: toutesLesCles,
    dateFr: dateFr,
    construireDonnees: construireDonnees,
    suggestionsHebreu: suggestionsHebreu,
    exempleBrouillon: exempleBrouillon,
    logoChoisi: logoChoisi,
  };
})();
