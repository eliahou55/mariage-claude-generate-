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
      // Dans un onglet (16-32 px), le cadre decoratif du logo prenait toute
      // la place et les initiales devenaient invisibles (carre presque vide) :
      // on recadre sur le monogramme, au centre, nettement agrandi. Un logo
      // personnalise peut porter une ligne de texte sous les initiales :
      // recadrage un peu plus large.
      var k = perso ? 1.7 : 2.15;
      var cote = TAILLE * k;
      x.drawImage(img, (TAILLE - cote) / 2, (TAILLE - cote) / 2 - (perso ? TAILLE * .06 : 0), cote, cote);
      URL.revokeObjectURL(url);
      return c.toDataURL('image/png');
    });
  }

  /** Secours si le logo ne peut pas etre converti : les initiales dessinees
   *  directement (aucune image SVG), dans la couleur du theme. Ne doit
   *  jamais laisser l'invitation sans icone. */
  function depuisInitiales(D) {
    var theme = (D && D.site && D.site.themeSlug) || '';
    var fond = FONDS[theme] || '#FDFCF9';
    var encre = FONDS[theme] ? '#E8CF8E' : '#3A3630';
    var c = canvas(), x = c.getContext('2d');
    x.fillStyle = fond;
    x.fillRect(0, 0, TAILLE, TAILLE);
    var ini = D && D.couple ? [D.couple.marie.prenom, D.couple.mariee.prenom].map(function (p) { return String(p || '').trim().charAt(0).toUpperCase(); }).join('') : '';
    x.fillStyle = encre;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '500 ' + Math.round(TAILLE * .46) + 'px "Cormorant Garamond", Georgia, serif';
    x.fillText(ini || '♥', TAILLE / 2, TAILLE / 2 + TAILLE * .03);
    return Promise.resolve(c.toDataURL('image/png'));
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

  return { depuisFichier: depuisFichier, depuisLogo: depuisLogo, depuisInitiales: depuisInitiales, appliquer: appliquer };
})();
