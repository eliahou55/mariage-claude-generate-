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

  var ETAPES = [
    { n: 1, nom: 'Événements', lien: 'configurateur.html' },
    { n: 2, nom: 'Informations', lien: 'formulaire.html' },
    { n: 3, nom: 'Thème & musique', lien: '../apercu/index.html' },
    { n: 4, nom: 'Publication', lien: null, bientot: true },
  ];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------------- Compte (factice) ---------------- */

  function lireCompte() {
    try { return JSON.parse(window.localStorage.getItem(CLE_STOCKAGE_COMPTE) || 'null'); } catch (e) { return null; }
  }
  function ecrireCompte(c) {
    try {
      if (c) window.localStorage.setItem(CLE_STOCKAGE_COMPTE, JSON.stringify(c));
      else window.localStorage.removeItem(CLE_STOCKAGE_COMPTE);
    } catch (e) { /* ignore */ }
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
      '  <p class="modale__marque">בס״ד · Invitations</p>' +
      '  <h2 class="modale__titre" id="modale-titre">Bienvenue</h2>' +
      '  <div class="modale__onglets" role="tablist">' +
      '    <button type="button" role="tab" data-onglet="connexion">Se connecter</button>' +
      '    <button type="button" role="tab" data-onglet="inscription">Créer un compte</button>' +
      '  </div>' +
      '  <form class="modale__form" novalidate>' +
      '    <div class="champ" data-seul="inscription"><label for="m-prenom">Prénom</label><input id="m-prenom" type="text" autocomplete="given-name"></div>' +
      '    <div class="champ"><label for="m-email">Adresse e-mail</label><input id="m-email" type="email" autocomplete="email" required></div>' +
      '    <div class="champ"><label for="m-mdp">Mot de passe</label><input id="m-mdp" type="password" autocomplete="current-password" required minlength="6"></div>' +
      '    <p class="modale__erreur" hidden></p>' +
      '    <button type="submit" class="btn btn--principal modale__valider">Se connecter</button>' +
      '    <p class="modale__note">Version de démonstration : aucun compte n\'est réellement créé et rien n\'est envoyé. ' +
      'Vous pourrez bientôt retrouver votre invitation, vos réponses et votre tableau de bord depuis votre espace.</p>' +
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
    }
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
      var err = modale.querySelector('.modale__erreur');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Merci de saisir une adresse e-mail valide.'; err.hidden = false; return; }
      if (mdp.length < 6) { err.textContent = 'Le mot de passe doit faire au moins 6 caractères.'; err.hidden = false; return; }
      if (onglet === 'inscription' && !prenom) { err.textContent = 'Merci d\'indiquer votre prénom.'; err.hidden = false; return; }
      var existant = lireCompte();
      if (onglet === 'connexion' && existant && existant.email === email) prenom = existant.prenom;
      if (!prenom) prenom = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/^\w/, function (c) { return c.toUpperCase(); });
      ecrireCompte({ prenom: prenom, email: email, depuis: new Date().toISOString() });
      fermer();
      rendreCompte();
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
      '<a href="' + BASE + (aUnBrouillon() ? 'formulaire.html' : 'configurateur.html') + '">' + (aUnBrouillon() ? 'Reprendre mon invitation' : 'Créer mon invitation') + '</a>' +
      '<a href="' + BASE + 'logo.html">Mon logo</a>' +
      '<span class="site-compte__bientot">Tableau de bord <em>bientôt</em></span>' +
      '<span class="site-compte__bientot">Réponses des invités <em>bientôt</em></span>' +
      '<button type="button" data-deconnexion>Se déconnecter</button>';
    bouton.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      bouton.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    });
    document.addEventListener('click', function () { menu.hidden = true; bouton.setAttribute('aria-expanded', 'false'); });
    menu.querySelector('[data-deconnexion]').addEventListener('click', function () { ecrireCompte(null); rendreCompte(); });
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
      '  <a class="site-entete__marque" href="' + accueil + '"><span class="site-entete__bsd">בס״ד</span> Invitations</a>' +
      '  <nav class="site-entete__nav" aria-label="Navigation principale">' +
      '    <a href="' + accueil + '#comment">Comment ça marche</a>' +
      '    <a href="' + accueil + '#themes">Les thèmes</a>' +
      '    <a href="' + accueil + '#fonctions">Fonctionnalités</a>' +
      '    <a href="' + accueil + '#faq">Questions</a>' +
      '    <button type="button" class="site-entete__lien-btn" data-exemple>Voir un exemple</button>' +
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
  return { ouvrir: ouvrir, voirExemple: voirExemple, lireCompte: lireCompte };
})();
