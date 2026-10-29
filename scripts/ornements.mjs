/**
 * Genere les ornements SVG de chaque theme (fleurs, feuillages, etoiles,
 * bougies, pampas...) dans themes/<slug>/orn/ :
 *
 *   coin.svg   coin de carte, dessine pour le coin haut-gauche (les 3
 *              autres coins sont des symetries CSS)
 *   haut.svg   motif au-dessus des prenoms (accueil et invitation)
 *   sep.svg    separateur horizontal
 *   event.svg  petit motif dans le coin haut-droit des cartes evenement
 *   fond.svg   semis de petits motifs, repete en fond de page
 *
 * Lancement : node scripts/ornements.mjs  (puis npm run build)
 * Les SVG produits sont commites ; ce script n'est relance que pour les
 * retoucher.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ================================================================== *
 * Outils geometriques
 * ================================================================== */

const r2 = (n) => Math.round(n * 100) / 100;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;

function bez(c, t) {
  const [p0, p1, p2, p3] = c;
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
function bezAngle(c, t) {
  const [p0, p1, p2, p3] = c;
  const u = 1 - t;
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return deg(Math.atan2(dy, dx));
}
const courbe = (c) => `M${c[0].map(r2)} C${c[1].map(r2)} ${c[2].map(r2)} ${c[3].map(r2)}`;
const miroirX = (c, w) => c.map(([x, y]) => [w - x, y]);

/** Generateur pseudo-aleatoire deterministe (memes SVG a chaque lancement). */
function alea(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${v}"`)
    .join(' ');

const g = (x, y, a, contenu, s = 1) =>
  `<g transform="translate(${r2(x)} ${r2(y)})${a ? ` rotate(${r2(a)})` : ''}${s !== 1 ? ` scale(${r2(s)})` : ''}">${contenu}</g>`;

/* ================================================================== *
 * Primitives de dessin
 * ================================================================== */

/** Feuille pointant vers +x depuis (x,y). */
function feuille(x, y, a, l, w, st = {}) {
  const d = `M0 0C${r2(l * 0.25)} ${r2(-w)} ${r2(l * 0.72)} ${r2(-w)} ${r2(l)} 0C${r2(l * 0.72)} ${r2(w)} ${r2(l * 0.25)} ${r2(w)} 0 0Z`;
  let s = `<path d="${d}" ${attrs({ fill: st.fill || 'none', stroke: st.stroke, strokeWidth: st.sw, opacity: st.op })}/>`;
  if (st.veine) s += `<path d="M${r2(l * 0.08)} 0Q${r2(l * 0.5)} ${r2(w * 0.12)} ${r2(l * 0.88)} 0" fill="none" stroke="${st.veine}" stroke-width="${st.vsw || 0.6}" stroke-linecap="round"/>`;
  return g(x, y, a, s);
}

/** Branche : tige (courbe de Bezier) garnie de feuilles. */
function branche(c, o) {
  const {
    n = 8, l0 = 16, l1 = 9, ratio = 0.38, angle = 42, t0 = 0.12, t1 = 0.96,
    deux = false, tige = '#000', tsw = 1, pointe = true, st = {}, alt = true, jitter = 0, rnd = Math.random,
  } = o;
  let s = `<path d="${courbe(c)}" fill="none" stroke="${tige}" stroke-width="${tsw}" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? t0 : lerp(t0, t1, i / (n - 1));
    const [x, y] = bez(c, t);
    const a = bezAngle(c, t);
    const l = lerp(l0, l1, t);
    const j = jitter ? (rnd() - 0.5) * jitter : 0;
    const cotes = deux ? [1, -1] : [alt ? (i % 2 ? 1 : -1) : 1];
    for (const sd of cotes) s += feuille(x, y, a + sd * angle + j, l, l * ratio, st);
  }
  if (pointe) {
    const [x, y] = bez(c, 1);
    s += feuille(x, y, bezAngle(c, 1), l1 * 1.05, l1 * ratio, st);
  }
  return s;
}

/** Fleur a petales ellipses (marguerite). */
function marguerite(x, y, r, o = {}) {
  const { n = 10, fill = '#fff', stroke, sw = 0.6, coeur = '#E2C878', rot = 0, rx = 0.46, ry = 0.17 } = o;
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = rot + (360 / n) * k;
    const px = Math.cos(rad(a)) * r * 0.52;
    const py = Math.sin(rad(a)) * r * 0.52;
    s += `<ellipse cx="${r2(px)}" cy="${r2(py)}" rx="${r2(r * rx)}" ry="${r2(r * ry)}" transform="rotate(${r2(a)} ${r2(px)} ${r2(py)})" ${attrs({ fill, stroke, strokeWidth: stroke ? sw : undefined })}/>`;
  }
  s += `<circle r="${r2(r * 0.2)}" fill="${coeur}"/>`;
  return g(x, y, 0, s);
}

/** Fleur ronde a 5 petales. */
function fleur5(x, y, r, o = {}) {
  const { n = 5, fill = '#fff', stroke, sw = 0.6, coeur = '#E2C878', rot = -90 } = o;
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = rad(rot + (360 / n) * k);
    s += `<circle cx="${r2(Math.cos(a) * r * 0.5)}" cy="${r2(Math.sin(a) * r * 0.5)}" r="${r2(r * 0.46)}" ${attrs({ fill, stroke, strokeWidth: stroke ? sw : undefined })}/>`;
  }
  s += `<circle r="${r2(r * 0.22)}" fill="${coeur}"/>`;
  return g(x, y, 0, s);
}

/** Rose vue de dessus : petales exterieurs + spirale. */
function rose(x, y, r, c, rot = 0) {
  let s = '';
  for (let k = 0; k < 5; k++) {
    const a = rad(rot + 72 * k);
    s += `<circle cx="${r2(Math.cos(a) * r * 0.5)}" cy="${r2(Math.sin(a) * r * 0.5)}" r="${r2(r * 0.52)}" fill="${c.clair}" stroke="${c.trait}" stroke-width="${r2(Math.max(0.5, r * 0.03))}"/>`;
  }
  s += `<circle r="${r2(r * 0.7)}" fill="${c.base}"/>`;
  const arcs = [[0.6, 10], [0.46, 140], [0.32, 260], [0.19, 40]];
  for (const [rr, a0] of arcs) {
    const R = r * rr;
    const a1 = a0 + 250;
    const p = (a) => [Math.cos(rad(a + rot)) * R, Math.sin(rad(a + rot)) * R];
    s += `<path d="M${p(a0).map(r2)}A${r2(R)} ${r2(R)} 0 1 1 ${p(a1).map(r2)}" fill="none" stroke="${c.fonce}" stroke-width="${r2(Math.max(0.6, r * 0.055))}" stroke-linecap="round"/>`;
  }
  return g(x, y, 0, s);
}

/** Bouton de rose (bourgeon) pointant vers +x. */
function bouton(x, y, a, l, c, vert) {
  const s =
    `<path d="M0 0C${r2(l * 0.3)} ${r2(-l * 0.42)} ${r2(l * 0.85)} ${r2(-l * 0.36)} ${r2(l)} 0C${r2(l * 0.85)} ${r2(l * 0.36)} ${r2(l * 0.3)} ${r2(l * 0.42)} 0 0Z" fill="${c.base}" stroke="${c.fonce}" stroke-width=".6"/>` +
    `<path d="M${r2(l * 0.3)} ${r2(-l * 0.12)}Q${r2(l * 0.65)} 0 ${r2(l * 0.88)} ${r2(-l * 0.08)}" fill="none" stroke="${c.fonce}" stroke-width=".6"/>` +
    `<path d="M0 0L${r2(l * 0.45)} ${r2(-l * 0.3)}M0 0L${r2(l * 0.45)} ${r2(l * 0.3)}" stroke="${vert}" stroke-width="1.1" stroke-linecap="round"/>`;
  return g(x, y, a, s);
}

function etoile(x, y, r, o = {}) {
  const { n = 5, ratio = 0.45, fill = '#fff', rot = -90, op } = o;
  const pts = [];
  for (let k = 0; k < n * 2; k++) {
    const R = k % 2 ? r * ratio : r;
    const a = rad(rot + (180 / n) * k);
    pts.push(`${r2(x + Math.cos(a) * R)},${r2(y + Math.sin(a) * R)}`);
  }
  return `<polygon points="${pts.join(' ')}" ${attrs({ fill, opacity: op })}/>`;
}

/** Etincelle a 4 branches aux cotes incurves. */
function etincelle(x, y, r, fill, op) {
  const d = `M0 ${-r}Q0 0 ${r} 0Q0 0 0 ${r}Q0 0 ${-r} 0Q0 0 0 ${-r}Z`;
  return g(x, y, 0, `<path d="${d}" ${attrs({ fill, opacity: op })}/>`);
}

function point(x, y, r, fill, op) {
  return `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" ${attrs({ fill, opacity: op })}/>`;
}

function losange(x, y, r, o = {}) {
  const { fill = 'none', stroke, sw = 1 } = o;
  return `<path d="M${r2(x)} ${r2(y - r)}L${r2(x + r)} ${r2(y)}L${r2(x)} ${r2(y + r)}L${r2(x - r)} ${r2(y)}Z" ${attrs({ fill, stroke, strokeWidth: stroke ? sw : undefined })}/>`;
}

/** Croissant de lune, bombe vers la gauche. */
function croissant(x, y, r, fill, a = 0) {
  const d = `M0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${r2(r * 0.78)} ${r2(r * 0.86)} 0 1 1 0 ${-r}Z`;
  return g(x, y, a, `<path d="${d}" fill="${fill}"/>`);
}

function coeur(x, y, s, o = {}) {
  const { fill = 'none', stroke, sw = 1, a = 0 } = o;
  const d = `M0 ${r2(s * 0.85)}C${r2(-s * 1.25)} ${r2(s * 0.05)} ${r2(-s * 0.62)} ${r2(-s * 0.85)} 0 ${r2(-s * 0.25)}C${r2(s * 0.62)} ${r2(-s * 0.85)} ${r2(s * 1.25)} ${r2(s * 0.05)} 0 ${r2(s * 0.85)}Z`;
  return g(x, y, a, `<path d="${d}" ${attrs({ fill, stroke, strokeWidth: stroke ? sw : undefined, strokeLinejoin: 'round' })}/>`);
}

/** Citron pointant vers +x, avec reflet. */
function citron(x, y, a, l, c) {
  const w = l * 0.3;
  const s =
    `<ellipse cx="${r2(-l * 0.03)}" rx="${r2(l * 0.07)}" ry="${r2(l * 0.05)}" fill="${c.base}" stroke="${c.ombre}" stroke-width=".6"/>` +
    `<ellipse cx="${r2(l * 1.03)}" rx="${r2(l * 0.07)}" ry="${r2(l * 0.05)}" fill="${c.base}" stroke="${c.ombre}" stroke-width=".6"/>` +
    `<path d="M0 0C${r2(l * 0.05)} ${r2(-w * 0.5)} ${r2(l * 0.2)} ${r2(-w)} ${r2(l * 0.5)} ${r2(-w)}C${r2(l * 0.8)} ${r2(-w)} ${r2(l * 0.95)} ${r2(-w * 0.5)} ${r2(l)} 0C${r2(l * 0.95)} ${r2(w * 0.5)} ${r2(l * 0.8)} ${r2(w)} ${r2(l * 0.5)} ${r2(w)}C${r2(l * 0.2)} ${r2(w)} ${r2(l * 0.05)} ${r2(w * 0.5)} 0 0Z" fill="${c.base}" stroke="${c.ombre}" stroke-width=".7"/>` +
    `<ellipse cx="${r2(l * 0.42)}" cy="${r2(-w * 0.4)}" rx="${r2(l * 0.2)}" ry="${r2(w * 0.22)}" fill="${c.reflet}" opacity=".8"/>`;
  return g(x, y, a, s);
}

/** Olive (petite ellipse brillante). */
function olive(x, y, a, l, c) {
  return g(x, y, a, `<ellipse cx="${r2(l / 2)}" rx="${r2(l / 2)}" ry="${r2(l * 0.33)}" fill="${c.base}"/><ellipse cx="${r2(l * 0.38)}" cy="${r2(-l * 0.1)}" rx="${r2(l * 0.12)}" ry="${r2(l * 0.07)}" fill="${c.reflet}"/>`);
}

/** Muguet : clochettes suspendues le long d'une tige. */
function muguet(c, o) {
  const { n = 5, tige, fill = '#fff', stroke, t0 = 0.3, t1 = 0.95, taille = 4.5, cote = 1 } = o;
  let s = `<path d="${courbe(c)}" fill="none" stroke="${tige}" stroke-width="1" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const t = lerp(t0, t1, i / (n - 1));
    const [x, y] = bez(c, t);
    const tz = taille * lerp(1, 0.7, i / (n - 1));
    const by = y + tz * 1.2 * cote;
    s += `<path d="M${r2(x)} ${r2(y)}Q${r2(x + tz * 0.4)} ${r2(y + tz * 0.6 * cote)} ${r2(x + tz * 0.2)} ${r2(by - tz * 0.2 * cote)}" fill="none" stroke="${tige}" stroke-width=".7"/>`;
    const bx = x + tz * 0.2;
    const cl = `M${r2(-tz * 0.75)} 0C${r2(-tz * 0.8)} ${r2(tz * 0.9)} ${r2(-tz * 0.9)} ${r2(tz * 1.15)} ${r2(-tz * 0.55)} ${r2(tz * 1.2)}Q${r2(-tz * 0.25)} ${r2(tz * 0.95)} 0 ${r2(tz * 1.25)}Q${r2(tz * 0.25)} ${r2(tz * 0.95)} ${r2(tz * 0.55)} ${r2(tz * 1.2)}C${r2(tz * 0.9)} ${r2(tz * 1.15)} ${r2(tz * 0.8)} ${r2(tz * 0.9)} ${r2(tz * 0.75)} 0Q0 ${r2(-tz * 0.45)} ${r2(-tz * 0.75)} 0Z`;
    s += g(bx, by - tz * 0.2 * cote, cote < 0 ? 180 : 0, `<path d="${cl}" ${attrs({ fill, stroke, strokeWidth: stroke ? 0.6 : undefined })}/>`);
  }
  return s;
}

/** Plumet de pampa le long d'une tige. */
function pampa(c, o) {
  const { tige, plume, plumeFonce, t0 = 0.38, n = 46, rnd } = o;
  let s = `<path d="${courbe(c)}" fill="none" stroke="${tige}" stroke-width="1.1" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const t = lerp(t0, 1, i / (n - 1));
    const [x, y] = bez(c, t);
    const a = bezAngle(c, t);
    const enveloppe = Math.sin(Math.PI * Math.min(1, (t - t0) / (1 - t0) * 0.95 + 0.05));
    const l = 7 + 9 * enveloppe;
    for (const sd of [1, -1]) {
      const aa = a + sd * (38 + rnd() * 18);
      const ex = x + Math.cos(rad(aa)) * l;
      const ey = y + Math.sin(rad(aa)) * l;
      const cx = x + Math.cos(rad(aa - sd * 18)) * l * 0.55;
      const cy = y + Math.sin(rad(aa - sd * 18)) * l * 0.55;
      s += `<path d="M${r2(x)} ${r2(y)}Q${r2(cx)} ${r2(cy)} ${r2(ex)} ${r2(ey)}" fill="none" stroke="${i % 3 ? plume : plumeFonce}" stroke-width="${r2(1 + rnd() * 0.6)}" stroke-linecap="round" opacity=".9"/>`;
    }
  }
  return s;
}

/** Feuille de palmier sechee : eventail de fines feuilles. */
function palme(x, y, a, l, o) {
  const { n = 13, ouverture = 110, fill, veine } = o;
  let s = '';
  for (let k = 0; k < n; k++) {
    const aa = -ouverture / 2 + (ouverture / (n - 1)) * k;
    const ll = l * (0.75 + 0.25 * Math.cos(rad(aa)));
    s += feuille(0, 0, aa, ll, ll * 0.07, { fill, veine, vsw: 0.4 });
  }
  return g(x, y, a, s);
}

/** Spirale (volute baroque). */
function volute(cx, cy, r0, tours, a0, sens, st) {
  const pts = [];
  const N = Math.round(60 * tours);
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * tours * 2 * Math.PI;
    const r = r0 * (1 - (i / N) * 0.85);
    const a = rad(a0) + sens * th;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return `<path d="M${pts.map((p) => p.map(r2).join(' ')).join('L')}" fill="none" stroke="${st.stroke}" stroke-width="${st.sw || 1}" stroke-linecap="round"/>`;
}

/** Bougie (base en 0,0, montant vers -y) avec flamme et halo. */
function bougie(x, y, h, w, c, idHalo, idFlamme) {
  const s =
    `<circle cy="${-h - 12}" r="${r2(w * 2.6)}" fill="url(#${idHalo})"/>` +
    `<rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="1.2" fill="${c.cire}"/>` +
    `<path d="M${-w / 2} ${-h + 1}Q${r2(-w * 0.1)} ${-h + 4} ${r2(-w * 0.15)} ${-h + 8}" stroke="${c.coulure}" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
    `<line x1="0" y1="${-h}" x2="0" y2="${-h - 3}" stroke="${c.meche}" stroke-width=".9"/>` +
    `<path d="M0 ${-h - 2}C-3.6 ${-h - 6} -2.8 ${-h - 13} 0 ${-h - 19}C2.8 ${-h - 13} 3.6 ${-h - 6} 0 ${-h - 2}Z" fill="url(#${idFlamme})"/>`;
  return g(x, y, 0, s);
}

/** Flute de champagne (pied en 0,0, montant vers -y). */
function flute(x, y, a, h, st) {
  const k = h / 40;
  const s =
    `<path d="M${-5 * k} ${-40 * k}L${-4 * k} ${-19 * k}Q0 ${-14 * k} ${4 * k} ${-19 * k}L${5 * k} ${-40 * k}" fill="none" stroke="${st.stroke}" stroke-width="${st.sw}" stroke-linejoin="round"/>` +
    `<path d="M${-4.6 * k} ${-31 * k}L${4.6 * k} ${-31 * k}" stroke="${st.stroke}" stroke-width="${st.sw * 0.7}"/>` +
    `<path d="M0 ${-15.5 * k}L0 ${-2 * k}M${-6 * k} 0Q0 ${-3 * k} ${6 * k} 0" fill="none" stroke="${st.stroke}" stroke-width="${st.sw}" stroke-linecap="round"/>` +
    (st.bulles ? point(-1.5 * k, -25 * k, 0.7 * k, st.stroke) + point(1.5 * k, -28 * k, 0.6 * k, st.stroke) + point(0, -35 * k, 0.5 * k, st.stroke) : '');
  return g(x, y, a, s);
}

/** Arc en ciel boheme : bandes concentriques (demi-disques). */
function arcEnCiel(cx, cy, r, couleurs, ep) {
  let s = '';
  couleurs.forEach((c, i) => {
    const R = r - i * ep;
    if (R <= 0) return;
    s += `<path d="M${r2(cx - R)} ${r2(cy)}A${r2(R)} ${r2(R)} 0 0 1 ${r2(cx + R)} ${r2(cy)}Z" fill="${c}"/>`;
  });
  return s;
}

function soleil(x, y, r, o) {
  const { fill, rayons = 12, lr = 0.7, stroke, sw = 1.1 } = o;
  let s = `<circle r="${r}" fill="${fill}"/>`;
  for (let k = 0; k < rayons; k++) {
    const a = rad((360 / rayons) * k);
    s += `<line x1="${r2(Math.cos(a) * r * 1.35)}" y1="${r2(Math.sin(a) * r * 1.35)}" x2="${r2(Math.cos(a) * r * (1.35 + lr))}" y2="${r2(Math.sin(a) * r * (1.35 + lr))}" stroke="${stroke || fill}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
  return g(x, y, 0, s);
}

/** Semis aleatoire (sans chevauchement) pour un motif de fond repetable. */
function semis(taille, n, ecart, rnd, dessin) {
  const pts = [];
  let essais = 0;
  while (pts.length < n && essais++ < 4000) {
    const m = ecart * 0.6;
    const x = m + rnd() * (taille - 2 * m);
    const y = m + rnd() * (taille - 2 * m);
    if (pts.every(([a, b]) => Math.hypot(a - x, b - y) > ecart)) pts.push([x, y]);
  }
  return pts.map(([x, y], i) => dessin(x, y, i)).join('');
}

const svg = (w, h, contenu, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}${contenu}</svg>\n`;

const degradeLin = (id, c, opDebut = 0, opFin = 0) =>
  `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${c}" stop-opacity="${opDebut}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="${opFin}"/></linearGradient>`;

/** Separateur classique : filet degrade - motif central - filet degrade. */
function sepFilets(w, h, couleur, centre, sw = 0.9, marge = 22) {
  const cy = h / 2;
  return svg(w, h,
    `<line x1="4" y1="${cy}" x2="${w / 2 - marge}" y2="${cy}" stroke="url(#fg)" stroke-width="${sw}"/>` +
    `<line x1="${w / 2 + marge}" y1="${cy}" x2="${w - 4}" y2="${cy}" stroke="url(#fd)" stroke-width="${sw}"/>` + centre,
    `<linearGradient id="fg" x1="0" x2="1"><stop offset="0" stop-color="${couleur}" stop-opacity="0"/><stop offset="1" stop-color="${couleur}"/></linearGradient>` +
    `<linearGradient id="fd" x1="0" x2="1"><stop offset="0" stop-color="${couleur}"/><stop offset="1" stop-color="${couleur}" stop-opacity="0"/></linearGradient>`);
}

/* ================================================================== *
 * Themes
 * ================================================================== */

const THEMES = {};

/* ---------- Marbre & Or : Art deco dore + lauriers ---------- */
THEMES['marbre-or'] = () => {
  const or = '#B8913A', orC = '#D8BD7C';
  const laurier = { fill: or, op: 0.92 };
  const coin = svg(200, 200,
    `<path d="M10 196V10H196" fill="none" stroke="${or}" stroke-width="1.3"/>` +
    `<path d="M20 150V20H150" fill="none" stroke="${or}" stroke-width=".8"/>` +
    `<path d="M10 52H28V28H52V10" fill="none" stroke="${or}" stroke-width=".8"/>` +
    [16, 24, 32].map((R) => `<path d="M${28 + R} 28A${R} ${R} 0 0 1 28 ${28 + R}" fill="none" stroke="${or}" stroke-width=".7"/>`).join('') +
    [15, 30, 45, 60, 75].map((a) => `<line x1="28" y1="28" x2="${r2(28 + Math.cos(rad(a)) * 32)}" y2="${r2(28 + Math.sin(rad(a)) * 32)}" stroke="${or}" stroke-width=".5"/>`).join('') +
    losange(20, 160, 4.5, { fill: or }) + losange(160, 20, 4.5, { fill: or }) +
    point(20, 172, 1.6, or) + point(20, 181, 1.2, or) + point(172, 20, 1.6, or) + point(181, 20, 1.2, or) +
    branche([[34, 60], [38, 80], [44, 100], [52, 124]], { n: 7, l0: 11, l1: 7, ratio: 0.34, angle: 48, tige: or, tsw: 0.8, st: laurier }) +
    branche([[60, 34], [80, 38], [100, 44], [124, 52]], { n: 7, l0: 11, l1: 7, ratio: 0.34, angle: 48, tige: or, tsw: 0.8, st: laurier }) +
    etincelle(46, 46, 5, orC));
  const brG = [[118, 66], [90, 70], [52, 60], [20, 30]];
  const haut = svg(240, 80,
    branche(brG, { n: 11, l0: 13, l1: 8, ratio: 0.33, angle: 44, tige: or, tsw: 0.9, st: laurier }) +
    branche(miroirX(brG, 240), { n: 11, l0: 13, l1: 8, ratio: 0.33, angle: 44, tige: or, tsw: 0.9, st: laurier }) +
    losange(120, 58, 7, { stroke: or, sw: 1 }) + losange(120, 58, 3, { fill: or }) +
    point(120, 42, 1.6, or) + point(120, 74, 1.6, or) + etincelle(120, 30, 5, orC));
  const sep = sepFilets(240, 30, or, losange(120, 15, 6, { stroke: or, sw: 1 }) + losange(120, 15, 2.5, { fill: or }) + point(104, 15, 1.5, or) + point(136, 15, 1.5, or), 0.9);
  const event = svg(64, 64,
    [10, 17, 24].map((R) => `<path d="M${56 - R} 8A${R} ${R} 0 0 0 56 ${8 + R}" fill="none" stroke="${or}" stroke-width=".7"/>`).join('') +
    [105, 120, 135, 150, 165].map((a) => `<line x1="56" y1="8" x2="${r2(56 + Math.cos(rad(a)) * 24)}" y2="${r2(8 + Math.sin(rad(a)) * 24)}" stroke="${or}" stroke-width=".45"/>`).join('') +
    losange(56, 8, 3, { fill: or }));
  const rnd = alea(11);
  const fond = svg(420, 420, semis(420, 16, 80, rnd, (x, y, i) =>
    i % 3 === 0 ? etincelle(x, y, 6 + rnd() * 4, or, 0.5) : losange(x, y, 3 + rnd() * 1.5, { fill: or })), '');
  return { coin, haut, sep, event, fond };
};

/* ---------- Botanique sauge : eucalyptus, fougere, baies dorees ---------- */
THEMES['botanique-sauge'] = () => {
  const v = '#8FA382', vC = '#B4C2A6', vF = '#6C8062', or = '#C9A44C';
  const euc = { fill: v, op: 0.9, veine: vC, vsw: 0.5 };
  const eucC = { fill: vC, op: 0.95 };
  const fin = { fill: vF, op: 0.85 };
  const baies = (x, y, s = 1) => [[0, 0], [5, -3], [3, 5], [-4, 4], [8, 3]].map(([a, b]) => point(x + a * s, y + b * s, 2.1 * s, or)).join('');
  const coin = svg(200, 200,
    branche([[4, 16], [60, 14], [120, 30], [176, 22]], { n: 9, l0: 15, l1: 9, ratio: 0.68, angle: 70, tige: vF, tsw: 1, st: euc }) +
    branche([[16, 4], [14, 60], [30, 120], [22, 176]], { n: 9, l0: 15, l1: 9, ratio: 0.68, angle: 70, tige: vF, tsw: 1, st: euc }) +
    branche([[10, 10], [40, 30], [62, 54], [92, 92]], { n: 12, l0: 10, l1: 4, ratio: 0.22, angle: 55, deux: true, tige: vF, tsw: 0.7, st: fin }) +
    branche([[30, 8], [60, 40], [84, 46], [120, 64]], { n: 6, l0: 11, l1: 7, ratio: 0.6, angle: 62, tige: vF, tsw: 0.8, st: eucC }) +
    baies(36, 36) + baies(70, 22, 0.8) + baies(22, 74, 0.8) +
    fleur5(48, 18, 6, { fill: '#FBF8F0', stroke: vC, coeur: or }) + fleur5(18, 50, 5, { fill: '#FBF8F0', stroke: vC, coeur: or }));
  const brG = [[116, 64], [88, 72], [50, 58], [14, 28]];
  const brG2 = [[112, 62], [90, 50], [66, 30], [44, 10]];
  const haut = svg(240, 80,
    branche(brG, { n: 9, l0: 13, l1: 8, ratio: 0.66, angle: 68, tige: vF, tsw: 1, st: euc }) +
    branche(miroirX(brG, 240), { n: 9, l0: 13, l1: 8, ratio: 0.66, angle: 68, tige: vF, tsw: 1, st: euc }) +
    branche(brG2, { n: 10, l0: 8, l1: 4, ratio: 0.22, angle: 55, deux: true, tige: vF, tsw: 0.7, st: fin }) +
    branche(miroirX(brG2, 240), { n: 10, l0: 8, l1: 4, ratio: 0.22, angle: 55, deux: true, tige: vF, tsw: 0.7, st: fin }) +
    baies(112, 58) + baies(124, 60, 0.9) +
    fleur5(120, 64, 9, { fill: '#FBF8F0', stroke: vC, coeur: or }));
  const sp = [[120, 15], [90, 10], [50, 20], [10, 15]];
  const sep = svg(240, 30,
    branche(sp, { n: 8, l0: 8, l1: 5, ratio: 0.6, angle: 64, tige: vF, tsw: 0.8, st: euc }) +
    branche(miroirX(sp, 240), { n: 8, l0: 8, l1: 5, ratio: 0.6, angle: 64, tige: vF, tsw: 0.8, st: euc }) +
    point(120, 15, 3, or) + point(113, 12, 1.8, or) + point(127, 12, 1.8, or));
  const event = svg(64, 64,
    branche([[62, 2], [48, 10], [36, 22], [24, 44]], { n: 6, l0: 9, l1: 6, ratio: 0.66, angle: 66, tige: vF, tsw: 0.8, st: euc }) +
    baies(52, 14, 0.7));
  const rnd = alea(22);
  const fond = svg(420, 420, semis(420, 14, 95, rnd, (x, y, i) => {
    if (!(i % 2)) return feuille(x, y, rnd() * 360, 18, 10, { fill: v, op: 0.45 });
    const a = rnd() * 360;
    return g(x, y, a, branche([[-22, 0], [-8, -6], [8, -6], [22, 0]], { n: 5, l0: 10, l1: 7, ratio: 0.65, angle: 64, tige: vF, tsw: 0.7, st: { fill: v, op: 0.55 } }));
  }));
  return { coin, haut, sep, event, fond };
};

/* ---------- Nuit etoilee : lune, constellations, etincelles ---------- */
THEMES['nuit-etoilee'] = () => {
  const or = '#D4B26A', orC = '#F1DFA8', bleu = '#8FA2D0';
  const cst = [[22, 70], [44, 54], [70, 60], [92, 36], [120, 30], [150, 44]];
  const cst2 = [[60, 110], [40, 132], [52, 160], [30, 184]];
  const ligne = (pts) => `<path d="M${pts.map((p) => p.join(' ')).join('L')}" fill="none" stroke="${or}" stroke-width=".6" opacity=".6" stroke-dasharray="2 3"/>`;
  const coin = svg(200, 200,
    croissant(34, 30, 17, or, -20) +
    ligne(cst) + ligne(cst2) +
    cst.map(([x, y], i) => etincelle(x, y, i % 2 ? 4 : 6, i % 3 ? orC : or)).join('') +
    cst2.map(([x, y], i) => etincelle(x, y, i % 2 ? 3.5 : 5, orC)).join('') +
    [[80, 12], [170, 18], [110, 70], [14, 110], [86, 96], [16, 150]].map(([x, y], i) => point(x, y, i % 2 ? 1 : 1.5, i % 2 ? bleu : orC)).join('') +
    etoile(64, 18, 3.5, { fill: or }) + etoile(14, 92, 3, { fill: or }));
  const arc = (side) => {
    let s = '';
    for (let k = 0; k < 7; k++) {
      const a = rad(200 - k * 11);
      const x = 120 + side * Math.cos(a) * 96 * -1;
      const y = 74 + Math.sin(a) * 50 * -1;
      s += k % 2 ? point(x, y, 1.6, orC) : etincelle(x, y, 5 - k * 0.45, or);
    }
    return s;
  };
  const haut = svg(240, 80,
    croissant(120, 42, 22, or, -35) + etoile(126, 40, 7, { fill: orC }) +
    arc(1) + arc(-1) +
    etincelle(92, 22, 3, orC) + etincelle(150, 18, 3, orC) + point(104, 12, 1, bleu) + point(140, 66, 1, bleu));
  const sep = sepFilets(240, 30, or, etincelle(120, 15, 8, or) + etincelle(104, 15, 3, orC) + etincelle(136, 15, 3, orC) + point(94, 15, 1.2, or) + point(146, 15, 1.2, or), 0.8, 30);
  const event = svg(64, 64, croissant(48, 16, 10, or, -30) + etincelle(30, 12, 4, orC) + etincelle(54, 38, 3, orC) + point(38, 28, 1.2, orC));
  const rnd = alea(33);
  const fond = svg(420, 420, semis(420, 26, 60, rnd, (x, y, i) =>
    i % 4 === 0 ? etincelle(x, y, 3 + rnd() * 3, orC, 0.7) : point(x, y, 0.6 + rnd() * 0.9, i % 2 ? '#fff' : orC, 0.5 + rnd() * 0.4)));
  return { coin, haut, sep, event, fond };
};

/* ---------- Mediterranee : oliviers et citrons ---------- */
THEMES['mediterranee'] = () => {
  const vO = '#7E8A4A', vF = '#5E6A34', vC = '#A3AD72';
  const oli = { base: '#4E5A2A', reflet: '#8C9A5A' };
  const cit = { base: '#EDC94B', ombre: '#C9A02C', reflet: '#F8E58E' };
  const fo = { fill: vO, op: 0.95, veine: vC, vsw: 0.5 };
  const fC = { fill: vC, op: 0.9 };
  const olives = (c, ts) => ts.map((t) => { const [x, y] = bez(c, t); return olive(x, y, bezAngle(c, t) + 90, 8, oli); }).join('');
  const b1 = [[4, 18], [60, 12], [120, 30], [180, 22]];
  const b2 = [[18, 4], [12, 60], [30, 120], [22, 180]];
  const coin = svg(200, 200,
    branche(b1, { n: 11, l0: 16, l1: 10, ratio: 0.26, angle: 40, tige: vF, tsw: 1, st: fo }) +
    branche(b2, { n: 11, l0: 16, l1: 10, ratio: 0.26, angle: 40, tige: vF, tsw: 1, st: fo }) +
    olives(b1, [0.35, 0.62, 0.8]) + olives(b2, [0.4, 0.66]) +
    feuille(38, 52, 60, 20, 7, { fill: vO, veine: vC }) + feuille(52, 38, 30, 20, 7, { fill: vF, veine: vC }) + feuille(30, 30, 130, 17, 6, { fill: vC }) +
    citron(22, 40, -18, 34, cit) + citron(46, 20, 38, 28, cit));
  const brG = [[116, 62], [86, 70], [50, 56], [12, 30]];
  const haut = svg(240, 80,
    branche(brG, { n: 11, l0: 14, l1: 9, ratio: 0.26, angle: 40, tige: vF, tsw: 1, st: fo }) +
    branche(miroirX(brG, 240), { n: 11, l0: 14, l1: 9, ratio: 0.26, angle: 40, tige: vF, tsw: 1, st: fo }) +
    olives(brG, [0.3, 0.55, 0.78]) + olives(miroirX(brG, 240), [0.3, 0.55, 0.78]) +
    feuille(112, 52, -120, 18, 6, { fill: vF, veine: vC }) + feuille(128, 52, -60, 18, 6, { fill: vO, veine: vC }) +
    citron(98, 62, -12, 26, cit) + citron(118, 66, 8, 28, cit) + citron(108, 46, -40, 22, cit));
  const sp = [[120, 16], [90, 12], [50, 20], [12, 15]];
  const sep = svg(240, 30,
    branche(sp, { n: 8, l0: 10, l1: 6, ratio: 0.26, angle: 40, tige: vF, tsw: 0.8, st: fo }) +
    branche(miroirX(sp, 240), { n: 8, l0: 10, l1: 6, ratio: 0.26, angle: 40, tige: vF, tsw: 0.8, st: fo }) +
    olives(sp, [0.4, 0.7]) + olives(miroirX(sp, 240), [0.4, 0.7]) + citron(110, 15, 0, 20, cit));
  const event = svg(64, 64,
    feuille(50, 12, 150, 18, 6, { fill: vO, veine: vC }) + feuille(52, 14, 100, 16, 5.5, { fill: vF, veine: vC }) +
    citron(30, 18, 20, 24, cit));
  const rnd = alea(44);
  const fond = svg(420, 420, semis(420, 14, 92, rnd, (x, y, i) =>
    i % 3 === 0 ? `<g opacity=".6">${citron(x, y, rnd() * 360, 26, cit)}</g>` : feuille(x, y, rnd() * 360, 20, 5.5, { fill: i % 2 ? vO : vC, op: 0.5 })));
  return { coin, haut, sep, event, fond };
};

/* ---------- Rose poudre : roses, boutons, gypsophile, coeurs ---------- */
THEMES['rose-poudre'] = () => {
  const r = { base: '#E7B3B1', clair: '#F4D3D0', trait: '#D9A2A1', fonce: '#BF7D80' };
  const r2c = { base: '#EFC9C4', clair: '#F9E3E0', trait: '#E0B7B3', fonce: '#C99396' };
  const vt = '#A3B293', vF = '#869578', or = '#C9A44C';
  const fe = { fill: vt, op: 0.95, veine: '#C4CFB7', vsw: 0.5 };
  const gyps = (x, y, n, rnd) => { let s = ''; for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = rnd() * 14; s += point(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.3 + rnd(), '#FFFFFF') + point(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.5, '#E8C8C6'); } return s; };
  const rc = alea(5);
  const coin = svg(200, 200,
    branche([[20, 30], [70, 18], [120, 34], [176, 20]], { n: 7, l0: 15, l1: 9, ratio: 0.42, angle: 50, tige: vF, tsw: 1, st: fe }) +
    branche([[30, 20], [18, 70], [34, 120], [20, 176]], { n: 7, l0: 15, l1: 9, ratio: 0.42, angle: 50, tige: vF, tsw: 1, st: fe }) +
    feuille(50, 62, 50, 26, 10, fe) + feuille(64, 46, 20, 24, 9, fe) + feuille(28, 66, 95, 22, 8, fe) +
    gyps(84, 54, 9, rc) + gyps(54, 86, 9, rc) +
    rose(38, 38, 26, r, 10) + rose(86, 26, 15, r2c, 40) + rose(24, 88, 15, r2c, 70) +
    bouton(108, 40, -10, 14, r, vF) + bouton(42, 108, 100, 14, r, vF) +
    point(70, 70, 2, or) + point(112, 22, 1.5, or) + point(22, 112, 1.5, or));
  const rh = alea(6);
  const brG = [[116, 56], [90, 66], [54, 56], [16, 34]];
  const haut = svg(240, 80,
    branche(brG, { n: 8, l0: 14, l1: 9, ratio: 0.42, angle: 52, tige: vF, tsw: 1, st: fe }) +
    branche(miroirX(brG, 240), { n: 8, l0: 14, l1: 9, ratio: 0.42, angle: 52, tige: vF, tsw: 1, st: fe }) +
    gyps(92, 46, 7, rh) + gyps(148, 46, 7, rh) +
    rose(98, 54, 12, r2c, 30) + rose(142, 54, 12, r2c, 60) + rose(120, 50, 18, r, 0) +
    bouton(72, 60, 170, 12, r, vF) + bouton(168, 60, 10, 12, r, vF) +
    coeur(120, 18, 5, { fill: r.fonce }));
  const sp = [[108, 15], [86, 10], [56, 20], [20, 15]];
  const sep = svg(240, 30,
    branche(sp, { n: 6, l0: 8, l1: 5, ratio: 0.42, angle: 50, tige: vF, tsw: 0.8, st: fe }) +
    branche(miroirX(sp, 240), { n: 6, l0: 8, l1: 5, ratio: 0.42, angle: 50, tige: vF, tsw: 0.8, st: fe }) +
    coeur(120, 15, 7, { fill: r.base, stroke: r.fonce, sw: 0.7 }) + point(100, 15, 1.4, or) + point(140, 15, 1.4, or));
  const event = svg(64, 64, feuille(46, 20, 160, 16, 6, fe) + feuille(46, 20, 100, 16, 6, fe) + rose(46, 18, 12, r, 20) + bouton(28, 28, 160, 10, r2c, vF));
  const rnd = alea(66);
  const fond = svg(420, 420, semis(420, 18, 78, rnd, (x, y, i) =>
    i % 4 === 0 ? coeur(x, y, 6, { fill: r.base, a: rnd() * 40 - 20 }) : feuille(x, y, rnd() * 360, 16, 8, { fill: i % 2 ? r.base : r.clair, op: 0.65 })));
  return { coin, haut, sep, event, fond };
};

/* ---------- Jardin blanc : marguerites, muguet, petites fleurs ---------- */
THEMES['jardin-blanc'] = () => {
  const tr = '#A5B39E', vt = '#A7B7A0', vF = '#879A80', coeurC = '#E6D49C';
  const fe = { fill: vt, op: 0.9, veine: '#C9D4C3', vsw: 0.5 };
  const blanc = { fill: '#FFFFFF', stroke: tr, sw: 0.7, coeur: coeurC };
  const coin = svg(200, 200,
    branche([[6, 22], [60, 16], [120, 34], [178, 24]], { n: 9, l0: 14, l1: 8, ratio: 0.36, angle: 48, tige: vF, tsw: 0.9, st: fe }) +
    branche([[22, 6], [16, 60], [34, 120], [24, 178]], { n: 9, l0: 14, l1: 8, ratio: 0.36, angle: 48, tige: vF, tsw: 0.9, st: fe }) +
    muguet([[40, 40], [70, 50], [96, 58], [130, 54]], { n: 6, tige: vF, stroke: tr, taille: 4.5 }) +
    muguet([[40, 40], [50, 70], [58, 96], [54, 130]], { n: 6, tige: vF, stroke: tr, taille: 4.5 }) +
    marguerite(36, 34, 22, { ...blanc, rot: 8 }) + marguerite(78, 24, 13, { ...blanc, rot: 20 }) + marguerite(24, 78, 13, { ...blanc, rot: 0 }) +
    fleur5(104, 28, 7, blanc) + fleur5(28, 104, 7, blanc) + fleur5(60, 58, 6, blanc));
  const brG = [[116, 60], [88, 70], [52, 58], [14, 32]];
  const haut = svg(240, 80,
    branche(brG, { n: 9, l0: 13, l1: 8, ratio: 0.36, angle: 48, tige: vF, tsw: 0.9, st: fe }) +
    branche(miroirX(brG, 240), { n: 9, l0: 13, l1: 8, ratio: 0.36, angle: 48, tige: vF, tsw: 0.9, st: fe }) +
    fleur5(58, 52, 6, blanc) + fleur5(182, 52, 6, blanc) + fleur5(36, 40, 5, blanc) + fleur5(204, 40, 5, blanc) +
    marguerite(96, 56, 12, { ...blanc, rot: 10 }) + marguerite(144, 56, 12, { ...blanc, rot: 30 }) + marguerite(120, 48, 19, blanc));
  const mg = [[112, 8], [92, 4], [70, 6], [40, 10]];
  const sep = svg(240, 30,
    muguet(mg, { n: 5, tige: vF, stroke: tr, taille: 5, t0: 0.25 }) +
    muguet(miroirX(mg, 240), { n: 5, tige: vF, stroke: tr, taille: 5, t0: 0.25 }) +
    feuille(114, 9, 160, 14, 4, fe) + feuille(126, 9, 20, 14, 4, fe) + fleur5(120, 9, 6, blanc));
  const event = svg(64, 64, feuille(48, 16, 150, 18, 5, fe) + feuille(48, 16, 105, 16, 5, fe) + marguerite(48, 16, 13, blanc) + fleur5(28, 12, 5, blanc));
  const rnd = alea(77);
  const fond = svg(420, 420, semis(420, 16, 84, rnd, (x, y, i) =>
    i % 3 === 0 ? marguerite(x, y, 14, { ...blanc, rot: rnd() * 40 }) : fleur5(x, y, 6 + rnd() * 3, { ...blanc, rot: rnd() * 72 })));
  return { coin, haut, sep, event, fond };
};

/* ---------- Esquisse illustree : trait d'encre dessine a la main ---------- */
THEMES['esquisse-illustree'] = () => {
  const e = '#23324F', eC = '#5C6B86';
  const filtre = `<filter id="enc" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>`;
  const enc = (s) => `<g filter="url(#enc)">${s}</g>`;
  const trait = { stroke: e, sw: 1, veine: e, vsw: 0.6 };
  const fleurT = (x, y, r, n = 6) => marguerite(x, y, r, { n, fill: 'none', stroke: e, sw: 1, coeur: e, rx: 0.42, ry: 0.2 });
  const anneaux = (x, y, s) =>
    `<circle cx="${x - 7 * s}" cy="${y}" r="${12 * s}" fill="none" stroke="${e}" stroke-width="${1.6 * s}"/>` +
    `<circle cx="${x + 7 * s}" cy="${y}" r="${12 * s}" fill="none" stroke="${e}" stroke-width="${1.6 * s}"/>` +
    losange(x - 7 * s, y - 15 * s, 3.4 * s, { stroke: e, sw: 1 }) +
    `<path d="M${x - 14 * s} ${y - 20 * s}l-3 -3M${x - 7 * s} ${y - 22 * s}v-4M${x} ${y - 20 * s}l3 -3" stroke="${e}" stroke-width=".9" stroke-linecap="round"/>`;
  const coin = svg(200, 200, enc(
    branche([[6, 18], [60, 10], [120, 30], [178, 18]], { n: 9, l0: 15, l1: 8, ratio: 0.32, angle: 45, tige: e, tsw: 1, st: trait }) +
    branche([[18, 6], [10, 60], [30, 120], [18, 178]], { n: 9, l0: 15, l1: 8, ratio: 0.32, angle: 45, tige: e, tsw: 1, st: trait }) +
    fleurT(38, 36, 22, 7) + fleurT(84, 26, 12) + fleurT(26, 84, 12) +
    volute(66, 62, 10, 1.6, 0, 1, { stroke: e, sw: 0.9 }) +
    [[104, 50], [50, 104], [110, 18], [18, 110]].map(([x, y]) => point(x, y, 1.4, e)).join('') +
    `<path d="M70 86v12M64 92h12" stroke="${e}" stroke-width=".9" stroke-linecap="round"/>`));
  const haut = svg(240, 80, enc(
    anneaux(120, 50, 1) +
    branche([[96, 54], [74, 60], [50, 50], [20, 34]], { n: 7, l0: 12, l1: 7, ratio: 0.32, angle: 45, tige: e, tsw: 1, st: trait }) +
    branche(miroirX([[96, 54], [74, 60], [50, 50], [20, 34]], 240), { n: 7, l0: 12, l1: 7, ratio: 0.32, angle: 45, tige: e, tsw: 1, st: trait }) +
    fleurT(66, 52, 8) + fleurT(174, 52, 8) +
    `<path d="M150 22v8M146 26h8M88 18v6M85 21h6" stroke="${eC}" stroke-width=".9" stroke-linecap="round"/>`));
  const sep = svg(240, 30, enc(
    `<path d="M14 16C34 8 50 22 70 14S100 10 106 15" fill="none" stroke="${e}" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M226 16C206 8 190 22 170 14S140 10 134 15" fill="none" stroke="${e}" stroke-width="1" stroke-linecap="round"/>` +
    coeur(120, 15, 7, { stroke: e, sw: 1.1 })));
  const event = svg(64, 64, enc(flute(30, 52, -14, 40, { stroke: e, sw: 1, bulles: true }) + flute(42, 52, 14, 40, { stroke: e, sw: 1, bulles: true }) +
    `<path d="M36 6v6M33 9h6M46 10l3-3M26 10l-3-3" stroke="${e}" stroke-width=".9" stroke-linecap="round"/>`));
  const rnd = alea(88);
  const doodles = [
    (x, y) => coeur(x, y, 7, { stroke: eC, sw: 0.9, a: rnd() * 30 - 15 }),
    (x, y) => `<path d="M${r2(x)} ${r2(y - 6)}v12M${r2(x - 6)} ${r2(y)}h12" stroke="${eC}" stroke-width=".9" stroke-linecap="round"/>`,
    (x, y) => marguerite(x, y, 11, { n: 6, fill: 'none', stroke: eC, sw: 0.8, coeur: eC, rx: 0.42, ry: 0.2 }),
    (x, y) => flute(x, y + 15, rnd() * 30 - 15, 30, { stroke: eC, sw: 0.8 }),
    (x, y) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="5" fill="none" stroke="${eC}" stroke-width=".9"/>`,
  ];
  const fond = svg(420, 420, enc(semis(420, 15, 92, rnd, (x, y, i) => `<g opacity=".55">${doodles[i % doodles.length](x, y)}</g>`)), filtre);
  // Le filtre doit etre dans chaque SVG qui l'utilise.
  const avecFiltre = (s) => s.replace(/(<svg[^>]*>)/, `$1<defs>${filtre}</defs>`);
  return { coin: avecFiltre(coin), haut: avecFiltre(haut), sep: avecFiltre(sep), event: avecFiltre(event), fond };
};

/* ---------- Diner aux chandelles : bougies, volutes dorees, roses sombres ---------- */
THEMES['diner-chandelles'] = () => {
  const or = '#D8B46A', orC = '#F0D79A';
  const rs = { base: '#7E2233', clair: '#9B3346', trait: '#5E1824', fonce: '#4A101B' };
  const cire = { cire: '#F2E6D0', coulure: '#E0CDAE', meche: '#3A2A20' };
  const defs = (id) =>
    `<radialGradient id="h${id}"><stop offset="0" stop-color="#FFD98A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="f${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF9F43"/><stop offset=".55" stop-color="#FFD27A"/><stop offset="1" stop-color="#FFF4D6"/></linearGradient>`;
  const fo = { fill: or, op: 0.85 };
  const coin = svg(200, 200,
    `<path d="M10 190V40Q10 10 40 10H190" fill="none" stroke="${or}" stroke-width="1"/>` +
    volute(46, 44, 16, 1.4, 180, 1, { stroke: or, sw: 1.1 }) + volute(78, 26, 10, 1.3, 90, -1, { stroke: or, sw: 0.9 }) + volute(26, 78, 10, 1.3, 0, 1, { stroke: or, sw: 0.9 }) +
    branche([[60, 20], [90, 18], [120, 26], [160, 20]], { n: 6, l0: 11, l1: 7, ratio: 0.34, angle: 48, tige: or, tsw: 0.8, st: fo }) +
    branche([[20, 60], [18, 90], [26, 120], [20, 160]], { n: 6, l0: 11, l1: 7, ratio: 0.34, angle: 48, tige: or, tsw: 0.8, st: fo }) +
    feuille(56, 66, 50, 18, 7, { fill: or, op: 0.7 }) + rose(46, 46, 14, rs, 0) + rose(70, 40, 8, rs, 50) + rose(40, 70, 8, rs, 20) +
    point(110, 40, 1.4, orC) + point(40, 110, 1.4, orC), defs('c'));
  const haut = svg(240, 80,
    `<path d="M80 74H160M88 74Q88 58 104 58H136Q152 58 152 74M120 74V58" fill="none" stroke="${or}" stroke-width="1.2"/>` +
    bougie(104, 58, 22, 6, cire, 'hh', 'fh') + bougie(136, 58, 22, 6, cire, 'hh', 'fh') + bougie(120, 58, 30, 7, cire, 'hh', 'fh') +
    volute(70, 62, 9, 1.3, 0, -1, { stroke: or, sw: 1 }) + volute(170, 62, 9, 1.3, 180, 1, { stroke: or, sw: 1 }) +
    branche([[62, 66], [46, 62], [30, 54], [12, 52]], { n: 5, l0: 10, l1: 7, ratio: 0.34, angle: 48, tige: or, tsw: 0.8, st: fo }) +
    branche(miroirX([[62, 66], [46, 62], [30, 54], [12, 52]], 240), { n: 5, l0: 10, l1: 7, ratio: 0.34, angle: 48, tige: or, tsw: 0.8, st: fo }) +
    point(84, 30, 1.2, orC) + point(156, 26, 1.2, orC), defs('h'));
  const sep = sepFilets(240, 30, or,
    flute(114, 27, -16, 24, { stroke: or, sw: 0.9, bulles: true }) + flute(126, 27, 16, 24, { stroke: or, sw: 0.9, bulles: true }) + etincelle(120, 3, 3, orC), 0.8, 28);
  const event = svg(64, 64, bougie(44, 58, 22, 6, cire, 'he', 'fe') + volute(28, 50, 6, 1.2, 0, -1, { stroke: or, sw: 0.9 }), defs('e'));
  const rnd = alea(99);
  const fond = svg(420, 420, semis(420, 18, 80, rnd, (x, y, i) =>
    `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(4 + rnd() * 9)}" fill="url(#b)" opacity="${r2(0.35 + rnd() * 0.4)}"/>` + (i % 3 === 0 ? etincelle(x + 12, y - 10, 2.5, orC, 0.6) : '')),
    `<radialGradient id="b"><stop offset="0" stop-color="#FFD98A" stop-opacity=".7"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>`);
  return { coin, haut, sep, event, fond };
};

/* ---------- Epure minimaliste : trait fin continu, peu mais present ---------- */
THEMES['epure-minimaliste'] = () => {
  const t = '#8B7D6B', s = '#D9CFC1';
  const ligne = { stroke: t, sw: 0.8 };
  const coin = svg(200, 200,
    `<path d="M14 120V14H120" fill="none" stroke="${t}" stroke-width=".7"/>` +
    branche([[26, 26], [60, 44], [80, 76], [92, 128]], { n: 6, l0: 18, l1: 10, ratio: 0.3, angle: 38, tige: t, tsw: 0.8, st: ligne }) +
    branche([[26, 26], [52, 30], [90, 30], [134, 50]], { n: 5, l0: 14, l1: 9, ratio: 0.3, angle: 38, tige: t, tsw: 0.8, st: ligne }) +
    `<circle cx="26" cy="26" r="9" fill="${s}"/>` + point(26, 26, 2, t) + point(14, 136, 1.6, t) + point(136, 14, 1.6, t));
  const cour = (side) => {
    const c = side > 0 ? [[120, 72], [80, 74], [52, 50], [56, 14]] : miroirX([[120, 72], [80, 74], [52, 50], [56, 14]], 240);
    return branche(c, { n: 8, l0: 12, l1: 8, ratio: 0.3, angle: 40, tige: t, tsw: 0.8, st: ligne, pointe: true });
  };
  const haut = svg(240, 80, cour(1) + cour(-1) + `<circle cx="120" cy="40" r="11" fill="${s}"/>` + point(120, 40, 2.2, t));
  const sep = svg(240, 30,
    `<line x1="40" y1="15" x2="108" y2="15" stroke="${t}" stroke-width=".7"/><line x1="132" y1="15" x2="200" y2="15" stroke="${t}" stroke-width=".7"/>` +
    feuille(120, 17, -125, 14, 4, ligne) + feuille(120, 17, -55, 14, 4, ligne) + point(120, 18, 1.6, t));
  const event = svg(64, 64, branche([[58, 6], [46, 14], [38, 26], [34, 46]], { n: 4, l0: 10, l1: 7, ratio: 0.3, angle: 40, tige: t, tsw: 0.7, st: ligne }));
  const rnd = alea(111);
  const fond = svg(420, 420, semis(420, 9, 120, rnd, (x, y, i) =>
    i % 2 ? feuille(x, y, rnd() * 360, 20, 5, { stroke: t, sw: 0.8, op: 0.6 }) : point(x, y, 1.8, t, 0.55)));
  return { coin, haut, sep, event, fond };
};

/* ---------- Boheme terracotta : pampas, palmes sechees, soleils, arcs ---------- */
THEMES['boheme-terracotta'] = () => {
  const tc = '#C46A45', tF = '#9B4A2C', ocre = '#D9A25B', sable = '#E8CFAE', pamp = '#E6D1B3', pampF = '#C9AC86', sauge = '#A2A780';
  const coin = svg(200, 200,
    palme(14, 14, 45, 70, { n: 15, ouverture: 100, fill: ocre, veine: '#C08A45' }) +
    pampa([[20, 30], [70, 26], [120, 40], [180, 26]], { tige: pampF, plume: pamp, plumeFonce: pampF, rnd: alea(1) }) +
    pampa([[30, 20], [26, 70], [40, 120], [26, 180]], { tige: pampF, plume: pamp, plumeFonce: pampF, rnd: alea(2) }) +
    branche([[24, 24], [50, 60], [70, 80], [96, 104]], { n: 8, l0: 12, l1: 7, ratio: 0.3, angle: 45, deux: true, tige: sauge, tsw: 0.8, st: { fill: sauge, op: 0.85 } }) +
    soleil(56, 56, 7, { fill: tc, rayons: 10, lr: 0.6 }) +
    etoile(110, 64, 4, { n: 4, ratio: 0.3, fill: tF }) + etoile(64, 110, 4, { n: 4, ratio: 0.3, fill: tF }) + point(96, 80, 1.6, tc) + point(80, 96, 1.6, tc));
  const haut = svg(240, 80,
    arcEnCiel(120, 74, 34, [tc, sable, ocre, '#F6E6D2', tF], 6) +
    pampa([[100, 74], [76, 66], [52, 46], [24, 34]], { tige: pampF, plume: pamp, plumeFonce: pampF, rnd: alea(3), n: 34 }) +
    pampa(miroirX([[100, 74], [76, 66], [52, 46], [24, 34]], 240), { tige: pampF, plume: pamp, plumeFonce: pampF, rnd: alea(4), n: 34 }) +
    etoile(120, 22, 5, { n: 4, ratio: 0.3, fill: tF }) + point(96, 28, 1.6, tc) + point(144, 28, 1.6, tc) + point(108, 16, 1.2, ocre) + point(132, 16, 1.2, ocre));
  const sep = svg(240, 30,
    soleil(120, 15, 5, { fill: tc, rayons: 10, lr: 0.7, sw: 1 }) +
    [96, 84, 72, 144, 156, 168].map((x, i) => point(x, 15, i % 3 === 0 ? 2.2 : 1.5, i % 2 ? ocre : tc)).join('') +
    `<line x1="20" y1="15" x2="62" y2="15" stroke="${tc}" stroke-width=".8" stroke-dasharray="1 4" stroke-linecap="round"/><line x1="178" y1="15" x2="220" y2="15" stroke="${tc}" stroke-width=".8" stroke-dasharray="1 4" stroke-linecap="round"/>`);
  const event = svg(64, 64, arcEnCiel(40, 26, 16, [tc, sable, ocre, '#F6E6D2'], 4) + etoile(56, 8, 3.5, { n: 4, ratio: 0.3, fill: tF }));
  const rnd = alea(122);
  const fond = svg(420, 420, semis(420, 16, 86, rnd, (x, y, i) =>
    i % 3 === 0 ? soleil(x, y, 4.5, { fill: tc, rayons: 8, lr: 0.8, sw: 1 })
      : i % 3 === 1 ? etoile(x, y, 6, { n: 4, ratio: 0.3, fill: ocre, op: 0.85 })
        : arcEnCiel(x, y, 12, [tc, sable, ocre], 3.5)));
  return { coin, haut, sep, event, fond };
};

/* ================================================================== */

const seul = process.argv[2];
for (const [slug, fabrique] of Object.entries(THEMES)) {
  if (seul && seul !== slug) continue;
  const dir = path.join(PROJECT, 'themes', slug, 'orn');
  fs.mkdirSync(dir, { recursive: true });
  const fichiers = fabrique();
  for (const [nom, contenu] of Object.entries(fichiers)) fs.writeFileSync(path.join(dir, `${nom}.svg`), contenu, 'utf8');
  console.log(`  ${slug} : ${Object.keys(fichiers).join(', ')}`);
}
