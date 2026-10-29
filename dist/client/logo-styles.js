/**
 * Styles du generateur de logo (version d'essai), en deux familles :
 *   TRAIT   : monogrammes au trait fin facon gravure botanique (couronnes,
 *             ecussons, medaillons, cartouches...)
 *   COULEUR : vignettes illustrees facon aquarelle (Jerusalem, paon,
 *             pivoines, bord de mer...)
 *
 *   { id, nom, couleurs: { cle: '#hex' }, dessin(a, b, c, texte) -> svg }
 *
 * a, b : les deux initiales ; texte : ligne facultative sous le logo.
 * Tout est dessine en SVG (viewBox 300 x 300).
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
  function g(x, y, a, s, contenu) {
    return '<g transform="translate(' + r2(x) + ' ' + r2(y) + ')' + (a ? ' rotate(' + r2(a) + ')' : '') + (s && s !== 1 ? ' scale(' + r2(s) + ')' : '') + '">' + contenu + '</g>';
  }
  /** Moitie gauche d'un motif + son reflet a droite (symetrie verticale). */
  function symetrie(contenu) {
    return contenu + '<g transform="translate(300 0) scale(-1 1)">' + contenu + '</g>';
  }

  /* -------- courbes de Bezier -------- */
  function bz(c, t) {
    var u = 1 - t;
    return [u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0],
            u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1]];
  }
  function bzAngle(c, t) {
    var a = bz(c, Math.max(0, t - .01)), b = bz(c, Math.min(1, t + .01));
    return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
  }
  function chemin(c) {
    return 'M' + c.map(function (p, i) { return (i === 1 ? 'C' : '') + r2(p[0]) + ' ' + r2(p[1]); }).join(' ');
  }

  /* ================================================================ *
   * Lettres et textes
   * ================================================================ */

  /** Monogramme emboite : grande premiere lettre, seconde decalee en bas a
   *  droite qui vient s'y imbriquer, eventuellement une etincelle. */
  /* Largeur approximative des capitales (en em) : les reglages des styles
   * sont faits pour "I" + "Y" ; des lettres plus larges (M, W...) sont
   * davantage ecartees et un peu reduites pour rester lisibles. */
  var LARGEURS = { I: .34, J: .4, L: .58, F: .58, E: .62, P: .6, T: .62, S: .55, Z: .62, Y: .7, K: .7, B: .66, R: .68, C: .7, X: .72, V: .72, A: .74, D: .76, H: .78, U: .76, N: .8, G: .76, O: .8, Q: .8, M: .96, W: 1.02 };
  function largeur(l) { return LARGEURS[String(l).toUpperCase()] || .7; }

  var policeChoisie = null;   // fixee par dessiner() le temps d'un rendu

  function monogramme(a, b, o) {
    if (policeChoisie) o = Object.assign({}, o, { police: policeChoisie.famille, graisse: policeChoisie.graisse, italique: policeChoisie.italique });
    var somme = largeur(a) + largeur(b), facteur = Math.max(1, somme / 1.04);
    var cx = o.cx || 150, cy = o.cy || 150, taille = (o.taille || 96) * Math.min(1, 1.55 / somme);
    var dx = (o.dx == null ? (o.taille || 96) * .2 : o.dx) * facteur, dy = o.dy == null ? taille * .3 : o.dy;
    var attr = 'font-family="' + (o.police || 'Bodoni Moda, serif') + '" font-size="' + taille + '" fill="' + o.couleur + '" text-anchor="middle"' +
      (o.graisse ? ' font-weight="' + o.graisse + '"' : '') + (o.italique ? ' font-style="italic"' : '');
    return '<text x="' + r2(cx - dx) + '" y="' + r2(cy) + '" ' + attr + '>' + a + '</text>' +
           '<text x="' + r2(cx + dx) + '" y="' + r2(cy + dy) + '" ' + attr + '>' + b + '</text>' +
           (o.etincelle ? etincelle(cx - dx * .1, cy + dy * .55, 4.5, o.etincelle) : '');
  }

  /** Ligne de texte en petites capitales espacees. */
  function legende(texte, y, couleur, o) {
    if (!texte) return '';
    o = o || {};
    // Largeur estimee (capitales ~0.68 em + espacement) : on reduit taille et
    // espacement pour que le texte tienne dans o.max (largeur disponible).
    var taille = o.taille || 10.5, espace = o.espace == null ? 3.2 : o.espace, max = o.max || 250;
    var n = String(texte).replace(/&amp;/g, '&').length;
    var largeurTxt = n * (taille * .68 + espace);
    if (largeurTxt > max) { var k = max / largeurTxt; taille = r2(taille * Math.max(.6, k)); espace = r2(espace * k * k); }
    return '<text x="150" y="' + y + '" text-anchor="middle" font-family="' + (o.police || 'Cormorant Garamond, serif') + '" font-weight="' + (o.graisse || 600) + '" font-size="' + taille +
      '" letter-spacing="' + espace + '" fill="' + couleur + '"' + (o.italique ? ' font-style="italic"' : '') + '>' +
      (o.casse === false ? texte : texte.toUpperCase()) + '</text>';
  }

  function etincelle(x, y, r, c) {
    var d = 'M0 ' + (-r) + 'C' + r2(r * .12) + ' ' + r2(-r * .12) + ' ' + r2(r * .12) + ' ' + r2(-r * .12) + ' ' + r + ' 0C' + r2(r * .12) + ' ' + r2(r * .12) + ' ' + r2(r * .12) + ' ' + r2(r * .12) + ' 0 ' + r +
      'C' + r2(-r * .12) + ' ' + r2(r * .12) + ' ' + r2(-r * .12) + ' ' + r2(r * .12) + ' ' + (-r) + ' 0C' + r2(-r * .12) + ' ' + r2(-r * .12) + ' ' + r2(-r * .12) + ' ' + r2(-r * .12) + ' 0 ' + (-r) + 'Z';
    return g(x, y, 0, 1, '<path d="' + d + '" fill="' + c + '"/>');
  }
  function point(x, y, r, c) { return '<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r + '" fill="' + c + '"/>'; }

  /* ================================================================ *
   * Gravure botanique au trait (famille TRAIT)
   * ================================================================ */

  /** Feuille nervuree pointant vers +x. */
  function feuilleT(l, w, c, sw) {
    var s = '<path d="M0 0C' + r2(l * .25) + ' ' + r2(-w * 1.05) + ' ' + r2(l * .7) + ' ' + r2(-w * .95) + ' ' + l + ' 0C' + r2(l * .7) + ' ' + r2(w * .95) + ' ' + r2(l * .25) + ' ' + r2(w * 1.05) + ' 0 0Z" fill="none" stroke="' + c + '" stroke-width="' + (sw || .7) + '" stroke-linejoin="round"/>' +
      '<path d="M' + r2(l * .06) + ' 0Q' + r2(l * .5) + ' ' + r2(w * .08) + ' ' + r2(l * .9) + ' 0" fill="none" stroke="' + c + '" stroke-width=".45"/>';
    if (l > 9) {
      for (var k = 1; k <= 3; k++) {
        var x = l * (.2 + k * .17);
        s += '<path d="M' + r2(x) + ' 0L' + r2(x + l * .1) + ' ' + r2(-w * .55) + 'M' + r2(x) + ' 0L' + r2(x + l * .1) + ' ' + r2(w * .55) + '" stroke="' + c + '" stroke-width=".35"/>';
      }
    }
    return s;
  }

  /** Brin : tige courbe garnie de feuilles appariees qui rapetissent vers la
   *  pointe, terminee par une feuille ou un bouton. */
  function brin(courbe, o) {
    var c = o.c, n = o.n || 8, l0 = o.l0 || 12, l1 = o.l1 || 6, ouv = o.ouv || 42;
    var s = '<path d="' + chemin(courbe) + '" fill="none" stroke="' + c + '" stroke-width="' + (o.tsw || .8) + '" stroke-linecap="round"/>';
    for (var i = 0; i < n; i++) {
      var t = .14 + .8 * i / Math.max(1, n - 1);
      var p = bz(courbe, t), a = bzAngle(courbe, t), l = l0 + (l1 - l0) * t;
      var cotes = o.alterne ? [i % 2 ? 1 : -1] : [1, -1];
      cotes.forEach(function (sd) { s += g(p[0], p[1], a + sd * ouv, 1, feuilleT(l, l * (o.ratio || .3), c)); });
    }
    var fin = bz(courbe, 1), af = bzAngle(courbe, 1);
    s += o.bouton ? g(fin[0], fin[1], af, 1, boutonT(l1 * 1.3, c)) : g(fin[0], fin[1], af, 1, feuilleT(l1 * 1.1, l1 * .32, c));
    return s;
  }

  /** Fougere : tige fine et nombreuses folioles minuscules. */
  function fougere(courbe, c, n) {
    var s = '<path d="' + chemin(courbe) + '" fill="none" stroke="' + c + '" stroke-width=".6"/>';
    n = n || 14;
    for (var i = 0; i < n; i++) {
      var t = .08 + .9 * i / (n - 1), p = bz(courbe, t), a = bzAngle(courbe, t), l = 7 * (1 - t * .6);
      s += g(p[0], p[1], a - 55, 1, '<path d="M0 0Q' + r2(l * .5) + ' -2 ' + r2(l) + ' 0Q' + r2(l * .5) + ' 2 0 0Z" fill="none" stroke="' + c + '" stroke-width=".45"/>') +
           g(p[0], p[1], a + 55, 1, '<path d="M0 0Q' + r2(l * .5) + ' -2 ' + r2(l) + ' 0Q' + r2(l * .5) + ' 2 0 0Z" fill="none" stroke="' + c + '" stroke-width=".45"/>');
    }
    return s;
  }

  /** Bouton floral (goutte + deux sepales) pointant vers +x. */
  function boutonT(l, c) {
    return '<path d="M0 0C' + r2(l * .35) + ' ' + r2(-l * .38) + ' ' + r2(l * .85) + ' ' + r2(-l * .3) + ' ' + l + ' 0C' + r2(l * .85) + ' ' + r2(l * .3) + ' ' + r2(l * .35) + ' ' + r2(l * .38) + ' 0 0Z" fill="none" stroke="' + c + '" stroke-width=".7"/>' +
      '<path d="M' + r2(l * .1) + ' 0Q' + r2(l * .45) + ' ' + r2(-l * .5) + ' ' + r2(l * .62) + ' ' + r2(-l * .2) + 'M' + r2(l * .1) + ' 0Q' + r2(l * .45) + ' ' + r2(l * .5) + ' ' + r2(l * .62) + ' ' + r2(l * .2) + '" fill="none" stroke="' + c + '" stroke-width=".55"/>' +
      '<path d="M' + r2(l * .45) + ' 0L' + r2(l * .95) + ' 0" stroke="' + c + '" stroke-width=".35"/>';
  }

  /** Fleur type cosmos : petales echancres, coeur pointille. */
  function cosmos(x, y, r, c, rot) {
    var s = '', n = 8;
    for (var k = 0; k < n; k++) {
      var a = (rot || 0) + 360 / n * k, w = r * .26;
      s += g(x, y, a, 1, '<path d="M' + r2(r * .22) + ' 0C' + r2(r * .3) + ' ' + r2(-w) + ' ' + r2(r * .85) + ' ' + r2(-w * 1.1) + ' ' + r + ' ' + r2(-w * .5) + 'L' + r2(r * .9) + ' 0L' + r + ' ' + r2(w * .5) + 'C' + r2(r * .85) + ' ' + r2(w * 1.1) + ' ' + r2(r * .3) + ' ' + r2(w) + ' ' + r2(r * .22) + ' 0Z" fill="#fff" stroke="' + c + '" stroke-width=".65"/>' +
        '<path d="M' + r2(r * .3) + ' 0L' + r2(r * .7) + ' 0" stroke="' + c + '" stroke-width=".35"/>');
    }
    s += '<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r2(r * .22) + '" fill="#fff" stroke="' + c + '" stroke-width=".7"/>';
    for (var j = 0; j < 9; j++) { var aa = rad(j * 40); s += point(x + Math.cos(aa) * r * .12, y + Math.sin(aa) * r * .12, .55, c); }
    return s;
  }

  /** Anemone : cinq petales arrondis qui se chevauchent, coeur fonce. */
  function anemone(x, y, r, c, rot) {
    var s = '';
    for (var k = 0; k < 5; k++) {
      var a = (rot || 0) + 72 * k;
      s += g(x, y, a, 1, '<path d="M0 0C' + r2(r * .2) + ' ' + r2(-r * .62) + ' ' + r2(r * 1.05) + ' ' + r2(-r * .58) + ' ' + r2(r * 1.02) + ' 0C' + r2(r * 1.05) + ' ' + r2(r * .58) + ' ' + r2(r * .2) + ' ' + r2(r * .62) + ' 0 0Z" fill="#fff" stroke="' + c + '" stroke-width=".65"/>' +
        '<path d="M' + r2(r * .3) + ' ' + r2(-r * .15) + 'Q' + r2(r * .6) + ' 0 ' + r2(r * .3) + ' ' + r2(r * .15) + '" fill="none" stroke="' + c + '" stroke-width=".35"/>');
    }
    s += '<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r2(r * .26) + '" fill="' + c + '"/>';
    for (var j = 0; j < 10; j++) { var aa = rad(j * 36); s += point(x + Math.cos(aa) * r * .4, y + Math.sin(aa) * r * .4, .5, c); }
    return s;
  }

  /** Lys : corolle en trompette (pointant vers +x), etamines. */
  function lys(l, c) {
    var s = '<path d="M0 0C' + r2(l * .4) + ' ' + r2(-l * .08) + ' ' + r2(l * .7) + ' ' + r2(-l * .45) + ' ' + l + ' ' + r2(-l * .42) + 'C' + r2(l * .85) + ' ' + r2(-l * .25) + ' ' + r2(l * .8) + ' ' + r2(-l * .05) + ' ' + r2(l * .9) + ' 0' +
      'C' + r2(l * .8) + ' ' + r2(l * .05) + ' ' + r2(l * .85) + ' ' + r2(l * .25) + ' ' + l + ' ' + r2(l * .42) + 'C' + r2(l * .7) + ' ' + r2(l * .45) + ' ' + r2(l * .4) + ' ' + r2(l * .08) + ' 0 0Z" fill="#fff" stroke="' + c + '" stroke-width=".7"/>' +
      '<path d="M' + r2(l * .15) + ' 0C' + r2(l * .5) + ' ' + r2(-l * .1) + ' ' + r2(l * .8) + ' ' + r2(-l * .1) + ' ' + r2(l * 1.05) + ' ' + r2(-l * .05) + '" fill="none" stroke="' + c + '" stroke-width=".5"/>';
    [-.18, 0, .18].forEach(function (d) {
      s += '<path d="M' + r2(l * .3) + ' 0L' + r2(l * 1.05) + ' ' + r2(l * d) + '" stroke="' + c + '" stroke-width=".35"/>' + point(l * 1.07, l * d, .8, c);
    });
    return s;
  }

  /** Noeud de ruban (deux boucles, noeud, deux pans ondules). */
  function noeud(x, y, e, c) {
    var s = '<path d="M0 0C-10 -12 -30 -16 -34 -6C-37 3 -18 6 0 0Z" fill="#fff" stroke="' + c + '" stroke-width=".8"/>' +
      '<path d="M-6 -2C-16 -8 -26 -10 -29 -5" fill="none" stroke="' + c + '" stroke-width=".45"/>' +
      '<path d="M0 0C10 -12 30 -16 34 -6C37 3 18 6 0 0Z" fill="#fff" stroke="' + c + '" stroke-width=".8"/>' +
      '<path d="M6 -2C16 -8 26 -10 29 -5" fill="none" stroke="' + c + '" stroke-width=".45"/>' +
      '<path d="M-3 1C-8 12 -12 22 -20 32L-14 31L-11 36C-6 26 -2 14 1 3Z" fill="#fff" stroke="' + c + '" stroke-width=".8"/>' +
      '<path d="M3 1C8 12 12 22 20 32L14 31L11 36C6 26 2 14 -1 3Z" fill="#fff" stroke="' + c + '" stroke-width=".8"/>' +
      '<ellipse cx="0" cy="0" rx="4.2" ry="3.4" fill="#fff" stroke="' + c + '" stroke-width=".8"/>';
    return g(x, y, 0, e, s);
  }

  /** Fleur de lys (centree, pointe vers le haut). */
  function fleurDeLys(x, y, e, c) {
    var s = '<path d="M0 -16C5 -10 6 -3 2 4L0 6L-2 4C-6 -3 -5 -10 0 -16Z" fill="none" stroke="' + c + '" stroke-width=".9"/>' +
      '<path d="M-2 3C-6 -4 -14 -6 -15 0C-16 5 -10 7 -7 4" fill="none" stroke="' + c + '" stroke-width=".9"/>' +
      '<path d="M2 3C6 -4 14 -6 15 0C16 5 10 7 7 4" fill="none" stroke="' + c + '" stroke-width=".9"/>' +
      '<path d="M-7 6H7" stroke="' + c + '" stroke-width="1.4"/><path d="M-2 8C-4 12 -5 14 -3 16M2 8C4 12 5 14 3 16" fill="none" stroke="' + c + '" stroke-width=".8"/>';
    return g(x, y, 0, e, s);
  }

  /** Volute en C (vers la droite), pour les cartouches et fleurons. */
  function volute(x, y, e, c, miroir) {
    var s = '<path d="M0 0C6 -8 18 -8 20 0C22 7 14 11 9 7C5 4 8 -1 12 1" fill="none" stroke="' + c + '" stroke-width=".9" stroke-linecap="round"/>' +
            '<path d="M0 0C-4 4 -10 6 -16 5" fill="none" stroke="' + c + '" stroke-width=".8" stroke-linecap="round"/>';
    return '<g transform="translate(' + r2(x) + ' ' + r2(y) + ') scale(' + (miroir ? -e : e) + ' ' + e + ')">' + s + '</g>';
  }

  /** Fleuron : fleur de lys entouree de deux volutes (haut de cadre). */
  function fleuron(x, y, e, c, retourne) {
    var s = fleurDeLys(0, -14, .8, c) + volute(4, -2, .7, c, false) + volute(-4, -2, .7, c, true) + point(0, 4, 1.4, c);
    return '<g transform="translate(' + r2(x) + ' ' + r2(y) + ') scale(' + e + ' ' + (retourne ? -e : e) + ')">' + s + '</g>';
  }

  /** Grappe de petites baies sur tiges fines. */
  function baies(x, y, ang, c) {
    var s = '';
    [[-14, -6], [-12, 2], [-7, -9], [-5, 5], [0, -3]].forEach(function (q) {
      s += '<path d="M0 0L' + q[0] + ' ' + q[1] + '" stroke="' + c + '" stroke-width=".4"/><circle cx="' + q[0] + '" cy="' + q[1] + '" r="1.7" fill="#fff" stroke="' + c + '" stroke-width=".55"/>';
    });
    return g(x, y, ang, 1, s);
  }

  /** Branche de couronne (cote gauche) : tige principale le long d'un arc,
   *  rameaux secondaires, fougeres, fleurs et boutons. Le cote droit est
   *  obtenu par symetrie. */
  function brancheCouronne(c, o) {
    o = o || {};
    var R = o.R || 104, cy = o.cy || 150;
    var P = function (ang, rr) { return [150 + Math.cos(rad(ang)) * (rr || R), cy + Math.sin(rad(ang)) * (rr || R)]; };
    var a0 = o.a0 || 104, a1 = o.a1 || 238;
    var p0 = P(a0), p1 = P(a0 + (a1 - a0) * .33, R * 1.04), p2 = P(a0 + (a1 - a0) * .7, R * 1.02), p3 = P(a1, R * .96);
    var tige = [p0, p1, p2, p3];
    var s = brin(tige, { c: c, n: 22, l0: 14, l1: 7, ouv: 42, tsw: .9, bouton: true });
    // seconde tige, plus fine, doublant la premiere a l'interieur
    var q0 = P(a0 + 6, R * .93), q1 = P(a0 + (a1 - a0) * .35, R * .9), q2 = P(a0 + (a1 - a0) * .68, R * .9), q3 = P(a1 - 14, R * .86);
    s += brin([q0, q1, q2, q3], { c: c, n: 16, l0: 10, l1: 5, ouv: 48, tsw: .6, alterne: true });
    // rameaux secondaires vers l'exterieur
    [.12, .28, .44, .6, .76, .9].forEach(function (t, i) {
      var b = bz(tige, t), ang = bzAngle(tige, t) - 55 + (i % 2 ? 12 : 0), L = 36 - i * 3.5;
      var fin = [b[0] + Math.cos(rad(ang)) * L, b[1] + Math.sin(rad(ang)) * L];
      var ctl = [b[0] + Math.cos(rad(ang + 20)) * L * .5, b[1] + Math.sin(rad(ang + 20)) * L * .5];
      s += brin([b, ctl, ctl, fin], { c: c, n: 6, l0: 9, l1: 5, ouv: 46, tsw: .6, bouton: i % 3 === 2 });
    });
    // petits brins vers l'interieur
    [.3, .55, .82].forEach(function (t) {
      var b = bz(tige, t), ang = bzAngle(tige, t) + 60, L = 18;
      var fin = [b[0] + Math.cos(rad(ang)) * L, b[1] + Math.sin(rad(ang)) * L];
      s += brin([b, [b[0] + Math.cos(rad(ang - 15)) * L * .5, b[1] + Math.sin(rad(ang - 15)) * L * .5], fin, fin], { c: c, n: 4, l0: 7, l1: 4, ouv: 48, tsw: .5 });
    });
    // fougere interieure
    var bf = bz(tige, .7), af = bzAngle(tige, .7) - 70;
    s += fougere([bf, [bf[0] + Math.cos(rad(af)) * 10, bf[1] + Math.sin(rad(af)) * 10], [bf[0] + Math.cos(rad(af - 12)) * 20, bf[1] + Math.sin(rad(af - 12)) * 20], [bf[0] + Math.cos(rad(af - 25)) * 28, bf[1] + Math.sin(rad(af - 25)) * 28]], c, 10);
    var bi = bz(tige, .4), ai = bzAngle(tige, .4) + 40;
    s += fougere([bi, [bi[0] + Math.cos(rad(ai)) * 12, bi[1] + Math.sin(rad(ai)) * 12], [bi[0] + Math.cos(rad(ai + 10)) * 22, bi[1] + Math.sin(rad(ai + 10)) * 22], [bi[0] + Math.cos(rad(ai + 25)) * 30, bi[1] + Math.sin(rad(ai + 25)) * 30]], c, 11);
    // fleurs
    var f1 = bz(tige, .36), f2 = bz(tige, .63);
    s += cosmos(f1[0] - 7, f1[1] + 2, o.grandeFleur || 11, c, 12) + anemone(f2[0] - 5, f2[1] - 2, 7.5, c, 20);
    var f3 = bz(tige, .88); s += g(f3[0], f3[1], bzAngle(tige, .88) - 60, 1, boutonT(10, c));
    if (o.baies !== false) { var bb = bz(tige, .15); s += baies(bb[0] + 4, bb[1] + 4, 200, c); }
    return s;
  }

  /* ================================================================ *
   * Lianes : feuillage leger qui court le long d'un cadre (arche,
   * ecusson, ovale, cercle...), pour habiller tout le contour sans le
   * surcharger. Le trace est mesure par le navigateur (getPointAtLength).
   * ================================================================ */

  var mesureur = null;
  function echantillons(d, t0, t1, pas) {
    if (!mesureur) {
      var hote = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      hote.setAttribute('width', '0'); hote.setAttribute('height', '0');
      hote.style.position = 'absolute'; hote.style.visibility = 'hidden';
      mesureur = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hote.appendChild(mesureur);
      document.body.appendChild(hote);
    }
    mesureur.setAttribute('d', d);
    var L = mesureur.getTotalLength(), pts = [];
    for (var l = L * t0; l <= L * t1; l += pas) {
      var p = mesureur.getPointAtLength(l), q = mesureur.getPointAtLength(Math.min(L, l + 1));
      pts.push({ x: p.x, y: p.y, a: Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI });
    }
    return pts;
  }
  function arcD(R, a0, a1, cx, cy) {
    var p0 = [(cx || 150) + Math.cos(rad(a0)) * R, (cy || 150) + Math.sin(rad(a0)) * R], p1 = [(cx || 150) + Math.cos(rad(a1)) * R, (cy || 150) + Math.sin(rad(a1)) * R];
    return 'M' + r2(p0[0]) + ' ' + r2(p0[1]) + 'A' + R + ' ' + R + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' ' + (a1 > a0 ? 1 : 0) + ' ' + r2(p1[0]) + ' ' + r2(p1[1]);
  }

  /** Liane le long du trace `d` (entre les fractions t0 et t1 de sa
   *  longueur), decalee vers l'exterieur. mode 'trait' ou 'aquarelle'. */
  function liane(d, o) {
    if (o.sym) return symetrie(liane(d, Object.assign({}, o, { sym: false })));
    var pts = echantillons(d, o.t0 || 0, o.t1 == null ? 1 : o.t1, o.pas || 7);
    if (pts.length < 2) return '';
    var cx = o.cx || 150, cy = o.cy || 150, decal = o.decal == null ? 5 : o.decal, aq = o.mode === 'aquarelle';
    var tige = [], s = '';
    pts.forEach(function (p, i) {
      // normale orientee vers l'exterieur (loin du centre du logo)
      var n = p.a - 90, nx = Math.cos(rad(n)), ny = Math.sin(rad(n));
      if (nx * (p.x - cx) + ny * (p.y - cy) < 0) { n += 180; nx = -nx; ny = -ny; }
      var x = p.x + nx * decal + Math.sin(i * 1.7) * 1.4, y = p.y + ny * decal + Math.cos(i * 1.3) * 1.4;
      tige.push(r2(x) + ' ' + r2(y));
      var cote = i % 2 ? 1 : -1, ang = p.a + (cote > 0 ? 180 : 0) + cote * (38 + (i % 3) * 8);
      // feuilles plutot tournees vers l'exterieur
      var angExt = n + cote * 25;
      var taille = (o.taille || (aq ? 12 : 8)) * (.75 + (i % 4) * .12);
      if (aq) {
        s += feuilleA(x, y, i % 3 ? ang : angExt, taille, taille * .3, i % 3 ? o.feuillage : teinte(o.feuillage, i % 2 ? .3 : -.12));
        if (o.fleurs && i % 7 === 3) s += fleurA(x + nx * 3, y + ny * 3, 4.5, i % 2 ? o.fleurs : '#FFFFFF', '#E6B85C', i * 23);
        else if (i % 5 === 0) s += point(x + nx * 4, y + ny * 4, 1.6, i % 2 ? '#FFFFFF' : teinte(o.feuillage, .5));
      } else {
        s += g(x, y, i % 3 ? ang : angExt, 1, feuilleT(taille, taille * .3, o.c, .55));
        if (i % 9 === 4) s += anemone(x + nx * 4, y + ny * 4, 3.6, o.c, i * 17);
        else if (i % 6 === 1) s += g(x, y, n, 1, boutonT(6, o.c));
      }
    });
    var trait = '<path d="M' + tige.join('L') + '" fill="none" stroke="' + (aq ? teinte(o.feuillage, -.25) : o.c) + '" stroke-width="' + (aq ? .9 : .5) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    return trait + s;
  }

  /** Ecusson a epaules decoupees (comme un blason de mariage). */
  var ECUSSON = 'M150 54C168 54 184 50 196 42L204 48C212 46 218 44 222 40C225 74 226 108 222 142C216 192 188 226 150 246C112 226 84 192 78 142C74 108 75 74 78 40C82 44 88 46 96 48L104 42C116 50 132 54 150 54Z';

  /* ================================================================ *
   * Aquarelle (famille COULEUR)
   * ================================================================ */

  /** Filtres communs : contour d'aquarelle, papier. */
  function defsAquarelle(id) {
    return '<filter id="aq' + id + '" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="' + (id % 9 + 2) + '"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>' +
      '<filter id="fl' + id + '"><feGaussianBlur stdDeviation="1.6"/></filter>';
  }

  function teinte(hex, t) {
    var h = String(hex).replace('#', ''); if (h.length !== 6) return hex;
    var v = [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
    v = v.map(function (x) { return Math.round(t > 0 ? x + (255 - x) * t : x * (1 + t)); });
    return '#' + v.map(function (x) { return ('0' + Math.max(0, Math.min(255, x)).toString(16)).slice(-2); }).join('');
  }

  /** Feuille aquarelle : degrade, nervure claire, bord legerement plus fonce. */
  function feuilleA(x, y, a, l, w, c) {
    return g(x, y, a, 1,
      '<path d="M0 0C' + r2(l * .25) + ' ' + r2(-w) + ' ' + r2(l * .7) + ' ' + r2(-w * .95) + ' ' + l + ' 0C' + r2(l * .7) + ' ' + r2(w * .95) + ' ' + r2(l * .25) + ' ' + r2(w) + ' 0 0Z" fill="' + c + '" opacity=".88"/>' +
      '<path d="M0 0C' + r2(l * .25) + ' ' + r2(-w) + ' ' + r2(l * .7) + ' ' + r2(-w * .95) + ' ' + l + ' 0" fill="none" stroke="' + teinte(c, -.3) + '" stroke-width=".5" opacity=".7"/>' +
      '<path d="M' + r2(l * .08) + ' 0Q' + r2(l * .5) + ' ' + r2(w * .1) + ' ' + r2(l * .92) + ' 0" fill="none" stroke="' + teinte(c, .45) + '" stroke-width=".7"/>');
  }

  /** Pivoine / rose aquarelle : couronnes de petales degradees. */
  function pivoine(x, y, r, c, rot) {
    var s = '', clair = teinte(c, .5), fonce = teinte(c, -.25);
    for (var k = 0; k < 8; k++) {
      var a = (rot || 0) + k * 45;
      s += g(x, y, a, 1, '<path d="M0 0C' + r2(r * .3) + ' ' + r2(-r * .8) + ' ' + r2(r * 1.1) + ' ' + r2(-r * .7) + ' ' + r2(r * 1.05) + ' 0C' + r2(r * 1.1) + ' ' + r2(r * .7) + ' ' + r2(r * .3) + ' ' + r2(r * .8) + ' 0 0Z" fill="' + (k % 2 ? clair : teinte(c, .3)) + '" opacity=".9"/>');
    }
    for (var j = 0; j < 6; j++) {
      var b = (rot || 0) + 20 + j * 60;
      s += g(x, y, b, 1, '<path d="M0 0C' + r2(r * .2) + ' ' + r2(-r * .55) + ' ' + r2(r * .72) + ' ' + r2(-r * .5) + ' ' + r2(r * .7) + ' 0C' + r2(r * .72) + ' ' + r2(r * .5) + ' ' + r2(r * .2) + ' ' + r2(r * .55) + ' 0 0Z" fill="' + c + '" opacity=".85"/>');
    }
    s += '<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r2(r * .34) + '" fill="' + fonce + '" opacity=".9"/>' +
      '<path d="M' + r2(x - r * .25) + ' ' + r2(y) + 'A' + r2(r * .25) + ' ' + r2(r * .25) + ' 0 1 1 ' + r2(x + r * .15) + ' ' + r2(y + r * .2) + '" fill="none" stroke="' + teinte(c, -.45) + '" stroke-width=".8"/>' +
      '<ellipse cx="' + r2(x - r * .35) + '" cy="' + r2(y - r * .45) + '" rx="' + r2(r * .25) + '" ry="' + r2(r * .12) + '" fill="#fff" opacity=".45"/>';
    return s;
  }

  /** Petite fleur aquarelle a cinq petales. */
  function fleurA(x, y, r, c, coeur, rot) {
    var s = '';
    for (var k = 0; k < 5; k++) {
      var a = (rot || -90) + 72 * k;
      s += g(x, y, a, 1, '<ellipse cx="' + r2(r * .55) + '" cy="0" rx="' + r2(r * .5) + '" ry="' + r2(r * .36) + '" fill="' + (k % 2 ? c : teinte(c, .25)) + '" opacity=".92"/>');
    }
    return s + '<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r2(r * .25) + '" fill="' + coeur + '"/>';
  }

  /** Bouquet aquarelle : feuilles en eventail, pivoine, roses, fleurettes. */
  function bouquetA(x, y, e, c, rot) {
    var s = '';
    for (var k = 0; k < 9; k++) {
      var a = (rot || 0) - 190 + k * 42;
      s += feuilleA(x, y, a, (k % 2 ? 26 : 32) * e, 8 * e, k % 3 ? c.feuillage : teinte(c.feuillage, .3));
    }
    s += pivoine(x, y, 15 * e, c.fleurs, rot || 0) +
      pivoine(x + 17 * e, y - 11 * e, 9 * e, c.fleurs2 || teinte(c.fleurs, .3), 30) +
      fleurA(x - 19 * e, y + 7 * e, 7 * e, '#FFFFFF', '#E6B85C') +
      fleurA(x + 6 * e, y + 18 * e, 6 * e, c.fleurs3 || '#F3D9A4', '#C98F3A', 20);
    for (var j = 0; j < 6; j++) {
      var aa = rad((rot || 0) - 150 + j * 25), d = 26 * e;
      s += point(x + Math.cos(aa) * d, y + Math.sin(aa) * d, 1.6 * e, '#FFFFFF') + point(x + Math.cos(aa) * d, y + Math.sin(aa) * d, .6 * e, '#E6B85C');
    }
    return s;
  }

  /** Bandeau de ruban (pour les prenoms sous les logos colores). */
  function ruban(y, c, texte, cTexte) {
    if (!texte) return '';
    return '<path d="M54 ' + (y - 6) + 'L74 ' + (y - 14) + 'L72 ' + (y + 8) + 'L54 ' + (y + 12) + 'L62 ' + (y + 3) + 'Z" fill="' + teinte(c, -.15) + '"/>' +
      '<path d="M246 ' + (y - 6) + 'L226 ' + (y - 14) + 'L228 ' + (y + 8) + 'L246 ' + (y + 12) + 'L238 ' + (y + 3) + 'Z" fill="' + teinte(c, -.15) + '"/>' +
      '<path d="M72 ' + (y - 14) + 'Q150 ' + (y - 24) + ' 228 ' + (y - 14) + 'L228 ' + (y + 8) + 'Q150 ' + (y - 2) + ' 72 ' + (y + 8) + 'Z" fill="' + c + '"/>' +
      legende(texte, y + 1, cTexte, { taille: 10.5, espace: 2.6, max: 140 });
  }

  /** Paysage de Jerusalem (silhouettes) pour une vignette. */
  function jerusalem(c, y0) {
    var v = c.ville, vC = teinte(v, .35), vF = teinte(v, -.15);
    var s = '<path d="M30 ' + (y0 - 10) + 'Q90 ' + (y0 - 46) + ' 150 ' + (y0 - 24) + 'T270 ' + (y0 - 30) + 'V' + (y0 + 60) + 'H30Z" fill="' + teinte(c.ciel, -.12) + '" opacity=".55"/>' +
      '<path d="M30 ' + (y0 + 2) + 'Q110 ' + (y0 - 26) + ' 190 ' + (y0 - 8) + 'T270 ' + (y0 - 12) + 'V' + (y0 + 60) + 'H30Z" fill="' + teinte(c.collines, .3) + '" opacity=".7"/>';
    // remparts creneles
    var rem = 'M62 ' + (y0 + 22) + 'V' + (y0 - 2);
    for (var x = 62; x < 238; x += 8) rem += 'H' + (x + 4) + 'V' + (y0 - 6) + 'H' + (x + 8) + 'V' + (y0 - 2);
    rem += 'V' + (y0 + 22) + 'Z';
    s += '<path d="' + rem + '" fill="' + vC + '"/>';
    // Tour de David
    s += '<path d="M100 ' + (y0 - 2) + 'V' + (y0 - 36) + 'H98V' + (y0 - 40) + 'H118V' + (y0 - 36) + 'H116V' + (y0 - 2) + 'Z" fill="' + v + '"/>' +
      '<path d="M102 ' + (y0 - 40) + 'V' + (y0 - 52) + 'Q108 ' + (y0 - 62) + ' 114 ' + (y0 - 52) + 'V' + (y0 - 40) + 'Z" fill="' + vF + '"/><path d="M108 ' + (y0 - 60) + 'V' + (y0 - 68) + '" stroke="' + vF + '" stroke-width="1"/>' +
      '<rect x="105" y="' + (y0 - 30) + '" width="2" height="5" fill="' + teinte(v, .6) + '"/><rect x="110" y="' + (y0 - 30) + '" width="2" height="5" fill="' + teinte(v, .6) + '"/>';
    // dome dore
    s += '<path d="M150 ' + (y0 - 2) + 'V' + (y0 - 14) + 'H180V' + (y0 - 2) + 'Z" fill="' + v + '"/>' +
      '<path d="M150 ' + (y0 - 14) + 'Q150 ' + (y0 - 36) + ' 165 ' + (y0 - 36) + 'Q180 ' + (y0 - 36) + ' 180 ' + (y0 - 14) + 'Z" fill="' + c.dome + '"/>' +
      '<path d="M165 ' + (y0 - 36) + 'V' + (y0 - 42) + '" stroke="' + c.dome + '" stroke-width="1.2"/>' +
      '<ellipse cx="160" cy="' + (y0 - 28) + '" rx="4" ry="2" fill="#fff" opacity=".5"/>';
    // cypres
    [[74, 1], [86, .8], [214, 1], [226, .85]].forEach(function (q) {
      s += '<path d="M' + q[0] + ' ' + (y0 + 4) + 'C' + (q[0] - 6) + ' ' + (y0 - 14) + ' ' + (q[0] - 3) + ' ' + (y0 - 34 * q[1]) + ' ' + q[0] + ' ' + (y0 - 44 * q[1]) + 'C' + (q[0] + 3) + ' ' + (y0 - 34 * q[1]) + ' ' + (q[0] + 6) + ' ' + (y0 - 14) + ' ' + q[0] + ' ' + (y0 + 4) + 'Z" fill="' + teinte(c.feuillage, -.2) + '"/>';
    });
    // pierre de Jerusalem au premier plan
    s += '<path d="M30 ' + (y0 + 18) + 'Q150 ' + (y0 + 8) + ' 270 ' + (y0 + 18) + 'V' + (y0 + 70) + 'H30Z" fill="' + teinte(v, .55) + '"/>';
    return s;
  }

  /* ================================================================ *
   * Famille TRAIT
   * ================================================================ */

  var TRAIT = [
    {
      id: 'couronne', nom: 'Couronne botanique',
      couleurs: { lettres: '#2A2A26', ornement: '#5C5C52' },
      dessin: function (a, b, c, t) {
        return svg(symetrie(brancheCouronne(c.ornement)) + noeud(150, 254, .62, c.ornement) +
          monogramme(a, b, { couleur: c.lettres, taille: 78, cy: 146, dx: 13, dy: 26 }) + legende(t, 292, c.lettres));
      },
    },
    {
      id: 'arche', nom: 'Arche',
      couleurs: { lettres: '#3B3226', ornement: '#8C7A55' },
      dessin: function (a, b, c, t) {
        var o = c.ornement;
        var arche = function (m) { return 'M' + (96 + m) + ' ' + (246 - m) + 'V' + (116 + m * .4) + 'A' + (54 - m) + ' ' + (54 - m) + ' 0 0 1 ' + (204 - m) + ' ' + (116 + m * .4) + 'V' + (246 - m); };
        var orn = '<path d="M150 38C143 44 134 46 126 44M150 38C157 44 166 46 174 44" fill="none" stroke="' + o + '" stroke-width=".8"/>' +
          g(124, 44, 200, 1, feuilleT(10, 3, o)) + g(176, 44, -20, 1, feuilleT(10, 3, o)) + volute(140, 50, .5, o, true) + volute(160, 50, .5, o, false) +
          anemone(150, 40, 5, o, 0) + point(150, 30, 1.2, o);
        return svg('<path d="' + arche(0) + 'Z" fill="none" stroke="' + o + '" stroke-width="1.1"/>' + '<path d="' + arche(6) + '" fill="none" stroke="' + o + '" stroke-width=".5"/>' +
          '<path d="M86 246H214M92 250H208" stroke="' + o + '" stroke-width=".6"/>' + orn +
          '<g transform="translate(0 292) scale(1 -1)">' + orn + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 76, cy: 156, dx: 12, dy: 22, police: 'Bodoni Moda, serif' }) +
          legende(t, 212, c.lettres, { taille: 9.5, espace: 3, max: 92 }) + '<path d="M132 222H168" stroke="' + o + '" stroke-width=".5"/>' + point(150, 222, 1.1, o));
      },
    },
    {
      id: 'ecusson', nom: 'Écusson',
      couleurs: { lettres: '#2A2A26', ornement: '#5C5C52' },
      dessin: function (a, b, c, t) {
        var o = c.ornement;
        var cote = brin([[100, 236], [78, 214], [58, 184], [50, 132]], { c: o, n: 18, l0: 13, l1: 6, ouv: 44, bouton: true }) +
          brin([[96, 230], [70, 216], [50, 196], [40, 168]], { c: o, n: 12, l0: 10, l1: 5, ouv: 48, tsw: .6, alterne: true }) +
          brin([[78, 214], [62, 210], [44, 200], [36, 182]], { c: o, n: 7, l0: 9, l1: 5, ouv: 46 }) +
          brin([[60, 186], [46, 176], [36, 160], [34, 146]], { c: o, n: 6, l0: 8, l1: 4, ouv: 46, tsw: .5 }) +
          brin([[54, 150], [44, 136], [44, 118], [50, 104]], { c: o, n: 6, l0: 8, l1: 4, ouv: 46, tsw: .5, bouton: true }) +
          fougere([[88, 232], [74, 234], [60, 232], [50, 226]], o, 9) +
          g(56, 176, -120, 1, lys(20, o)) + g(48, 128, -95, 1, boutonT(12, o)) + anemone(68, 206, 6.5, o, 10) +
          fougere([[64, 160], [52, 152], [42, 144], [38, 132]], o, 9);
        return svg(symetrie(cote) +
          '<path d="' + ECUSSON + '" fill="#fff" stroke="' + o + '" stroke-width="1.1"/>' +
          '<path transform="translate(150 146) scale(.9) translate(-150 -146)" d="' + ECUSSON + '" fill="none" stroke="' + o + '" stroke-width=".5"/>' +
          fleurDeLys(150, 28, .9, o) + fleuron(150, 262, .7, o, true) +
          monogramme(a, b, { couleur: c.lettres, taille: 74, cy: 140, dx: 12, dy: 28, etincelle: c.lettres }) + legende(t, 294, c.lettres));
      },
    },
    {
      id: 'cartouche', nom: 'Cartouche',
      couleurs: { lettres: '#2A2A26', ornement: '#5C5C52' },
      dessin: function (a, b, c, t) {
        var o = c.ornement;
        var bord = function (m) {
          var x0 = 52 + m, x1 = 248 - m, y0 = 74 + m, y1 = 226 - m;
          return 'M' + (x0 + 18) + ' ' + y0 + 'Q' + 120 + ' ' + (y0 - 12) + ' 150 ' + (y0 - 2) + 'Q' + 180 + ' ' + (y0 - 12) + ' ' + (x1 - 18) + ' ' + y0 +
            'Q' + x1 + ' ' + y0 + ' ' + x1 + ' ' + (y0 + 18) + 'Q' + (x1 + 10) + ' 150 ' + x1 + ' ' + (y1 - 18) + 'Q' + x1 + ' ' + y1 + ' ' + (x1 - 18) + ' ' + y1 +
            'Q180 ' + (y1 + 12) + ' 150 ' + (y1 + 2) + 'Q120 ' + (y1 + 12) + ' ' + (x0 + 18) + ' ' + y1 + 'Q' + x0 + ' ' + y1 + ' ' + x0 + ' ' + (y1 - 18) +
            'Q' + (x0 - 10) + ' 150 ' + x0 + ' ' + (y0 + 18) + 'Q' + x0 + ' ' + y0 + ' ' + (x0 + 18) + ' ' + y0 + 'Z';
        };
        var acanthe = function (y, sens) {
          return '<g transform="translate(150 ' + y + ') scale(1 ' + sens + ')">' + fleurDeLys(0, -14, .75, o) +
            g(-8, -4, 200, 1, feuilleT(18, 5, o)) + g(8, -4, -20, 1, feuilleT(18, 5, o)) + g(-6, -2, 160, 1, feuilleT(14, 4, o)) + g(6, -2, 20, 1, feuilleT(14, 4, o)) +
            volute(20, -2, .6, o, false) + volute(-20, -2, .6, o, true) + '</g>';
        };
        var cote = g(46, 150, 0, 1, '<path d="M0 -14C-8 -6 -8 6 0 14" fill="none" stroke="' + o + '" stroke-width=".8"/>' + g(0, 0, 180, 1, feuilleT(12, 3.5, o)) + g(-2, -8, 210, 1, feuilleT(9, 3, o)) + g(-2, 8, 150, 1, feuilleT(9, 3, o)) + point(4, 0, 1.3, o));
        return svg('<path d="' + bord(0) + '" fill="none" stroke="' + o + '" stroke-width="1.1"/><path d="' + bord(7) + '" fill="none" stroke="' + o + '" stroke-width=".5"/>' +
          acanthe(72, 1) + acanthe(228, -1) + symetrie(cote) +
          symetrie(brin([[128, 66], [110, 58], [90, 60], [70, 70]], { c: o, n: 8, l0: 8, l1: 4, ouv: 48, tsw: .5 }) +
                   brin([[128, 234], [110, 242], [90, 240], [70, 230]], { c: o, n: 8, l0: 8, l1: 4, ouv: 48, tsw: .5 })) +
          monogramme(a, b, { couleur: c.lettres, taille: 66, cy: 160, cx: 147, dx: 13, dy: 0, police: 'Pinyon Script, cursive' }) + legende(t, 284, c.lettres));
      },
    },
    {
      id: 'medaillon', nom: 'Médaillon',
      couleurs: { lettres: '#2A2A26', ornement: '#4F4B42' },
      dessin: function (a, b, c, t) {
        var o = c.ornement;
        var fin = function (y, sens) {
          return '<g transform="translate(150 ' + y + ') scale(1 ' + sens + ')">' + fleurDeLys(0, -16, .8, o) + volute(5, -2, .75, o, false) + volute(-5, -2, .75, o, true) +
            '<path d="M-26 6Q-14 0 0 2Q14 0 26 6" fill="none" stroke="' + o + '" stroke-width=".7"/>' + point(-28, 6, 1.2, o) + point(28, 6, 1.2, o) + '</g>';
        };
        return svg('<ellipse cx="150" cy="148" rx="60" ry="86" fill="none" stroke="' + o + '" stroke-width="1.3"/>' +
          '<ellipse cx="150" cy="148" rx="55" ry="81" fill="none" stroke="' + o + '" stroke-width=".45"/>' +
          '<ellipse cx="150" cy="148" rx="65" ry="91" fill="none" stroke="' + o + '" stroke-width=".45" stroke-dasharray=".1 3.2" stroke-linecap="round"/>' +
          fin(60, 1) + fin(236, -1) + etincelle(150, 92, 3.2, o) + point(150, 102, 1, o) + etincelle(150, 204, 3.2, o) + point(150, 194, 1, o) +
          monogramme(a, b, { couleur: c.lettres, taille: 60, cy: 168, dx: 15, dy: 0, police: 'Bodoni Moda, serif' }) + legende(t, 290, c.lettres));
      },
    },
    {
      id: 'coeur', nom: 'Cœur au ruban',
      couleurs: { lettres: '#2A2A26', ornement: '#5C5C52' },
      dessin: function (a, b, c, t) {
        var o = c.ornement;
        var coeur = 'M150 250C112 222 70 188 68 140C66 108 88 88 114 88C130 88 143 98 150 110C157 98 170 88 186 88C212 88 234 108 232 140C230 188 188 222 150 250Z';
        var flore = brin([[150, 246], [118, 236], [86, 212], [70, 172]], { c: o, n: 18, l0: 12, l1: 6, ouv: 44, bouton: true }) +
          brin([[146, 240], [116, 228], [92, 206], [80, 178]], { c: o, n: 12, l0: 9, l1: 5, ouv: 48, tsw: .55, alterne: true }) +
          brin([[100, 226], [84, 228], [66, 222], [56, 208]], { c: o, n: 7, l0: 9, l1: 5 }) +
          brin([[80, 200], [66, 192], [56, 178], [54, 160]], { c: o, n: 6, l0: 8, l1: 4, tsw: .5 }) +
          brin([[72, 174], [62, 160], [62, 142], [68, 128]], { c: o, n: 6, l0: 8, l1: 4, tsw: .5, bouton: true }) +
          fougere([[126, 242], [112, 248], [98, 248], [88, 244]], o, 9) +
          cosmos(78, 200, 10, o, 15) + anemone(104, 230, 6.5, o, 30) + g(66, 166, -100, 1, boutonT(11, o)) + baies(124, 244, 170, o);
        return svg('<path d="' + coeur + '" fill="none" stroke="' + o + '" stroke-width="1.1"/>' +
          '<path transform="translate(150 160) scale(.93) translate(-150 -160)" d="' + coeur + '" fill="none" stroke="' + o + '" stroke-width=".45"/>' +
          symetrie(flore) + noeud(150, 100, .72, o) +
          monogramme(a, b, { couleur: c.lettres, taille: 58, cy: 176, dx: 10, dy: 22, etincelle: c.lettres }) + legende(t, 290, c.lettres));
      },
    },
    {
      id: 'superpose', nom: 'Lettres superposées',
      couleurs: { lettres: '#1F1D1A', ornement: '#8B7D6B' },
      dessin: function (a, b, c, t) {
        return svg(monogramme(a, b, { couleur: c.lettres, taille: 128, cy: 162, dx: 24, dy: 32, police: 'Bodoni Moda, serif' }) +
          legende(t, 234, c.lettres, { taille: 12, espace: 4.5, police: 'Bodoni Moda, serif', graisse: 400 }) +
          '<path d="M112 248H188" stroke="' + c.ornement + '" stroke-width=".6"/>' + etincelle(150, 248, 3, c.ornement));
      },
    },
    {
      id: 'minuscules', nom: 'Minuscules',
      couleurs: { lettres: '#1F1D1A', ornement: '#8B7D6B' },
      dessin: function (a, b, c, t) {
        return svg(monogramme(a.toLowerCase(), b.toLowerCase(), { couleur: c.lettres, taille: 150, cy: 178, dx: 30, dy: 0, police: 'Bodoni Moda, serif' }) +
          legende(t, 230, c.ornement, { taille: 15, espace: 1, italique: true, casse: false, graisse: 500 }));
      },
    },
    {
      id: 'cercle', nom: 'Cercle de texte',
      couleurs: { lettres: '#1F1D1A', ornement: '#1F1D1A' },
      dessin: function (a, b, c, t) {
        var id = 'arc-logo-' + (++uid), o = c.ornement;
        return svg('<circle cx="150" cy="150" r="96" fill="none" stroke="' + o + '" stroke-width=".9"/>' +
          (t ? '<text font-family="Cormorant Garamond, serif" font-weight="600" font-size="13" letter-spacing="5" fill="' + o + '"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">' + t.toUpperCase() + '</textPath></text>' : '') +
          etincelle(44, 150, 3.4, o) + etincelle(256, 150, 3.4, o) +
          monogramme(a, b, { couleur: c.lettres, taille: 96, cy: 162, dx: 22, dy: 32, police: 'Bodoni Moda, serif' }),
          '<path id="' + id + '" d="M42 150A108 108 0 0 1 258 150"/>');
      },
    },
    {
      id: 'brin', nom: 'Brin d\'olivier',
      couleurs: { lettres: '#2A2A26', ornement: '#5C5C52' },
      dessin: function (a, b, c, t) {
        var o = c.ornement;
        var olivier = brin([[150, 236], [112, 232], [82, 214], [62, 186]], { c: o, n: 16, l0: 14, l1: 7, ouv: 38, ratio: .24 }) +
          brin([[132, 234], [104, 222], [84, 200], [76, 174]], { c: o, n: 10, l0: 11, l1: 6, ouv: 42, ratio: .24, tsw: .55, alterne: true }) +
          brin([[110, 228], [96, 236], [80, 238], [66, 232]], { c: o, n: 6, l0: 10, l1: 6, ouv: 40, ratio: .24, tsw: .55 });
        return svg(symetrie(olivier) +
          [[96, 224], [204, 224], [76, 204], [224, 204]].map(function (q) { return '<ellipse cx="' + q[0] + '" cy="' + (q[1] + 4) + '" rx="2.8" ry="3.8" fill="none" stroke="' + o + '" stroke-width=".7"/>'; }).join('') +
          monogramme(a, b, { couleur: c.lettres, taille: 92, cy: 150, dx: 15, dy: 26, police: 'Cormorant Garamond, serif', graisse: 500 }) +
          legende(t, 262, c.lettres, { taille: 11, espace: 3.6 }));
      },
    },
  ];

  /* ================================================================ *
   * Famille COULEUR
   * ================================================================ */

  var COULEUR = [
    {
      id: 'arche-jerusalem', nom: 'Arche de Jérusalem',
      couleurs: { lettres: '#22385C', arche: '#C9A15A', ciel: '#F7D7BE', collines: '#E9C39A', ville: '#D9B27C', dome: '#D4A537', fleurs: '#E58FA0', feuillage: '#6E9A6A' },
      dessin: function (a, b, c, t) {
        var id = ++uid;
        var arche = 'M88 248V128C88 102 108 86 128 74C138 68 146 60 150 46C154 60 162 68 172 74C192 86 212 102 212 128V248Z';
        return svg('<g clip-path="url(#cl' + id + ')"><rect x="80" y="40" width="140" height="210" fill="url(#ci' + id + ')"/>' +
          '<circle cx="186" cy="132" r="13" fill="#FFF3DA" filter="url(#fl' + id + ')"/>' + jerusalem(c, 216) + '</g>' +
          '<path d="' + arche + '" fill="none" stroke="' + c.arche + '" stroke-width="3"/>' +
          '<path transform="translate(150 150) scale(1.05) translate(-150 -150)" d="' + arche + '" fill="none" stroke="' + c.arche + '" stroke-width=".8"/>' +
          '<g filter="url(#aq' + id + ')">' + bouquetA(88, 238, 1.05, c, 20) + bouquetA(212, 238, 1.05, c, 160) + bouquetA(150, 48, .62, c, -90) + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 58, cy: 122, dx: 10, dy: 20, police: 'Playfair Display, serif' }) + ruban(276, teinte(c.arche, .55), t, c.lettres),
          defsAquarelle(id) + '<clipPath id="cl' + id + '"><path d="' + arche + '"/></clipPath><linearGradient id="ci' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + teinte(c.ciel, .6) + '"/><stop offset=".7" stop-color="' + c.ciel + '"/></linearGradient>');
      },
    },
    {
      id: 'panorama', nom: 'Panorama',
      couleurs: { lettres: '#22385C', ciel: '#BFD8E8', collines: '#D7C7A0', ville: '#D9B27C', dome: '#D4A537', fleurs: '#D96C8B', feuillage: '#6E9A6A' },
      dessin: function (a, b, c, t) {
        var id = ++uid;
        return svg('<g clip-path="url(#cl' + id + ')"><rect x="40" y="40" width="220" height="220" fill="url(#ci' + id + ')"/>' + jerusalem(c, 214) + '</g>' +
          '<path d="M54 160A96 96 0 0 0 246 160" fill="none" stroke="' + teinte(c.ville, -.2) + '" stroke-width="1.2"/>' +
          '<g filter="url(#aq' + id + ')">' + bouquetA(52, 170, .9, c, -10) + bouquetA(248, 170, .9, c, 190) +
          [76, 96, 204, 224].map(function (x, i) { return fleurA(x, 120 - i % 2 * 14, 5, i % 2 ? '#F3D9A4' : c.fleurs, '#C98F3A'); }).join('') + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 66, cy: 112, dx: 11, dy: 22, police: 'Playfair Display, serif', italique: true }) + legende(t, 288, c.lettres, { taille: 11 }),
          defsAquarelle(id) + '<clipPath id="cl' + id + '"><path d="M54 160A96 96 0 0 0 246 160Z"/></clipPath><linearGradient id="ci' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset=".4" stop-color="' + teinte(c.ciel, .5) + '"/><stop offset="1" stop-color="' + c.ciel + '"/></linearGradient>');
      },
    },
    {
      id: 'pivoines', nom: 'Écusson de pivoines',
      couleurs: { lettres: '#C0607E', ecusson: '#E9A9BC', fleurs: '#D9668A', fleurs2: '#B38BD0', feuillage: '#6E9A6A' },
      dessin: function (a, b, c, t) {
        var id = ++uid, s = '';
        var C = { fleurs: c.fleurs, fleurs2: c.fleurs2, feuillage: c.feuillage };
        [[96, 52, 22], [80, 92, 60], [72, 140, 90], [78, 186, 110], [104, 226, 140]].forEach(function (q) {
          for (var f = 0; f < 5; f++) s += feuilleA(q[0], q[1], q[2] + 140 + f * 22, 24, 7, f % 2 ? c.feuillage : teinte(c.feuillage, .3));
        });
        [[86, 70, .7, 10], [76, 116, .75, 40], [74, 164, .7, 80], [90, 206, .72, 120]].forEach(function (q) { s += bouquetA(q[0], q[1], q[2], C, q[3]); });
        return svg('<path d="' + ECUSSON + '" fill="#FFF9FA" stroke="' + c.ecusson + '" stroke-width="4"/>' +
          '<path transform="translate(150 146) scale(.9) translate(-150 -146)" d="' + ECUSSON + '" fill="none" stroke="' + c.ecusson + '" stroke-width="1"/>' +
          '<g filter="url(#aq' + id + ')">' + symetrie(s) + bouquetA(150, 50, .6, C, -90) + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 74, cy: 140, dx: 12, dy: 28, police: 'Bodoni Moda, serif' }) + legende(t, 284, c.lettres, { taille: 11 }),
          defsAquarelle(id));
      },
    },
    {
      id: 'bord-de-mer', nom: 'Bord de mer',
      couleurs: { lettres: '#2E6E6A', ecusson: '#9ED3C8', ciel: '#D6EEF2', mer: '#5DB3C8', sable: '#F1DDBA', feuillage: '#5E9A6A', fleurs: '#F2A0B4' },
      dessin: function (a, b, c, t) {
        var id = ++uid;
        var palme = function (x, y, e) {
          var s = '<path d="M0 0C-2 -20 2 -42 8 -60" fill="none" stroke="#9A7650" stroke-width="3.4" stroke-linecap="round"/>';
          [-170, -140, -110, -70, -40, -10].forEach(function (ang, i) { s += feuilleA(8, -60, ang, 30 - i % 2 * 6, 6, i % 2 ? c.feuillage : teinte(c.feuillage, .2)); });
          return g(x, y, 0, e, s);
        };
        return svg('<g clip-path="url(#cl' + id + ')"><rect x="70" y="40" width="160" height="220" fill="' + c.ciel + '"/>' +
          '<path d="M70 168Q120 160 150 166T230 164V200H70Z" fill="' + c.mer + '"/><path d="M70 178Q120 172 150 178T230 176" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7"/>' +
          '<path d="M70 196Q120 184 160 192T230 188V260H70Z" fill="' + c.sable + '"/>' +
          '<circle cx="118" cy="124" r="12" fill="#FFF1C9" filter="url(#fl' + id + ')"/>' +
          '<path d="M164 146q4 -3 8 0q4 -3 8 0M176 136q3 -2 6 0q3 -2 6 0" fill="none" stroke="#5C6B7A" stroke-width=".9"/>' + palme(206, 214, .9) + '</g>' +
          '<path d="' + ECUSSON + '" fill="none" stroke="' + c.ecusson + '" stroke-width="5"/>' +
          '<g filter="url(#aq' + id + ')">' + bouquetA(150, 48, .55, { fleurs: c.fleurs, feuillage: c.feuillage }, -90) + bouquetA(96, 230, .55, { fleurs: c.fleurs, feuillage: c.feuillage }, 30) + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 66, cy: 110, dx: 11, dy: 22, police: 'Playfair Display, serif' }) + ruban(268, c.ecusson, t, c.lettres),
          defsAquarelle(id) + '<clipPath id="cl' + id + '"><path d="' + ECUSSON + '"/></clipPath>');
      },
    },
    {
      id: 'arche-palmiers', nom: 'Arche aux palmiers',
      couleurs: { lettres: '#22385C', arche: '#C9A15A', feuillage: '#4F8A5B', fleurs: '#E58FA0', fleurs2: '#F2B48C' },
      dessin: function (a, b, c, t) {
        var id = ++uid;
        var palmier = function (x, y, e, sens) {
          var s = '<path d="M0 0C' + (4 * sens) + ' -40 ' + (-2 * sens) + ' -80 ' + (10 * sens) + ' -118" fill="none" stroke="#8A6A45" stroke-width="5" stroke-linecap="round"/>';
          for (var k = 0; k < 9; k++) s += '<path d="M' + (-1 + 1 * sens) + ' ' + (-12 - k * 12) + 'h4" stroke="#6E5236" stroke-width=".8"/>';
          [-175, -145, -115, -85, -55, -25, 5].forEach(function (ang, i) { s += feuilleA(10 * sens, -118, sens > 0 ? ang : -180 - ang, 46 - i % 2 * 10, 8, i % 2 ? c.feuillage : teinte(c.feuillage, .25)); });
          return g(x, y, 0, e, s);
        };
        var arche = 'M98 252V128C98 104 116 88 136 76C144 71 148 62 150 50C152 62 156 71 164 76C184 88 202 104 202 128V252Z';
        return svg('<path d="' + arche + '" fill="#FFF8EC"/>' + palmier(70, 252, 1, 1) + palmier(232, 252, .85, -1) +
          '<path d="' + arche + '" fill="none" stroke="' + c.arche + '" stroke-width="2.6"/>' +
          '<path transform="translate(150 152) scale(.92) translate(-150 -152)" d="' + arche + '" fill="none" stroke="' + c.arche + '" stroke-width=".8"/>' +
          '<g filter="url(#aq' + id + ')">' + bouquetA(104, 248, .9, c, 30) + bouquetA(196, 248, .9, c, 150) + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 66, cy: 150, dx: 11, dy: 26, police: 'Playfair Display, serif' }) + legende(t, 284, c.lettres, { taille: 11 }),
          defsAquarelle(id));
      },
    },
    {
      id: 'paon', nom: 'Paon',
      couleurs: { lettres: '#1E3A5F', plumes: '#2E8B83', oeil: '#1E3A8A', or: '#C9A15A', fleurs: '#E58FA0', feuillage: '#5E8C62' },
      dessin: function (a, b, c, t) {
        var id = ++uid, s = '';
        // queue en eventail : plumes avec barbes fines et ocelle
        for (var k = 0; k < 13; k++) {
          var ang = -172 + k * 13.7, R = 110, p = [150 + Math.cos(rad(ang)) * R, 176 + Math.sin(rad(ang)) * R], q = [150 + Math.cos(rad(ang)) * 46, 176 + Math.sin(rad(ang)) * 46];
          s += '<path d="M' + r2(q[0]) + ' ' + r2(q[1]) + 'L' + r2(p[0]) + ' ' + r2(p[1]) + '" stroke="' + c.or + '" stroke-width=".8"/>';
          s += g(p[0], p[1], ang + 90, 1,
            '<path d="M0 -24C14 -20 16 10 0 22C-16 10 -14 -20 0 -24Z" fill="' + c.plumes + '" opacity=".85"/>' +
            '<path d="M0 -24V22M-8 -14L0 -6L8 -14M-11 -2L0 6L11 -2M-9 10L0 16L9 10" fill="none" stroke="' + teinte(c.plumes, .45) + '" stroke-width=".5"/>' +
            '<ellipse cx="0" cy="-4" rx="8" ry="10" fill="' + c.or + '"/><ellipse cx="0" cy="-4" rx="5" ry="6.4" fill="' + teinte(c.plumes, -.1) + '"/><ellipse cx="0" cy="-5" rx="2.8" ry="3.6" fill="' + c.oeil + '"/>');
        }
        return svg('<g filter="url(#aq' + id + ')">' + s + '</g>' +
          '<path d="M64 176A86 86 0 0 1 236 176V254H64Z" fill="#FFFBF2" stroke="' + c.or + '" stroke-width="2"/>' +
          '<path d="M70 178A80 80 0 0 1 230 178V248H70Z" fill="none" stroke="' + c.or + '" stroke-width=".7"/>' +
          '<g filter="url(#aq' + id + ')">' + bouquetA(70, 250, .8, c, 20) + bouquetA(230, 250, .8, c, 160) + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 64, cy: 186, dx: 11, dy: 24, police: 'Playfair Display, serif' }) + legende(t, 290, c.lettres, { taille: 11 }),
          defsAquarelle(id));
      },
    },
    {
      id: 'grenadier', nom: 'Couronne de grenades',
      couleurs: { lettres: '#3A2A2A', fruits: '#B83A3A', feuillage: '#5E8C52', fleurs: '#E86A50' },
      dessin: function (a, b, c, t) {
        var id = ++uid, s = '';
        var grenade = function (x, y, r) {
          return '<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r + '" fill="url(#gr' + id + ')"/>' +
            '<path d="M' + r2(x - r * .35) + ' ' + r2(y - r * .85) + 'L' + r2(x - r * .22) + ' ' + r2(y - r * 1.3) + 'L' + r2(x - r * .05) + ' ' + r2(y - r * 1) + 'L' + r2(x + r * .1) + ' ' + r2(y - r * 1.32) + 'L' + r2(x + r * .22) + ' ' + r2(y - r * 1) + 'L' + r2(x + r * .38) + ' ' + r2(y - r * 1.25) + 'L' + r2(x + r * .4) + ' ' + r2(y - r * .82) + 'Z" fill="' + teinte(c.fruits, -.25) + '"/>' +
            '<ellipse cx="' + r2(x - r * .38) + '" cy="' + r2(y - r * .32) + '" rx="' + r2(r * .28) + '" ry="' + r2(r * .16) + '" fill="#fff" opacity=".4" transform="rotate(-30 ' + r2(x - r * .38) + ' ' + r2(y - r * .32) + ')"/>';
        };
        var gauche = '';
        for (var k = 0; k < 30; k++) {
          var ang = 100 + k * 4.8, rr = 102 + (k % 3 - 1) * 5, p = [150 + Math.cos(rad(ang)) * rr, 146 + Math.sin(rad(ang)) * rr];
          gauche += feuilleA(p[0], p[1], ang + 90 + (k % 2 ? 42 : -42), k % 4 ? 22 : 16, 6.5, k % 3 ? c.feuillage : teinte(c.feuillage, k % 2 ? .3 : -.15));
        }
        gauche += '<path d="M' + r2(150 + Math.cos(rad(100)) * 102) + ' ' + r2(146 + Math.sin(rad(100)) * 102) + 'A102 102 0 0 1 ' + r2(150 + Math.cos(rad(240)) * 102) + ' ' + r2(146 + Math.sin(rad(240)) * 102) + '" fill="none" stroke="#7A5A3A" stroke-width="1.6"/>';
        [[150, 15], [190, 12], [228, 10]].forEach(function (q) { var p = [150 + Math.cos(rad(q[0])) * 106, 146 + Math.sin(rad(q[0])) * 106]; gauche += grenade(p[0], p[1], q[1]); });
        var f = [150 + Math.cos(rad(122)) * 104, 146 + Math.sin(rad(122)) * 104];
        gauche += fleurA(f[0], f[1], 8, c.fleurs, '#F4C95D') + fleurA(f[0] - 30, f[1] - 64, 6, c.fleurs, '#F4C95D');
        s += symetrie(gauche);
        return svg('<g filter="url(#aq' + id + ')">' + s + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 78, cy: 138, dx: 13, dy: 26, police: 'Bodoni Moda, serif' }) + legende(t, 292, c.lettres, { taille: 11 }),
          defsAquarelle(id) + '<radialGradient id="gr' + id + '" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="' + teinte(c.fruits, .35) + '"/><stop offset="1" stop-color="' + teinte(c.fruits, -.15) + '"/></radialGradient>');
      },
    },
    {
      id: 'houppa-fleurie', nom: 'Houppa fleurie',
      couleurs: { lettres: '#22385C', voile: '#F6EBDD', bois: '#B08A55', fleurs: '#E58FA0', fleurs2: '#F7C6A5', feuillage: '#6E9A6A' },
      dessin: function (a, b, c, t) {
        var id = ++uid, guirlande = '';
        for (var k = 0; k <= 10; k++) {
          var x = 56 + k * 18.8, y = 96 - Math.sin(Math.PI * k / 10) * 24;
          guirlande += feuilleA(x, y, 150 + k * 25, 16, 5, k % 2 ? c.feuillage : teinte(c.feuillage, .3)) +
            (k % 3 === 0 ? pivoine(x, y, 9, c.fleurs, k * 30) : fleurA(x, y, 6.5, k % 2 ? c.fleurs2 : '#FFFFFF', '#E6B85C', k * 17));
        }
        var drape = '<path d="M52 98Q150 54 248 98Q232 128 210 104Q194 132 172 106Q160 130 150 106Q140 130 128 106Q106 132 90 104Q68 128 52 98Z" fill="' + c.voile + '" stroke="' + teinte(c.voile, -.18) + '" stroke-width="1"/>' +
          '<path d="M90 104Q86 118 82 126M128 106Q126 120 124 128M172 106Q174 120 176 128M210 104Q214 118 218 126" fill="none" stroke="' + teinte(c.voile, -.15) + '" stroke-width=".7"/>';
        var poteau = function (x) {
          var s = '<path d="M' + x + ' 98V252" stroke="' + c.bois + '" stroke-width="4" stroke-linecap="round"/>';
          for (var j = 0; j < 6; j++) s += feuilleA(x, 120 + j * 22, j % 2 ? 200 : -20, 14, 4.5, c.feuillage) + (j % 2 ? fleurA(x, 130 + j * 22, 4.5, c.fleurs, '#E6B85C') : '');
          return s;
        };
        return svg(drape + poteau(58) + poteau(242) + '<path d="M40 254H260" stroke="' + c.bois + '" stroke-width="1.6"/>' +
          '<g filter="url(#aq' + id + ')">' + guirlande + bouquetA(58, 248, .75, c, 10) + bouquetA(242, 248, .75, c, 170) + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 70, cy: 168, dx: 12, dy: 26, police: 'Playfair Display, serif', italique: true }) + legende(t, 284, c.lettres, { taille: 11 }),
          defsAquarelle(id));
      },
    },
    {
      id: 'couronne-roses', nom: 'Couronne de roses',
      couleurs: { lettres: '#22385C', fleurs: '#E58FA0', fleurs2: '#F2B48C', feuillage: '#6E9A6A' },
      dessin: function (a, b, c, t) {
        var id = ++uid, s = '';
        for (var k = 0; k < 64; k++) {
          var ang = -90 + k * 360 / 64, rr = 100 + (k % 3 - 1) * 6, p = [150 + Math.cos(rad(ang)) * rr, 146 + Math.sin(rad(ang)) * rr];
          s += feuilleA(p[0], p[1], ang + 90 + (k % 2 ? 40 : -40), k % 4 ? 22 : 16, 6.5, k % 3 ? c.feuillage : teinte(c.feuillage, k % 2 ? .3 : -.15));
        }
        [[210, 15, 0], [250, 9, 1], [300, 13, 0], [340, 8, 1], [30, 15, 0], [75, 9, 1], [120, 13, 0], [160, 8, 1]].forEach(function (q) {
          var p = [150 + Math.cos(rad(q[0])) * 100, 146 + Math.sin(rad(q[0])) * 100];
          s += q[2] ? fleurA(p[0], p[1], q[1], c.fleurs2, '#E6B85C', q[0]) : pivoine(p[0], p[1], q[1], c.fleurs, q[0]);
        });
        return svg('<g filter="url(#aq' + id + ')">' + s + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 76, cy: 138, dx: 13, dy: 26, police: 'Playfair Display, serif' }) + legende(t, 290, c.lettres, { taille: 11 }),
          defsAquarelle(id));
      },
    },
    {
      id: 'champetre', nom: 'Bouquet champêtre',
      couleurs: { lettres: '#3A3A5A', lavande: '#9C88C9', fleurs: '#F2C14E', feuillage: '#7FA37A' },
      dessin: function (a, b, c, t) {
        var id = ++uid, s = '';
        var lavande = function (x, y, ang) {
          var g2 = '<path d="M0 0L0 -50" stroke="' + c.feuillage + '" stroke-width="1"/>';
          for (var i = 0; i < 9; i++) g2 += '<ellipse cx="' + (i % 2 ? 2.4 : -2.4) + '" cy="' + (-20 - i * 3.6) + '" rx="2.4" ry="3.8" fill="' + (i % 2 ? c.lavande : teinte(c.lavande, .3)) + '"/>';
          return g(x, y, ang, 1, g2);
        };
        for (var k = 0; k < 15; k++) { var ang = 16 + k * (148 / 14), p = [150 + Math.cos(rad(ang)) * 82, 126 + Math.sin(rad(ang)) * 82]; s += lavande(p[0], p[1], ang + 90); }
        for (var j = 0; j < 21; j++) {
          var a2 = 18 + j * 7.2, q = [150 + Math.cos(rad(a2)) * (86 + (j % 2) * 6), 126 + Math.sin(rad(a2)) * (86 + (j % 2) * 6)];
          s += feuilleA(q[0], q[1], a2 + (j % 2 ? 30 : -30), 20, 5, c.feuillage);
          if (j % 2 === 0) s += fleurA(q[0], q[1], 6.5, c.fleurs, '#C9822E', j * 11);
        }
        s += fleurA(74, 170, 9, '#FFFFFF', c.fleurs) + fleurA(226, 170, 9, '#FFFFFF', c.fleurs) + fleurA(150, 220, 8, '#FFFFFF', c.fleurs);
        return svg('<g filter="url(#aq' + id + ')">' + s + '</g>' +
          monogramme(a, b, { couleur: c.lettres, taille: 76, cy: 118, dx: 13, dy: 24, police: 'Cormorant Garamond, serif', graisse: 500 }) + legende(t, 290, c.lettres, { taille: 11 }),
          defsAquarelle(id));
      },
    },
  ];

  /* Lianes de feuillage par logo (voir liane()) : le long des cadres. */
  var ARCHE_T = 'M92 236V118A58 58 0 0 1 208 118V236';
  var ARCHE_J = 'M88 248V128C88 102 108 86 128 74C138 68 146 60 150 46C154 60 162 68 172 74C192 86 212 102 212 128V248';
  var ARCHE_P = 'M98 252V128C98 104 116 88 136 76C144 71 148 62 150 50C152 62 156 71 164 76C184 88 202 104 202 128V252';
  var COEUR_T = 'M150 250C112 222 70 188 68 140C66 108 88 88 114 88C130 88 143 98 150 110C157 98 170 88 186 88C212 88 234 108 232 140C230 188 188 222 150 250Z';
  var ovale = function (rx, ry, cy) { return 'M' + (150 - rx) + ' ' + cy + 'A' + rx + ' ' + ry + ' 0 1 0 ' + (150 + rx) + ' ' + cy + 'A' + rx + ' ' + ry + ' 0 1 0 ' + (150 - rx) + ' ' + cy + 'Z'; };
  var demiOvale = function (rx, ry, cy) { return 'M150 ' + (cy - ry) + 'A' + rx + ' ' + ry + ' 0 0 0 150 ' + (cy + ry); };
  var T = function (c, o) { return Object.assign({ c: c.ornement, sym: true }, o); };
  var A = function (c, o) { return Object.assign({ mode: 'aquarelle', feuillage: c.feuillage, fleurs: c.fleurs, sym: true }, o); };
  var LIANES = {
    couronne: function (c) { return liane(arcD(124, 112, 258), T(c, { decal: 0, taille: 9 })); },
    arche: function (c) { return liane('M92 236V118A58 58 0 0 1 150 60', T(c, { decal: 6, t0: .04 })); },
    ecusson: function (c) { return liane(ECUSSON, T(c, { decal: 6, t0: .52, t1: .99, cy: 146 })); },
    cartouche: function (c) { return liane('M50 206V94', T(c, { decal: 7 })); },
    medaillon: function (c) { return liane(demiOvale(66, 92, 148), T(c, { decal: 4, cy: 148, t0: .04, t1: .96 })); },
    coeur: function (c) { return liane(COEUR_T, T(c, { decal: 7, cy: 160, t0: .12, t1: .5 })); },
    cercle: function (c) { return liane(arcD(96, 90, 162), T(c, { decal: 6 })); },
    brin: function (c) { return liane(arcD(100, 148, 214, 150, 160), T(c, { decal: 0, cy: 160 })); },
    'arche-jerusalem': function (c) { return liane('M88 248V128C88 102 108 86 128 74C138 68 146 60 150 46', A(c, { decal: 7, t0: .16 })); },
    panorama: function (c) { return liane('M54 160A96 96 0 0 0 150 256', A(c, { decal: 5, t0: .24 })); },
    pivoines: function (c) { return liane(ECUSSON, A(c, { fleurs: null, decal: 9, t0: .52, t1: .66, cy: 146 })); },
    'bord-de-mer': function (c) { return liane(ECUSSON, A(c, { decal: 8, t0: .52, t1: .94, cy: 146 })); },
    'arche-palmiers': function (c) { return liane('M98 252V128C98 104 116 88 136 76C144 71 148 62 150 50', A(c, { decal: 6, t0: .6 })); },
    paon: function (c) { return liane('M64 254V176', A(c, { decal: 5, cy: 200 })); },
    'houppa-fleurie': function (c) { return liane('M58 250V104', A(c, { decal: 4, cy: 170 })); },
    'couronne-roses': function (c) { return liane(demiOvale(118, 118, 146), A(c, { fleurs: null, decal: 0, cy: 146, taille: 10, pas: 9 })); },
    grenadier: function (c) { return liane(arcD(120, 104, 250, 150, 146), A(c, { decal: 0, cy: 146 })); },
    champetre: function (c) { return liane(arcD(104, 90, 166, 150, 126), A(c, { decal: 0, cy: 126 })); },
  };

  var FAMILLES = { trait: TRAIT, couleur: COULEUR };

  var LIBELLES = {
    lettres: 'Lettres', ornement: 'Ornements', fleurs: 'Fleurs', fleurs2: 'Autres fleurs', feuillage: 'Feuillage',
    ciel: 'Ciel', collines: 'Collines', ville: 'Ville', dome: 'Dôme', arche: 'Arche', plumes: 'Plumes', oeil: 'Œil des plumes',
    or: 'Doré', fruits: 'Grenades', voile: 'Voile', bois: 'Bois', ecusson: 'Écusson', mer: 'Mer', sable: 'Sable', lavande: 'Lavande',
  };

  /** Dessine le style avec les initiales, couleurs et texte donnes. */
  /** Polices proposees pour les initiales (null = celle du style). */
  var POLICES = [
    { id: '', nom: 'Police du logo' },
    { id: 'pinyon', nom: 'Pinyon Script', famille: 'Pinyon Script, cursive' },
    { id: 'great-vibes', nom: 'Great Vibes', famille: 'Great Vibes, cursive' },
    { id: 'parisienne', nom: 'Parisienne', famille: 'Parisienne, cursive' },
    { id: 'allura', nom: 'Allura', famille: 'Allura, cursive' },
    { id: 'bodoni', nom: 'Bodoni', famille: 'Bodoni Moda, serif' },
    { id: 'playfair', nom: 'Playfair', famille: 'Playfair Display, serif' },
    { id: 'playfair-italique', nom: 'Playfair italique', famille: 'Playfair Display, serif', italique: true },
    { id: 'cinzel', nom: 'Cinzel', famille: 'Cinzel, serif' },
    { id: 'italiana', nom: 'Italiana', famille: 'Italiana, serif' },
    { id: 'marcellus', nom: 'Marcellus', famille: 'Marcellus, serif' },
    { id: 'josefin', nom: 'Josefin', famille: 'Josefin Sans, sans-serif', graisse: 300 },
  ];

  /** Dessine le style avec les initiales, couleurs, texte et police donnes. */
  function dessiner(style, a, b, couleurs, texte, policeId, options) {
    var c = {};
    for (var k in style.couleurs) c[k] = (couleurs && couleurs[k]) || style.couleurs[k];
    policeChoisie = null;
    for (var i = 0; i < POLICES.length; i++) if (policeId && POLICES[i].id === policeId) policeChoisie = POLICES[i];
    try {
      var rendu = style.dessin(echappe(a || ' '), echappe(b || ' '), c, echappe(texte || ''));
      // Liane de feuillage glissee sous le reste du dessin.
      if (LIANES[style.id]) rendu = rendu.replace(/(<svg[^>]*>(?:<defs>[\s\S]*?<\/defs>)?)/, function (m) { return m + LIANES[style.id](c); });
      // Sur un fond colore (themes sombres...), les petales "blancs" qui
      // masquent les tiges prennent la couleur du fond.
      if (options && options.papier) rendu = rendu.replace(/fill="#fff"/g, 'fill="' + options.papier + '"');
      return rendu;
    }
    finally { policeChoisie = null; }
  }

  /* Logo automatique de chaque theme : un style au trait, aux couleurs du
   * theme, avec les initiales des maries. */
  var AUTO = {
    'marbre-or': { style: 'medaillon', couleurs: { lettres: '#2B2722', ornement: '#A88638' } },
    'botanique-sauge': { style: 'couronne', couleurs: { lettres: '#2F3A2B', ornement: '#6C8062' } },
    'nuit-etoilee': { style: 'cercle', couleurs: { lettres: '#E8CF8E', ornement: '#C9A85A' } },
    'mediterranee': { style: 'brin', couleurs: { lettres: '#33381F', ornement: '#5E6A34' } },
    'rose-poudre': { style: 'coeur', couleurs: { lettres: '#6E4448', ornement: '#B87478' } },
    'jardin-blanc': { style: 'couronne', couleurs: { lettres: '#343C33', ornement: '#879A80' } },
    'esquisse-illustree': { style: 'cartouche', couleurs: { lettres: '#23324F', ornement: '#23324F' } },
    'diner-chandelles': { style: 'medaillon', couleurs: { lettres: '#F4E8DA', ornement: '#D8B46A' } },
    'epure-minimaliste': { style: 'superpose', couleurs: { lettres: '#2E2A25', ornement: '#8B7D6B' } },
    'boheme-terracotta': { style: 'arche', couleurs: { lettres: '#4A2C1E', ornement: '#C46A45' } },
    'toile-de-jouy-vert': { style: 'ecusson', couleurs: { lettres: '#45532F', ornement: '#5E6E45' } },
    'toile-de-jouy-bleu': { style: 'ecusson', couleurs: { lettres: '#1F3A5C', ornement: '#2B4A72' } },
  };

  function trouverStyle(famille, id) {
    var liste = FAMILLES[famille] || [];
    for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i];
    return null;
  }

  /** Logo de l'invitation : celui choisi dans le generateur (choix), sinon
   *  le logo automatique du theme. Renvoie le SVG, ou '' si aucun. */
  function logoInvitation(choix, themeSlug, initiales, papier) {
    if (choix && choix.style) {
      var st = trouverStyle(choix.famille || 'trait', choix.style);
      if (st) return dessiner(st, choix.lettres[0], choix.lettres[1], choix.couleurs, choix.texte, choix.police, { papier: choix.famille === 'couleur' ? null : papier });
    }
    var auto = AUTO[themeSlug] || AUTO['marbre-or'];
    return dessiner(trouverStyle('trait', auto.style), initiales[0], initiales[1], auto.couleurs, '', '', { papier: papier });
  }

  return { FAMILLES: FAMILLES, LIBELLES: LIBELLES, POLICES: POLICES, AUTO: AUTO, dessiner: dessiner, logoInvitation: logoInvitation };
})();
