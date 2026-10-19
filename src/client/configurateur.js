/**
 * Etape 1 : choix et ordre des evenements (glisser-deposer + fleches).
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
    sauvegarder();
    rendreTout();
  }

  function rendreListe() {
    listeEl.innerHTML = '';
    brouillon.ordreEvenements.forEach(function (cle, index) {
      var def = ClientInvitation.infoEvenement(cle);
      if (!def) return;
      var li = document.createElement('li');
      li.className = 'conf-item';
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
      titre.textContent = def.titre;
      corps.appendChild(titre);
      if (def.titreHe) {
        var titreHe = document.createElement('p');
        titreHe.className = 'conf-item__titre-he';
        titreHe.setAttribute('dir', 'rtl');
        titreHe.textContent = def.titreHe;
        corps.appendChild(titreHe);
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

      if (def.obligatoire) {
        var oblig = document.createElement('span');
        oblig.className = 'conf-item__obligatoire';
        oblig.textContent = 'Obligatoire';
        li.appendChild(oblig);
      } else {
        var suppr = document.createElement('button');
        suppr.type = 'button';
        suppr.className = 'conf-item__suppr';
        suppr.setAttribute('aria-label', 'Retirer ' + def.titre);
        suppr.textContent = '✕';
        suppr.addEventListener('click', function () { retirer(cle); });
        li.appendChild(suppr);
      }

      listeEl.appendChild(li);
    });
  }

  function rendreFusion() {
    var aHouppa = brouillon.ordreEvenements.indexOf('houppa') !== -1;
    var aReception = brouillon.ordreEvenements.indexOf('reception') !== -1;
    fusionWrap.hidden = !(aHouppa && aReception);
    fusionInput.checked = !!brouillon.fusionnerHouppaReception;
  }

  function rendreTout() {
    erreurEl.hidden = true;
    rendreChips();
    rendreListe();
    rendreFusion();
  }

  fusionInput.addEventListener('change', function () {
    brouillon.fusionnerHouppaReception = fusionInput.checked;
    sauvegarder();
  });

  /* --- Glisser-deposer : Pointer Events (souris ET tactile), ecoute
   *     deleguee une seule fois sur le conteneur (pas a chaque rendu). --- */
  (function activerGlisser() {
    var enCours = null;

    function pointerdown(e) {
      var poignee = e.target.closest ? e.target.closest('.conf-item__poignee') : null;
      if (!poignee) return;
      var li = poignee.closest('li.conf-item');
      if (!li) return;
      enCours = li;
      li.classList.add('conf-item--drag');
      try { li.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      document.addEventListener('pointermove', pointermove);
      document.addEventListener('pointerup', pointerup);
      e.preventDefault();
    }

    function pointermove(e) {
      if (!enCours) return;
      var apres = document.elementFromPoint(e.clientX, e.clientY);
      var cible = apres && apres.closest ? apres.closest('li.conf-item') : null;
      if (cible && cible !== enCours && cible.parentElement === listeEl) {
        var rect = cible.getBoundingClientRect();
        var avant = (e.clientY - rect.top) < rect.height / 2;
        listeEl.insertBefore(enCours, avant ? cible : cible.nextSibling);
      }
    }

    function pointerup() {
      if (!enCours) return;
      enCours.classList.remove('conf-item--drag');
      document.removeEventListener('pointermove', pointermove);
      document.removeEventListener('pointerup', pointerup);
      enCours = null;
      brouillon.ordreEvenements = Array.prototype.map.call(listeEl.children, function (li) { return li.dataset.cle; });
      sauvegarder();
      rendreTout();   // remet a jour les fleches desactivees en bout de liste
    }

    listeEl.addEventListener('pointerdown', pointerdown);
  })();

  btnContinuer.addEventListener('click', function () {
    if (brouillon.ordreEvenements.indexOf('houppa') === -1) {
      erreurEl.textContent = 'La houppa est obligatoire pour continuer.';
      erreurEl.hidden = false;
      return;
    }
    sauvegarder();
    window.location.href = 'formulaire.html';
  });

  rendreTout();
})();
