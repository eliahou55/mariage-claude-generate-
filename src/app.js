/**
 * Logique commune a tous les themes.
 * Les donnees viennent soit :
 *  - du localStorage (espace client, src/client/*) si l'utilisateur a
 *    configure sa propre invitation dans son navigateur -- prioritaire ;
 *  - sinon du JSON inline genere par scripts/build.mjs depuis l'Excel
 *    (inline plutot que fetch, pour que le site marche aussi en file://).
 */
(function () {
  'use strict';

  var noeudData = document.getElementById('invitation-data');
  var app = document.getElementById('app');
  if (!noeudData || !app) return;

  var origineLocale = false;
  function lireDonnees() {
    try {
      var brut = window.localStorage && window.localStorage.getItem(CLE_STOCKAGE_DONNEES);
      if (brut) { origineLocale = true; return JSON.parse(brut); }
    } catch (e) { /* localStorage indisponible (navigation privee, etc.) -> repli Excel */ }
    return JSON.parse(noeudData.textContent);
  }

  var D = lireDonnees();
  var BASE = app.getAttribute('data-base') || '';
  var motionReduite = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- *
   * Couleur d'accent dynamique (espace client uniquement)
   * Pour l'Excel, --accent/--accent-ink/... sont deja injectes par le
   * build. Pour une invitation configuree dans le navigateur, on les
   * calcule ici contre le --surface deja defini par le theme charge.
   * ---------------------------------------------------------------- */

  function versRgb(hex) {
    var h = hex.replace('#', '');
    return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); });
  }
  function versHex(rgb) {
    return '#' + rgb.map(function (v) {
      return Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }
  function luminance(hex) {
    var c = versRgb(hex).map(function (v) {
      var x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contraste(a, b) {
    var l1 = luminance(a), l2 = luminance(b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function melange(hex, vers, t) {
    var a = versRgb(hex), b = versRgb(vers);
    return versHex(a.map(function (v, i) { return v + (b[i] - v) * t; }));
  }
  function accentLisible(accent, fond, min) {
    if (contraste(accent, fond) >= min) return accent;
    var cible = luminance(fond) > 0.4 ? '#000000' : '#FFFFFF';
    for (var t = 0.04; t <= 1.0001; t += 0.04) {
      var c = melange(accent, cible, t);
      if (contraste(c, fond) >= min) return c;
    }
    return cible;
  }
  function encreSurAccent(accent) {
    return contraste(accent, '#1A1A1A') >= contraste(accent, '#FFFFFF') ? '#1A1A1A' : '#FFFFFF';
  }

  if (origineLocale && D.site && D.site.couleurHex) {
    var styleRacine = getComputedStyle(document.documentElement);
    var surface = (styleRacine.getPropertyValue('--surface') || '#ffffff').trim() || '#ffffff';
    var accent = D.site.couleurHex;
    var encre = accentLisible(accent, surface, 4.5);
    var encreDouce = accentLisible(accent, surface, 3.0);
    var surAccent = encreSurAccent(accent);
    var racine = document.documentElement.style;
    racine.setProperty('--accent', accent);
    racine.setProperty('--accent-ink', encre);
    racine.setProperty('--accent-soft', encreDouce);
    racine.setProperty('--accent-on', surAccent);

    // Sur une page d'apercu, la pastille du bandeau annonce la couleur
    // de l'Excel par defaut : on la recolore avec celle du client.
    var pastille = document.getElementById('apercu-bar-dot');
    if (pastille) pastille.style.background = accent;
  }

  /* ---------------------------------------------------------------- *
   * Petits utilitaires DOM
   * ---------------------------------------------------------------- */

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null && txt !== '') n.textContent = txt;
    return n;
  }

  /** Ornement decoratif (fleurs, feuillages, etoiles...) : span vide,
   *  masque par defaut ; chaque theme active et dessine ceux qu'il veut
   *  (themes/<slug>/orn/*.svg). */
  function orn(mod) {
    var n = el('span', 'orn orn--' + mod);
    n.setAttribute('aria-hidden', 'true');
    return n;
  }
  /** Les 4 coins decoratifs d'un ecran. */
  function coins(parent) {
    ['hg', 'hd', 'bg', 'bd'].forEach(function (c) { parent.appendChild(orn('coin orn--' + c)); });
  }

  /** Bloc de texte hebreu, correctement aligne a droite. */
  function he(tag, cls, txt) {
    var n = el(tag, cls, txt);
    n.setAttribute('dir', 'rtl');
    n.setAttribute('lang', 'he');
    return n;
  }

  /** Un prenom + son nom hebreu juste a cote (en face), au lieu d'une
   *  ligne hebraique separee et commune aux deux maries. */
  function construireNomPersonne(personne) {
    var p = el('span', 'noms__personne');
    p.appendChild(el('span', 'noms__prenom', personne.prenom));
    if (personne.hebreu) p.appendChild(he('span', 'noms__prenom-he', personne.hebreu));
    return p;
  }

  /** "Prenom (+ hebreu) & Prenom (+ hebreu)", reutilise a l'accueil et
   *  en tete de l'invitation -- meme balise/classe racine que l'appelant. */
  function construireNomsCouple(tag, cls) {
    var conteneur = el(tag, cls);
    // Face a face : plus le plus long mot des deux prenoms est long, plus on
    // reduit la taille, pour ne jamais couper un prenom au milieu d'un mot
    // (seuls les traits d'union et les espaces peuvent passer a la ligne).
    var plusLong = (D.couple.marie.prenom + ' ' + D.couple.mariee.prenom)
      .split(/[s-]+/).reduce(function (m, w) { return Math.max(m, w.length); }, 0);
    if (plusLong > 5) conteneur.style.setProperty('--noms-echelle', Math.max(0.45, 5.5 / plusLong).toFixed(3));
    conteneur.appendChild(construireNomPersonne(D.couple.marie));
    conteneur.appendChild(el('span', 'noms__lien', '&'));
    conteneur.appendChild(construireNomPersonne(D.couple.mariee));
    return conteneur;
  }

  /** N'ajoute l'element que si le texte existe (colonne Excel vide -> rien). */
  function ajouteSi(parent, txt, tag, cls, rtl) {
    if (!txt) return null;
    var n = rtl ? he(tag, cls, txt) : el(tag, cls, txt);
    parent.appendChild(n);
    return n;
  }

  function lienBouton(href, libelle, cls) {
    var a = el('a', cls, libelle);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  var prenoms = D.couple.marie.prenom + ' • ' + D.couple.mariee.prenom;

  /** Compteur pour garantir des id de <path> SVG uniques sur la page. */
  var compteurArc = 0;

  /**
   * Phrase hebraique affichee en texte courbe (SVG text-on-path), comme sur
   * les faire-part traditionnels. L'alternative textuelle (sr-only) garde le
   * verset accessible aux lecteurs d'ecran.
   */
  function texteCourbe(texte) {
    if (!texte) return null;
    var NS = 'http://www.w3.org/2000/svg';
    compteurArc += 1;
    var idArc = 'verset-arc-' + compteurArc;

    var wrap = el('div', 'verset-arc-wrap');

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 400 92');
    svg.setAttribute('class', 'verset-arc');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    var path = document.createElementNS(NS, 'path');
    path.setAttribute('id', idArc);
    path.setAttribute('d', 'M14,78 Q200,6 386,78');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);

    // Safari (iPhone, Mac) place mal l'hebreu le long d'une courbe : les
    // lettres sortent dans l'ordre inverse et les mots se melangent. On
    // ecrit donc les lettres deja dans leur ordre visuel (inversees) et on
    // force un trace de gauche a droite : meme rendu correct partout.
    var txt = document.createElementNS(NS, 'text');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('direction', 'ltr');
    txt.setAttribute('unicode-bidi', 'bidi-override');
    txt.setAttribute('class', 'verset-arc__texte');

    var textPath = document.createElementNS(NS, 'textPath');
    textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + idArc);
    textPath.setAttribute('href', '#' + idArc);
    textPath.setAttribute('startOffset', '50%');
    textPath.textContent = Array.from(texte).reverse().join('');
    txt.appendChild(textPath);
    svg.appendChild(txt);

    wrap.appendChild(svg);
    wrap.appendChild(he('p', 'sr-only', texte));   // alternative accessible
    return wrap;
  }

  /* ---------------------------------------------------------------- *
   * Page d'accueil
   * ---------------------------------------------------------------- */

  var refsCompte = {};

  function construireAccueil() {
    var sec = el('section', 'ecran ecran--accueil');
    sec.id = 'accueil';

    coins(sec);
    var inner = el('div', 'accueil__inner');
    sec.appendChild(inner);

    inner.appendChild(he('p', 'bsd', 'בס״ד'));          // בס״ד
    inner.appendChild(orn('haut'));
    inner.appendChild(el('span', 'filet filet--haut'));

    inner.appendChild(construireNomsCouple('h1', 'noms'));

    ajouteSi(inner, D.site.verset, 'p', 'verset', true);
    inner.appendChild(el('span', 'filet filet--bas'));

    ajouteSi(inner, D.compteARebours.dateFr, 'p', 'accueil__date');
    ajouteSi(inner, D.compteARebours.dateHe, 'p', 'accueil__date-he', true);

    inner.appendChild(construireCompteARebours());

    var btn = el('button', 'btn btn--principal', 'Voir l’invitation');
    btn.type = 'button';
    btn.id = 'ouvrir';
    inner.appendChild(btn);
    inner.appendChild(orn('bas'));

    return sec;
  }

  function construireCompteARebours() {
    var zone = el('div', 'compte');

    var grille = el('div', 'compte__grille');
    grille.id = 'compte-grille';
    grille.setAttribute('role', 'timer');
    [['j', 'Jours'], ['h', 'Heures'], ['m', 'Minutes'], ['s', 'Secondes']].forEach(function (p) {
      var cell = el('div', 'compte__cell');
      var n = el('span', 'compte__n', '--');
      var l = el('span', 'compte__l', p[1]);
      cell.appendChild(n);
      cell.appendChild(l);
      grille.appendChild(cell);
      refsCompte[p[0]] = n;
    });
    zone.appendChild(grille);

    var fini = el('p', 'compte__fini', 'Mazal tov !');
    fini.id = 'compte-fini';
    fini.hidden = true;
    zone.appendChild(fini);

    refsCompte.grille = grille;
    refsCompte.fini = fini;
    return zone;
  }

  /* ---------------------------------------------------------------- *
   * Page invitation
   * ---------------------------------------------------------------- */

  function construireInvitation() {
    var sec = el('section', 'ecran ecran--invitation');
    sec.id = 'invitation';
    sec.hidden = true;

    coins(sec);
    var inner = el('div', 'invitation__inner');
    sec.appendChild(inner);
    inner.appendChild(orn('haut'));

    /* 0. Verset d'ouverture, en texte courbe */
    var arcHaut = texteCourbe(VERSETS.aniLedodi);
    if (arcHaut) inner.appendChild(arcHaut);

    /* 1. Parents (hatan a gauche, kala a droite, face a face),
     *    puis grands-parents (plus petit) dans la meme colonne */
    var fam = construireFamilles();
    if (fam) inner.appendChild(fam);

    /* 2. Phrase d'invitation + prenoms */
    inner.appendChild(el('p', 'phrase', 'ont la joie de vous convier au mariage de leurs enfants'));
    inner.appendChild(construireNomsCouple('p', 'invitation__noms'));
    inner.appendChild(orn('sep'));
    inner.appendChild(el('span', 'filet filet--invitation'));

    /* 3. Une carte par groupe (cf. D.groupes), dans l'ordre fourni par les
     *    donnees. Un groupe de plusieurs evenements -> une seule carte. */
    var groupes = (D.groupes && D.groupes.length) ? D.groupes : D.evenements.map(function (e) { return [e]; });
    var liste = el('div', 'evenements');
    groupes.forEach(function (groupe) {
      var carte = carteGroupe(groupe);
      carte.insertBefore(orn('event'), carte.firstChild);
      liste.appendChild(carte);
    });
    inner.appendChild(liste);

    /* 4. Confirmation de presence (fictive : rien n'est envoye nulle part) */
    var rsvp = construireRSVP();
    if (rsvp) inner.appendChild(rsvp);

    /* 5. Pied de page */
    inner.appendChild(orn('sep'));
    inner.appendChild(el('span', 'filet filet--invitation'));
    inner.appendChild(he('p', 'mazal', 'מזל טוב'));   // מזל טוב

    return sec;
  }

  /** Colonnes hatan/kala (parents + grands-parents), reutilisees en haut
   *  de l'invitation et dans la carte houppa. Retourne null si tout est vide. */
  function construireFamilles() {
    var fam = el('div', 'familles');
    var colHatan = el('div', 'familles__col familles__col--hatan');
    ajouteSi(colHatan, D.familles.parentsMarie, 'p', 'familles__parents');
    ajouteSi(colHatan, D.familles.grandsParentsMarieMaman, 'p', 'familles__gp');
    ajouteSi(colHatan, D.familles.grandsParentsMariePapa, 'p', 'familles__gp');
    var colKala = el('div', 'familles__col familles__col--kala');
    ajouteSi(colKala, D.familles.parentsMariee, 'p', 'familles__parents');
    ajouteSi(colKala, D.familles.grandsParentsMarieeMaman, 'p', 'familles__gp');
    ajouteSi(colKala, D.familles.grandsParentsMarieePapa, 'p', 'familles__gp');
    if (colHatan.childNodes.length) fam.appendChild(colHatan);
    if (colKala.childNodes.length) fam.appendChild(colKala);
    return fam.childNodes.length ? fam : null;
  }

  /** N'ajoute la ligne que si le texte deja construit n'est pas vide. */
  function ligneSi(parent, txt, cls, rtl) {
    if (!txt) return;
    parent.appendChild(rtl ? he('p', cls, txt) : el('p', cls, txt));
  }

  /** Une carte par groupe (cf. D.groupes). Un seul evenement -> dispatch
   *  habituel ; houppa+reception ensemble -> le recit narratif ; toute
   *  autre combinaison -> une carte generique qui empile chaque evenement. */
  function carteGroupe(groupe) {
    if (groupe.length === 1) return carteEvenement(groupe[0]);
    var houppaEv = groupe.filter(function (e) { return e.cle === 'houppa'; })[0];
    var receptionEv = groupe.filter(function (e) { return e.cle === 'reception'; })[0];
    if (groupe.length === 2 && houppaEv && receptionEv) return carteHouppa(houppaEv, receptionEv);
    return carteMultiple(groupe);
  }

  function carteEvenement(ev) {
    if (ev.cle === 'mairie') return carteMairie(ev);
    if (ev.cle === 'houppa') return carteHouppa(ev, null);
    return carteSimple(ev);
  }

  /** Contenu "sobre" (icone, date/heure, lieu/adresse, actions) commun a
   *  Henne/Chabbat/Reception -- reutilise tel quel par carteMultiple. */
  function remplirContenuSimple(container, ev) {
    var head = el('header', 'event__head');
    var titres = el('div', 'event__titres');
    titres.appendChild(el('h2', 'event__titre', ev.titre));
    // Pas de traduction hebraique sous "Henne" (demande client).
    if (ev.titreHe && ev.cle !== 'henne') titres.appendChild(he('p', 'event__titre-he', ev.titreHe));
    head.appendChild(titres);
    container.appendChild(head);

    container.appendChild(el('span', 'event__filet'));

    // Une phrase, puis date (mise en avant), lieu et adresse a la ligne.
    var texte = el('div', 'event__texte');
    ajouteSi(texte, PHRASES[ev.cle] || '', 'p', 'event__phrase');
    lignesDate(texte, ev);
    ajouteSi(texte, ev.dateHe, 'p', 'event__date-he', true);
    ajouteSi(texte, ev.lieu, 'p', 'event__lieu');
    ajouteSi(texte, ev.adresse, 'p', 'event__adresse');
    container.appendChild(texte);

    ajouteActions(container, ev);
  }

  /** Phrase d'annonce de chaque evenement (cartes simples). */
  var PHRASES = {
    henne: 'Nous aurons la joie de vous recevoir pour la soirée du henné',
    chabbat: "Nous serons heureux de vous accueillir pour le Chabbat 'Hatan",
    reception: 'Nous vous attendons pour la réception, qui se tiendra',
    mairie: 'Le mariage civil sera célébré',
    houppa: 'La cérémonie religieuse sera célébrée',
  };

  /** Date puis heure, chacune sur sa ligne, mises en evidence. */
  function lignesDate(parent, ev) {
    ligneSi(parent, ev.dateFr, 'date-phare');
    if (ev.heure) ligneSi(parent, 'à ' + ev.heure, 'heure-phare');
  }

  /** Henne, Chabbat 'Hatan, Reception (seuls) : carte sobre. */
  function carteSimple(ev) {
    var art = el('article', 'event event--' + ev.cle);
    remplirContenuSimple(art, ev);
    return art;
  }

  /** N'importe quelle autre combinaison fusionnee par le client (ex. Henne
   *  + Mairie) : une seule carte qui empile chaque evenement, separes par
   *  un filet, dans l'ordre choisi. */
  function carteMultiple(groupe) {
    var art = el('article', 'event event--multiple');
    groupe.forEach(function (ev, i) {
      if (i > 0) art.appendChild(el('span', 'event__filet event__filet--groupe'));
      var section = el('div', 'event__membre');
      remplirContenuSimple(section, ev);
      art.appendChild(section);
    });
    return art;
  }

  /** Mairie : recit centre "La Mairie / prenoms / se diront / Oui / ...". */
  function carteMairie(ev) {
    var art = el('article', 'event event--mairie event--recit');
    var recit = el('div', 'recit');

    recit.appendChild(el('p', 'recit__kicker', 'La Mairie'));

    var noms = el('p', 'recit__noms');
    noms.appendChild(el('span', null, D.couple.marie.prenom));
    noms.appendChild(el('span', 'recit__esperluette', '&'));
    noms.appendChild(el('span', null, D.couple.mariee.prenom));
    recit.appendChild(noms);

    recit.appendChild(el('p', 'recit__se-diront', 'se diront'));
    recit.appendChild(el('p', 'recit__oui', 'Oui'));

    var det = el('div', 'recit__details');
    lignesDate(det, ev);
    ligneSi(det, ev.lieu, 'recit__lieu');
    ligneSi(det, ev.adresse, 'recit__adresse');
    recit.appendChild(det);

    art.appendChild(recit);
    ajouteActions(art, ev);
    return art;
  }

  /** Houppa : rappel des familles, phrase d'annonce, prenoms+hebreu,
   *  puis ceremonie religieuse (date/date hebraique/heure/lieu/adresse),
   *  et enfin la memoire des grands-parents si l'Excel la renseigne. */
  function carteHouppa(ev, reception) {
    var art = el('article', 'event event--houppa event--recit');
    var recit = el('div', 'recit');

    var arcHoup = texteCourbe(VERSETS.oumssossHatan);
    if (arcHoup) recit.appendChild(arcHoup);

    var fam = construireFamilles();
    if (fam) { fam.classList.add('recit__familles'); recit.appendChild(fam); }

    recit.appendChild(el('p', 'recit__intro', "Ont l'immense joie de vous faire part du mariage de leurs petits-enfants et enfants :"));

    var couple = el('div', 'recit__couple');
    var pMarie = el('div', 'recit__personne');
    pMarie.appendChild(el('p', 'recit__personne-nom', D.couple.marie.prenom));
    if (D.couple.marie.hebreu) pMarie.appendChild(he('p', 'recit__personne-he', D.couple.marie.hebreu));
    couple.appendChild(pMarie);
    couple.appendChild(el('span', 'recit__esperluette recit__esperluette--couple', '&'));
    var pMariee = el('div', 'recit__personne');
    pMariee.appendChild(el('p', 'recit__personne-nom', D.couple.mariee.prenom));
    if (D.couple.mariee.hebreu) pMariee.appendChild(he('p', 'recit__personne-he', D.couple.mariee.hebreu));
    couple.appendChild(pMariee);
    recit.appendChild(couple);

    recit.appendChild(el('p', 'recit__intro', 'Et seraient honorés de votre présence à la cérémonie religieuse qui sera célébrée le'));

    var det = el('div', 'recit__details');
    lignesDate(det, ev);
    ligneSi(det, ev.dateHe, 'recit__date-he', true);
    ligneSi(det, ev.lieu, 'recit__lieu');
    ligneSi(det, ev.adresse, 'recit__adresse');
    recit.appendChild(det);

    if (D.familles.memoire) {
      var mem = el('div', 'recit__memoire');
      mem.appendChild(el('p', 'recit__memoire-intro', 'En ce jour solennel, nous avons une pensée émue pour la mémoire bénie de nos grands-parents.'));
      D.familles.memoire.split(/\r?\n|;/).map(function (s) { return s.trim(); }).filter(Boolean)
        .forEach(function (nom) { mem.appendChild(el('p', 'recit__memoire-nom', nom)); });
      recit.appendChild(mem);
    }

    /* Si la houppa et la reception sont dans le meme groupe (fusionnees
     * par le client, ou comportement historique de l'Excel), la reception
     * n'a pas sa propre carte : elle est annoncee ici, a la suite de la
     * houppa (meme lieu la plupart du temps -> pas besoin de repeter
     * l'adresse ni les boutons). */
    if (reception) {
      var memeLieu = reception.lieu && reception.lieu === ev.lieu;
      var phrase = "La cérémonie sera suivie d'une réception";
      if (reception.heure) phrase += ' à ' + reception.heure;
      phrase += '.';
      ligneSi(recit, phrase, 'recit__suite');
      if (reception.lieu && !memeLieu) ligneSi(recit, reception.lieu, 'recit__suite-lieu');
      if (reception.adresse && reception.adresse !== ev.adresse) {
        ligneSi(recit, reception.adresse, 'recit__suite-adresse');
      }
    }

    art.appendChild(recit);
    ajouteActions(art, ev);

    if (reception && reception.lieu && reception.lieu !== ev.lieu && (reception.itineraire || reception.waze)) {
      var actionsReception = el('div', 'event__actions event__actions--reception');
      if (reception.itineraire) actionsReception.appendChild(lienBouton(reception.itineraire, 'Itinéraire réception', 'btn btn--carte'));
      if (reception.waze) actionsReception.appendChild(lienBouton(reception.waze, 'Waze réception', 'btn btn--carte btn--waze'));
      art.appendChild(actionsReception);
    }

    return art;
  }

  function ajouteActions(art, ev) {
    if (!ev.itineraire && !ev.waze) return;
    var actions = el('div', 'event__actions');
    if (ev.itineraire) actions.appendChild(lienBouton(ev.itineraire, 'Itinéraire', 'btn btn--carte'));
    if (ev.waze) actions.appendChild(lienBouton(ev.waze, 'Waze', 'btn btn--carte btn--waze'));
    art.appendChild(actions);
  }

  /* ---------------------------------------------------------------- *
   * Confirmation de presence (RSVP)
   * Fictif pour l'instant : "Envoyer" ne transmet nulle part, affiche
   * juste un message de remerciement cote client.
   * ---------------------------------------------------------------- */

  function champTexte(id, libelle, type, opts) {
    opts = opts || {};
    var champ = el('div', 'rsvp__champ');
    var label = el('label', null);
    label.setAttribute('for', id);
    label.appendChild(document.createTextNode(libelle));
    if (opts.requis) label.appendChild(el('span', 'rsvp__requis', ' *'));
    champ.appendChild(label);

    var input = el(type === 'textarea' ? 'textarea' : 'input', null);
    input.id = id;
    input.name = id;
    if (type !== 'textarea') input.type = type;
    if (opts.requis) input.required = true;
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.min != null) input.min = opts.min;
    if (opts.autocomplete) input.autocomplete = opts.autocomplete;
    if (type === 'number') input.inputMode = 'numeric';
    if (type === 'textarea') input.rows = 3;
    champ.appendChild(input);

    return { champ: champ, input: input };
  }

  /** Case a cocher (ou radio) avec son libelle, pour les sections presence. */
  function caseRsvp(type, name, id, libelle) {
    var label = el('label', 'rsvp__case');
    var input = el('input', null);
    input.type = type;
    input.name = name;
    input.id = id;
    label.appendChild(input);
    label.appendChild(document.createTextNode(libelle));
    return { label: label, input: input };
  }

  /** Affiche/masque le champ "nombre de personnes" selon la case cochee,
   *  et bascule son caractere requis en consequence (champ cache = non
   *  requis, pour ne jamais bloquer l'envoi sur un champ invisible). */
  function brancherNombre(declencheurs, oui, champ, input) {
    function maj() {
      var visible = oui.checked;
      champ.hidden = !visible;
      input.required = visible;
      if (!visible) input.value = '';
    }
    declencheurs.forEach(function (d) { d.addEventListener('change', maj); });
    maj();
  }

  function construireRSVP() {
    var mairie = D.evenements.filter(function (e) { return e.cle === 'mairie'; })[0];
    var houppa = D.evenements.filter(function (e) { return e.cle === 'houppa'; })[0];
    var aReception = D.evenements.some(function (e) { return e.cle === 'reception'; });
    var libelleHouppa = aReception ? 'la houppa & réception' : 'la houppa';
    if (!houppa) return null;   // la houppa est obligatoire dans l'Excel

    var section = el('section', 'rsvp');
    section.setAttribute('aria-labelledby', 'rsvp-titre');

    section.appendChild(el('h2', 'rsvp__titre', 'Confirmation de présence'));
    section.appendChild(el('span', 'filet'));

    var form = el('form', 'rsvp__form');
    form.setAttribute('novalidate', '');
    section.appendChild(form);

    var prenom = champTexte('rsvp-prenom', 'Prénom', 'text', { requis: true, autocomplete: 'given-name' });
    form.appendChild(prenom.champ);
    var nom = champTexte('rsvp-nom', 'Nom de famille', 'text', { requis: true, autocomplete: 'family-name' });
    form.appendChild(nom.champ);

    /* --- Mairie : une seule case, replie/deplie son champ nombre --- */
    if (mairie) {
      var fsMairie = el('fieldset', 'rsvp__section');
      fsMairie.appendChild(el('legend', null, 'À la mairie - ' + mairie.dateFr));
      var caseMairie = caseRsvp('checkbox', 'rsvp-mairie-presence', 'rsvp-mairie-oui', 'Assisteront à la mairie');
      fsMairie.appendChild(caseMairie.label);
      var nbMairie = champTexte('rsvp-mairie-nombre', 'Nombre de personnes à la mairie', 'number', { requis: true, min: 1 });
      nbMairie.champ.classList.add('rsvp__champ--nombre');
      fsMairie.appendChild(nbMairie.champ);
      brancherNombre([caseMairie.input], caseMairie.input, nbMairie.champ, nbMairie.input);
      form.appendChild(fsMairie);
    }

    /* --- Houppa (& reception si presente) : choix oui/non, champ nombre repliable --- */
    var fsHouppa = el('fieldset', 'rsvp__section');
    fsHouppa.appendChild(el('legend', null, 'À ' + libelleHouppa + ' - ' + houppa.dateFr));
    var ouiHouppa = caseRsvp('radio', 'rsvp-houppa-presence', 'rsvp-houppa-oui', 'Assisteront à ' + libelleHouppa);
    var nonHouppa = caseRsvp('radio', 'rsvp-houppa-presence', 'rsvp-houppa-non', "N'assisteront pas" + (aReception ? ' à la réception' : ''));
    fsHouppa.appendChild(ouiHouppa.label);
    fsHouppa.appendChild(nonHouppa.label);
    var nbHouppa = champTexte('rsvp-houppa-nombre', 'Nombre de personnes à ' + libelleHouppa, 'number', { requis: true, min: 1 });
    nbHouppa.champ.classList.add('rsvp__champ--nombre');
    fsHouppa.appendChild(nbHouppa.champ);
    brancherNombre([ouiHouppa.input, nonHouppa.input], ouiHouppa.input, nbHouppa.champ, nbHouppa.input);
    form.appendChild(fsHouppa);

    var mot = champTexte('rsvp-mot', 'Un mot pour les mariés', 'textarea', { placeholder: 'Mazal tov !' });
    form.appendChild(mot.champ);

    var envoyer = el('button', 'btn btn--principal rsvp__envoyer', 'Envoyer');
    envoyer.type = 'submit';
    form.appendChild(envoyer);

    var merci = el('p', 'rsvp__merci', 'Merci ! Votre réponse a bien été enregistrée.');
    merci.hidden = true;
    section.appendChild(merci);

    // Fictif : aucune donnee n'est transmise nulle part, juste un retour visuel.
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      form.hidden = true;
      merci.hidden = false;
    });

    return section;
  }

  /* ---------------------------------------------------------------- *
   * Musique
   * ---------------------------------------------------------------- */

  var audio = null;
  var boutonSon = null;
  var libelleSon = null;

  function construireAudio() {
    if (!D.site.musique) return;

    audio = document.createElement('audio');
    audio.id = 'musique';
    audio.loop = true;
    audio.preload = 'auto';
    audio.src = /^https?:/i.test(D.site.musique) ? D.site.musique : BASE + D.site.musique;
    document.body.appendChild(audio);

    boutonSon = el('button', 'son');
    boutonSon.type = 'button';
    boutonSon.id = 'son';
    boutonSon.hidden = true;
    boutonSon.setAttribute('aria-pressed', 'false');

    var icone = el('span', 'son__icone');
    icone.setAttribute('aria-hidden', 'true');
    icone.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M11 5 6 9H3v6h3l5 4z"/>' +
      '<g class="son__ondes"><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a9 9 0 0 1 0 12"/></g>' +
      '<line class="son__barre" x1="16" y1="9" x2="22" y2="15"/>' +
      '<line class="son__barre" x1="22" y1="9" x2="16" y2="15"/>' +
      '</svg>';
    boutonSon.appendChild(icone);

    libelleSon = el('span', 'sr-only', 'Couper le son');
    boutonSon.appendChild(libelleSon);
    document.body.appendChild(boutonSon);

    boutonSon.addEventListener('click', function () {
      if (audio.paused) {
        var p = audio.play();
        if (p && p.then) p.then(function () { etatSon(true); }, function () { etatSon(false); });
        else etatSon(true);
      } else {
        audio.pause();
        etatSon(false);
      }
    });

    // Si la piste est introuvable (404), on retire le bouton plutot que de mentir.
    audio.addEventListener('error', function () {
      if (boutonSon) boutonSon.hidden = true;
    });
  }

  function etatSon(actif) {
    if (!boutonSon) return;
    boutonSon.setAttribute('aria-pressed', actif ? 'true' : 'false');
    boutonSon.classList.toggle('son--coupe', !actif);
    if (libelleSon) libelleSon.textContent = actif ? 'Couper le son' : 'Activer le son';
  }

  /* ---------------------------------------------------------------- *
   * Navigation accueil -> invitation
   * ---------------------------------------------------------------- */

  var ouvert = false;

  function ouvrirInvitation(accueil, invitation) {
    if (ouvert) return;
    ouvert = true;

    document.body.classList.add('est-ouvert');
    invitation.hidden = false;
    accueil.classList.add('ecran--sort');

    requestAnimationFrame(function () { invitation.classList.add('ecran--entre'); });

    var finir = function () {
      accueil.hidden = true;
      window.scrollTo(0, 0);
      if (boutonSon) boutonSon.hidden = false;
      var premier = invitation.querySelector('h2, p');
      if (premier) { premier.setAttribute('tabindex', '-1'); premier.focus({ preventScroll: true }); }
    };
    if (motionReduite) finir();
    else window.setTimeout(finir, 560);
  }

  /* ---------------------------------------------------------------- *
   * Compte a rebours (instant absolu calcule a Paris au build)
   * ---------------------------------------------------------------- */

  function demarrerCompteARebours() {
    var cible = D.compteARebours.timestamp;
    if (!cible) return;

    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var timer = null;

    function tic() {
      var reste = cible - Date.now();
      if (reste <= 0) {
        refsCompte.grille.hidden = true;
        refsCompte.fini.hidden = false;
        if (timer) window.clearInterval(timer);
        return;
      }
      var s = Math.floor(reste / 1000);
      refsCompte.j.textContent = String(Math.floor(s / 86400));
      refsCompte.h.textContent = pad(Math.floor(s / 3600) % 24);
      refsCompte.m.textContent = pad(Math.floor(s / 60) % 60);
      refsCompte.s.textContent = pad(s % 60);
    }

    tic();
    timer = window.setInterval(tic, 1000);
  }

  /* ---------------------------------------------------------------- *
   * Demarrage
   * ---------------------------------------------------------------- */

  var accueil = construireAccueil();
  var invitation = construireInvitation();
  app.appendChild(accueil);
  app.appendChild(invitation);
  construireAudio();
  demarrerCompteARebours();

  document.getElementById('ouvrir').addEventListener('click', function () {
    // CRITIQUE iOS/Safari : play() doit etre appele EN PREMIER, de facon
    // synchrone dans le gestionnaire du geste. Aucun await / setTimeout avant.
    if (audio) {
      try {
        var p = audio.play();
        if (p && p.then) p.then(function () { etatSon(true); }, function () { etatSon(false); });
        else etatSon(true);
      } catch (e) {
        etatSon(false);
      }
    }
    // Seulement ensuite : animation d'ouverture et affichage de l'invitation.
    ouvrirInvitation(accueil, invitation);
  });

  document.documentElement.classList.add('pret');
})();
