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

    /* 1. Image de couverture */
    if (D.site.image) {
      var fig = el('figure', 'couverture');
      var img = el('img');
      img.src = BASE + D.site.image;
      img.alt = '';
      img.setAttribute('decoding', 'async');
      fig.appendChild(img);
      inner.appendChild(fig);
    }

    /* 2. Parents, puis grands-parents (plus petit) */
    var fam = el('div', 'familles');
    ajouteSi(fam, D.familles.parentsMarie, 'p', 'familles__parents');
    ajouteSi(fam, D.familles.parentsMariee, 'p', 'familles__parents');
    ajouteSi(fam, D.familles.grandsParentsMarie, 'p', 'familles__gp');
    ajouteSi(fam, D.familles.grandsParentsMariee, 'p', 'familles__gp');
    if (fam.childNodes.length) inner.appendChild(fam);

    /* 3. Phrase d'invitation + prenoms */
    inner.appendChild(el('p', 'phrase', 'ont la joie de vous convier au mariage de leurs enfants'));
    var h2 = el('p', 'invitation__noms');
    h2.appendChild(el('span', 'noms__prenom', D.couple.marie.prenom));
    h2.appendChild(el('span', 'noms__lien', '&'));
    h2.appendChild(el('span', 'noms__prenom', D.couple.mariee.prenom));
    inner.appendChild(h2);

    /* 4. Une carte par evenement, deja triee chronologiquement par le build */
    var liste = el('div', 'evenements');
    D.evenements.forEach(function (ev) { liste.appendChild(carteEvenement(ev)); });
    inner.appendChild(liste);

    /* 5. Pied de page */
    inner.appendChild(he('p', 'mazal', 'מזל טוב'));   // מזל טוב

    return sec;
  }

  function carteEvenement(ev) {
    var art = el('article', 'event event--' + ev.cle);

    var head = el('header', 'event__head');
    head.appendChild(el('h2', 'event__titre', ev.titre));
    if (ev.titreHe) head.appendChild(he('p', 'event__titre-he', ev.titreHe));
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

    if (ev.itineraire || ev.waze) {
      var actions = el('div', 'event__actions');
      if (ev.itineraire) actions.appendChild(lienBouton(ev.itineraire, 'Itinéraire', 'btn btn--carte'));
      if (ev.waze) actions.appendChild(lienBouton(ev.waze, 'Waze', 'btn btn--carte btn--waze'));
      art.appendChild(actions);
    }

    return art;
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
