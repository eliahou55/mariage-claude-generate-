/**
 * En-tete commun a toutes les pages du parcours client (hors pages de
 * rendu d'un theme) : marque, navigation, compte (connexion / inscription
 * FACTICES pour l'instant : rien n'est envoye, le "compte" est garde dans
 * ce navigateur), et barre d'etapes 1 -> 4.
 *
 * Utilisation : <div id="entete-site" data-base="" data-etape="2"></div>
 *   data-base  : chemin vers le dossier client/ depuis la page ("" ou "../client/")
 *   data-etape : etape du parcours a mettre en avant (absent = pas de barre)
 * Script classique, charge APRES stockage.js (et client.js si possible).
 */
var SiteEntete = (function () {
  'use strict';

  var hote = document.getElementById('entete-site');
  var BASE = hote ? hote.getAttribute('data-base') || '' : '';
  var ETAPE = hote ? parseInt(hote.getAttribute('data-etape') || '0', 10) : 0;

  /* Nom du site : a changer ici (et dans le titre des pages). */
  var MARQUE = { nom: 'Sasson', he: 'ששון' };

  var ETAPES = [
    { n: 1, nom: 'Événements', lien: 'configurateur.html' },
    { n: 2, nom: 'Informations', lien: 'formulaire.html' },
    { n: 3, nom: 'Thème & musique', lien: '../apercu/index.html' },
    { n: 4, nom: 'Publication · 19,99 €', lien: 'publication.html' },
  ];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------------- Compte (Firebase Auth, src/sasson-firebase.js) ---------------- */

  var FB = typeof SassonFB !== 'undefined' ? SassonFB : null;
  var compte = null;            // { uid, prenom, email } ou null
  var compteConnu = !FB;        // vrai une fois l'etat de connexion recu
  var abonnes = [];

  /** Appelle cb(compte) maintenant (si connu) et a chaque changement. */
  function surCompte(cb) {
    abonnes.push(cb);
    if (compteConnu) cb(compte);
  }
  function lireCompte() { return compte; }

  if (FB) {
    FB.surUtilisateur(function (u) {
      compte = u ? { uid: u.uid, email: u.email || '', prenom: u.displayName || (u.email || '').split('@')[0] } : null;
      compteConnu = true;
      rendreCompte();
      abonnes.forEach(function (cb) { cb(compte); });
    });
  }

  /** "Voir un exemple" : mariage fictif complet, sans toucher au brouillon. */
  function voirExemple() {
    try {
      window.localStorage.removeItem(CLE_STOCKAGE_MODIF);
      var donnees = ClientInvitation.construireDonnees(ClientInvitation.exempleBrouillon());
      donnees.exemple = true;
      window.localStorage.setItem(CLE_STOCKAGE_DONNEES, JSON.stringify(donnees));
    } catch (e) { /* ignore */ }
    window.location.href = BASE + '../apercu/index.html';
  }

  function aUnBrouillon() {
    try { return !!window.localStorage.getItem(CLE_STOCKAGE_BROUILLON); } catch (e) { return false; }
  }

  /* ---------------- Fenetre connexion / inscription ---------------- */

  var modale = null;
  function construireModale() {
    modale = el('div', 'modale');
    modale.hidden = true;
    modale.setAttribute('role', 'dialog');
    modale.setAttribute('aria-modal', 'true');
    modale.setAttribute('aria-labelledby', 'modale-titre');
    modale.innerHTML =
      '<div class="modale__fond" data-fermer></div>' +
      '<div class="modale__boite">' +
      '  <button type="button" class="modale__fermer" data-fermer aria-label="Fermer">×</button>' +
      '  <p class="modale__marque">' + MARQUE.nom + '</p>' +
      '  <h2 class="modale__titre" id="modale-titre">Bienvenue</h2>' +
      '  <div class="modale__onglets" role="tablist">' +
      '    <button type="button" role="tab" data-onglet="connexion">Se connecter</button>' +
      '    <button type="button" role="tab" data-onglet="inscription">Créer un compte</button>' +
      '  </div>' +
      '  <button type="button" class="modale__google" data-google>' +
      '    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>' +
      '    Continuer avec Google</button>' +
      '  <p class="modale__ou"><span>ou</span></p>' +
      '  <form class="modale__form" novalidate>' +
      '    <div class="champ" data-seul="inscription"><label for="m-prenom">Prénom</label><input id="m-prenom" type="text" autocomplete="given-name"></div>' +
      '    <div class="champ"><label for="m-email">Adresse e-mail</label><input id="m-email" type="email" autocomplete="email" required></div>' +
      '    <div class="champ"><label for="m-mdp">Mot de passe</label><input id="m-mdp" type="password" autocomplete="current-password" required minlength="6"></div>' +
      '    <p class="modale__erreur" hidden></p>' +
      '    <p class="modale__info" hidden></p>' +
      '    <button type="submit" class="btn btn--principal modale__valider">Se connecter</button>' +
      '    <button type="button" class="modale__oubli" data-seul="connexion" data-oubli>Mot de passe oublié ?</button>' +
      '    <p class="modale__note">Votre espace : votre invitation, le tableau de bord et les réponses de vos invités.</p>' +
      '  </form>' +
      '</div>';
    document.body.appendChild(modale);

    var form = modale.querySelector('form');
    var onglet = 'connexion';
    function choisirOnglet(o) {
      onglet = o;
      modale.querySelectorAll('[data-onglet]').forEach(function (b) {
        var actif = b.getAttribute('data-onglet') === o;
        b.classList.toggle('actif', actif);
        b.setAttribute('aria-selected', actif ? 'true' : 'false');
      });
      modale.querySelectorAll('[data-seul]').forEach(function (z) { z.hidden = z.getAttribute('data-seul') !== o; });
      modale.querySelector('.modale__titre').textContent = o === 'connexion' ? 'Bon retour parmi nous' : 'Créez votre espace';
      modale.querySelector('.modale__valider').textContent = o === 'connexion' ? 'Se connecter' : 'Créer mon compte';
      modale.querySelector('#m-mdp').setAttribute('autocomplete', o === 'connexion' ? 'current-password' : 'new-password');
      modale.querySelector('.modale__erreur').hidden = true;
      modale.querySelector('.modale__info').hidden = true;
    }
    function erreur(msg) { var e = modale.querySelector('.modale__erreur'); e.textContent = msg; e.hidden = false; modale.querySelector('.modale__info').hidden = true; }
    function occupe(oui) { modale.querySelectorAll('button, input').forEach(function (b) { b.disabled = oui; }); }
    function reussi() { occupe(false); fermer(); }

    modale.querySelector('[data-google]').addEventListener('click', function () {
      if (!FB) { erreur('Connexion indisponible pour le moment.'); return; }
      occupe(true);
      FB.google().then(reussi, function (e) { occupe(false); erreur(FB.messageErreur(e)); });
    });
    modale.querySelector('[data-oubli]').addEventListener('click', function () {
      var email = form.querySelector('#m-email').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { erreur('Indiquez d\'abord votre adresse e-mail ci-dessus.'); return; }
      FB.motDePasseOublie(email).then(function () {
        var i = modale.querySelector('.modale__info');
        i.textContent = 'Un e-mail pour choisir un nouveau mot de passe vient de vous être envoyé.';
        i.hidden = false; modale.querySelector('.modale__erreur').hidden = true;
      }, function (e) { erreur(FB.messageErreur(e)); });
    });
    modale.querySelectorAll('[data-onglet]').forEach(function (b) {
      b.addEventListener('click', function () { choisirOnglet(b.getAttribute('data-onglet')); });
    });
    modale.querySelectorAll('[data-fermer]').forEach(function (b) { b.addEventListener('click', fermer); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modale.hidden) fermer(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('#m-email').value.trim();
      var mdp = form.querySelector('#m-mdp').value;
      var prenom = form.querySelector('#m-prenom').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { erreur('Merci de saisir une adresse e-mail valide.'); return; }
      if (mdp.length < 6) { erreur('Le mot de passe doit faire au moins 6 caractères.'); return; }
      if (onglet === 'inscription' && !prenom) { erreur('Merci d\'indiquer votre prénom.'); return; }
      if (!FB) { erreur('Connexion indisponible pour le moment.'); return; }
      occupe(true);
      var action = onglet === 'inscription' ? FB.inscrire(prenom, email, mdp) : FB.connecter(email, mdp);
      action.then(function (u) {
        // displayName vient d'etre fixe : on rafraichit l'en-tete.
        if (onglet === 'inscription' && compte) { compte.prenom = prenom; rendreCompte(); }
        reussi();
      }, function (e) { occupe(false); erreur(FB.messageErreur(e)); });
    });

    modale.choisirOnglet = choisirOnglet;
  }

  var dernierFocus = null;
  function ouvrir(onglet) {
    if (!modale) construireModale();
    dernierFocus = document.activeElement;
    modale.choisirOnglet(onglet || 'connexion');
    modale.hidden = false;
    document.body.classList.add('modale-ouverte');
    setTimeout(function () { (modale.querySelector('#' + (onglet === 'inscription' ? 'm-prenom' : 'm-email'))).focus(); }, 30);
  }
  function fermer() {
    modale.hidden = true;
    document.body.classList.remove('modale-ouverte');
    if (dernierFocus && dernierFocus.focus) dernierFocus.focus();
  }

  /* ---------------- En-tete ---------------- */

  var zoneCompte = null;
  var zoneCompteMenu = null;   // copie des liens de compte dans le menu burger (mobile)
  function rendreCompte() {
    if (!zoneCompte) return;
    var c = lireCompte();
    zoneCompte.innerHTML = '';
    if (zoneCompteMenu) zoneCompteMenu.innerHTML = '';
    if (!compteConnu) return;   // evite le clignotement "Se connecter" -> prenom
    if (!c) {
      var bCo = el('button', 'site-entete__lien-btn', 'Se connecter');
      bCo.type = 'button';
      bCo.addEventListener('click', function () { ouvrir('connexion'); });
      // Pas de gros bouton noir : de simples liens (le compte n'est demande
      // qu'a la publication). Sur mobile, ils passent dans le menu burger.
      var bIns = el('button', 'site-entete__lien-btn', 'Créer un compte');
      bIns.type = 'button';
      bIns.addEventListener('click', function () { ouvrir('inscription'); });
      zoneCompte.appendChild(bCo);
      zoneCompte.appendChild(bIns);
      if (zoneCompteMenu) {
        [['Se connecter', 'connexion'], ['Créer un compte', 'inscription']].forEach(function (x) {
          var b = el('button', 'site-entete__lien-btn', x[0]);
          b.type = 'button';
          b.addEventListener('click', function () { hote.querySelector('.site-entete').classList.remove('site-entete--ouvert'); ouvrir(x[1]); });
          zoneCompteMenu.appendChild(b);
        });
      }
      return;
    }
    var bouton = el('button', 'site-compte__bouton', '<span class="site-compte__avatar">' + (c.prenom.charAt(0) || '?').toUpperCase() + '</span><span class="site-compte__nom">' + c.prenom.replace(/</g, '&lt;') + '</span>');
    bouton.type = 'button';
    bouton.setAttribute('aria-haspopup', 'true');
    bouton.setAttribute('aria-expanded', 'false');
    var menu = el('div', 'site-compte__menu');
    menu.hidden = true;
    menu.innerHTML =
      '<p class="site-compte__email">' + c.email.replace(/</g, '&lt;') + '</p>' +
      '<a href="' + BASE + 'espace.html">Mon espace · tableau de bord</a>' +
      '<a href="' + BASE + (aUnBrouillon() ? 'formulaire.html' : 'configurateur.html') + '">' + (aUnBrouillon() ? 'Reprendre ma saisie' : 'Créer une invitation') + '</a>' +
      '<a href="' + BASE + 'logo.html">Mon logo</a>' +
      '<button type="button" data-deconnexion>Se déconnecter</button>';
    bouton.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      bouton.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    });
    document.addEventListener('click', function () { menu.hidden = true; bouton.setAttribute('aria-expanded', 'false'); });
    menu.querySelector('[data-deconnexion]').addEventListener('click', function () {
      // Deconnexion : la saisie est dans le compte ; on vide ce navigateur
      // pour qu'une visite suivante (autre personne, ou nouvelle creation)
      // ne reparte pas de ces donnees, et n'ecrase jamais cette invitation.
      if (FB) FB.deconnecter().then(function () { viderSession(); location.href = BASE + 'index.html'; });
    });
    var wrap = el('div', 'site-compte');
    wrap.appendChild(bouton);
    wrap.appendChild(menu);
    zoneCompte.appendChild(wrap);
  }

  function construireEntete() {
    if (!hote) return;
    var accueil = BASE + 'index.html';
    var h = el('header', 'site-entete');
    h.innerHTML =
      '<div class="site-entete__barre">' +
      '  <a class="site-entete__marque" href="' + accueil + '">' + MARQUE.nom + '<span class="site-entete__he">' + MARQUE.he + '</span></a>' +
      '  <nav class="site-entete__nav" aria-label="Navigation principale">' +
      '    <a href="' + accueil + '#themes">Les thèmes</a>' +
      '    <a href="' + accueil + '#comment">Comment ça marche</a>' +
      '    <a href="' + accueil + '#offre">Tarif</a>' +
      '    <a href="' + accueil + '#faq">Questions</a>' +
      '    <button type="button" class="site-entete__lien-btn" data-exemple>Essayer des exemples</button>' +
      '    <div class="site-entete__nav-compte"></div>' +
      '  </nav>' +
      '  <div class="site-entete__compte"></div>' +
      '  <button type="button" class="site-entete__burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '</div>';
    hote.appendChild(h);
    zoneCompte = h.querySelector('.site-entete__compte');
    zoneCompteMenu = h.querySelector('.site-entete__nav-compte');
    h.querySelector('[data-exemple]').addEventListener('click', voirExemple);

    var burger = h.querySelector('.site-entete__burger');
    burger.addEventListener('click', function () {
      var ouvert = h.classList.toggle('site-entete--ouvert');
      burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
    h.querySelectorAll('.site-entete__nav a').forEach(function (a) {
      a.addEventListener('click', function () { h.classList.remove('site-entete--ouvert'); });
    });
    window.addEventListener('scroll', function () { h.classList.toggle('site-entete--defile', window.scrollY > 8); }, { passive: true });
    rendreCompte();

    // Mariage d'exemple : pas de barre d'etapes (le visiteur n'a rien rempli,
    // des coches « Evenements / Informations » le derouteraient).
    var exemple = false;
    try { exemple = ETAPE === 3 && !!(JSON.parse(window.localStorage.getItem(CLE_STOCKAGE_DONNEES) || '{}').exemple); } catch (e) { /* ignore */ }
    if (ETAPE && !exemple) {
      var barre = el('nav', 'etapes-parcours');
      barre.setAttribute('aria-label', 'Étapes de création');
      barre.innerHTML = '<ol>' + ETAPES.map(function (e) {
        var etat = e.n < ETAPE ? 'fait' : e.n === ETAPE ? 'actuel' : e.bientot ? 'bientot' : 'avenir';
        var contenu = '<span class="etapes-parcours__num">' + (etat === 'fait' ? '✓' : e.n) + '</span><span class="etapes-parcours__nom">' + e.nom +
          (e.bientot ? ' <em>bientôt</em>' : '') + '</span>';
        var lien = e.lien && etat === 'fait' ? '<a href="' + BASE + e.lien + '">' + contenu + '</a>' : '<span>' + contenu + '</span>';
        return '<li class="etapes-parcours__etape etapes-parcours__etape--' + etat + '"' + (etat === 'actuel' ? ' aria-current="step"' : '') +
          (e.bientot ? ' title="Paiement et mise en ligne : bientôt disponible"' : '') + '>' + lien + '</li>';
      }).join('') + '</ol>';
      hote.appendChild(barre);
    }
  }

  /* ---------------- Session : compte <-> saisie de ce navigateur ----------------
   * - Deconnexion : tout est vide (viderSession).
   * - Une invitation du compte est « liee » a la saisie locale
   *   (CLE_STOCKAGE_INVITATION + statut + proprietaire). Liee a un autre
   *   compte que celui connecte : le lien est oublie (jamais d'ecrasement).
   * - Connexion sans saisie en cours : bandeau « Reprendre … ».
   * - Saisie liee a un brouillon : sauvegarde automatique dans le compte,
   *   avec l'etape atteinte (reprise possible sur un autre appareil).
   * - Saisie nouvelle alors que le compte a deja une invitation : rien
   *   n'est enregistre ici ; le choix se fait a la publication.
   * ------------------------------------------------------------------ */
  var CLES_SESSION = [CLE_STOCKAGE_BROUILLON, CLE_STOCKAGE_DONNEES, CLE_STOCKAGE_INVITATION, CLE_STOCKAGE_LOGO,
    CLE_STOCKAGE_PARCOURS, CLE_STOCKAGE_MODIF, CLE_STOCKAGE_STATUT, CLE_STOCKAGE_PROPRIETAIRE, 'invitation-client:avis-logo',
    'invitation-client:musique-envoyee'];
  function lireLocal(cle) { try { return window.localStorage.getItem(cle); } catch (e) { return null; } }
  function viderSession() {
    CLES_SESSION.forEach(function (c) { try { window.localStorage.removeItem(c); } catch (e) { /* ignore */ } });
    try { window.sessionStorage.removeItem('sasson:reprise-vue'); } catch (e) { /* ignore */ }
  }
  /** Une creation est en cours dans ce navigateur (au moins un prenom saisi). */
  function saisieEnCours() {
    try {
      var b = JSON.parse(lireLocal(CLE_STOCKAGE_BROUILLON) || 'null');
      return !!(b && b.couple && ((b.couple.marie && b.couple.marie.prenom) || (b.couple.mariee && b.couple.mariee.prenom)));
    } catch (e) { return false; }
  }
  /** Recopie une invitation du compte dans ce navigateur et l'y lie. */
  function lier(inv, uid) {
    try {
      if (inv.brouillon) window.localStorage.setItem(CLE_STOCKAGE_BROUILLON, JSON.stringify(inv.brouillon));
      if (inv.donnees) window.localStorage.setItem(CLE_STOCKAGE_DONNEES, JSON.stringify(inv.donnees));
      window.localStorage.setItem(CLE_STOCKAGE_INVITATION, inv.id);
      window.localStorage.setItem(CLE_STOCKAGE_STATUT, inv.statut || 'brouillon');
      window.localStorage.setItem(CLE_STOCKAGE_PROPRIETAIRE, uid);
      window.localStorage.removeItem(CLE_STOCKAGE_PARCOURS);
      if (inv.statut === 'publiee') window.localStorage.setItem(CLE_STOCKAGE_MODIF, inv.id);
      else window.localStorage.removeItem(CLE_STOCKAGE_MODIF);
    } catch (e) { /* ignore */ }
  }
  /** Ou reprendre un brouillon : l'etape memorisee, sinon selon ce qui est rempli. */
  function etapeDeReprise(inv) {
    if (inv.statut === 'publiee') return 'espace.html';
    var permises = ['configurateur.html', 'formulaire.html', '../apercu/index.html', 'logo.html', 'publication.html'];
    if (inv.etape && permises.indexOf(inv.etape) !== -1) return inv.etape;
    return inv.donnees && inv.donnees.evenements && inv.donnees.evenements.length ? '../apercu/index.html' : 'formulaire.html';
  }
  /** Etape de la page courante, telle qu'enregistree dans le compte. */
  function etapeCourante() {
    var p = location.pathname;
    if (/configurateur\.html/.test(p)) return 'configurateur.html';
    if (/formulaire\.html/.test(p)) return 'formulaire.html';
    if (/logo\.html/.test(p)) return 'logo.html';
    if (/\/apercu\//.test(p)) return '../apercu/index.html';
    return '';
  }

  function bandeauReprise(inv) {
    if (document.getElementById('reprise-compte')) return;
    var noms = (inv.resume && inv.resume.noms) || 'votre invitation';
    var enLigne = inv.statut === 'publiee';
    var b = el('div', 'reprise-compte');
    b.id = 'reprise-compte';
    b.setAttribute('role', 'status');
    b.innerHTML = '<p class="reprise-compte__texte">' + (enLigne
      ? 'Votre invitation <strong></strong> est en ligne.'
      : 'Reprenez <strong></strong> là où vous vous étiez arrêté.') + '</p>' +
      '<button type="button" class="reprise-compte__ok">' + (enLigne ? 'Mon espace' : 'Reprendre') + '</button>' +
      '<button type="button" class="reprise-compte__fermer" aria-label="Fermer">×</button>';
    b.querySelector('strong').textContent = '« ' + noms + ' »';
    b.querySelector('.reprise-compte__ok').addEventListener('click', function () {
      lier(inv, compte.uid);
      location.href = BASE + etapeDeReprise(inv);
    });
    b.querySelector('.reprise-compte__fermer').addEventListener('click', function () {
      try { window.sessionStorage.setItem('sasson:reprise-vue', '1'); } catch (e) { /* ignore */ }
      b.remove();
    });
    var barre = hote && hote.querySelector('.site-entete');
    if (barre && barre.parentNode) barre.parentNode.insertBefore(b, barre.nextSibling);
    else document.body.insertBefore(b, document.body.firstChild);
  }

  var sauvegardeEnCours = false;
  function sauvegardeAuto() {
    if (!FB || !compte || sauvegardeEnCours || typeof ClientInvitation === 'undefined') return;
    var etape = etapeCourante();
    if (!etape || !saisieEnCours() || lireLocal(CLE_STOCKAGE_MODIF)) return;
    var id = lireLocal(CLE_STOCKAGE_INVITATION);
    if (id && lireLocal(CLE_STOCKAGE_STATUT) !== 'brouillon') return;   // jamais une invitation en ligne
    var brouillon = ClientInvitation.lireBrouillon();
    var donnees;
    try { donnees = ClientInvitation.construireDonnees(brouillon); } catch (e) { return; }
    sauvegardeEnCours = true;
    // Saisie pas encore liee : on ne cree un brouillon que si le compte n'a
    // encore aucune invitation (sinon, choix a la publication).
    var cible = id ? Promise.resolve(id) : FB.mesInvitations().then(function (l) { return l.length ? false : null; });
    cible.then(function (c) {
      if (c === false) return null;
      return FB.enregistrer(c, brouillon, donnees, { etape: etape }).then(function (nouvelId) {
        if (!id) lier({ id: nouvelId, statut: 'brouillon' }, compte.uid);
      });
    }).catch(function () { /* hors ligne : la saisie reste dans le navigateur */ })
      .then(function () { sauvegardeEnCours = false; });
  }

  surCompte(function (c) {
    if (!c) return;
    // Saisie liee a l'invitation d'un AUTRE compte : on oublie ce lien.
    var proprio = lireLocal(CLE_STOCKAGE_PROPRIETAIRE);
    if (lireLocal(CLE_STOCKAGE_INVITATION) && proprio && proprio !== c.uid) {
      [CLE_STOCKAGE_INVITATION, CLE_STOCKAGE_STATUT, CLE_STOCKAGE_PROPRIETAIRE, CLE_STOCKAGE_MODIF].forEach(function (k) {
        try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ }
      });
    }
    // Rien en cours ici : proposer de reprendre l'invitation du compte.
    var surEspace = /espace\.html|publication\.html/.test(location.pathname);
    var vue = false;
    try { vue = !!window.sessionStorage.getItem('sasson:reprise-vue'); } catch (e) { /* ignore */ }
    if (FB && !surEspace && !vue && !saisieEnCours() && !lireLocal(CLE_STOCKAGE_INVITATION)) {
      FB.mesInvitations().then(function (liste) { if (liste.length) bandeauReprise(liste[0]); }).catch(function () {});
    }
    sauvegardeAuto();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') sauvegardeAuto(); });

  construireEntete();
  return { ouvrir: ouvrir, voirExemple: voirExemple, lireCompte: lireCompte, surCompte: surCompte, viderSession: viderSession, lier: lier, etapeDeReprise: etapeDeReprise };
})();
