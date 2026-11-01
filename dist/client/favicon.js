/**
 * Icone de l'invitation (favicon / icone d'ecran d'accueil du telephone) :
 * image carree 192 px en PNG (data URL), creee soit a partir du logo des
 * maries, soit a partir d'une image televersee. Gardee dans les donnees de
 * l'invitation (site.favicon), lue par la page publique (i/index.html).
 */
var FaviconInvitation = (function () {
  'use strict';

  var TAILLE = 192;
  // Fond selon le theme (logos automatiques clairs sur les themes sombres).
  var FONDS = { 'nuit-etoilee': '#101B33', 'diner-chandelles': '#2A0E16' };

  function canvas() {
    var c = document.createElement('canvas');
    c.width = c.height = TAILLE;
    return c;
  }

  function chargerImage(src) {
    return new Promise(function (ok, ko) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { ko(new Error('Image illisible.')); };
      img.src = src;
    });
  }

  /** Image televersee -> carre 192 px, recadree au centre. */
  function depuisFichier(fichier) {
    if (!fichier || !/^image\//.test(fichier.type)) return Promise.reject(new Error('Choisissez une image (PNG, JPG…).'));
    if (fichier.size > 8 * 1024 * 1024) return Promise.reject(new Error('Image trop lourde (8 Mo maximum).'));
    var url = URL.createObjectURL(fichier);
    return chargerImage(url).then(function (img) {
      var c = canvas(), x = c.getContext('2d');
      x.fillStyle = '#FFFFFF';
      x.fillRect(0, 0, TAILLE, TAILLE);
      var cote = Math.min(img.naturalWidth, img.naturalHeight);
      x.drawImage(img, (img.naturalWidth - cote) / 2, (img.naturalHeight - cote) / 2, cote, cote, 0, 0, TAILLE, TAILLE);
      URL.revokeObjectURL(url);
      return c.toDataURL('image/png');
    });
  }

  /** Logo de l'invitation (choisi ou automatique) -> carre 192 px. */
  function depuisLogo(D) {
    if (typeof LogoStyles === 'undefined' || !D || !D.couple) return Promise.reject(new Error('Logo indisponible.'));
    var theme = (D.site && D.site.themeSlug) || 'marbre-or';
    var perso = D.site && D.site.logo && D.site.logo.style ? D.site.logo : null;
    var fond = perso ? '#FDFCF9' : (FONDS[theme] || '#FDFCF9');
    var initiales = [D.couple.marie.prenom, D.couple.mariee.prenom].map(function (p) { return String(p || '').trim().charAt(0).toUpperCase(); });
    var svg = LogoStyles.logoInvitation(perso, theme, initiales, fond);
    if (!svg) return Promise.reject(new Error('Logo indisponible.'));
    if (svg.indexOf('xmlns=') < 0) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    return chargerImage(url).then(function (img) {
      var c = canvas(), x = c.getContext('2d');
      x.fillStyle = fond;
      x.fillRect(0, 0, TAILLE, TAILLE);
      // Le monogramme occupe le centre du logo : leger agrandissement pour
      // qu'il reste lisible a petite taille (onglet du navigateur).
      var m = TAILLE * .08;
      x.drawImage(img, -m, -m, TAILLE + 2 * m, TAILLE + 2 * m);
      URL.revokeObjectURL(url);
      return c.toDataURL('image/png');
    });
  }

  /** Place l'icone dans la page (onglet + ecran d'accueil). */
  function appliquer(dataUrl) {
    if (!dataUrl) return;
    ['icon', 'apple-touch-icon'].forEach(function (rel) {
      var l = document.querySelector('link[rel="' + rel + '"]') || document.createElement('link');
      l.rel = rel;
      l.href = dataUrl;
      document.head.appendChild(l);
    });
  }

  return { depuisFichier: depuisFichier, depuisLogo: depuisLogo, appliquer: appliquer };
})();
