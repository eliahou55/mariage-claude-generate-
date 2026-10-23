/**
 * Etape 1 : choix, ordre et regroupement des evenements.
 *
 * Modele : brouillon.groupes est un tableau de groupes, chaque groupe un
 * tableau d'une ou plusieurs cles d'evenements (une carte sur l'invitation
 * finale). N'IMPORTE QUELLE PAIRE peut etre fusionnee en glissant une carte
 * sur une autre (pas seulement houppa/reception).
 *
 * Glisser-depose :
 *  - une carte se saisit n'importe ou dessus ;
 *  - a la souris, le glissement demarre immediatement ;
 *  - au tactile, un appui bref et immobile (~180ms) "prend" la carte --
 *    sinon un balayage reste un defilement normal de la page (le navigateur
 *    gagne toujours la course si on essaie d'intercepter un defilement deja
 *    engage, donc on ne lui dispute jamais un mouvement qui commence vite) ;
 *  - PENDANT le glissement, on ne deplace jamais les autres cartes dans le
 *    DOM (source des bugs precedents : lire la position d'un element en
 *    pleine animation CSS donne une position transitoire, pas sa position
 *    finale). On se contente d'un indicateur (ligne d'insertion / carte
 *    survolee en surbrillance) ; le reordonnancement reel n'a lieu qu'UNE
 *    fois, au relachement -- la liste est alors entierement redessinee.
 */
(function () {
  'use strict';

  var brouillon = ClientInvitation.lireBrouillon();
  var listeEl = document.getElementById('conf-liste');
  var chipsEl = document.getElementById('chips');
  var btnContinuer = document.getElementById('btn-continuer');
  var erreurEl = document.getElementById('message-erreur');

  function sauvegarder() { ClientInvitation.ecrireBrouillon(brouillon); }

  /* ---------------------------------------------------------------- *
   * Chips "+ ajouter"
   * ---------------------------------------------------------------- */

  function rendreChips() {
    var presentes = ClientInvitation.toutesLesCles(brouillon);
    chipsEl.innerHTML = '';
    ClientInvitation.CATALOGUE.forEach(function (def) {
      if (presentes.indexOf(def.cle) !== -1) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.innerHTML = '<span class="chip__plus">+</span> ' + def.titre;
      btn.addEventListener('click', function () {
        brouillon.groupes.push([def.cle]);
        sauvegarder();
        rendreTout();
      });
      chipsEl.appendChild(btn);
    });
  }

  function deplacerGroupe(index, delta) {
    var j = index + delta;
    if (j < 0 || j >= brouillon.groupes.length) return;
    var tmp = brouillon.groupes[index];
    brouillon.groupes[index] = brouillon.groupes[j];
    brouillon.groupes[j] = tmp;
    sauvegarder();
    rendreTout();
  }

  function retirerCle(cle) {
    brouillon.groupes = brouillon.groupes
      .map(function (g) { return g.filter(function (c) { return c !== cle; }); })
      .filter(function (g) { return g.length > 0; });
    sauvegarder();
    rendreTout();
  }

  function separerGroupe(index) {
    var groupe = brouillon.groupes[index];
    var separes = groupe.map(function (c) { return [c]; });
    brouillon.groupes.splice.apply(brouillon.groupes, [index, 1].concat(separes));
    sauvegarder();
    rendreTout();
  }

  /* ---------------------------------------------------------------- *
   * Liste : une ligne par groupe
   * ---------------------------------------------------------------- */

  function creerLigne(groupe, index) {
    var defs = groupe.map(ClientInvitation.infoEvenement).filter(Boolean);
    var fusionnee = defs.length > 1;

    var li = document.createElement('li');
    li.className = 'conf-item' + (fusionnee ? ' conf-item--fusion' : '');
    li.dataset.index = String(index);

    var poignee = document.createElement('span');
    poignee.className = 'conf-item__poignee';
    poignee.textContent = '☰';
    poignee.setAttribute('aria-hidden', 'true');
    li.appendChild(poignee);

    var corps = document.createElement('div');
    corps.className = 'conf-item__corps';
    var titre = document.createElement('p');
    titre.className = 'conf-item__titre';
    titre.textContent = defs.map(function (d) { return d.titre; }).join(' & ');
    corps.appendChild(titre);
    var hebreux = defs.map(function (d) { return d.titreHe; }).filter(Boolean).join(' · ');
    if (hebreux) {
      var titreHe = document.createElement('p');
      titreHe.className = 'conf-item__titre-he';
      titreHe.setAttribute('dir', 'rtl');
      titreHe.textContent = hebreux;
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
    haut.setAttribute('aria-label', 'Monter ' + titre.textContent);
    haut.addEventListener('click', function () { deplacerGroupe(index, -1); });
    var bas = document.createElement('button');
    bas.type = 'button'; bas.className = 'conf-item__fleche'; bas.textContent = '↓';
    bas.disabled = index === brouillon.groupes.length - 1;
    bas.setAttribute('aria-label', 'Descendre ' + titre.textContent);
    bas.addEventListener('click', function () { deplacerGroupe(index, 1); });
    fleches.appendChild(haut);
    fleches.appendChild(bas);
    li.appendChild(fleches);

    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'conf-item__suppr';
    if (fusionnee) {
      action.title = 'Séparer ces cartes';
      action.setAttribute('aria-label', 'Séparer ' + titre.textContent);
      action.textContent = '⤢';
      action.addEventListener('click', function () { separerGroupe(index); });
    } else {
      action.setAttribute('aria-label', 'Retirer ' + titre.textContent);
      action.textContent = '✕';
      action.addEventListener('click', function () { retirerCle(groupe[0]); });
    }
    li.appendChild(action);

    return li;
  }

  function rendreListe() {
    listeEl.innerHTML = '';
    brouillon.groupes.forEach(function (groupe, index) {
      listeEl.appendChild(creerLigne(groupe, index));
    });
  }

  function rendreTout() {
    erreurEl.hidden = true;
    rendreChips();
    rendreListe();
  }

  /* ---------------------------------------------------------------- *
   * Glisser-deposer
   * ---------------------------------------------------------------- */

  var DELAI_APPUI = 180;         // ms d'immobilite avant de "prendre" la carte au toucher
  var SEUIL_AVANT_APPUI = 9;     // px : au-dela pendant l'attente, c'est un defilement
  var etat = null;

  function estInteractif(el) {
    return !!(el && el.closest && el.closest('button, a, input, select, textarea'));
  }

  function nettoyerIndicateurs() {
    listeEl.querySelectorAll('.conf-item--avant, .conf-item--apres, .conf-item--cible-fusion').forEach(function (c) {
      c.classList.remove('conf-item--avant', 'conf-item--apres', 'conf-item--cible-fusion');
    });
  }

  function demarrerDrag(e) {
    var li = etat.li;
    var rect = li.getBoundingClientRect();
    etat.largeur = rect.width;
    etat.hauteur = rect.height;
    // Position STABLE (ignore tout transform en cours) : le centre de la
    // carte dans le repere de la liste, mesure juste avant de la sortir
    // du flux normal.
    etat.centreListeDepart = li.offsetTop + li.offsetHeight / 2;

    li.classList.remove('conf-item--pret');
    li.classList.add('conf-item--drag');
    li.style.position = 'fixed';
    li.style.left = rect.left + 'px';
    li.style.top = rect.top + 'px';
    li.style.width = rect.width + 'px';
    li.style.zIndex = '80';

    document.body.style.userSelect = 'none';
    try { li.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    etat.demarre = true;
  }

  function pointerdown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (estInteractif(e.target)) return;
    var li = e.target.closest ? e.target.closest('li.conf-item') : null;
    if (!li) return;

    var estTactile = e.pointerType === 'touch' || e.pointerType === 'pen';

    etat = {
      li: li, indexDepart: parseInt(li.dataset.index, 10), pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      largeur: 0, hauteur: 0, centreListeDepart: 0,
      demarre: false, enAttente: estTactile, minuteur: null,
      cibleLi: null, indexCible: null,
    };

    if (estTactile) {
      etat.minuteur = window.setTimeout(function () {
        if (!etat || etat.pointerId !== e.pointerId) return;
        etat.enAttente = false;
        li.classList.add('conf-item--pret');
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
      }, DELAI_APPUI);
    }

    document.addEventListener('pointermove', pointermove);
    document.addEventListener('pointerup', pointerup);
    document.addEventListener('pointercancel', pointerup);
  }

  function pointermove(e) {
    if (!etat) return;
    var dx = e.clientX - etat.startX;
    var dy = e.clientY - etat.startY;

    if (etat.enAttente) {
      if (Math.abs(dx) > SEUIL_AVANT_APPUI || Math.abs(dy) > SEUIL_AVANT_APPUI) {
        if (etat.minuteur) window.clearTimeout(etat.minuteur);
        document.removeEventListener('pointermove', pointermove);
        document.removeEventListener('pointerup', pointerup);
        document.removeEventListener('pointercancel', pointerup);
        etat = null;
      }
      return;   // laisse le navigateur decider (defilement normal)
    }

    if (!etat.demarre) demarrerDrag(e);
    e.preventDefault();

    var inclinaison = Math.max(-7, Math.min(7, dx / 10));
    etat.li.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + inclinaison + 'deg) scale(1.03)';

    // --- Fusion : la carte est-elle visuellement posee sur UNE AUTRE ? ---
    var autres = Array.prototype.slice.call(listeEl.querySelectorAll('.conf-item')).filter(function (c) { return c !== etat.li; });
    var cibleLi = null;
    for (var k = 0; k < autres.length; k++) {
      var r = autres[k].getBoundingClientRect();
      if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) { cibleLi = autres[k]; break; }
    }
    nettoyerIndicateurs();
    etat.cibleLi = cibleLi;

    if (cibleLi) {
      cibleLi.classList.add('conf-item--cible-fusion');
      etat.indexCible = null;
      return;
    }

    // --- Sinon : indicateur de ligne d'insertion, base sur une position
    //     STABLE (offsetTop), jamais sur un rect en cours d'animation. ---
    var centreActuel = etat.centreListeDepart + dy;
    var indexCible = autres.length;
    for (var i = 0; i < autres.length; i++) {
      var milieu = autres[i].offsetTop + autres[i].offsetHeight / 2;
      if (centreActuel < milieu) {
        indexCible = i;
        autres[i].classList.add('conf-item--avant');
        break;
      }
    }
    if (indexCible === autres.length && autres.length) {
      autres[autres.length - 1].classList.add('conf-item--apres');
    }
    etat.indexCible = indexCible;
  }

  function pointerup() {
    if (!etat) return;
    if (etat.minuteur) window.clearTimeout(etat.minuteur);
    document.removeEventListener('pointermove', pointermove);
    document.removeEventListener('pointerup', pointerup);
    document.removeEventListener('pointercancel', pointerup);
    document.body.style.userSelect = '';
    nettoyerIndicateurs();

    if (!etat.demarre) {
      if (etat.li) etat.li.classList.remove('conf-item--pret');
      etat = null;
      return;
    }

    if (etat.cibleLi) {
      var indexCibleGroupe = parseInt(etat.cibleLi.dataset.index, 10);
      var groupes = brouillon.groupes.slice();
      var source = groupes.splice(etat.indexDepart, 1)[0];
      var idxAjuste = indexCibleGroupe > etat.indexDepart ? indexCibleGroupe - 1 : indexCibleGroupe;
      groupes[idxAjuste] = groupes[idxAjuste].concat(source);
      brouillon.groupes = groupes;
    } else if (etat.indexCible != null && etat.indexCible !== etat.indexDepart) {
      var g = brouillon.groupes.slice();
      var dep = g.splice(etat.indexDepart, 1)[0];
      var cible = etat.indexCible > etat.indexDepart ? etat.indexCible - 1 : etat.indexCible;
      g.splice(cible, 0, dep);
      brouillon.groupes = g;
    }

    sauvegarder();
    rendreTout();   // reconstruit tout depuis zero : aucun etat transitoire ne peut rester bloque
    etat = null;
  }

  listeEl.addEventListener('pointerdown', pointerdown);

  /* ---------------------------------------------------------------- *
   * Indication pour un premier usage (discretement, une seule fois)
   * ---------------------------------------------------------------- */

  (function indicationPremiereVisite() {
    var CLE_VU = 'invitation-client:glisser-vu';
    try { if (window.localStorage.getItem(CLE_VU)) return; } catch (e) { return; }

    function marquerVu() {
      try { window.localStorage.setItem(CLE_VU, '1'); } catch (e) { /* ignore */ }
      listeEl.classList.remove('conf-liste--demo');
      listeEl.removeEventListener('pointerdown', marquerVu);
    }
    window.setTimeout(function () { listeEl.classList.add('conf-liste--demo'); }, 400);
    window.setTimeout(marquerVu, 5000);
    listeEl.addEventListener('pointerdown', marquerVu);
  })();

  btnContinuer.addEventListener('click', function () {
    var presentes = ClientInvitation.toutesLesCles(brouillon);
    if (presentes.indexOf('houppa') === -1) {
      erreurEl.textContent = "La date de la houppa est indispensable : ajoutez-la avant de continuer.";
      erreurEl.hidden = false;
      return;
    }
    sauvegarder();
    window.location.href = 'formulaire.html';
  });

  rendreTout();
})();
