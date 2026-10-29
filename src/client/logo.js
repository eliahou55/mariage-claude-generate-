/**
 * Generateur de logo (version d'essai) : deux initiales, galerie des 10
 * styles a faire defiler (doigt, souris, fleches, points), couleurs du logo
 * affiche modifiables. Le choix est garde dans ce navigateur
 * (CLE_LOGO) pour une future integration a l'invitation.
 */
(function () {
  'use strict';

  var CLE_LOGO = 'invitation-client:logo';
  var STYLES = LogoStyles.STYLES;

  var etat = lireEtat();
  var piste = document.getElementById('piste');
  var points = document.getElementById('points');
  var nomStyle = document.getElementById('nom-style');
  var zoneCouleurs = document.getElementById('couleurs');
  var champ1 = document.getElementById('lettre-1');
  var champ2 = document.getElementById('lettre-2');
  var confirmation = document.getElementById('confirmation');

  function lireEtat() {
    var e = null;
    try { e = JSON.parse(window.localStorage.getItem(CLE_LOGO) || 'null'); } catch (err) { /* ignore */ }
    e = e || {};
    if (!e.lettres) {
      // Par defaut : initiales des prenoms deja saisis dans le formulaire.
      var b = ClientInvitation.lireBrouillon();
      var i1 = (b.couple && b.couple.marie && b.couple.marie.prenom || 'A').trim().charAt(0);
      var i2 = (b.couple && b.couple.mariee && b.couple.mariee.prenom || 'B').trim().charAt(0);
      e.lettres = [(i1 || 'A').toUpperCase(), (i2 || 'B').toUpperCase()];
    }
    e.index = Math.max(0, Math.min(STYLES.length - 1, e.index || 0));
    e.couleurs = e.couleurs || {};
    return e;
  }

  function ecrireEtat() {
    try { window.localStorage.setItem(CLE_LOGO, JSON.stringify(etat)); } catch (err) { /* ignore */ }
  }

  /* --- Galerie --- */
  function rendreGalerie() {
    piste.innerHTML = '';
    points.innerHTML = '';
    STYLES.forEach(function (style, i) {
      var diapo = document.createElement('div');
      diapo.className = 'logo-diapo';
      diapo.setAttribute('role', 'group');
      diapo.setAttribute('aria-label', 'Logo ' + (i + 1) + ' sur ' + STYLES.length + ' : ' + style.nom);
      diapo.innerHTML = LogoStyles.dessiner(style, etat.lettres[0], etat.lettres[1], etat.couleurs[style.id]);
      piste.appendChild(diapo);

      var pt = document.createElement('button');
      pt.type = 'button';
      pt.className = 'logo-galerie__point';
      pt.setAttribute('aria-label', style.nom);
      pt.addEventListener('click', function () { allerA(i); });
      points.appendChild(pt);
    });
  }

  function redessiner(i) {
    var style = STYLES[i];
    piste.children[i].innerHTML = LogoStyles.dessiner(style, etat.lettres[0], etat.lettres[1], etat.couleurs[style.id]);
  }

  function allerA(i, instantane) {
    i = (i + STYLES.length) % STYLES.length;
    piste.scrollTo({ left: i * piste.clientWidth, behavior: instantane ? 'auto' : 'smooth' });
    majIndex(i);
  }

  function majIndex(i) {
    i = Math.max(0, Math.min(STYLES.length - 1, i || 0));
    if (i === etat.index && nomStyle.textContent) return;
    etat.index = i;
    ecrireEtat();
    nomStyle.textContent = STYLES[i].nom + ' · ' + (i + 1) + ' / ' + STYLES.length;
    Array.prototype.forEach.call(points.children, function (p, k) {
      p.classList.toggle('logo-galerie__point--actif', k === i);
      p.setAttribute('aria-selected', k === i ? 'true' : 'false');
    });
    rendreCouleurs();
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
  document.getElementById('prec').addEventListener('click', function () { allerA(etat.index - 1); });
  document.getElementById('suiv').addEventListener('click', function () { allerA(etat.index + 1); });
  piste.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { allerA(etat.index - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { allerA(etat.index + 1); e.preventDefault(); }
  });
  window.addEventListener('resize', function () { allerA(etat.index, true); });

  /* --- Couleurs du logo affiche --- */
  function rendreCouleurs() {
    var style = STYLES[etat.index];
    var perso = etat.couleurs[style.id] || {};
    zoneCouleurs.innerHTML = '';
    Object.keys(style.couleurs).forEach(function (cle) {
      var origine = style.couleurs[cle];
      var valeur = perso[cle] || origine;
      var ligne = document.createElement('div');
      ligne.className = 'logo-couleur';

      var id = 'couleur-' + cle;
      var label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = LogoStyles.LIBELLES[cle] || cle;

      var input = document.createElement('input');
      input.type = 'color';
      input.id = id;
      input.value = valeur === 'none' ? (origine === 'none' ? '#FFFFFF' : origine) : valeur;
      ligne.appendChild(input);
      ligne.appendChild(label);

      var aucun = null;
      if (cle === 'fond') {
        var lab = document.createElement('label');
        lab.className = 'logo-couleur__aucun';
        aucun = document.createElement('input');
        aucun.type = 'checkbox';
        aucun.checked = valeur === 'none';
        input.disabled = aucun.checked;
        lab.appendChild(aucun);
        lab.appendChild(document.createTextNode(' Sans fond'));
        ligne.appendChild(lab);
        aucun.addEventListener('change', function () {
          input.disabled = aucun.checked;
          appliquer(cle, aucun.checked ? 'none' : input.value);
        });
      }

      input.addEventListener('input', function () { appliquer(cle, input.value); });
      zoneCouleurs.appendChild(ligne);
    });
  }

  function appliquer(cle, valeur) {
    var style = STYLES[etat.index];
    etat.couleurs[style.id] = etat.couleurs[style.id] || {};
    etat.couleurs[style.id][cle] = valeur;
    ecrireEtat();
    redessiner(etat.index);
    confirmation.hidden = true;
  }

  document.getElementById('reinit-couleurs').addEventListener('click', function () {
    delete etat.couleurs[STYLES[etat.index].id];
    ecrireEtat();
    redessiner(etat.index);
    rendreCouleurs();
  });

  /* --- Initiales --- */
  function majLettres() {
    etat.lettres = [champ1.value.trim().toUpperCase(), champ2.value.trim().toUpperCase()];
    ecrireEtat();
    STYLES.forEach(function (s, i) { redessiner(i); });
    confirmation.hidden = true;
  }
  champ1.value = etat.lettres[0];
  champ2.value = etat.lettres[1];
  champ1.addEventListener('input', function () { majLettres(); if (champ1.value) champ2.focus(); });
  champ2.addEventListener('input', majLettres);

  /* --- Choix final (garde dans ce navigateur pour plus tard) --- */
  document.getElementById('choisir').addEventListener('click', function () {
    var style = STYLES[etat.index];
    etat.choisi = { style: style.id, lettres: etat.lettres.slice(), couleurs: etat.couleurs[style.id] || {} };
    ecrireEtat();
    confirmation.textContent = '« ' + style.nom + ' » est enregistré comme votre logo (dans ce navigateur).';
    confirmation.hidden = false;
  });

  rendreGalerie();
  var depart = etat.index;
  etat.index = -1;
  majIndex(depart);
  allerA(depart, true);

  // Les polices des logos arrivent apres le premier rendu : on redessine.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { STYLES.forEach(function (s, i) { redessiner(i); }); });
  }
})();
