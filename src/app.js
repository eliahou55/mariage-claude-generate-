/**
 * Logique commune a tous les themes.
 * Les donnees viennent du JSON inline genere par scripts/build.mjs
 * (inline plutot que fetch, pour que le site marche aussi en file://).
 */
(function () {
  'use strict';

  var noeudData = document.getElementById('invitation-data');
  var app = document.getElementById('app');
  if (!noeudData || !app) return;

  var D = JSON.parse(noeudData.textContent);
  var BASE = app.getAttribute('data-base') || '';
  var motionReduite = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- *
   * Petits utilitaires DOM
   * ---------------------------------------------------------------- */

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null && txt !== '') n.textContent = txt;
    return n;
  }

  /** Bloc de texte hebreu, correctement aligne a droite. */
  function he(tag, cls, txt) {
    var n = el(tag, cls, txt);
    n.setAttribute('dir', 'rtl');
    n.setAttribute('lang', 'he');
    return n;
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

    var txt = document.createElementNS(NS, 'text');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('direction', 'rtl');
    txt.setAttribute('class', 'verset-arc__texte');

    var textPath = document.createElementNS(NS, 'textPath');
    textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + idArc);
    textPath.setAttribute('href', '#' + idArc);
    textPath.setAttribute('startOffset', '50%');
    textPath.textContent = texte;
    txt.appendChild(textPath);
    svg.appendChild(txt);

    wrap.appendChild(svg);
    wrap.appendChild(he('p', 'sr-only', texte));   // alternative accessible
    return wrap;
  }

  /** Petites icones au trait (24x24, currentColor) : une par type d'evenement. */
  var ICONES = {
    henne:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><circle cx="12" cy="7.3" r="2.5"/><circle cx="16.6" cy="10.2" r="2.5"/><circle cx="14.8" cy="15.4" r="2.5"/><circle cx="9.2" cy="15.4" r="2.5"/><circle cx="7.4" cy="10.2" r="2.5"/><circle cx="12" cy="11.3" r="1.6" fill="currentColor" stroke="none"/></svg>',
    mairie:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10 12 4l8 6"/><path d="M5 10v9M9.4 10v9M12 10v9M14.6 10v9M19 10v9"/><path d="M3 19h18"/></svg>',
    chabbat:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20v-8M15 20v-8"/><path d="M9 20H6M18 20h-3"/><ellipse cx="9" cy="9.1" rx="1.3" ry="1.9" fill="currentColor" stroke="none"/><ellipse cx="15" cy="9.1" rx="1.3" ry="1.9" fill="currentColor" stroke="none"/></svg>',
    houppa:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V9M19 20V9"/><path d="M3 9c2.2-2.7 15.8-2.7 18 0"/><path d="M3 9c2.2 1.6 15.8 1.6 18 0"/></svg>',
    reception:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10l-1.3 7.1a3.7 3.7 0 0 1-3.7 3.1V17"/><path d="M12 17v3M9 20h6"/></svg>',
  };

  /* ---------------------------------------------------------------- *
   * Page d'accueil
   * ---------------------------------------------------------------- */

  var refsCompte = {};

  function construireAccueil() {
    var sec = el('section', 'ecran ecran--accueil');
    sec.id = 'accueil';

    var inner = el('div', 'accueil__inner');
    sec.appendChild(inner);

    inner.appendChild(he('p', 'bsd', 'בס״ד'));          // בס״ד
    inner.appendChild(el('span', 'filet filet--haut'));

    var titre = el('h1', 'noms');
    titre.appendChild(el('span', 'noms__prenom', D.couple.marie.prenom));
    titre.appendChild(el('span', 'noms__lien', '&'));
    titre.appendChild(el('span', 'noms__prenom', D.couple.mariee.prenom));
    inner.appendChild(titre);

    if (D.couple.marie.hebreu || D.couple.mariee.hebreu) {
      var nh = he('p', 'noms-he');
      if (D.couple.marie.hebreu) nh.appendChild(el('span', null, D.couple.marie.hebreu));
      if (D.couple.marie.hebreu && D.couple.mariee.hebreu) nh.appendChild(el('span', 'noms-he__sep', '•'));
      if (D.couple.mariee.hebreu) nh.appendChild(el('span', null, D.couple.mariee.hebreu));
      inner.appendChild(nh);
    }

    ajouteSi(inner, D.site.verset, 'p', 'verset', true);
    inner.appendChild(el('span', 'filet filet--bas'));

    ajouteSi(inner, D.compteARebours.dateFr, 'p', 'accueil__date');
    ajouteSi(inner, D.compteARebours.dateHe, 'p', 'accueil__date-he', true);

    inner.appendChild(construireCompteARebours());

    var btn = el('button', 'btn btn--principal', 'Voir l’invitation');
    btn.type = 'button';
    btn.id = 'ouvrir';
    inner.appendChild(btn);

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

    var inner = el('div', 'invitation__inner');
    sec.appendChild(inner);

    /* 0. Verset d'ouverture, en texte courbe */
    var arcHaut = texteCourbe(VERSETS.aniLedodi);
    if (arcHaut) inner.appendChild(arcHaut);

    /* 1. Parents (hatan a gauche, kala a droite, face a face),
     *    puis grands-parents (plus petit) dans la meme colonne */
    var fam = construireFamilles();
    if (fam) inner.appendChild(fam);

    /* 2. Phrase d'invitation + prenoms */
    inner.appendChild(el('p', 'phrase', 'ont la joie de vous convier au mariage de leurs enfants'));
    var h2 = el('p', 'invitation__noms');
    h2.appendChild(el('span', 'noms__prenom', D.couple.marie.prenom));
    h2.appendChild(el('span', 'noms__lien', '&'));
    h2.appendChild(el('span', 'noms__prenom', D.couple.mariee.prenom));
    inner.appendChild(h2);
    inner.appendChild(el('span', 'filet filet--invitation'));

    /* 3. Une carte par evenement (Chabbat 'Hatan toujours en dernier, deja
     *    reordonne par le build). La reception est fusionnee dans la carte
     *    houppa (pas de carte separee) : on la retire de la boucle ici. */
    var liste = el('div', 'evenements');
    D.evenements
      .filter(function (ev) { return ev.cle !== 'reception'; })
      .forEach(function (ev) { liste.appendChild(carteEvenement(ev)); });
    inner.appendChild(liste);

    /* 4. Pied de page */
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
    ajouteSi(colHatan, D.familles.grandsParentsMarie, 'p', 'familles__gp');
    var colKala = el('div', 'familles__col familles__col--kala');
    ajouteSi(colKala, D.familles.parentsMariee, 'p', 'familles__parents');
    ajouteSi(colKala, D.familles.grandsParentsMariee, 'p', 'familles__gp');
    if (colHatan.childNodes.length) fam.appendChild(colHatan);
    if (colKala.childNodes.length) fam.appendChild(colKala);
    return fam.childNodes.length ? fam : null;
  }

  /** N'ajoute la ligne que si le texte deja construit n'est pas vide. */
  function ligneSi(parent, txt, cls, rtl) {
    if (!txt) return;
    parent.appendChild(rtl ? he('p', cls, txt) : el('p', cls, txt));
  }

  function carteEvenement(ev) {
    if (ev.cle === 'mairie') return carteMairie(ev);
    if (ev.cle === 'houppa') return carteHouppa(ev);
    return carteSimple(ev);
  }

  /** Henne, Chabbat 'Hatan, Reception : carte sobre, icone + infos pratiques. */
  function carteSimple(ev) {
    var art = el('article', 'event event--' + ev.cle);

    var head = el('header', 'event__head');
    var icone = el('span', 'event__icon');
    icone.setAttribute('aria-hidden', 'true');
    icone.innerHTML = ICONES[ev.cle] || '';
    head.appendChild(icone);
    var titres = el('div', 'event__titres');
    titres.appendChild(el('h2', 'event__titre', ev.titre));
    if (ev.titreHe) titres.appendChild(he('p', 'event__titre-he', ev.titreHe));
    head.appendChild(titres);
    art.appendChild(head);

    art.appendChild(el('span', 'event__filet'));

    var quand = el('div', 'event__quand');
    ajouteSi(quand, ev.dateFr, 'p', 'event__date');
    ajouteSi(quand, ev.dateHe, 'p', 'event__date-he', true);
    ajouteSi(quand, ev.heure, 'p', 'event__heure');   // absent pour Chabbat 'Hatan
    art.appendChild(quand);

    var ou = el('div', 'event__ou');
    ajouteSi(ou, ev.lieu, 'p', 'event__lieu');
    ajouteSi(ou, ev.adresse, 'p', 'event__adresse');
    art.appendChild(ou);

    ajouteActions(art, ev);
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
    if (ev.lieu) ligneSi(det, 'à la ' + ev.lieu);
    ligneSi(det, ev.adresse);
    if (ev.dateFr) ligneSi(det, 'le ' + ev.dateFr);
    if (ev.heure) ligneSi(det, 'à ' + ev.heure);
    recit.appendChild(det);

    art.appendChild(recit);
    ajouteActions(art, ev);
    return art;
  }

  /** Houppa : rappel des familles, phrase d'annonce, prenoms+hebreu,
   *  puis ceremonie religieuse (date/date hebraique/heure/lieu/adresse),
   *  et enfin la memoire des grands-parents si l'Excel la renseigne. */
  function carteHouppa(ev) {
    var art = el('article', 'event event--houppa event--recit');
    var recit = el('div', 'recit');

    var arcHoup = texteCourbe(VERSETS.oumssossHatan);
    if (arcHoup) recit.appendChild(arcHoup);

    var fam = construireFamilles();
    if (fam) { fam.classList.add('recit__familles'); recit.appendChild(fam); }

    recit.appendChild(el('p', 'recit__intro', "Ont l'immense joie de vous faire part du mariage de leurs petits-enfants et enfants :"));

    var couple = el('div', 'recit__couple');
    var pMarie = el('div', 'recit__personne');
    pMarie.appendChild(el('p', 'recit__personne-nom', D.couple.marie.prenom + ' ' + D.couple.marie.nom));
    if (D.couple.marie.hebreu) pMarie.appendChild(he('p', 'recit__personne-he', D.couple.marie.hebreu));
    couple.appendChild(pMarie);
    couple.appendChild(el('span', 'recit__esperluette recit__esperluette--couple', '&'));
    var pMariee = el('div', 'recit__personne');
    pMariee.appendChild(el('p', 'recit__personne-nom', D.couple.mariee.prenom + ' ' + D.couple.mariee.nom));
    if (D.couple.mariee.hebreu) pMariee.appendChild(he('p', 'recit__personne-he', D.couple.mariee.hebreu));
    couple.appendChild(pMariee);
    recit.appendChild(couple);

    recit.appendChild(el('p', 'recit__intro', 'Et seraient honorés de votre présence à la cérémonie religieuse qui sera célébrée le'));

    var det = el('div', 'recit__details');
    ligneSi(det, ev.dateFr);
    ligneSi(det, ev.dateHe, null, true);
    if (ev.heure) ligneSi(det, 'À ' + ev.heure);
    if (ev.lieu) ligneSi(det, 'au ' + ev.lieu + ',');
    ligneSi(det, ev.adresse);
    recit.appendChild(det);

    if (D.familles.memoire) {
      var mem = el('div', 'recit__memoire');
      mem.appendChild(el('p', 'recit__memoire-intro', 'En ce jour solennel, nous avons une pensée émue pour la mémoire bénie de nos grands-parents.'));
      D.familles.memoire.split(/\r?\n|;/).map(function (s) { return s.trim(); }).filter(Boolean)
        .forEach(function (nom) { mem.appendChild(el('p', 'recit__memoire-nom', nom)); });
      recit.appendChild(mem);
    }

    /* La reception n'a pas sa propre carte : elle est annoncee ici, a la
     * suite de la houppa (meme lieu la plupart du temps -> pas besoin de
     * repeter l'adresse ni les boutons Itineraire/Waze). */
    var reception = D.evenements.filter(function (e) { return e.cle === 'reception'; })[0];
    if (reception) {
      var memeLieu = reception.lieu && reception.lieu === ev.lieu;
      var phrase = "La cérémonie sera suivie d'une réception";
      if (reception.heure) phrase += ' à ' + reception.heure;
      if (reception.lieu && !memeLieu) phrase += ', au ' + reception.lieu;
      phrase += '.';
      ligneSi(recit, phrase, 'recit__suite');
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
