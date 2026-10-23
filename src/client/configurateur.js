/**
 * Etape 1 : choix et ordre des evenements.
 *
 * Glisser-depose fluide (Pointer Events, souris ET tactile) :
 *  - on saisit une carte n'importe ou dessus (pas seulement la poignee) ;
 *  - elle suit le doigt/curseur avec une legere rotation ("physique") ;
 *  - les autres cartes glissent pour faire de la place (anime en FLIP) ;
 *  - si on la relache superposee a la houppa/reception, elles fusionnent
 *    en une seule carte sur l'invitation finale.
 * Des fleches haut/bas restent disponibles en repli clavier/accessible.
 */
(function () {
  'use strict';

  var brouillon = ClientInvitation.lireBrouillon();
  var listeEl = document.getElementById('conf-liste');
  var chipsEl = document.getElementById('chips');
  var fusionWrap = document.getElementById('conf-fusion-wrap');
  var fusionInput = document.getElementById('conf-fusion-input');
  var btnContinuer = document.getElementById('btn-continuer');
  var erreurEl = document.getElementById('message-erreur');

  function sauvegarder() { ClientInvitation.ecrireBrouillon(brouillon); }
  function aLesDeux() { return brouillon.ordreEvenements.indexOf('houppa') !== -1 && brouillon.ordreEvenements.indexOf('reception') !== -1; }
  function estFusionnee() { return !!brouillon.fusionnerHouppaReception && aLesDeux(); }

  /* ---------------------------------------------------------------- *
   * Chips "+ ajouter"
   * ---------------------------------------------------------------- */

  function rendreChips() {
    chipsEl.innerHTML = '';
    ClientInvitation.CATALOGUE.forEach(function (def) {
      if (brouillon.ordreEvenements.indexOf(def.cle) !== -1) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.innerHTML = '<span class="chip__plus">+</span> ' + def.titre;
      btn.addEventListener('click', function () {
        brouillon.ordreEvenements.push(def.cle);
        sauvegarder();
        rendreTout();
      });
      chipsEl.appendChild(btn);
    });
  }

  function deplacer(cle, delta) {
    var arr = brouillon.ordreEvenements;
    var i = arr.indexOf(cle);
    var j = i + delta;
    if (i === -1 || j < 0 || j >= arr.length) return;
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    sauvegarder();
    rendreTout();
  }

  function retirer(cle) {
    brouillon.ordreEvenements = brouillon.ordreEvenements.filter(function (c) { return c !== cle; });
    if (cle === 'houppa' || cle === 'reception') brouillon.fusionnerHouppaReception = false;
    sauvegarder();
    rendreTout();
  }

  function separer() {
    brouillon.fusionnerHouppaReception = false;
    sauvegarder();
    rendreTout();
  }

  /* ---------------------------------------------------------------- *
   * Liste : une ligne par evenement, sauf houppa+reception fusionnees
   * (une seule ligne "Houppa & Réception").
   * ---------------------------------------------------------------- */

  function creerLigne(cle, def, index, fusionnee) {
    var li = document.createElement('li');
    li.className = 'conf-item' + (fusionnee ? ' conf-item--fusion' : '');
    li.dataset.cle = cle;

    var poignee = document.createElement('span');
    poignee.className = 'conf-item__poignee';
    poignee.textContent = '☰';
    poignee.setAttribute('aria-hidden', 'true');
    li.appendChild(poignee);

    var corps = document.createElement('div');
    corps.className = 'conf-item__corps';
    var titre = document.createElement('p');
    titre.className = 'conf-item__titre';
    titre.textContent = fusionnee ? (def.titre + ' & Réception') : def.titre;
    corps.appendChild(titre);
    var titreHeTxt = fusionnee ? (def.titreHe + ' · סעודה') : def.titreHe;
    if (titreHeTxt) {
      var titreHe = document.createElement('p');
      titreHe.className = 'conf-item__titre-he';
      titreHe.setAttribute('dir', 'rtl');
      titreHe.textContent = titreHeTxt;
      corps.appendChild(titreHe);
    }
    if (fusionnee) {
      var note = document.createElement('p');
      note.className = 'conf-item__note';
      note.textContent = 'Réunies en une seule carte';
      corps.appendChild(note);
    }
    li.appendChild(corps);

    var fleches = document.createElement('div');
    fleches.className = 'conf-item__fleches';
    var haut = document.createElement('button');
    haut.type = 'button'; haut.className = 'conf-item__fleche'; haut.textContent = '↑';
    haut.disabled = index === 0;
    haut.setAttribute('aria-label', 'Monter ' + def.titre);
    haut.addEventListener('click', function () { deplacer(cle, -1); });
    var bas = document.createElement('button');
    bas.type = 'button'; bas.className = 'conf-item__fleche'; bas.textContent = '↓';
    bas.disabled = index === brouillon.ordreEvenements.length - 1;
    bas.setAttribute('aria-label', 'Descendre ' + def.titre);
    bas.addEventListener('click', function () { deplacer(cle, 1); });
    fleches.appendChild(haut);
    fleches.appendChild(bas);
    li.appendChild(fleches);

    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'conf-item__suppr';
    if (fusionnee) {
      action.title = 'Séparer la houppa et la réception';
      action.setAttribute('aria-label', 'Séparer la houppa et la réception');
      action.textContent = '⤢';
      action.addEventListener('click', separer);
    } else {
      action.setAttribute('aria-label', 'Retirer ' + def.titre);
      action.textContent = '✕';
      action.addEventListener('click', function () { retirer(cle); });
    }
    li.appendChild(action);

    return li;
  }

  function rendreListe() {
    listeEl.innerHTML = '';
    var fusion = estFusionnee();
    brouillon.ordreEvenements.forEach(function (cle, index) {
      if (fusion && cle === 'reception') return;   // affichee fusionnee avec la houppa
      var def = ClientInvitation.infoEvenement(cle);
      if (!def) return;
      listeEl.appendChild(creerLigne(cle, def, index, fusion && cle === 'houppa'));
    });
  }

  function rendreFusionCase() {
    fusionWrap.hidden = !aLesDeux();
    fusionInput.checked = estFusionnee();
  }

  function rendreTout() {
    erreurEl.hidden = true;
    rendreChips();
    rendreListe();
    rendreFusionCase();
  }

  fusionInput.addEventListener('change', function () {
    brouillon.fusionnerHouppaReception = fusionInput.checked;
    sauvegarder();
    rendreTout();
  });

  /* ---------------------------------------------------------------- *
   * Glisser-deposer fluide (Pointer Events)
   * ---------------------------------------------------------------- */

  var SEUIL_PX = 5;        // tolerance avant de considerer que c'est un glissement
  var PAIRE_FUSION = { houppa: 'reception', reception: 'houppa' };
  var etat = null;

  function estInteractif(el) {
    return !!(el && el.closest && el.closest('button, a, input, select, textarea'));
  }

  /** Anime en FLIP le deplacement des cartes NON glissees (fluide, pas de saut). */
  function avecAnimationVoisins(action) {
    var voisins = Array.prototype.slice.call(listeEl.children).filter(function (c) { return c !== etat.li; });
    var avant = voisins.map(function (c) { return c.getBoundingClientRect(); });
    action();
    var apres = voisins.map(function (c) { return c.getBoundingClientRect(); });
    voisins.forEach(function (c, i) {
      var dx = avant[i].left - apres[i].left;
      var dy = avant[i].top - apres[i].top;
      if (!dx && !dy) return;
      c.style.transition = 'none';
      c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      requestAnimationFrame(function () {
        c.style.transition = 'transform .2s ease';
        c.style.transform = '';
      });
    });
  }

  function detecterCibleFusion(cle, cx, cy) {
    if (estFusionnee()) return null;              // deja fusionnees
    var cleCible = PAIRE_FUSION[cle];
    if (!cleCible) return null;
    var cibleLi = listeEl.querySelector('li[data-cle="' + cleCible + '"]');
    if (!cibleLi) return null;
    var r = cibleLi.getBoundingClientRect();
    var chevauche = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
    return chevauche ? cibleLi : null;
  }

  function demarrerDrag(e) {
    var li = etat.li;
    etat.demarre = true;
    document.body.style.userSelect = 'none';

    var rect = li.getBoundingClientRect();
    etat.largeur = rect.width;
    etat.hauteur = rect.height;

    var espace = document.createElement('li');
    espace.className = 'conf-item conf-item--espace';
    espace.style.height = rect.height + 'px';
    listeEl.insertBefore(espace, li);
    etat.espace = espace;

    li.classList.add('conf-item--drag');
    li.style.position = 'fixed';
    li.style.left = rect.left + 'px';
    li.style.top = rect.top + 'px';
    li.style.width = rect.width + 'px';
    li.style.zIndex = '80';

    try { li.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  function pointerdown(e) {
    if (e.button !== undefined && e.button !== 0) return;   // clic gauche / tactile uniquement
    if (estInteractif(e.target)) return;                     // laisse boutons/fleches fonctionner
    var li = e.target.closest ? e.target.closest('li.conf-item') : null;
    if (!li || li.classList.contains('conf-item--espace')) return;

    etat = {
      li: li, cle: li.dataset.cle, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      origLeft: li.getBoundingClientRect().left, origTop: li.getBoundingClientRect().top,
      demarre: false, cibleFusion: null, largeur: 0, hauteur: 0,
    };
    document.addEventListener('pointermove', pointermove);
    document.addEventListener('pointerup', pointerup);
    document.addEventListener('pointercancel', pointerup);
  }

  function pointermove(e) {
    if (!etat) return;
    var dx = e.clientX - etat.startX;
    var dy = e.clientY - etat.startY;

    if (!etat.demarre) {
      if (Math.abs(dx) < SEUIL_PX && Math.abs(dy) < SEUIL_PX) return;
      demarrerDrag(e);
    }
    e.preventDefault();

    var inclinaison = Math.max(-7, Math.min(7, dx / 10));
    etat.li.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + inclinaison + 'deg) scale(1.03)';

    var cx = etat.origLeft + etat.largeur / 2 + dx;
    var cy = etat.origTop + etat.hauteur / 2 + dy;

    var cible = detecterCibleFusion(etat.cle, cx, cy);
    if (cible !== etat.cibleFusion) {
      if (etat.cibleFusion) etat.cibleFusion.classList.remove('conf-item--cible-fusion');
      if (cible) cible.classList.add('conf-item--cible-fusion');
      etat.cibleFusion = cible;
    }

    if (!cible) {
      // Deplace l'espace reserve jusqu'a la position survolee -> reordonnancement.
      var avant = null;
      for (var i = 0; i < listeEl.children.length; i++) {
        var enfant = listeEl.children[i];
        if (enfant === etat.li || enfant === etat.espace) continue;
        var r = enfant.getBoundingClientRect();
        if (cy < r.top + r.height / 2) { avant = enfant; break; }
      }
      if (avant !== etat.espace.nextSibling) {
        avecAnimationVoisins(function () { listeEl.insertBefore(etat.espace, avant); });
      }
    }
  }

  function pointerup() {
    if (!etat) return;
    document.removeEventListener('pointermove', pointermove);
    document.removeEventListener('pointerup', pointerup);
    document.removeEventListener('pointercancel', pointerup);
    document.body.style.userSelect = '';

    if (!etat.demarre) { etat = null; return; }   // simple clic, pas un glissement

    var li = etat.li;
    li.classList.remove('conf-item--drag');
    li.style.position = ''; li.style.left = ''; li.style.top = ''; li.style.width = '';
    li.style.zIndex = ''; li.style.transform = '';
    if (etat.cibleFusion) etat.cibleFusion.classList.remove('conf-item--cible-fusion');

    if (etat.espace && etat.espace.parentNode) etat.espace.parentNode.replaceChild(li, etat.espace);

    if (etat.cibleFusion) {
      brouillon.fusionnerHouppaReception = true;
    } else {
      brouillon.ordreEvenements = Array.prototype.map.call(listeEl.children, function (c) { return c.dataset.cle; });
    }

    sauvegarder();
    rendreTout();
    etat = null;
  }

  listeEl.addEventListener('pointerdown', pointerdown);

  /* ---------------------------------------------------------------- */

  btnContinuer.addEventListener('click', function () {
    if (brouillon.ordreEvenements.indexOf('houppa') === -1) {
      erreurEl.textContent = "La date de la houppa est indispensable : ajoutez-la avant de continuer.";
      erreurEl.hidden = false;
      return;
    }
    sauvegarder();
    window.location.href = 'formulaire.html';
  });

  rendreTout();
})();
