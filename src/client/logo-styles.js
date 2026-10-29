/**
 * Les 10 styles du generateur de logo (version d'essai, branche
 * generateur-logo). Chaque style dessine un monogramme SVG a partir de
 * deux initiales et d'un jeu de couleurs modifiables.
 *
 *   { id, nom, couleurs: { cle: '#hex' | 'none' }, dessin(a, b, c) -> svg }
 *
 * `c` contient les couleurs du style (memes cles que `couleurs`). Une
 * couleur de fond peut valoir 'none' (fond transparent).
 * Script classique (pas de module ES), comme le reste de l'espace client.
 */
var LogoStyles = (function () {
  'use strict';

  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var rad = function (d) { return d * Math.PI / 180; };

  function echappe(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function svg(contenu) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" class="logo-svg">' + contenu + '</svg>';
  }

  /** Disque de fond (ou rien si la couleur vaut 'none'). */
  function fondRond(c, r) {
    return c.fond && c.fond !== 'none' ? '<circle cx="150" cy="150" r="' + (r || 142) + '" fill="' + c.fond + '"/>' : '';
  }
  function fondCarre(c) {
    return c.fond && c.fond !== 'none' ? '<rect x="8" y="8" width="284" height="284" rx="6" fill="' + c.fond + '"/>' : '';
  }

  function feuille(x, y, a, l, w, fill) {
    return '<path transform="translate(' + r2(x) + ' ' + r2(y) + ') rotate(' + r2(a) + ')" d="M0 0C' + r2(l * .25) + ' ' + r2(-w) + ' ' + r2(l * .72) + ' ' + r2(-w) + ' ' + r2(l) + ' 0C' + r2(l * .72) + ' ' + r2(w) + ' ' + r2(l * .25) + ' ' + r2(w) + ' 0 0Z" fill="' + fill + '"/>';
  }

  function fleur(x, y, r, fill, coeur) {
    var s = '';
    for (var k = 0; k < 5; k++) {
      var a = rad(-90 + 72 * k);
      s += '<circle cx="' + r2(x + Math.cos(a) * r * .5) + '" cy="' + r2(y + Math.sin(a) * r * .5) + '" r="' + r2(r * .46) + '" fill="' + fill + '"/>';
    }
    return s + '<circle cx="' + x + '" cy="' + y + '" r="' + r2(r * .22) + '" fill="' + coeur + '"/>';
  }

  function losange(x, y, r, fill) {
    return '<path d="M' + x + ' ' + (y - r) + 'L' + (x + r) + ' ' + y + 'L' + x + ' ' + (y + r) + 'L' + (x - r) + ' ' + y + 'Z" fill="' + fill + '"/>';
  }

  /** Branche de laurier le long d'un arc de cercle (centre 150,150). */
  function laurier(R, a0, a1, sens, fill, tige) {
    var s = '', n = 11, pts = [];
    for (var i = 0; i <= 40; i++) {
      var t = a0 + (a1 - a0) * i / 40;
      pts.push(r2(150 + Math.cos(rad(t)) * R) + ' ' + r2(150 + Math.sin(rad(t)) * R));
    }
    s += '<path d="M' + pts.join('L') + '" fill="none" stroke="' + tige + '" stroke-width="1.2" stroke-linecap="round"/>';
    for (var k = 0; k < n; k++) {
      var tt = a0 + (a1 - a0) * (k + .5) / n;
      var x = 150 + Math.cos(rad(tt)) * R, y = 150 + Math.sin(rad(tt)) * R;
      var tangente = tt + 90 * sens;
      s += feuille(x, y, tangente - 38, 17, 5.5, fill) + feuille(x, y, tangente + 38, 17, 5.5, fill);
    }
    return s;
  }

  var STYLES = [
    {
      id: 'classique', nom: 'Classique',
      couleurs: { lettres: '#2B2722', ornement: '#B8913A', fond: '#FBF8F2' },
      dessin: function (a, b, c) {
        return svg(fondRond(c) +
          '<circle cx="150" cy="150" r="128" fill="none" stroke="' + c.ornement + '" stroke-width="1.6"/>' +
          '<circle cx="150" cy="150" r="120" fill="none" stroke="' + c.ornement + '" stroke-width=".7"/>' +
          losange(150, 30, 5, c.ornement) + losange(150, 270, 5, c.ornement) +
          '<text x="150" y="178" text-anchor="middle" font-family="Cormorant Garamond, serif" fill="' + c.lettres + '">' +
          '<tspan font-size="96" font-weight="500">' + a + '</tspan>' +
          '<tspan font-size="40" font-style="italic" fill="' + c.ornement + '" dx="8" dy="-16">&amp;</tspan>' +
          '<tspan font-size="96" font-weight="500" dx="8" dy="16">' + b + '</tspan></text>');
      },
    },
    {
      id: 'entrelace', nom: 'Entrelacé',
      couleurs: { lettres: '#3A2F2A', ornement: '#C9A44C', fond: 'none' },
      dessin: function (a, b, c) {
        return svg(fondRond(c) +
          '<circle cx="150" cy="150" r="118" fill="none" stroke="' + c.ornement + '" stroke-width="1"/>' +
          [0, 90, 180, 270].map(function (d) {
            return '<circle cx="' + r2(150 + Math.cos(rad(d)) * 118) + '" cy="' + r2(150 + Math.sin(rad(d)) * 118) + '" r="3" fill="' + c.ornement + '"/>';
          }).join('') +
          '<text x="122" y="196" text-anchor="middle" font-family="Great Vibes, cursive" font-size="150" fill="' + c.lettres + '">' + a + '</text>' +
          '<text x="182" y="196" text-anchor="middle" font-family="Great Vibes, cursive" font-size="150" fill="' + c.lettres + '" opacity=".88">' + b + '</text>');
      },
    },
    {
      id: 'lauriers', nom: 'Couronne de lauriers',
      couleurs: { lettres: '#2F3A2B', ornement: '#7E9470', fond: 'none' },
      dessin: function (a, b, c) {
        return svg(fondRond(c) +
          laurier(112, 98, 238, 1, c.ornement, c.ornement) + laurier(112, 82, -58, -1, c.ornement, c.ornement) +
          '<text x="150" y="176" text-anchor="middle" font-family="Cinzel, serif" font-size="74" letter-spacing="4" fill="' + c.lettres + '">' + a +
          '<tspan font-size="30" dy="-10" dx="6" fill="' + c.ornement + '">·</tspan><tspan dy="10" dx="6">' + b + '</tspan></text>');
      },
    },
    {
      id: 'art-deco', nom: 'Art déco',
      couleurs: { lettres: '#1F1D1A', ornement: '#B8913A', fond: '#F4EEE1' },
      dessin: function (a, b, c) {
        var rayons = '';
        for (var k = -4; k <= 4; k++) {
          var ang = -90 + k * 11;
          rayons += '<line x1="' + r2(150 + Math.cos(rad(ang)) * 64) + '" y1="' + r2(150 + Math.sin(rad(ang)) * 64) + '" x2="' + r2(150 + Math.cos(rad(ang)) * 92) + '" y2="' + r2(150 + Math.sin(rad(ang)) * 92) + '" stroke="' + c.ornement + '" stroke-width="1"/>';
        }
        return svg((c.fond !== 'none' ? '<path d="M150 14L286 150L150 286L14 150Z" fill="' + c.fond + '"/>' : '') +
          '<path d="M150 22L278 150L150 278L22 150Z" fill="none" stroke="' + c.ornement + '" stroke-width="1.6"/>' +
          '<path d="M150 36L264 150L150 264L36 150Z" fill="none" stroke="' + c.ornement + '" stroke-width=".7"/>' +
          rayons + '<g transform="rotate(180 150 150)">' + rayons + '</g>' +
          '<line x1="150" y1="118" x2="150" y2="182" stroke="' + c.ornement + '" stroke-width="1.2"/>' +
          '<text x="118" y="172" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="64" fill="' + c.lettres + '">' + a + '</text>' +
          '<text x="182" y="172" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="64" fill="' + c.lettres + '">' + b + '</text>');
      },
    },
    {
      id: 'arche', nom: 'Arche orientale',
      couleurs: { lettres: '#2B4A72', ornement: '#B89A4E', fond: '#FAFAF2' },
      dessin: function (a, b, c) {
        var arche = 'M70 276V120C70 92 96 70 124 54C138 46 146 36 150 22C154 36 162 46 176 54C204 70 230 92 230 120V276Z';
        return svg((c.fond !== 'none' ? '<path d="' + arche + '" fill="' + c.fond + '"/>' : '') +
          '<path d="' + arche + '" fill="none" stroke="' + c.lettres + '" stroke-width="1.6"/>' +
          '<path d="M82 264V124C82 100 104 82 128 68C140 61 147 52 150 42C153 52 160 61 172 68C196 82 218 100 218 124V264Z" fill="none" stroke="' + c.ornement + '" stroke-width="1"/>' +
          losange(150, 62, 4, c.ornement) +
          '<text x="150" y="196" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" fill="' + c.lettres + '">' +
          '<tspan font-size="70">' + a + '</tspan><tspan font-size="34" fill="' + c.ornement + '" dx="4" dy="-12">&amp;</tspan><tspan font-size="70" dx="4" dy="12">' + b + '</tspan></text>');
      },
    },
    {
      id: 'minimal', nom: 'Épuré',
      couleurs: { lettres: '#2E2A25', ornement: '#8B7D6B', fond: 'none' },
      dessin: function (a, b, c) {
        return svg(fondCarre(c) +
          '<text x="104" y="182" text-anchor="middle" font-family="Josefin Sans, sans-serif" font-weight="200" font-size="96" fill="' + c.lettres + '">' + a + '</text>' +
          '<text x="196" y="182" text-anchor="middle" font-family="Josefin Sans, sans-serif" font-weight="200" font-size="96" fill="' + c.lettres + '">' + b + '</text>' +
          '<line x1="150" y1="96" x2="150" y2="196" stroke="' + c.ornement + '" stroke-width="1"/>' +
          '<line x1="126" y1="222" x2="174" y2="222" stroke="' + c.ornement + '" stroke-width="1"/>' +
          '<circle cx="150" cy="222" r="2.4" fill="' + c.ornement + '"/>');
      },
    },
    {
      id: 'sceau', nom: 'Sceau de cire',
      couleurs: { cire: '#8E2B3A', lettres: '#F3E3C3', fond: 'none' },
      dessin: function (a, b, c) {
        // contour irregulier de cire fondue
        var pts = [], n = 28;
        for (var i = 0; i < n; i++) {
          var t = i / n * Math.PI * 2;
          var R = 122 + Math.sin(t * 5) * 5 + Math.sin(t * 9 + 1) * 3.5 + (i % 4 === 0 ? 4 : 0);
          pts.push(r2(150 + Math.cos(t) * R) + ' ' + r2(150 + Math.sin(t) * R));
        }
        return svg(fondRond(c, 146) +
          '<path d="M' + pts.join('L') + 'Z" fill="' + c.cire + '" stroke="' + c.cire + '" stroke-width="10" stroke-linejoin="round"/>' +
          '<circle cx="150" cy="150" r="98" fill="none" stroke="' + c.lettres + '" stroke-opacity=".45" stroke-width="1.4" stroke-dasharray="2 5" stroke-linecap="round"/>' +
          '<circle cx="150" cy="150" r="86" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="5"/>' +
          '<text x="150" y="174" text-anchor="middle" font-family="Cinzel, serif" font-weight="600" font-size="70" letter-spacing="2" fill="' + c.lettres + '">' + a + b + '</text>');
      },
    },
    {
      id: 'floral', nom: 'Bouquet',
      couleurs: { lettres: '#5A3E3F', feuillage: '#9DAF8E', fleurs: '#E9B9B5', fond: 'none' },
      dessin: function (a, b, c) {
        var branche = '<path d="M60 226C100 250 200 250 240 226" fill="none" stroke="' + c.feuillage + '" stroke-width="1.4" stroke-linecap="round"/>';
        var feuilles = '';
        [[78, 236, 200], [98, 243, 205], [120, 247, 198], [180, 247, -18], [202, 243, -25], [222, 236, -20]].forEach(function (f) {
          feuilles += feuille(f[0], f[1], f[2] - 40, 18, 6, c.feuillage) + feuille(f[0], f[1], f[2] + 40, 18, 6, c.feuillage);
        });
        return svg(fondRond(c) + branche + feuilles +
          fleur(150, 246, 16, c.fleurs, c.feuillage) + fleur(128, 240, 9, c.fleurs, c.feuillage) + fleur(172, 240, 9, c.fleurs, c.feuillage) +
          '<text x="150" y="168" text-anchor="middle" font-family="Italiana, serif" fill="' + c.lettres + '">' +
          '<tspan font-size="94">' + a + '</tspan><tspan font-size="40" font-family="Pinyon Script, cursive" fill="' + c.fleurs + '" dx="2" dy="-6">&amp;</tspan><tspan font-size="94" dx="2" dy="6">' + b + '</tspan></text>');
      },
    },
    {
      id: 'houppa', nom: 'Sous la houppa',
      couleurs: { lettres: '#33402E', ornement: '#A08548', fond: 'none' },
      dessin: function (a, b, c) {
        var st = 'fill="none" stroke="' + c.ornement + '" stroke-linecap="round" stroke-linejoin="round"';
        return svg(fondCarre(c) +
          '<path d="M52 92Q150 50 248 92" ' + st + ' stroke-width="1.8"/>' +
          '<path d="M52 92Q76 112 101 92Q125 112 150 92Q175 112 199 92Q224 112 248 92" ' + st + ' stroke-width="1.2"/>' +
          '<path d="M56 94V244M244 94V244" ' + st + ' stroke-width="1.6"/>' +
          '<path d="M40 246H260" ' + st + ' stroke-width="1.2"/>' +
          '<circle cx="52" cy="92" r="4" fill="' + c.ornement + '"/><circle cx="248" cy="92" r="4" fill="' + c.ornement + '"/>' +
          '<text x="150" y="196" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" fill="' + c.lettres + '">' +
          '<tspan font-size="78">' + a + '</tspan><tspan font-size="36" fill="' + c.ornement + '" dx="6" dy="-14">&amp;</tspan><tspan font-size="78" dx="6" dy="14">' + b + '</tspan></text>');
      },
    },
    {
      id: 'timbre', nom: 'Moderne',
      couleurs: { lettres: '#1A1A1A', ornement: '#C46A45', fond: '#FBF2E7' },
      dessin: function (a, b, c) {
        return svg(
          '<rect x="58" y="58" width="196" height="196" fill="none" stroke="' + c.ornement + '" stroke-width="1.4"/>' +
          (c.fond !== 'none' ? '<rect x="44" y="44" width="196" height="196" fill="' + c.fond + '"/>' : '') +
          '<rect x="44" y="44" width="196" height="196" fill="none" stroke="' + c.lettres + '" stroke-width="1.6"/>' +
          '<line x1="168" y1="80" x2="116" y2="204" stroke="' + c.ornement + '" stroke-width="2"/>' +
          '<text x="104" y="146" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="74" fill="' + c.lettres + '">' + a + '</text>' +
          '<text x="180" y="208" text-anchor="middle" font-family="Bodoni Moda, serif" font-style="italic" font-size="74" fill="' + c.lettres + '">' + b + '</text>');
      },
    },
  ];

  var LIBELLES = { lettres: 'Lettres', ornement: 'Ornements', fond: 'Fond', cire: 'Cire', feuillage: 'Feuillage', fleurs: 'Fleurs' };

  /** Dessine le style `style` avec les initiales et couleurs donnees. */
  function dessiner(style, a, b, couleurs) {
    var c = {};
    for (var k in style.couleurs) c[k] = (couleurs && couleurs[k]) || style.couleurs[k];
    return style.dessin(echappe(a || ' '), echappe(b || ' '), c);
  }

  return { STYLES: STYLES, LIBELLES: LIBELLES, dessiner: dessiner };
})();
