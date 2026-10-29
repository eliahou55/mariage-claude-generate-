/**
 * Generateur de logo (version d'essai) : deux familles (Logo au trait /
 * Logo colore) choisies par la barre d'onglets, deux initiales et une
 * ligne de texte facultative, galerie de 10 logos par famille a faire
 * defiler (doigt, souris, fleches, points), couleurs du logo affiche
 * modifiables. Le choix est garde dans ce navigateur (CLE_LOGO) pour une
 * future integration a l'invitation.
 */
(function () {
  'use strict';

  var CLE_LOGO = 'invitation-client:logo';
  var FAMILLES = LogoStyles.FAMILLES;

  var piste = document.getElementById('piste');
  var points = document.getElementById('points');
  var nomStyle = document.getElementById('nom-style');
  var zoneCouleurs = document.getElementById('couleurs');
  var zonePolices = document.getElementById('polices');
  var champ1 = document.getElementById('lettre-1');
  var champ2 = document.getElementById('lettre-2');
  var champTexte = document.getElementById('texte-logo');
  var confirmation = document.getElementById('confirmation');
  var onglets = document.querySelectorAll('.logo-onglet');

  var etat = lireEtat();
  function styles() { return FAMILLES[etat.famille]; }

  function lireEtat() {
    var e = null;
    try { e = JSON.parse(window.localStorage.getItem(CLE_LOGO) || 'null'); } catch (err) { /* ignore */ }
    e = e || {};
    var b = ClientInvitation.lireBrouillon();
    var p1 = (b.couple && b.couple.marie && b.couple.marie.prenom || '').trim();
    var p2 = (b.couple && b.couple.mariee && b.couple.mariee.prenom || '').trim();
    if (!e.lettres) e.lettres = [(p1.charAt(0) || 'A').toUpperCase(), (p2.charAt(0) || 'B').toUpperCase()];
    // Par defaut, les prenoms deja saisis dans le formulaire sous le logo.
    if (e.texte == null) e.texte = p1 && p2 ? p1 + ' & ' + p2 : '';
    if (!FAMILLES[e.famille]) e.famille = 'trait';
    e.index = e.index && typeof e.index === 'object' ? e.index : { trait: 0, couleur: 0 };
    e.couleurs = e.couleurs || {};
    e.polices = e.polices || {};
    return e;
  }

  function ecrireEtat() {
    try { window.localStorage.setItem(CLE_LOGO, JSON.stringify(etat)); } catch (err) { /* ignore */ }
  }

  function indexCourant() { return Math.max(0, Math.min(styles().length - 1, etat.index[etat.famille] || 0)); }

  /* --- Galerie --- */
  function dessin(style) {
    return LogoStyles.dessiner(style, etat.lettres[0], etat.lettres[1], etat.couleurs[style.id], etat.texte, etat.polices[style.id]);
  }

  function rendreGalerie() {
    piste.innerHTML = '';
    points.innerHTML = '';
    piste.classList.toggle('logo-galerie__piste--couleur', etat.famille === 'couleur');
    styles().forEach(function (style, i) {
      var diapo = document.createElement('div');
      diapo.className = 'logo-diapo';
      diapo.setAttribute('role', 'group');
      diapo.setAttribute('aria-label', 'Logo ' + (i + 1) + ' sur ' + styles().length + ' : ' + style.nom);
      diapo.innerHTML = dessin(style);
      piste.appendChild(diapo);

      var pt = document.createElement('button');
      pt.type = 'button';
      pt.className = 'logo-galerie__point';
      pt.setAttribute('aria-label', style.nom);
      pt.addEventListener('click', function () { allerA(i); });
      points.appendChild(pt);
    });
  }

  function redessiner(i) { piste.children[i].innerHTML = dessin(styles()[i]); }
  function toutRedessiner() { styles().forEach(function (s, i) { redessiner(i); }); }

  function allerA(i, instantane) {
    var n = styles().length;
    i = (i + n) % n;
    piste.scrollTo({ left: i * piste.clientWidth, behavior: instantane ? 'auto' : 'smooth' });
    majIndex(i, true);
  }

  function majIndex(i, force) {
    i = Math.max(0, Math.min(styles().length - 1, i || 0));
    if (!force && i === indexCourant()) return;
    etat.index[etat.famille] = i;
    ecrireEtat();
    nomStyle.textContent = styles()[i].nom + ' · ' + (i + 1) + ' / ' + styles().length;
    Array.prototype.forEach.call(points.children, function (p, k) {
      p.classList.toggle('logo-galerie__point--actif', k === i);
      p.setAttribute('aria-selected', k === i ? 'true' : 'false');
    });
    rendreCouleurs();
    rendrePolices();
    confirmation.hidden = true;
  }

  // Index courant d'apres la position de defilement (doigt / trackpad).
  var minuteur = null;
  piste.addEventListener('scroll', function () {
    window.clearTimeout(minuteur);
    minuteur = window.setTimeout(function () {
      if (piste.clientWidth) majIndex(Math.round(piste.scrollLeft / piste.clientWidth));
    }, 60);
  });
  document.getElementById('prec').addEventListener('click', function () { allerA(indexCourant() - 1); });
  document.getElementById('suiv').addEventListener('click', function () { allerA(indexCourant() + 1); });
  piste.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { allerA(indexCourant() - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { allerA(indexCourant() + 1); e.preventDefault(); }
  });
  window.addEventListener('resize', function () { allerA(indexCourant(), true); });

  /* --- Barre d'onglets : Logo / Logo colore --- */
  function choisirFamille(famille) {
    etat.famille = famille;
    ecrireEtat();
    Array.prototype.forEach.call(onglets, function (o) {
      var actif = o.getAttribute('data-famille') === famille;
      o.classList.toggle('logo-onglet--actif', actif);
      o.setAttribute('aria-selected', actif ? 'true' : 'false');
    });
    rendreGalerie();
    allerA(indexCourant(), true);
  }
  Array.prototype.forEach.call(onglets, function (o) {
    o.addEventListener('click', function () { choisirFamille(o.getAttribute('data-famille')); });
  });

  /* --- Police des initiales du logo affiche --- */
  function rendrePolices() {
    var style = styles()[indexCourant()];
    var actuelle = etat.polices[style.id] || '';
    zonePolices.innerHTML = '';
    LogoStyles.POLICES.forEach(function (pol) {
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'logo-police' + (pol.id === actuelle ? ' logo-police--active' : '');
      bouton.setAttribute('role', 'radio');
      bouton.setAttribute('aria-checked', pol.id === actuelle ? 'true' : 'false');
      var apercu = document.createElement('span');
      apercu.className = 'logo-police__apercu';
      apercu.textContent = (etat.lettres[0] || 'A') + (etat.lettres[1] || 'B');
      if (pol.famille) {
        apercu.style.fontFamily = pol.famille;
        if (pol.graisse) apercu.style.fontWeight = pol.graisse;
        if (pol.italique) apercu.style.fontStyle = 'italic';
      } else {
        apercu.textContent = '★';
      }
      var nom = document.createElement('span');
      nom.className = 'logo-police__nom';
      nom.textContent = pol.nom;
      bouton.appendChild(apercu);
      bouton.appendChild(nom);
      bouton.addEventListener('click', function () {
        if (pol.id) etat.polices[style.id] = pol.id; else delete etat.polices[style.id];
        ecrireEtat();
        redessiner(indexCourant());
        rendrePolices();
        confirmation.hidden = true;
      });
      zonePolices.appendChild(bouton);
    });
  }

  /* --- Couleurs du logo affiche --- */
  function rendreCouleurs() {
    var style = styles()[indexCourant()];
    var perso = etat.couleurs[style.id] || {};
    zoneCouleurs.innerHTML = '';
    Object.keys(style.couleurs).forEach(function (cle) {
      var ligne = document.createElement('div');
      ligne.className = 'logo-couleur';
      var id = 'couleur-' + cle;
      var input = document.createElement('input');
      input.type = 'color';
      input.id = id;
      input.value = perso[cle] || style.couleurs[cle];
      var label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = LogoStyles.LIBELLES[cle] || cle;
      ligne.appendChild(input);
      ligne.appendChild(label);
      input.addEventListener('input', function () { appliquer(cle, input.value); });
      zoneCouleurs.appendChild(ligne);
    });
  }

  function appliquer(cle, valeur) {
    var style = styles()[indexCourant()];
    etat.couleurs[style.id] = etat.couleurs[style.id] || {};
    etat.couleurs[style.id][cle] = valeur;
    ecrireEtat();
    redessiner(indexCourant());
    confirmation.hidden = true;
  }

  document.getElementById('reinit-couleurs').addEventListener('click', function () {
    delete etat.couleurs[styles()[indexCourant()].id];
    ecrireEtat();
    redessiner(indexCourant());
    rendreCouleurs();
  });

  /* --- Initiales et texte --- */
  function majTexte() {
    etat.lettres = [champ1.value.trim().toUpperCase(), champ2.value.trim().toUpperCase()];
    etat.texte = champTexte.value.trim();
    ecrireEtat();
    toutRedessiner();
    rendrePolices();
    confirmation.hidden = true;
  }
  champ1.value = etat.lettres[0];
  champ2.value = etat.lettres[1];
  champTexte.value = etat.texte;
  champ1.addEventListener('input', function () { majTexte(); if (champ1.value) champ2.focus(); });
  champ2.addEventListener('input', majTexte);
  champTexte.addEventListener('input', majTexte);

  /* --- Choix final (garde dans ce navigateur pour plus tard) --- */
  document.getElementById('choisir').addEventListener('click', function () {
    var style = styles()[indexCourant()];
    etat.choisi = { famille: etat.famille, style: style.id, lettres: etat.lettres.slice(), texte: etat.texte, couleurs: etat.couleurs[style.id] || {}, police: etat.polices[style.id] || '' };
    ecrireEtat();
    confirmation.textContent = '« ' + style.nom + ' » est enregistré comme votre logo (dans ce navigateur).';
    confirmation.hidden = false;
  });

  choisirFamille(etat.famille);
  majIndex(indexCourant(), true);

  // Les polices des logos arrivent apres le premier rendu : on redessine.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(toutRedessiner);
})();
