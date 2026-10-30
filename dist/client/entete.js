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
  function rendreCompte() {
    if (!zoneCompte) return;
    var c = lireCompte();
    zoneCompte.innerHTML = '';
    if (!compteConnu) return;   // evite le clignotement "Se connecter" -> prenom
    if (!c) {
      var bCo = el('button', 'site-entete__lien-btn', 'Se connecter');
      bCo.type = 'button';
      bCo.addEventListener('click', function () { ouvrir('connexion'); });
      var bIns = el('button', 'btn btn--principal btn--petit', 'Créer un compte');
      bIns.type = 'button';
      bIns.addEventListener('click', function () { ouvrir('inscription'); });
      zoneCompte.appendChild(bCo);
      zoneCompte.appendChild(bIns);
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
      if (FB) FB.deconnecter().then(function () { if (/espace\.html/.test(location.pathname)) location.href = BASE + 'index.html'; });
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
      '  </nav>' +
      '  <div class="site-entete__compte"></div>' +
      '  <button type="button" class="site-entete__burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '</div>';
    hote.appendChild(h);
    zoneCompte = h.querySelector('.site-entete__compte');
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

    if (ETAPE) {
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

  construireEntete();
  return { ouvrir: ouvrir, voirExemple: voirExemple, lireCompte: lireCompte, surCompte: surCompte };
})();
