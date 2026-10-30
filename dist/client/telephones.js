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

  Array.prototype.forEach.call(document.querySelectorAll('.iphone[data-theme]'), function (tel) {
    var slug = tel.getAttribute('data-theme');
    var ecran = document.createElement('div');
    ecran.className = 'iphone__ecran';
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
