/**
 * Styles du generateur de logo (version d'essai), en deux familles :
 *   TRAIT   : monogrammes au trait fin (couronnes, ecussons, medaillons...)
 *   COULEUR : ecussons illustres en couleur (fleurs, Jerusalem, paon...)
 *
 *   { id, nom, couleurs: { cle: '#hex' | 'none' }, dessin(a, b, c, texte) -> svg }
 *
 * a, b : les deux initiales ; texte : ligne facultative sous le logo
 * (ex. les prenoms). Tout est dessine en SVG (viewBox 300 x 300).
 * Script classique (pas de module ES), comme le reste de l'espace client.
 */
var LogoStyles = (function () {
  'use strict';

  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var rad = function (d) { return d * Math.PI / 180; };
  var uid = 0;

  function echappe(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function svg(contenu, defs) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" class="logo-svg">' + (defs ? '<defs>' + defs + '</defs>' : '') + contenu + '</svg>';
  }
  function P(R, t, cx, cy) { return [(cx || 150) + Math.cos(rad(t)) * R, (cy || 150) + Math.sin(rad(t)) * R]; }

  /* ================================================================ *
   * Lettres et texte
   * ================================================================ */

  /** Monogramme : premiere lettre en haut a gauche, seconde en bas a
   *  droite, qui se chevauchent legerement (comme les exemples). */
  function monoDiag(a, b, o) {
    o = o || {};
    var cx = o.cx || 150, cy = o.cy || 150, dx = o.dx == null ? 20 : o.dx, dy = o.dy == null ? 26 : o.dy;
    var st = 'font-family="' + (o.font || 'Cormorant Garamond, serif') + '" font-size="' + (o.size || 92) + '" fill="' + o.fill + '"' +
      (o.weight ? ' font-weight="' + o.weight + '"' : '') + (o.italic ? ' font-style="italic"' : '') + ' text-anchor="middle"';
    return '<text x="' + (cx - dx) + '" y="' + (cy + 8) + '" ' + st + '>' + a + '</text>' +
           '<text x="' + (cx + dx) + '" y="' + (cy + 8 + dy) + '" ' + st + (o.op2 ? ' opacity="' + o.op2 + '"' : '') + '>' + b + '</text>';
  }

  /** Ligne de texte en petites capitales espacees (prenoms sous le logo). */
  function legende(texte, y, fill, o) {
    if (!texte) return '';
    o = o || {};
    return '<text x="150" y="' + y + '" text-anchor="middle" font-family="' + (o.font || 'Cormorant Garamond, serif') + '" font-size="' + (o.size || 13) +
      '" letter-spacing="' + (o.ls == null ? 3 : o.ls) + '" fill="' + fill + '"' + (o.italic ? ' font-style="italic"' : '') + '>' +
      (o.casse === false ? texte : texte.toUpperCase()) + '</text>';
  }

  /* ================================================================ *
   * Vegetal au trait (famille TRAIT)
   * ================================================================ */

  function feuilleT(x, y, a, l, w, c, sw) {
    return '<g transform="translate(' + r2(x) + ' ' + r2(y) + ') rotate(' + r2(a) + ')"><path d="M0 0C' + r2(l * .3) + ' ' + r2(-w) + ' ' + r2(l * .75) + ' ' + r2(-w * .9) + ' ' + r2(l) + ' 0C' + r2(l * .75) + ' ' + r2(w * .9) + ' ' + r2(l * .3) + ' ' + r2(w) + ' 0 0Z" fill="none" stroke="' + c + '" stroke-width="' + (sw || .9) + '"/>' +
      '<path d="M' + r2(l * .1) + ' 0L' + r2(l * .85) + ' 0" stroke="' + c + '" stroke-width=".5"/></g>';
  }
  function feuilleP(x, y, a, l, w, c, nervure) {
    return '<g transform="translate(' + r2(x) + ' ' + r2(y) + ') rotate(' + r2(a) + ')"><path d="M0 0C' + r2(l * .3) + ' ' + r2(-w) + ' ' + r2(l * .75) + ' ' + r2(-w * .9) + ' ' + r2(l) + ' 0C' + r2(l * .75) + ' ' + r2(w * .9) + ' ' + r2(l * .3) + ' ' + r2(w) + ' 0 0Z" fill="' + c + '"/>' +
      (nervure ? '<path d="M' + r2(l * .1) + ' 0L' + r2(l * .85) + ' 0" stroke="' + nervure + '" stroke-width=".6" opacity=".6"/>' : '') + '</g>';
  }

  /** Branche le long d'un arc de cercle, de l'angle a0 vers a1, garnie de
   *  feuilles des deux cotes. `fe(x, y, angle, taille)` dessine une feuille. */
  function brinArc(R, a0, a1, o) {
    var n = o.n || 9, cx = o.cx || 150, cy = o.cy || 150, sens = a1 > a0 ? 1 : -1;
    var pts = [];
    for (var i = 0; i <= 30; i++) { var p = P(R, a0 + (a1 - a0) * i / 30, cx, cy); pts.push(r2(p[0]) + ' ' + r2(p[1])); }
    var s = '<path d="M' + pts.join('L') + '" fill="none" stroke="' + o.tige + '" stroke-width="' + (o.tsw || 1) + '" stroke-linecap="round"/>';
    for (var k = 0; k < n; k++) {
      var t = a0 + (a1 - a0) * (k + .6) / (n + .4);
      var q = P(R, t, cx, cy), dir = t + 90 * sens;
      var taille = (o.l || 15) * (1 - .35 * k / n);
      s += o.fe(q[0], q[1], dir - (o.ouv || 40), taille) + o.fe(q[0], q[1], dir + (o.ouv || 40), taille);
    }
    var fin = P(R, a1, cx, cy);
    return s + o.fe(fin[0], fin[1], a1 + 90 * sens, (o.l || 15) * .7);
  }

  function fleurT(x, y, r, c) {
    var s = '';
    for (var k = 0; k < 5; k++) {
      var a = -90 + 72 * k, p = [x + Math.cos(rad(a)) * r * .55, y + Math.sin(rad(a)) * r * .55];
      s += '<ellipse cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" rx="' + r2(r * .42) + '" ry="' + r2(r * .3) + '" transform="rotate(' + a + ' ' + r2(p[0]) + ' ' + r2(p[1]) + ')" fill="none" stroke="' + c + '" stroke-width=".8"/>';
    }
    return s + '<circle cx="' + x + '" cy="' + y + '" r="' + r2(r * .18) + '" fill="' + c + '"/>';
  }

  function losange(x, y, r, c, plein) {
    return '<path d="M' + x + ' ' + (y - r) + 'L' + (x + r) + ' ' + y + 'L' + x + ' ' + (y + r) + 'L' + (x - r) + ' ' + y + 'Z" ' + (plein === false ? 'fill="none" stroke="' + c + '" stroke-width=".9"' : 'fill="' + c + '"') + '/>';
  }

  /** Petit fleuron vertical (pointe + volutes) au-dessus / dessous d'un cadre. */
  function fleuron(x, y, sens, c) {
    var s = sens;
    return '<path d="M' + x + ' ' + y + 'L' + x + ' ' + (y - 16 * s) + '" stroke="' + c + '" stroke-width="1"/>' +
      '<path d="M' + x + ' ' + (y - 6 * s) + 'C' + (x - 10) + ' ' + (y - 4 * s) + ' ' + (x - 12) + ' ' + (y - 14 * s) + ' ' + (x - 6) + ' ' + (y - 15 * s) + '" fill="none" stroke="' + c + '" stroke-width=".9"/>' +
      '<path d="M' + x + ' ' + (y - 6 * s) + 'C' + (x + 10) + ' ' + (y - 4 * s) + ' ' + (x + 12) + ' ' + (y - 14 * s) + ' ' + (x + 6) + ' ' + (y - 15 * s) + '" fill="none" stroke="' + c + '" stroke-width=".9"/>' +
      losange(x, y - 20 * s, 3.2, c);
  }

  var ECUSSON = 'M150 46C176 46 204 40 222 30C226 70 230 110 224 150C216 200 186 232 150 250C114 232 84 200 76 150C70 110 74 70 78 30C96 40 124 46 150 46Z';

  /* ================================================================ *
   * Vegetal en couleur (famille COULEUR)
   * ================================================================ */

  function rose(x, y, r, c) {
    var s = '';
    for (var k = 0; k < 6; k++) {
      var a = 60 * k + 15, p = [x + Math.cos(rad(a)) * r * .45, y + Math.sin(rad(a)) * r * .45];
      s += '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="' + r2(r * .55) + '" fill="' + c.clair + '"/>';
    }
    s += '<circle cx="' + x + '" cy="' + y + '" r="' + r2(r * .62) + '" fill="' + c.base + '"/>';
    [[.48, 20], [.34, 150], [.2, 270]].forEach(function (q) {
      var R = r * q[0], p0 = [x + Math.cos(rad(q[1])) * R, y + Math.sin(rad(q[1])) * R], p1 = [x + Math.cos(rad(q[1] + 250)) * R, y + Math.sin(rad(q[1] + 250)) * R];
      s += '<path d="M' + r2(p0[0]) + ' ' + r2(p0[1]) + 'A' + r2(R) + ' ' + r2(R) + ' 0 1 1 ' + r2(p1[0]) + ' ' + r2(p1[1]) + '" fill="none" stroke="' + c.fonce + '" stroke-width="' + r2(Math.max(.7, r * .07)) + '" stroke-linecap="round"/>';
    });
    return s;
  }
  function fleur5(x, y, r, c, coeur, rot) {
    var s = '';
    for (var k = 0; k < 5; k++) {
      var a = (rot || -90) + 72 * k;
      s += '<circle cx="' + r2(x + Math.cos(rad(a)) * r * .5) + '" cy="' + r2(y + Math.sin(rad(a)) * r * .5) + '" r="' + r2(r * .45) + '" fill="' + c + '"/>';
    }
    return s + '<circle cx="' + x + '" cy="' + y + '" r="' + r2(r * .22) + '" fill="' + coeur + '"/>';
  }
  /** Melange un hex avec du blanc (t>0) ou du noir (t<0). */
  function teinte(hex, t) {
    var h = String(hex).replace('#', ''); if (h.length !== 6) return hex;
    var v = [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
    v = v.map(function (x) { return Math.round(t > 0 ? x + (255 - x) * t : x * (1 + t)); });
    return '#' + v.map(function (x) { return ('0' + Math.max(0, Math.min(255, x)).toString(16)).slice(-2); }).join('');
  }
  function gamme(hex) { return { base: hex, clair: teinte(hex, .45), fonce: teinte(hex, -.35) }; }

  /** Bouquet (fleurs + feuilles) centre en (x, y). */
  function bouquet(x, y, e, c) {
    var s = '';
    for (var k = 0; k < 7; k++) {
      var a = -170 + k * 50;
      s += feuilleP(x, y, a, 26 * e, 8 * e, k % 2 ? c.feuillage : teinte(c.feuillage, .25), teinte(c.feuillage, -.3));
    }
    s += rose(x, y, 15 * e, gamme(c.fleurs)) +
      fleur5(x - 18 * e, y + 8 * e, 8 * e, c.fleurs2, '#E9C46A') +
      fleur5(x + 19 * e, y + 6 * e, 7 * e, '#FFFFFF', '#E9C46A') +
      rose(x + 12 * e, y - 15 * e, 8 * e, gamme(c.fleurs2));
    return s;
  }

  /* ================================================================ *
   * Famille TRAIT
   * ================================================================ */

  var TRAIT = [
    {
      id: 'couronne', nom: 'Couronne fleurie',
      couleurs: { lettres: '#2E2A25', ornement: '#6F6A5E' },
      dessin: function (a, b, c, t) {
        var fe = function (x, y, ang, l) { return feuilleT(x, y, ang, l, l * .32, c.ornement); };
        return svg(
          brinArc(104, 112, 252, { n: 10, l: 17, tige: c.ornement, fe: fe }) +
          brinArc(104, 68, -72, { n: 10, l: 17, tige: c.ornement, fe: fe }) +
          fleurT(108, 58, 10, c.ornement) + fleurT(192, 58, 10, c.ornement) + fleurT(150, 256, 8, c.ornement) +
          monoDiag(a, b, { fill: c.lettres, size: 96, cy: 140 }) + legende(t, 284, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'arche', nom: 'Arche',
      couleurs: { lettres: '#3B3226', ornement: '#A88B57' },
      dessin: function (a, b, c, t) {
        return svg(
          '<path d="M92 236V118A58 58 0 0 1 208 118V236" fill="none" stroke="' + c.ornement + '" stroke-width="1.4"/>' +
          '<path d="M100 236V120A50 50 0 0 1 200 120V236" fill="none" stroke="' + c.ornement + '" stroke-width=".7"/>' +
          '<path d="M84 236H216" stroke="' + c.ornement + '" stroke-width="1"/>' + losange(150, 52, 4, c.ornement) +
          monoDiag(a, b, { fill: c.lettres, size: 78, cy: 148, dx: 14, dy: 30, font: 'Playfair Display, serif' }) +
          legende(t, 262, c.lettres, { size: 11.5, ls: 3.5 }) + losange(150, 276, 2.6, c.ornement));
      },
    },
    {
      id: 'ecusson', nom: 'Écusson',
      couleurs: { lettres: '#2E2A25', ornement: '#5F5A50' },
      dessin: function (a, b, c, t) {
        var fe = function (x, y, ang, l) { return feuilleT(x, y, ang, l, l * .32, c.ornement); };
        return svg(
          '<path d="' + ECUSSON + '" fill="none" stroke="' + c.ornement + '" stroke-width="1.3"/>' +
          '<path transform="translate(150 150) scale(.9) translate(-150 -150)" d="' + ECUSSON + '" fill="none" stroke="' + c.ornement + '" stroke-width=".6"/>' +
          brinArc(118, 125, 205, { n: 7, l: 15, tige: c.ornement, fe: fe }) + brinArc(118, 55, -25, { n: 7, l: 15, tige: c.ornement, fe: fe }) +
          fleurT(60, 160, 8, c.ornement) + fleurT(240, 160, 8, c.ornement) + fleuron(150, 30, 1, c.ornement) +
          monoDiag(a, b, { fill: c.lettres, size: 80, cy: 130, dx: 16, dy: 26 }) + legende(t, 284, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'cartouche', nom: 'Cartouche',
      couleurs: { lettres: '#2E2A25', ornement: '#6F6A5E' },
      dessin: function (a, b, c, t) {
        var cadre = function (m) {
          var x0 = 56 + m, x1 = 244 - m, y0 = 70 + m, y1 = 230 - m, r = 22;
          return 'M' + (x0 + r) + ' ' + y0 + 'H' + (x1 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + x1 + ' ' + (y0 + r) + 'V' + (y1 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x1 - r) + ' ' + y1 +
                 'H' + (x0 + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + x0 + ' ' + (y1 - r) + 'V' + (y0 + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x0 + r) + ' ' + y0 + 'Z';
        };
        return svg('<path d="' + cadre(0) + '" fill="none" stroke="' + c.ornement + '" stroke-width="1.3"/><path d="' + cadre(7) + '" fill="none" stroke="' + c.ornement + '" stroke-width=".6"/>' +
          fleuron(150, 70, 1, c.ornement) + fleuron(150, 230, -1, c.ornement) +
          [[56, 150], [244, 150]].map(function (q) { return losange(q[0], q[1], 4, c.ornement); }).join('') +
          monoDiag(a, b, { fill: c.lettres, size: 104, cy: 140, dx: 18, dy: 18, font: 'Great Vibes, cursive' }) + legende(t, 284, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'medaillon', nom: 'Médaillon',
      couleurs: { lettres: '#2E2A25', ornement: '#5F5A50' },
      dessin: function (a, b, c, t) {
        return svg('<ellipse cx="150" cy="146" rx="62" ry="88" fill="none" stroke="' + c.ornement + '" stroke-width="1.3"/>' +
          '<ellipse cx="150" cy="146" rx="55" ry="81" fill="none" stroke="' + c.ornement + '" stroke-width=".6"/>' +
          fleuron(150, 58, 1, c.ornement) + fleuron(150, 234, -1, c.ornement) +
          '<circle cx="150" cy="252" r="1.6" fill="' + c.ornement + '"/><circle cx="150" cy="260" r="1.2" fill="' + c.ornement + '"/>' +
          '<text x="150" y="164" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="58" fill="' + c.lettres + '">' + a + '<tspan font-size="30" dy="-6" font-style="italic"> </tspan><tspan dy="6">' + b + '</tspan></text>' +
          legende(t, 286, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'coeur', nom: 'Cœur au ruban',
      couleurs: { lettres: '#2E2A25', ornement: '#6F6A5E' },
      dessin: function (a, b, c, t) {
        var fe = function (x, y, ang, l) { return feuilleT(x, y, ang, l, l * .32, c.ornement); };
        var coeur = 'M150 246C110 214 66 182 66 132C66 100 90 80 116 80C132 80 144 90 150 102C156 90 168 80 184 80C210 80 234 100 234 132C234 182 190 214 150 246Z';
        return svg('<path d="' + coeur + '" fill="none" stroke="' + c.ornement + '" stroke-width="1.3"/>' +
          '<path d="M150 98C142 82 120 74 116 86C112 98 138 100 150 98ZM150 98C158 82 180 74 184 86C188 98 162 100 150 98Z" fill="none" stroke="' + c.ornement + '" stroke-width="1"/>' +
          '<path d="M146 100L134 122M154 100L166 122" stroke="' + c.ornement + '" stroke-width="1"/>' +
          brinArc(108, 140, 205, { n: 6, l: 14, tige: c.ornement, fe: fe, cy: 140 }) + brinArc(108, 40, -25, { n: 6, l: 14, tige: c.ornement, fe: fe, cy: 140 }) +
          fleurT(48, 106, 8, c.ornement) + fleurT(252, 106, 8, c.ornement) +
          monoDiag(a, b, { fill: c.lettres, size: 74, cy: 152, dx: 15, dy: 22 }) + legende(t, 284, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'superpose', nom: 'Lettres superposées',
      couleurs: { lettres: '#1F1D1A', ornement: '#8B7D6B' },
      dessin: function (a, b, c, t) {
        return svg('<text x="124" y="160" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="140" fill="' + c.lettres + '">' + a + '</text>' +
          '<text x="178" y="190" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="100" fill="' + c.lettres + '" opacity=".9">' + b + '</text>' +
          legende(t, 224, c.lettres, { size: 14, ls: 4, font: 'Bodoni Moda, serif' }) +
          '<path d="M118 240H182" stroke="' + c.ornement + '" stroke-width=".8"/>' + losange(150, 254, 2.6, c.ornement));
      },
    },
    {
      id: 'minuscules', nom: 'Minuscules',
      couleurs: { lettres: '#1F1D1A', ornement: '#8B7D6B' },
      dessin: function (a, b, c, t) {
        return svg('<text x="120" y="176" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="150" fill="' + c.lettres + '">' + a.toLowerCase() + '</text>' +
          '<text x="184" y="176" text-anchor="middle" font-family="Bodoni Moda, serif" font-style="italic" font-size="150" fill="' + c.lettres + '">' + b.toLowerCase() + '</text>' +
          legende(t, 236, c.ornement, { size: 15, ls: 1, italic: true, casse: false }));
      },
    },
    {
      id: 'cercle', nom: 'Cercle de texte',
      couleurs: { lettres: '#1F1D1A', ornement: '#1F1D1A' },
      dessin: function (a, b, c, t) {
        var id = 'arc-logo-' + (++uid);
        return svg('<circle cx="150" cy="150" r="104" fill="none" stroke="' + c.ornement + '" stroke-width="1"/>' +
          (t ? '<text font-family="Cormorant Garamond, serif" font-size="15" letter-spacing="5" fill="' + c.ornement + '"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">' + t.toUpperCase() + '</textPath></text>' : '') +
          '<text x="128" y="164" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="104" fill="' + c.lettres + '">' + a + '</text>' +
          '<text x="176" y="196" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="104" fill="' + c.lettres + '">' + b + '</text>',
          '<path id="' + id + '" d="M38 150A112 112 0 0 1 262 150"/>');
      },
    },
    {
      id: 'oblique', nom: 'Barre oblique',
      couleurs: { lettres: '#2E2A25', ornement: '#8B7D6B' },
      dessin: function (a, b, c, t) {
        return svg('<text x="112" y="150" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="96" fill="' + c.lettres + '">' + a + '</text>' +
          '<line x1="172" y1="70" x2="128" y2="196" stroke="' + c.ornement + '" stroke-width="1.2"/>' +
          '<text x="190" y="196" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="96" fill="' + c.lettres + '">' + b + '</text>' +
          (t ? '<line x1="44" y1="242" x2="78" y2="242" stroke="' + c.ornement + '" stroke-width=".8"/><line x1="222" y1="242" x2="256" y2="242" stroke="' + c.ornement + '" stroke-width=".8"/>' : '') +
          legende(t, 246, c.lettres, { size: 12.5, ls: 3.5 }));
      },
    },
  ];

  /* ================================================================ *
   * Famille COULEUR
   * ================================================================ */

  var COULEUR = [
    {
      id: 'couronne-roses', nom: 'Couronne de roses',
      couleurs: { lettres: '#2B3A55', fleurs: '#E58FA0', fleurs2: '#F2B48C', feuillage: '#6E9A6A' },
      dessin: function (a, b, c, t) {
        var s = '';
        for (var k = 0; k < 26; k++) {
          var ang = -90 + k * 360 / 26, p = P(104, ang);
          s += feuilleP(p[0], p[1], ang + 90 + (k % 2 ? 35 : -35), 22, 7, k % 3 ? c.feuillage : teinte(c.feuillage, .3), teinte(c.feuillage, -.3));
        }
        [[200, 0], [245, 1], [290, 0], [335, 1], [20, 0], [65, 1], [110, 0], [155, 1]].forEach(function (q, i) {
          var p = P(104, q[0]);
          s += q[1] ? fleur5(p[0], p[1], 11, c.fleurs2, '#E9C46A', i * 20) : rose(p[0], p[1], 15, gamme(c.fleurs));
        });
        return svg(s + monoDiag(a, b, { fill: c.lettres, size: 86, cy: 136, dx: 16, dy: 26, font: 'Playfair Display, serif' }) + legende(t, 288, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'jerusalem', nom: 'Jérusalem',
      couleurs: { lettres: '#2B3A55', ciel: '#F6C9A8', ville: '#C9A15A', fleurs: '#E58FA0', feuillage: '#7FA37A' },
      dessin: function (a, b, c, t) {
        var id = 'clip-j-' + (++uid), g = 'ciel-j-' + uid;
        // remparts, Tour de David et dome, en silhouette doree
        var ville = 'M58 236V206H70V198H78V206H90V196H98V206H108V186H112V176L118 168L124 176V186H128V206H138V194C138 178 162 178 162 194V206H172V180H176V160H174L180 148L186 160H184V180H188V206H200V198H208V206H220V196H228V206H242V236Z';
        return svg('<g clip-path="url(#' + id + ')"><rect x="40" y="40" width="220" height="220" fill="url(#' + g + ')"/><path d="' + ville + '" fill="' + c.ville + '"/>' +
          '<path d="M40 236H260V260H40Z" fill="' + teinte(c.ville, -.15) + '"/><circle cx="208" cy="112" r="14" fill="#FFF4DC" opacity=".9"/></g>' +
          '<circle cx="150" cy="150" r="96" fill="none" stroke="' + c.ville + '" stroke-width="2.4"/>' +
          bouquet(68, 228, .9, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .3), feuillage: c.feuillage }) +
          bouquet(232, 228, .9, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .3), feuillage: c.feuillage }) +
          monoDiag(a, b, { fill: c.lettres, size: 72, cy: 118, dx: 15, dy: 22, font: 'Playfair Display, serif' }) + legende(t, 284, c.lettres, { size: 12 }),
          '<clipPath id="' + id + '"><circle cx="150" cy="150" r="96"/></clipPath><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + teinte(c.ciel, .55) + '"/><stop offset="1" stop-color="' + c.ciel + '"/></linearGradient>');
      },
    },
    {
      id: 'arche-palmiers', nom: 'Arche aux palmiers',
      couleurs: { lettres: '#2B3A55', arche: '#C9A15A', feuillage: '#4F8A5B', fleurs: '#E58FA0' },
      dessin: function (a, b, c, t) {
        var palmier = function (x, sens) {
          var s = '<path d="M' + x + ' 250C' + (x + 4 * sens) + ' 200 ' + (x - 2 * sens) + ' 150 ' + (x + 10 * sens) + ' 104" fill="none" stroke="#8A6A45" stroke-width="5" stroke-linecap="round"/>';
          [-160, -125, -90, -55, -20, 15].forEach(function (ang, i) {
            s += feuilleP(x + 10 * sens, 104, sens > 0 ? ang : -180 - ang, 46 - (i % 2) * 8, 9, i % 2 ? c.feuillage : teinte(c.feuillage, .2), teinte(c.feuillage, -.35));
          });
          return s;
        };
        var arche = 'M98 250V126C98 104 116 88 136 76C144 71 148 64 150 54C152 64 156 71 164 76C184 88 202 104 202 126V250Z';
        return svg(palmier(66, 1) + palmier(234, -1) +
          '<path d="' + arche + '" fill="#FFF8EC" stroke="' + c.arche + '" stroke-width="3"/>' +
          '<path transform="translate(150 152) scale(.9) translate(-150 -152)" d="' + arche + '" fill="none" stroke="' + c.arche + '" stroke-width="1"/>' +
          bouquet(98, 248, .8, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .3), feuillage: c.feuillage }) +
          bouquet(202, 248, .8, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .3), feuillage: c.feuillage }) +
          monoDiag(a, b, { fill: c.lettres, size: 66, cy: 150, dx: 13, dy: 26, font: 'Playfair Display, serif' }) + legende(t, 286, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'paon', nom: 'Paon',
      couleurs: { lettres: '#1E3A5F', plumes: '#2E8B83', oeil: '#1E3A8A', or: '#C9A15A' },
      dessin: function (a, b, c, t) {
        var s = '';
        for (var k = 0; k < 11; k++) {
          var ang = -170 + k * 16, p = P(104, ang, 150, 176), q = P(40, ang, 150, 176);
          s += '<path d="M' + r2(q[0]) + ' ' + r2(q[1]) + 'L' + r2(p[0]) + ' ' + r2(p[1]) + '" stroke="' + c.or + '" stroke-width="1"/>' +
            '<ellipse cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" rx="15" ry="22" transform="rotate(' + (ang + 90) + ' ' + r2(p[0]) + ' ' + r2(p[1]) + ')" fill="' + c.plumes + '"/>' +
            '<ellipse cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" rx="8" ry="11" transform="rotate(' + (ang + 90) + ' ' + r2(p[0]) + ' ' + r2(p[1]) + ')" fill="' + c.or + '"/>' +
            '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="5" fill="' + c.oeil + '"/>';
        }
        return svg(s + '<path d="M60 176A90 90 0 0 1 240 176V250H60Z" fill="#FFFBF2" stroke="' + c.or + '" stroke-width="2"/>' +
          monoDiag(a, b, { fill: c.lettres, size: 70, cy: 186, dx: 15, dy: 24, font: 'Playfair Display, serif' }) + legende(t, 284, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'grenadier', nom: 'Grenadier',
      couleurs: { lettres: '#3A2A2A', fruits: '#B83A3A', feuillage: '#5E8C52', fleurs: '#E86A50' },
      dessin: function (a, b, c, t) {
        var fe = function (x, y, ang, l) { return feuilleP(x, y, ang, l, l * .32, c.feuillage, teinte(c.feuillage, -.35)); };
        var grenade = function (x, y, r) {
          return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c.fruits + '"/><ellipse cx="' + (x - r * .35) + '" cy="' + (y - r * .35) + '" rx="' + r2(r * .3) + '" ry="' + r2(r * .2) + '" fill="#fff" opacity=".35"/>' +
            '<path d="M' + (x - r * .35) + ' ' + (y - r * .85) + 'L' + (x - r * .2) + ' ' + (y - r * 1.25) + 'L' + x + ' ' + (y - r * .95) + 'L' + (x + r * .2) + ' ' + (y - r * 1.25) + 'L' + (x + r * .35) + ' ' + (y - r * .85) + 'Z" fill="' + teinte(c.fruits, -.25) + '"/>';
        };
        var s = brinArc(108, 100, 255, { n: 10, l: 22, tige: '#7A5A3A', tsw: 1.6, fe: fe }) + brinArc(108, 80, -75, { n: 10, l: 22, tige: '#7A5A3A', tsw: 1.6, fe: fe });
        [[165], [200], [235], [15], [-20], [-55]].forEach(function (q, i) { var p = P(110, q[0]); s += grenade(r2(p[0]), r2(p[1]), i % 3 === 1 ? 15 : 12); });
        var f1 = P(108, 130), f2 = P(108, 50);
        s += fleur5(f1[0], f1[1], 9, c.fleurs, '#F4C95D') + fleur5(f2[0], f2[1], 9, c.fleurs, '#F4C95D');
        return svg(s + monoDiag(a, b, { fill: c.lettres, size: 84, cy: 136, dx: 16, dy: 26 }) + legende(t, 288, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'houppa-fleurie', nom: 'Houppa fleurie',
      couleurs: { lettres: '#2B3A55', voile: '#F3E6D8', fleurs: '#E58FA0', feuillage: '#6E9A6A' },
      dessin: function (a, b, c, t) {
        var s = '<path d="M58 96V250M242 96V250" stroke="#B08A55" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M50 96Q150 52 250 96Q226 122 200 100Q176 124 150 100Q124 124 100 100Q74 122 50 96Z" fill="' + c.voile + '" stroke="' + teinte(c.voile, -.2) + '" stroke-width="1.2"/>' +
          '<path d="M40 252H260" stroke="#B08A55" stroke-width="2"/>';
        for (var k = 0; k <= 8; k++) {
          var x = 54 + k * 24, y = 96 - Math.sin(Math.PI * k / 8) * 22;
          s += feuilleP(x, y, 200 + k * 10, 18, 6, c.feuillage) + (k % 2 ? fleur5(x, y, 8, teinte(c.fleurs, .35), '#E9C46A') : rose(x, y, 10, gamme(c.fleurs)));
        }
        s += bouquet(58, 246, .7, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .3), feuillage: c.feuillage }) + bouquet(242, 246, .7, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .3), feuillage: c.feuillage });
        return svg(s + monoDiag(a, b, { fill: c.lettres, size: 74, cy: 162, dx: 15, dy: 26, font: 'Playfair Display, serif', italic: true }) + legende(t, 284, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'ecusson-fleuri', nom: 'Écusson fleuri',
      couleurs: { lettres: '#2B3A55', blason: '#C9A15A', fleurs: '#D96C8B', feuillage: '#6E9A6A' },
      dessin: function (a, b, c, t) {
        return svg('<path d="' + ECUSSON + '" fill="#FFFBF2" stroke="' + c.blason + '" stroke-width="3"/>' +
          '<path transform="translate(150 150) scale(.9) translate(-150 -150)" d="' + ECUSSON + '" fill="none" stroke="' + c.blason + '" stroke-width="1"/>' +
          bouquet(84, 210, 1.05, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .35), feuillage: c.feuillage }) +
          bouquet(216, 210, 1.05, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .35), feuillage: c.feuillage }) +
          bouquet(150, 40, .75, { fleurs: c.fleurs, fleurs2: teinte(c.fleurs, .35), feuillage: c.feuillage }) +
          monoDiag(a, b, { fill: c.lettres, size: 76, cy: 128, dx: 15, dy: 26, font: 'Playfair Display, serif' }) + legende(t, 284, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'coeur-fleurs', nom: 'Cœur de fleurs',
      couleurs: { lettres: '#4A2B35', fleurs: '#E58FA0', fleurs2: '#F7C6B5', feuillage: '#7FA37A' },
      dessin: function (a, b, c, t) {
        var s = '', n = 30;
        for (var k = 0; k < n; k++) {
          var u = k / n * Math.PI * 2;
          var x = 150 + 104 * Math.pow(Math.sin(u), 3) * .95;
          var y = 140 - (80 * Math.cos(u) - 30 * Math.cos(2 * u) - 12 * Math.cos(3 * u) - 6 * Math.cos(4 * u)) * .95;
          s += feuilleP(x, y, k * 37, 18, 6, k % 2 ? c.feuillage : teinte(c.feuillage, .3));
          if (k % 2 === 0) s += k % 4 === 0 ? rose(x, y, 11, gamme(c.fleurs)) : fleur5(x, y, 9, c.fleurs2, '#E9C46A', k * 13);
        }
        return svg(s + monoDiag(a, b, { fill: c.lettres, size: 60, cy: 150, dx: 12, dy: 20, font: 'Playfair Display, serif' }) + legende(t, 288, c.lettres, { size: 12 }));
      },
    },
    {
      id: 'mediterranee', nom: 'Oliviers & mer',
      couleurs: { lettres: '#24405E', mer: '#5B9BC4', feuillage: '#6F7F3E', olives: '#3E4A22' },
      dessin: function (a, b, c, t) {
        var id = 'clip-m-' + (++uid);
        var fe = function (x, y, ang, l) { return feuilleP(x, y, ang, l, l * .22, c.feuillage, teinte(c.feuillage, .4)); };
        var s = '<g clip-path="url(#' + id + ')"><rect x="40" y="40" width="220" height="220" fill="#FFFBF0"/>' +
          '<path d="M40 200Q75 188 110 200T180 200T260 200V260H40Z" fill="' + teinte(c.mer, .3) + '"/>' +
          '<path d="M40 218Q75 206 110 218T180 218T260 218V260H40Z" fill="' + c.mer + '"/><circle cx="150" cy="200" r="18" fill="#F6D58A" opacity=".8"/></g>' +
          '<circle cx="150" cy="150" r="96" fill="none" stroke="' + c.feuillage + '" stroke-width="1.6"/>' +
          brinArc(106, 105, 250, { n: 11, l: 20, tige: c.olives, fe: fe, ouv: 30 }) + brinArc(106, 75, -70, { n: 11, l: 20, tige: c.olives, fe: fe, ouv: 30 });
        [130, 165, 205, 50, 15, -25].forEach(function (ang) { var p = P(112, ang); s += '<ellipse cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" rx="4.5" ry="6" fill="' + c.olives + '"/>'; });
        return svg(s + monoDiag(a, b, { fill: c.lettres, size: 76, cy: 128, dx: 15, dy: 24, font: 'Playfair Display, serif' }) + legende(t, 288, c.lettres, { size: 12 }),
          '<clipPath id="' + id + '"><circle cx="150" cy="150" r="96"/></clipPath>');
      },
    },
    {
      id: 'champetre', nom: 'Bouquet champêtre',
      couleurs: { lettres: '#3A3A5A', lavande: '#9C88C9', fleurs: '#F2C14E', feuillage: '#7FA37A' },
      dessin: function (a, b, c, t) {
        var s = '';
        var lavande = function (x, y, ang) {
          var g2 = '<path d="M0 0L0 -46" stroke="' + c.feuillage + '" stroke-width="1.2"/>';
          for (var i = 0; i < 7; i++) g2 += '<ellipse cx="' + (i % 2 ? 2.5 : -2.5) + '" cy="' + (-22 - i * 4) + '" rx="2.6" ry="4" fill="' + (i % 2 ? c.lavande : teinte(c.lavande, .25)) + '"/>';
          return '<g transform="translate(' + r2(x) + ' ' + r2(y) + ') rotate(' + r2(ang) + ')">' + g2 + '</g>';
        };
        // Croissant de fleurs des champs sous les lettres : brins de lavande
        // qui rayonnent vers l'exterieur, feuilles, fleurs jaunes et blanches.
        for (var k = 0; k < 13; k++) {
          var ang = 18 + k * (144 / 12), p = P(84, ang, 150, 128);
          s += lavande(p[0], p[1], ang + 90);
        }
        for (var j = 0; j < 9; j++) {
          var a2 = 22 + j * 17, q = P(86, a2, 150, 128);
          s += feuilleP(q[0], q[1], a2 + (j % 2 ? 30 : -30), 18, 5, c.feuillage);
          if (j % 2 === 0) s += fleur5(q[0], q[1], 7, c.fleurs, '#C9822E', j * 11);
        }
        s += fleur5(72, 168, 10, '#FFFFFF', c.fleurs) + fleur5(228, 168, 10, '#FFFFFF', c.fleurs) + fleur5(150, 222, 9, '#FFFFFF', c.fleurs);
        return svg(s +
          monoDiag(a, b, { fill: c.lettres, size: 80, cy: 118, dx: 15, dy: 26, font: 'Cormorant Garamond, serif', weight: 500 }) + legende(t, 290, c.lettres, { size: 12 }));
      },
    },
  ];

  var FAMILLES = { trait: TRAIT, couleur: COULEUR };

  var LIBELLES = {
    lettres: 'Lettres', ornement: 'Ornements', fleurs: 'Fleurs', fleurs2: 'Autres fleurs', feuillage: 'Feuillage',
    ciel: 'Ciel', ville: 'Ville', arche: 'Arche', plumes: 'Plumes', oeil: 'Œil des plumes', or: 'Doré',
    fruits: 'Grenades', voile: 'Voile', blason: 'Écusson', mer: 'Mer', olives: 'Olives', lavande: 'Lavande',
  };

  /** Dessine le style avec les initiales, couleurs et texte donnes. */
  function dessiner(style, a, b, couleurs, texte) {
    var c = {};
    for (var k in style.couleurs) c[k] = (couleurs && couleurs[k]) || style.couleurs[k];
    return style.dessin(echappe(a || ' '), echappe(b || ' '), c, echappe(texte || ''));
  }

  return { FAMILLES: FAMILLES, LIBELLES: LIBELLES, dessiner: dessiner };
})();
