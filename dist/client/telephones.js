/**
 * Maquettes de telephone : chaque <div class="iphone" data-theme="slug">
 * affiche EN DIRECT la page d'accueil du theme (iframe a 390 px de large,
 * reduite a la taille de l'ecran du telephone), sans la barre d'apercu.
 * Les iframes ne se chargent qu'a l'approche de l'ecran (loading=lazy).
 */
(function () {
  'use strict';

  var hote = document.getElementById('entete-site');
  var BASE = hote ? hote.getAttribute('data-base') || '' : '';

  function ajuster(ecran, iframe) {
    var w = ecran.clientWidth, h = ecran.clientHeight;
    if (!w) return;
    var k = w / 390;
    iframe.style.transform = 'scale(' + k + ')';
    iframe.style.height = Math.ceil(h / k) + 'px';
  }

  /* Cartes de theme (galerie) : ce ne sont PAS des liens, pour eviter
   * l'apercu de lien d'iOS (page grise) quand le doigt reste pose pendant
   * le defilement. Ouverture au toucher bref, sans glissement. */
  Array.prototype.forEach.call(document.querySelectorAll('.ac-theme[data-lien]'), function (carte) {
    var lien = BASE + carte.getAttribute('data-lien');
    var depart = null;
    carte.setAttribute('role', 'link');
    carte.setAttribute('tabindex', '0');
    carte.addEventListener('pointerdown', function (e) { depart = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    carte.addEventListener('click', function (e) {
      if (depart && (Math.abs(e.clientX - depart.x) > 10 || Math.abs(e.clientY - depart.y) > 10 || Date.now() - depart.t > 600)) return;
      window.location.href = lien;
    });
    carte.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.location.href = lien; });
    carte.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.iphone[data-theme]'), function (tel) {
    var slug = tel.getAttribute('data-theme');
    var ecran = document.createElement('div');
    ecran.className = 'iphone__ecran';

    // Page vivante (iframe) seulement pour les 3 telephones du haut, sur un
    // ordinateur. Ailleurs, une capture du theme : 15 pages chargees a la
    // fois font planter Safari sur iPhone (rechargements, page impossible
    // a ouvrir). Captures : scripts/captures-themes.cjs.
    var vivant = tel.hasAttribute('data-immediat') && window.matchMedia &&
      window.matchMedia('(min-width: 900px) and (hover: hover)').matches;
    if (!vivant) {
      var img = document.createElement('img');
      img.className = 'iphone__capture';
      img.src = BASE + 'apercus/' + slug + '.jpg';
      img.alt = 'Aperçu du thème ' + (tel.getAttribute('data-nom') || slug);
      img.loading = tel.hasAttribute('data-immediat') ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      ecran.appendChild(img);
      tel.appendChild(ecran);
      return;
    }
    var iframe = document.createElement('iframe');
    iframe.src = BASE + '../apercu/' + slug + '/index.html';
    iframe.loading = tel.hasAttribute('data-immediat') ? 'eager' : 'lazy';
    iframe.title = 'Aperçu du thème ' + (tel.getAttribute('data-nom') || slug);
    iframe.setAttribute('tabindex', '-1');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('scrolling', 'no');
    ecran.appendChild(iframe);
    tel.appendChild(ecran);

    iframe.addEventListener('load', function () {
      try {
        var doc = iframe.contentDocument;
        var barre = doc.querySelector('.apercu-bar');
        if (barre) barre.remove();   // retire aussi le decalage lie a la barre (:has)
        doc.documentElement.style.overflow = 'hidden';
      } catch (e) { /* autre origine : on laisse tel quel */ }
      ajuster(ecran, iframe);
      iframe.classList.add('pret');
    });

    ajuster(ecran, iframe);
    if (window.ResizeObserver) new ResizeObserver(function () { ajuster(ecran, iframe); }).observe(ecran);
  });
})();
