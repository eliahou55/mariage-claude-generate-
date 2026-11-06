/**
 * Generateur d'invitations de mariage.
 *
 * Source unique de verite : ../invitation_mariage.xlsx (jamais modifie).
 * Sortie : dist/ (HTML + CSS + JS + medias + data/invitation.json)
 *
 * Aucune donnee client n'est ecrite en dur : tout est lu dans le classeur,
 * par NOM d'en-tete, puis injecte dans le JSON consomme par src/app.js.
 */

import ExcelJS from 'exceljs';
import { promises as fs } from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');          // invitations/
const DATA_ROOT = path.resolve(PROJECT, '..');     // racine, ou vit le xlsx
const XLSX = path.join(DATA_ROOT, 'invitation_mariage.xlsx');
const DIST = path.join(PROJECT, 'dist');

/* ------------------------------------------------------------------ *
 * Catalogue des themes. `nom` doit correspondre EXACTEMENT au texte
 * de la liste deroulante Excel (colonne J de la feuille Site).
 * `surface` sert au calcul de contraste de la couleur d'accent.
 * L'ORDRE est celui de la galerie : les deux Toile de Jouy (les plus
 * choisies, `vedette`) sont presentees en premier.
 * ------------------------------------------------------------------ */
const THEMES = [
  {
    nom: 'Toile de Jouy vert', slug: 'toile-de-jouy-vert', vedette: true, sombre: false, surface: '#FAF7EB',
    fonts: 'family=IM+Fell+English:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Toile de Jouy bleu', slug: 'toile-de-jouy-bleu', vedette: true, sombre: false, surface: '#FAFAF2',
    fonts: 'family=IM+Fell+English:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Marbre & Or', slug: 'marbre-or', sombre: false, surface: '#FBF8F2',
    fonts: 'family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Raleway:ital,wght@0,300;0,400;0,500;1,300&family=Pinyon+Script&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Botanique sauge', slug: 'botanique-sauge', sombre: false, surface: '#F6F4EC',
    fonts: 'family=Marcellus&family=Lora:ital,wght@0,400;0,500;1,400&family=Parisienne&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Nuit étoilée', slug: 'nuit-etoilee', sombre: true, surface: '#101B33',
    fonts: 'family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Cinzel+Decorative:wght@400;700&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Méditerranée', alias: ['Méditerranée (olivier & citrons)'], slug: 'mediterranee', sombre: false, surface: '#F7F3E4',
    fonts: 'family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Crimson+Pro:ital,wght@0,400;0,500;1,400&family=Dancing+Script:wght@500;600&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Rosé poudré', slug: 'rose-poudre', sombre: false, surface: '#FDF6F4',
    fonts: 'family=Italiana&family=Josefin+Sans:ital,wght@0,300;0,400;0,600;1,300&family=Great+Vibes&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Jardin blanc', slug: 'jardin-blanc', sombre: false, surface: '#FFFFFF',
    fonts: 'family=Cormorant:ital,wght@0,300;0,400;0,600;1,300&family=Spectral:ital,wght@0,300;0,400;1,300&family=Alex+Brush&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Esquisse illustrée', slug: 'esquisse-illustree', sombre: false, surface: '#FAF4E6',
    fonts: 'family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Caveat:wght@400;600&family=David+Libre:wght@400;500;700',
  },
  {
    nom: 'Dîner aux chandelles', slug: 'diner-chandelles', sombre: true, surface: '#2A0E16',
    fonts: 'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;1,6..96,400&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Italianno&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Épuré minimaliste', slug: 'epure-minimaliste', sombre: false, surface: '#FAF8F5',
    fonts: 'family=Jost:wght@200;300;400;500&family=Cormorant+Garamond:ital,wght@1,300;1,400&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
  {
    nom: 'Bohème terracotta', slug: 'boheme-terracotta', sombre: false, surface: '#FBF2E7',
    fonts: 'family=DM+Serif+Display:ital@0;1&family=Work+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Satisfy&family=Frank+Ruhl+Libre:wght@300;400;500;700',
  },
];

/* Couleurs proposees par la liste deroulante Excel (colonne K). */
const COULEURS = {
  'Or': '#C9A44C',
  'Blanc cassé': '#F7F3EA',
  'Crème': '#F1E7D3',
  'Ivoire': '#FFFDF4',
  'Vert sauge': '#9CAF88',
  'Vert olive': '#6B7A3A',
  'Bleu nuit': '#1B2A4A',
  'Bleu cobalt': '#1F4FA3',
  'Rose poudré': '#E8C4C4',
  'Bordeaux': '#6D1F2F',
  'Taupe': '#8B7D6B',
  'Terracotta': '#C46A45',
  'Noir': '#1A1A1A',
  'Blanc': '#FFFFFF',
};

/* Les 5 evenements, dans leur ordre "logique". L'ordre d'AFFICHAGE est
 * recalcule chronologiquement a partir des dates reelles. */
const EVENEMENTS = [
  { cle: 'henne',    titre: 'Henné',          titreHe: 'חינה',     suffixe: 'henné',          heure: true },
  { cle: 'mairie',   titre: 'Mairie',         titreHe: '',          suffixe: 'mairie',         heure: true },
  { cle: 'chabbat',  titre: "Chabbat 'Hatan", titreHe: 'שבת חתן',  suffixe: "Chabbat 'Hatan", heure: false },
  { cle: 'houppa',   titre: "'Houppa",        titreHe: 'חופה',     suffixe: 'mariage (houppa)', heure: true },
  { cle: 'reception', titre: 'Réception',     titreHe: 'סעודה',    suffixe: 'réception',      heure: true },
];

/* ==================================================================
 * Lecture de cellules
 * ================================================================== */

/** Deplie une valeur ExcelJS : formule -> result, richText -> texte. */
function unwrap(value) {
  let v = value;
  for (let i = 0; i < 4 && v && typeof v === 'object'; i++) {
    if (v instanceof Date) return v;
    if ('result' in v) { v = v.result; continue; }      // cellule formule
    if ('richText' in v) { return v.richText.map((r) => r.text).join(''); }
    if ('text' in v) { v = v.text; continue; }          // cellule lien hypertexte
    break;
  }
  return v;
}

function texte(cell) {
  const v = unwrap(cell ? cell.value : null);
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return '';
  return String(v).trim();
}

/** Recupere l'URL d'un lien hypertexte, jamais son libelle. */
function lien(cell) {
  const v = cell ? cell.value : null;
  if (v && typeof v === 'object' && typeof v.hyperlink === 'string') return v.hyperlink.trim();
  if (cell && typeof cell.hyperlink === 'string') return cell.hyperlink.trim();
  return '';
}

const EPOCH = 25569; // jours entre le 1899-12-30 d'Excel et le 1970-01-01 d'Unix

function partiesDate(cell) {
  const v = unwrap(cell ? cell.value : null);
  if (v === null || v === undefined || v === '') return null;
  let dt = null;
  if (v instanceof Date) dt = v;
  else if (typeof v === 'number') dt = new Date(Math.round((v - EPOCH) * 86400000));
  if (!dt || Number.isNaN(dt.getTime())) return null;
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function partiesHeure(cell) {
  const v = unwrap(cell ? cell.value : null);
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return { h: v.getUTCHours(), min: v.getUTCMinutes() };
  if (typeof v === 'number') {
    let frac = v % 1;
    if (frac < 0) frac += 1;
    let total = Math.round(frac * 1440) % 1440;
    return { h: Math.floor(total / 60), min: total % 60 };
  }
  return null;
}

const FMT_FR = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

function dateFr(p) {
  if (!p) return '';
  const s = FMT_FR.format(new Date(Date.UTC(p.y, p.m - 1, p.d)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function heureFr(t) {
  if (!t) return '';
  return `${String(t.h).padStart(2, '0')}h${String(t.min).padStart(2, '0')}`;
}

/* ==================================================================
 * Fuseau horaire : convertir une heure locale de Paris en instant UTC
 * ================================================================== */

function decalageMs(ts, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ts;
}

/** Instant absolu (epoch ms) correspondant a une date/heure a Paris. */
function parisVersUtc(y, m, d, h, min) {
  const naif = Date.UTC(y, m - 1, d, h, min, 0);
  let ts = naif;
  for (let i = 0; i < 4; i++) {
    const suivant = naif - decalageMs(ts, 'Europe/Paris');
    if (suivant === ts) break;
    ts = suivant;
  }
  return ts;
}

/* ==================================================================
 * Contraste (WCAG) : garantir un accent lisible sur chaque theme
 * ================================================================== */

function versRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function versHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function luminance(hex) {
  const [r, g, b] = versRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function melange(hex, vers, t) {
  const a = versRgb(hex), b = versRgb(vers);
  return versHex(a.map((v, i) => v + (b[i] - v) * t));
}

/** Variante de l'accent assurant >= `min` de contraste sur `fond`. */
function accentLisible(accent, fond, min = 4.5) {
  if (contraste(accent, fond) >= min) return accent;
  const cible = luminance(fond) > 0.4 ? '#000000' : '#FFFFFF';
  for (let t = 0.04; t <= 1.0001; t += 0.04) {
    const c = melange(accent, cible, t);
    if (contraste(c, fond) >= min) return c;
  }
  return cible;
}

/** Couleur de texte a poser SUR l'accent (bouton plein). */
function encreSurAccent(accent) {
  return contraste(accent, '#1A1A1A') >= contraste(accent, '#FFFFFF') ? '#1A1A1A' : '#FFFFFF';
}

/* ==================================================================
 * Extraction du classeur
 * ================================================================== */

function enTetes(ws) {
  const map = new Map();
  const ligne = ws.getRow(1);
  ligne.eachCell({ includeEmpty: false }, (cell, col) => {
    const nom = texte(cell);
    if (nom) map.set(nom, col);
  });
  return map;
}

function lecteur(ws) {
  const map = enTetes(ws);
  const ligne = ws.getRow(2);
  const get = (nom) => {
    const col = map.get(nom);
    return col ? ligne.getCell(col) : null;
  };
  return {
    cellule: get,
    txt: (nom) => texte(get(nom)),
    url: (nom) => lien(get(nom)),
    date: (nom) => partiesDate(get(nom)),
    heure: (nom) => partiesHeure(get(nom)),
    aColonne: (nom) => map.has(nom),
  };
}

async function extraireImage(wb, wsSite, id) {
  const images = typeof wsSite.getImages === 'function' ? wsSite.getImages() : [];
  if (images && images.length) {
    // Priorite a l'image ancree sur F2 (col 5, row 1 en base 0), sinon la premiere.
    const cible = images.find((im) => im.range?.tl?.nativeCol === 5 && im.range?.tl?.nativeRow === 1)
      || images.find((im) => im.range?.tl?.col >= 5 && im.range?.tl?.col < 6)
      || images[0];
    const media = wb.getImage(Number(cible.imageId));
    if (media && media.buffer) {
      const ext = (media.extension || 'png').replace(/^\./, '');
      return { buffer: Buffer.from(media.buffer), nom: `${id}_couverture.${ext}`, source: 'xlsx' };
    }
  }
  // Repli : medias/<ID>_couverture.png a la racine
  const repli = path.join(DATA_ROOT, 'medias', `${id}_couverture.png`);
  if (existsSync(repli)) {
    return { buffer: await fs.readFile(repli), nom: `${id}_couverture.png`, source: 'medias/' };
  }
  return null;
}

async function lireClasseur() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);

  const info = lecteur(wb.getWorksheet('Info'));
  const dates = lecteur(wb.getWorksheet('Dates'));
  const lieux = lecteur(wb.getWorksheet('Lieux'));
  const siteWs = wb.getWorksheet('Site');
  const site = lecteur(siteWs);

  const id = info.txt('ID');
  if (!id) throw new Error('Feuille "Info" : colonne ID vide en ligne 2.');

  /* ---- Evenements ---- */
  const evenements = [];
  for (const def of EVENEMENTS) {
    const d = dates.date(`Date ${def.suffixe}`);
    if (!d) continue;                       // colonne vide -> section absente

    // Les en-tetes de "Lieux" utilisent "houppa", ceux de "Dates" "mariage (houppa)".
    const suffixeLieu = def.cle === 'houppa' ? 'houppa' : def.suffixe;
    const t = def.heure ? dates.heure(`Heure ${def.suffixe}`) : null;
    const adresse = lieux.txt(`Adresse ${suffixeLieu}`);
    const itineraire = lieux.url(`Itinéraire ${suffixeLieu}`);

    evenements.push({
      cle: def.cle,
      titre: def.titre,
      titreHe: def.titreHe,
      dateFr: dateFr(d),
      dateHe: dates.txt(`Date hébraïque ${def.suffixe}`),
      heure: t ? heureFr(t) : '',
      lieu: lieux.txt(`Lieu ${suffixeLieu}`),
      adresse,
      itineraire,
      waze: adresse ? `https://waze.com/ul?q=${encodeURIComponent(adresse)}` : '',
      _tri: Date.UTC(d.y, d.m - 1, d.d) + (t ? (t.h * 60 + t.min) * 60000 : 0),
    });
  }
  evenements.sort((a, b) => a._tri - b._tri);
  // Le Chabbat 'Hatan s'affiche toujours en dernier, meme s'il tombe
  // chronologiquement avant la houppa (demande explicite, pas un bug de tri).
  const iChabbat = evenements.findIndex((e) => e.cle === 'chabbat');
  if (iChabbat !== -1) evenements.push(evenements.splice(iChabbat, 1)[0]);

  /* ---- Houppa : cible du compte a rebours (heure de Paris) ---- */
  const dHoup = dates.date('Date mariage (houppa)');
  const tHoup = dates.heure('Heure mariage (houppa)');
  if (!dHoup) throw new Error('Feuille "Dates" : "Date mariage (houppa)" est vide.');
  const cibleTs = parisVersUtc(dHoup.y, dHoup.m, dHoup.d, tHoup ? tHoup.h : 0, tHoup ? tHoup.min : 0);

  /* ---- Site ---- */
  const nomTheme = site.txt('Thème');
  // alias : anciens noms encore presents dans des classeurs existants
  const theme = THEMES.find((t) => t.nom === nomTheme || (t.alias || []).includes(nomTheme));
  if (!theme) {
    throw new Error(
      `Feuille "Site" : thème "${nomTheme}" inconnu.\n  Thèmes valides : ${THEMES.map((t) => t.nom).join(' | ')}`,
    );
  }
  const nomCouleur = site.txt('Couleur principale');
  const hexCouleur = COULEURS[nomCouleur];
  if (!hexCouleur) {
    throw new Error(
      `Feuille "Site" : couleur "${nomCouleur}" inconnue.\n  Couleurs valides : ${Object.keys(COULEURS).join(' | ')}`,
    );
  }

  /* ---- Medias ---- */
  const avertissements = [];
  const medias = path.join(DIST, 'medias');
  await fs.mkdir(medias, { recursive: true });

  let musique = null;
  const lienMusique = site.url('Musique (mp3)') || site.txt('Musique (mp3)');
  if (lienMusique) {
    if (/^https?:\/\//i.test(lienMusique)) {
      musique = lienMusique;                               // URL absolue : on la garde
    } else {
      const src = path.resolve(DATA_ROOT, lienMusique);    // relatif au dossier du xlsx
      if (existsSync(src)) {
        const nom = path.basename(src);
        await fs.copyFile(src, path.join(medias, nom));
        musique = `medias/${nom}`;
      } else {
        avertissements.push(`Musique introuvable : ${path.relative(DATA_ROOT, src)} — le bouton son sera masqué.`);
      }
    }
  }

  let image = null;
  const img = await extraireImage(wb, siteWs, id);
  if (img) {
    await fs.writeFile(path.join(medias, img.nom), img.buffer);
    image = `medias/${img.nom}`;
  } else {
    avertissements.push("Aucune image (ni dans le xlsx, ni dans medias/) — pas d'aperçu image pour les liens partagés.");
  }

  return {
    donnees: {
      id,
      genere: new Date().toISOString(),
      couple: {
        // Le nom de famille n'est plus affiche sur la carte (demande explicite) :
        // on ne lit meme plus ces colonnes Excel, meme si elles existent encore.
        marie: { prenom: info.txt('Prénom marié'), hebreu: info.txt('Nom hébreu marié') },
        mariee: { prenom: info.txt('Prénom mariée'), hebreu: info.txt('Nom hébreu mariée') },
      },
      familles: {
        parentsMarie: info.txt('Parents du marié'),
        parentsMariee: info.txt('Parents de la mariée'),
        // L'Excel n'a qu'une seule colonne par cote (pas de distinction
        // maman/papa) : on la place dans le creneau "maman", le creneau
        // "papa" reste vide et la carte affiche alors une seule ligne,
        // comme avant. Le formulaire client (sans Excel) remplit lui les 4.
        grandsParentsMarieMaman: info.txt('Grands-parents du marié'),
        grandsParentsMariePapa: '',
        grandsParentsMarieeMaman: info.txt('Grands-parents de la mariée'),
        grandsParentsMarieePapa: '',
        // Colonne optionnelle (absente par defaut) : une ligne par grand-parent
        // decede, ex. "Eliahou Pinhas ז\"ל". Si la colonne n'existe pas ou est
        // vide, le paragraphe de memoire n'apparait pas sous la houppa.
        memoire: info.txt('Mémoire des grands-parents'),
      },
      site: {
        lien: site.url('Lien du site') || site.txt('Lien du site'),
        theme: theme.nom,
        themeSlug: theme.slug,
        couleurNom: nomCouleur,
        couleurHex: hexCouleur,
        verset: site.txt('Verset'),
        musique,
        image,
      },
      compteARebours: {
        iso: new Date(cibleTs).toISOString(),
        timestamp: cibleTs,
        fuseau: 'Europe/Paris',
        dateFr: dateFr(dHoup),
        dateHe: dates.txt('Date hébraïque mariage (houppa)'),
        heure: tHoup ? heureFr(tHoup) : '',
      },
      // Une carte par groupe : l'Excel ne propose pas (encore) de fusion
      // personnalisee, donc houppa+reception restent groupees par defaut
      // (comportement historique) et chaque autre evenement est seul dans
      // son groupe. L'espace client (src/client/*) construit ses propres
      // groupes librement (n'importe quelle paire peut y etre fusionnee).
      groupes: construireGroupesParDefaut(evenements),
      evenements,
    },
    avertissements,
  };
}

/** Une carte par evenement, sauf houppa+reception regroupees (comportement
 *  historique du site genere depuis l'Excel). */
function construireGroupesParDefaut(evenements) {
  const groupes = [];
  const dejaGroupe = new Set();
  for (const ev of evenements) {
    if (dejaGroupe.has(ev.cle)) continue;
    if (ev.cle === 'houppa') {
      const reception = evenements.find((e) => e.cle === 'reception');
      if (reception) {
        groupes.push([ev, reception]);
        dejaGroupe.add('houppa');
        dejaGroupe.add('reception');
        continue;
      }
    }
    groupes.push([ev]);
    dejaGroupe.add(ev.cle);
  }
  return groupes;
}

/* ==================================================================
 * Generation des pages
 * ================================================================== */

const echappe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JSON sur pour une balise <script>. */
const jsonSur = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/** Polices utilisees par les logos (src/client/logo-styles.js). */
const POLICES_LOGO = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&family=Great+Vibes&family=Cinzel:wght@400;500;600&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Josefin+Sans:wght@200;300&family=Italiana&family=Pinyon+Script&family=Libre+Baskerville&family=Marcellus&family=Parisienne&family=Allura&display=swap';

function page({ donnees, theme, base, titre, bandeau = '' }) {
  const accent = donnees.site.couleurHex;
  const encre = accentLisible(accent, theme.surface, 4.5);
  const encreDouce = accentLisible(accent, theme.surface, 3.0);
  const surAccent = encreSurAccent(accent);

  // Les donnees sont inlinees : le site fonctionne aussi en file:// (fetch bloque).
  const payload = { ...donnees, site: { ...donnees.site, theme: theme.nom, themeSlug: theme.slug } };

  const { marie, mariee } = donnees.couple;
  const description = `Invitation au mariage de ${marie.prenom} et ${mariee.prenom}`;
  // L'image n'est plus affichee en tete de page : elle sert uniquement
  // d'aperçu (og:image) quand le lien de l'invitation est partage.
  const ogImage = donnees.site.image
    ? `\n<meta property="og:image" content="${echappe(base + donnees.site.image)}">`
    : '';

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="format-detection" content="telephone=no, address=no, date=no, email=no">
<meta name="description" content="${echappe(description)}">
<meta name="theme-color" content="${theme.surface}">
<meta property="og:type" content="website">
<meta property="og:title" content="${echappe(titre)}">
<meta property="og:description" content="${echappe(description)}">${ogImage}
<title>${echappe(titre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${theme.fonts}&display=swap">
<link rel="stylesheet" href="${POLICES_LOGO.replace(/&/g, '&amp;')}">
<link rel="stylesheet" href="${base}base.css">
<link rel="stylesheet" href="${base}themes/${theme.slug}/theme.css">
<style>:root{--accent:${accent};--accent-ink:${encre};--accent-soft:${encreDouce};--accent-on:${surAccent};}</style>
</head>
<body class="theme-${theme.slug}">
<div class="decor decor--page" aria-hidden="true"><span class="decor__layer decor__layer--1"></span><span class="decor__layer decor__layer--2"></span><span class="decor__layer decor__layer--3"></span><span class="decor__layer decor__layer--4"></span></div>
${bandeau}
<main id="app" class="app" data-base="${base}"></main>
<script type="application/json" id="invitation-data">${jsonSur(payload)}</script>
<script src="${base}stockage.js"></script>
<script src="${base}versets.js"></script>
<script src="${base}client/logo-styles.js"></script>
<script src="${base}musique-perso.js"></script>
<script src="${base}app.js"></script>
</body>
</html>
`;
}

function bandeauApercu(theme, donnees) {
  // id sur la pastille : app.js la recolore si une invitation client
  // (localStorage) est presente, pour refleter sa propre couleur.
  return `<div class="apercu-bar"><a class="apercu-bar__back" href="../index.html">&#8592; Thèmes</a><span class="apercu-bar__name">${echappe(theme.nom)}</span><span class="apercu-bar__dot" id="apercu-bar-dot" style="background:${donnees.site.couleurHex}"></span><a class="apercu-bar__choisir" id="apercu-choisir" href="../../client/publication.html" hidden>Choisir ce thème</a></div>`;
}

/** Invitation publiee (dist/i/index.html, servie pour /i/<adresse>) :
 *  coquille qui lit l'invitation dans Firestore, charge le theme choisi
 *  puis app.js. Les reponses des invites partent dans l'espace des maries. */
function pagePublique() {
  const polices = Object.fromEntries(THEMES.map((t) => [t.slug, t.fonts]));
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="format-detection" content="telephone=no, address=no, date=no, email=no">
<meta name="robots" content="noindex">
<title>Invitation de mariage</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://www.gstatic.com" crossorigin>
<!-- Rien ne bloque le premier affichage : l'ecran d'ouverture n'a besoin que
     de ses styles (ci-dessous). Polices et base.css se chargent en fond
     (base.css est attendu avant d'afficher l'invitation, cf. plus bas). -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&amp;display=swap" media="print" onload="this.media='all'">
<link rel="stylesheet" href="${POLICES_LOGO.replace(/&/g, '&amp;')}" media="print" onload="this.media='all'">
<link rel="preload" href="/base.css" as="style">
<link rel="preload" href="/stockage.js" as="script">
<link rel="preload" href="/versets.js" as="script">
<link rel="preload" href="/client/logo-styles.js" as="script">
<link rel="preload" href="/app.js" as="script">
<style>
/* Ecran d'ouverture (pendant la lecture de l'invitation) : les initiales
   dans un anneau dore qui se dessine, les prenoms, aux couleurs du theme
   (body[data-theme], pose par la fonction serveur). Aucun mot « chargement ». */
.chargement-public {
  --cp-fond: #F7F4EE; --cp-encre: #3A3630; --cp-or: #B8975A;
  position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 30px;
  text-align: center; background: var(--cp-fond); color: var(--cp-encre);
  transition: opacity .7s ease, visibility .7s;
}
.chargement-public--fin { opacity: 0; visibility: hidden; }
.cp__anneau { position: relative; width: 132px; height: 132px; margin: 0 auto 26px; }
.cp__anneau svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.cp__cercle { fill: none; stroke: var(--cp-or); stroke-width: 1.2; stroke-dasharray: 380; stroke-dashoffset: 380; animation: cp-trace 1.4s cubic-bezier(.25, .6, .3, 1) forwards; }
.cp__cercle--fin { stroke-width: .6; opacity: .55; animation-delay: .15s; }
.cp__etoile { fill: var(--cp-or); transform-origin: 66px 6px; animation: cp-scintille 2.4s ease-in-out infinite .9s; opacity: 0; }
.cp__ini { position: absolute; inset: 0; display: grid; place-items: center; font: 400 44px/1 "Cormorant Garamond", Georgia, serif; letter-spacing: .04em; opacity: 0; animation: cp-apparait .8s ease .1s forwards; }
.cp__noms { margin: 0; font: italic 400 clamp(26px, 8vw, 34px)/1.2 "Cormorant Garamond", Georgia, serif; opacity: 0; animation: cp-apparait .9s ease .3s forwards; }
.cp__noms:empty { display: none; }
.cp__filet { display: block; width: 46px; height: 1px; margin: 18px auto 0; background: var(--cp-or); transform: scaleX(0); animation: cp-filet 1.4s ease-in-out infinite alternate .8s; }
.cp__msg { margin: 0; font: 300 15px/1.6 system-ui, sans-serif; opacity: .8; }
.cp__msg strong { display: block; margin-bottom: 8px; font: 400 26px/1.2 "Cormorant Garamond", Georgia, serif; }
@keyframes cp-trace { to { stroke-dashoffset: 0; } }
@keyframes cp-apparait { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes cp-filet { from { transform: scaleX(.2); opacity: .4; } to { transform: scaleX(1); opacity: 1; } }
@keyframes cp-scintille { 0%, 100% { opacity: 0; transform: scale(.5); } 50% { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .cp__cercle, .cp__ini, .cp__noms, .cp__filet, .cp__etoile { animation: none; opacity: 1; stroke-dashoffset: 0; transform: none; } }
${THEMES.map((t) => { const id = identite(t); return `body[data-theme="${t.slug}"] .chargement-public { --cp-fond: ${t.surface}; --cp-encre: ${id.encre}; }`; }).join('\n')}
</style>
</head>
<body>
<div class="chargement-public" id="chargement-public" role="status" aria-label="Ouverture de l'invitation">
  <div class="cp__contenu" id="chargement-contenu">
    <div class="cp__anneau" aria-hidden="true">
      <svg viewBox="0 0 132 132"><circle class="cp__cercle" cx="66" cy="66" r="60" transform="rotate(-90 66 66)"></circle><circle class="cp__cercle cp__cercle--fin" cx="66" cy="66" r="54" transform="rotate(-90 66 66)"></circle><path class="cp__etoile" d="M66 0l1.6 4.4L72 6l-4.4 1.6L66 12l-1.6-4.4L60 6l4.4-1.6z"></path></svg>
      <span class="cp__ini" id="chargement-ini"><!--INITIALES--></span>
    </div>
    <p class="cp__noms" id="chargement-noms"><!--NOMS--></p>
    <span class="cp__filet" aria-hidden="true"></span>
  </div>
</div>
<!--INVITATION-->
<script>
// L'invitation est lue par le serveur et ecrite dans la page
// (#invitation-prechargee, cf. netlify/edge-functions/invitation) : elle
// s'affiche sans attendre Firebase (~250 Ko + connexion a la base), qui
// n'est charge qu'ensuite, en fond, pour les reponses des invites. Sans
// donnees prechargees (page de secours), lecture classique via Firebase.
(function () {
  var POLICES = ${jsonSur(polices)};
  var attente = document.getElementById('chargement-public');
  function introuvable() {
    attente.classList.remove('chargement-public--fin');
    document.getElementById('chargement-contenu').innerHTML = '<p class="cp__msg"><strong>Invitation introuvable</strong>Vérifiez le lien reçu, ou demandez-le à nouveau aux mariés.</p>';
  }
  /** L'invitation est prete : l'ecran d'ouverture s'efface en douceur, mais
   *  jamais avant la fin de son animation (anneau, initiales, prenoms :
   *  ~1,9 s depuis l'ouverture de la page), meme si tout est deja charge. */
  var DUREE_ANIMATION = 1900;
  function devoiler() {
    var reste = Math.max(0, DUREE_ANIMATION - (window.performance && performance.now ? performance.now() : DUREE_ANIMATION));
    window.setTimeout(function () {
      attente.classList.add('chargement-public--fin');
      window.setTimeout(function () { attente.remove(); }, 800);
    }, reste);
  }
  // /i/ilan-yael (reecriture Netlify) ou /i/?s=ilan-yael
  var slug = decodeURIComponent(location.pathname.replace(/^\\/i\\/?/, '').replace(/\\/.*$/, '').replace(/index\\.html$/, ''))
    || (/[?&]s=([^&]+)/.exec(location.search) || [])[1] || '';
  if (!slug) { introuvable(); return; }

  function chargerScript(src) {
    return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.body.appendChild(s); });
  }
  function chargerCss(href) {
    return new Promise(function (ok) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = ok; l.onerror = ok; document.head.appendChild(l); });
  }
  var FIREBASE = [
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
    '/stockage.js',
    '/sasson-firebase.js',
  ];
  var firebasePret = null;
  /** Firebase, charge une seule fois, a la demande. */
  function chargerFirebase() {
    if (!firebasePret) {
      firebasePret = FIREBASE.reduce(function (p, src) { return p.then(function () { return chargerScript(src); }); }, Promise.resolve())
        .then(function () { if (typeof SassonFB === 'undefined' || !SassonFB) throw new Error('Firebase indisponible'); return SassonFB; });
      firebasePret.catch(function () { firebasePret = null; });
    }
    return firebasePret;
  }
  function lireInvitation() {
    var pre = document.getElementById('invitation-prechargee');
    if (pre) {
      try { var x = JSON.parse(pre.textContent); if (x && x.donnees) return Promise.resolve(x); } catch (e) { /* page de secours */ }
    }
    return chargerFirebase().then(function (fb) { return fb.lireParSlug(slug); });
  }

  lireInvitation().then(function (inv) {
    if (!inv || !inv.donnees) { introuvable(); return; }
    var D = inv.donnees;
    var theme = (D.site && D.site.themeSlug) || 'marbre-or';
    // Musique importee : pas encore envoyee sur le serveur -> musique par defaut.
    if (D.site && D.site.musique === 'perso') D.site.musique = 'client/musique/bereshit-olam.mp3';
    var noms = [D.couple.marie.prenom, D.couple.mariee.prenom].join(' & ');
    document.title = noms;
    // Ecran d'ouverture deja personnalise par le serveur ; sinon on le complete ici.
    document.body.setAttribute('data-theme', theme);
    var cpNoms = document.getElementById('chargement-noms');
    if (cpNoms && !cpNoms.textContent.trim()) cpNoms.textContent = noms;
    var cpIni = document.getElementById('chargement-ini');
    if (cpIni && !cpIni.textContent.trim()) cpIni.textContent = [D.couple.marie.prenom, D.couple.mariee.prenom].map(function (p) { return String(p || '').trim().charAt(0).toUpperCase(); }).join('');
    // Icone de l'invitation (onglet + ecran d'accueil du telephone).
    if (D.site && D.site.favicon && String(D.site.favicon).indexOf('data:image/') === 0) {
      ['icon', 'apple-touch-icon'].forEach(function (rel) {
        var l = document.createElement('link'); l.rel = rel; l.href = D.site.favicon; document.head.appendChild(l);
      });
    }

    window.SASSON_PUBLIC = true;
    window.SassonReponse = function (reponse) {
      return chargerFirebase().then(function (fb) { return fb.envoyerReponse(inv.id, reponse); }).then(function (ref) {
        // Les maries sont prevenus par e-mail (une fois par reponse reelle).
        try {
          fetch('/.netlify/functions/notifier-reponse', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invitationId: inv.id, reponseId: ref && ref.id }) }).catch(function () {});
        } catch (e) { /* ignore */ }
        return ref;
      });
    };

    var polices = POLICES[theme];
    return Promise.all([
      polices ? chargerCss('https://fonts.googleapis.com/css2?' + polices + '&display=swap') : null,
      chargerCss('/base.css'),
      chargerCss('/themes/' + theme + '/theme.css'),
    ]).then(function () {
      document.body.className = 'theme-' + theme;
      var decor = document.createElement('div');
      decor.className = 'decor decor--page';
      decor.setAttribute('aria-hidden', 'true');
      decor.innerHTML = '<span class="decor__layer decor__layer--1"></span><span class="decor__layer decor__layer--2"></span><span class="decor__layer decor__layer--3"></span><span class="decor__layer decor__layer--4"></span>';
      var app = document.createElement('main');
      app.id = 'app'; app.className = 'app'; app.setAttribute('data-base', '/');
      var data = document.createElement('script');
      data.type = 'application/json'; data.id = 'invitation-data';
      data.textContent = JSON.stringify(D).replace(/</g, '\\\\u003c');
      document.body.insertBefore(data, document.body.firstChild);
      document.body.insertBefore(app, document.body.firstChild);
      document.body.insertBefore(decor, document.body.firstChild);
      return chargerScript('/stockage.js')
        .then(function () { return chargerScript('/versets.js'); })
        .then(function () { return chargerScript('/client/logo-styles.js'); })
        .then(function () { return chargerScript('/app.js'); })
        // un court instant pour que la premiere image se peigne sous l'ecran
        .then(function () {
          window.setTimeout(devoiler, 250);
          // Firebase en fond, pour que la reponse des invites parte sans attente.
          window.setTimeout(function () { chargerFirebase().catch(function () {}); }, 2500);
        });
    });
  }).catch(introuvable);
})();
</script>
</body>
</html>
`;
}

/** Vignette de la liste des themes : un apercu du theme lui-meme (son
 *  motif d'ornement sur sa couleur de fond, ou l'image de toile de Jouy),
 *  au lieu d'une simple pastille de couleur. */
function vignette(t) {
  if (existsSync(path.join(PROJECT, 'themes', t.slug, 'fond.jpg'))) {
    return `background:${t.surface} url(../themes/${t.slug}/fond.jpg) center/cover`;
  }
  // Coin decore du theme (le plus fourni de ses ornements), en grand
  // dans le coin haut-gauche de la vignette, plus son semis de fond.
  return `background:url(../themes/${t.slug}/orn/coin.svg) -6px -6px/118% auto no-repeat,url(../themes/${t.slug}/orn/fond.svg) 0 0/90px repeat,${t.surface}`;
}

/** Identite typographique d'un theme (police des titres, couleur des noms),
 *  lue dans son theme.css (derniere valeur declaree), pour ecrire les
 *  prenoms du couple sur sa vignette dans la galerie. */
function identite(t) {
  let css = '';
  try { css = readFileSync(path.join(PROJECT, 'themes', t.slug, 'theme.css'), 'utf8'); } catch (e) { /* theme sans css */ }
  const derniere = (nom) => {
    const v = [...css.matchAll(new RegExp('--' + nom + ':\\s*([^;]+);', 'g'))];
    return v.length ? v[v.length - 1][1].trim() : '';
  };
  const police = derniere('font-titre') || 'Georgia, serif';
  const famille = (/^"([^"]+)"/.exec(police) || [])[1] || '';
  return { police, famille, encre: derniere('oui') || derniere('ink') || '#2A2722' };
}

function pageIndexApercus(donnees) {
  const familles = [...new Set(THEMES.map((t) => identite(t).famille).filter(Boolean))];
  const policesNoms = familles.length
    ? 'https://fonts.googleapis.com/css2?' + familles.map((f) => 'family=' + f.replace(/ /g, '+')).join('&') + '&display=swap'
    : '';
  const nomsCouple = `${donnees.couple.marie.prenom} & ${donnees.couple.mariee.prenom}`;
  const cartes = THEMES.map((t) => {
    const actif = t.slug === donnees.site.themeSlug;
    const id = identite(t);
    return `    <a class="theme-carte${actif ? ' theme-carte--actif' : ''}" href="${t.slug}/index.html">
      <span class="theme-carte__vignette" style="${vignette(t)}" aria-hidden="true"><span class="theme-carte__noms" style="font-family:${echappe(id.police)};color:${id.encre};background:${t.surface}E6">${echappe(nomsCouple)}</span></span>
      <span class="theme-carte__pied"><strong>${echappe(t.nom)}</strong><span>Voir ce thème →</span></span>
      ${actif ? '<span class="theme-carte__badge">Choisi dans l\u2019Excel</span>' : ''}
      ${t.vedette ? '<span class="theme-carte__vedette">Le plus choisi</span>' : ''}
    </a>`;
  }).join('\n');

  const { marie, mariee } = donnees.couple;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thème et musique — ${echappe(marie.prenom)} &amp; ${echappe(mariee.prenom)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500;600&family=Frank+Ruhl+Libre:wght@400&display=swap">
<link rel="icon" type="image/png" sizes="32x32" href="../client/icones/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="../client/icones/favicon-192.png">
<link rel="apple-touch-icon" href="../client/icones/apple-touch-icon.png">
${policesNoms ? `<link rel="stylesheet" href="${echappe(policesNoms)}">\n` : ''}<link rel="stylesheet" href="../client/client.css">
<link rel="stylesheet" href="../client/site.css">
<link rel="stylesheet" href="../client/lecteur-musique.css">
<style>
/* Etape 3 du parcours : galerie des themes + musique (et logo). */
.choix { display: grid; grid-template-columns: minmax(0, 1fr); gap: 30px; }
.choix > * { min-width: 0; }   /* un titre de musique long ne doit pas elargir la colonne */
@media (min-width: 1000px) { .choix { grid-template-columns: minmax(0, 1fr) 320px; gap: 44px; align-items: start; } .choix__cote { position: sticky; top: 150px; order: 2; } }
.choix__cote { display: flex; flex-direction: column; gap: 18px; }
.encart { padding: 22px; border: 1px solid var(--rule); border-radius: 2px; background: var(--bg); min-width: 0; }
.encart h2 { margin: 0 0 4px; font-family: var(--font-titre); font-weight: 600; font-size: 21px; }
.encart > p { margin: 0 0 14px; font-size: 13.5px; color: var(--muted); line-height: 1.55; }
.encart .lecteur { --lecteur-fond: var(--surface); --lecteur-bord: var(--rule); --lecteur-texte: var(--ink); --lecteur-doux: var(--muted); --lecteur-accent: var(--accent); --lecteur-sur-accent: #2A2008; --lecteur-piste: rgba(42,39,34,.14); }
.encart--suite { background: transparent; border-style: dashed; }
.grille-themes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (min-width: 700px) { .grille-themes { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; } }
.theme-carte { position: relative; display: flex; flex-direction: column; border: 1px solid var(--rule); border-radius: 2px; overflow: hidden; background: var(--surface); color: inherit; text-decoration: none; transition: transform .2s, box-shadow .2s, border-color .2s; }
.theme-carte:hover, .theme-carte:focus-visible { transform: translateY(-3px); box-shadow: 0 16px 34px rgba(42,39,34,.12); border-color: var(--accent); }
.theme-carte__vignette { display: grid; place-items: center; aspect-ratio: 4 / 3; padding: 10px; }
/* Les prenoms du couple, dans la police et la couleur de chaque theme. */
.theme-carte__noms { max-width: 100%; padding: 8px 12px; border-radius: 2px; font-size: clamp(15px, 4.4vw, 21px); line-height: 1.2; text-align: center; overflow-wrap: anywhere; box-shadow: 0 6px 18px rgba(0,0,0,.08); }
.theme-carte__pied { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px 14px; }
.theme-carte__pied strong { font-family: var(--font-titre); font-weight: 600; font-size: 19px; line-height: 1.2; }
.theme-carte__pied span { font-size: 12.5px; color: var(--accent-ink); }
.theme-carte--actif { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.theme-carte__vedette { position: absolute; top: 10px; right: 10px; padding: 4px 10px; border-radius: 999px; background: #1F3B2D; color: #F6F1E1; font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,.18); }
.theme-carte__badge { position: absolute; top: 10px; left: 10px; padding: 4px 10px; border-radius: 999px; background: var(--accent); color: #2A2008; font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; font-weight: 600; }
.pied-apercus { margin-top: 28px; color: var(--muted); font-size: 13px; line-height: 1.7; }
.pied-apercus code { background: var(--bg); padding: 2px 6px; border-radius: 5px; font-size: 12px; }
</style>
</head>
<body class="site">
<div id="entete-site" data-base="../client/" data-etape="3"></div>
<div class="page page--large">
<main>
<h1 class="titre">${echappe(marie.prenom)} &amp; ${echappe(mariee.prenom)}</h1>
<p class="chapo sous">Les ${THEMES.length} thèmes, avec les données réelles de l’Excel et la couleur « ${echappe(donnees.site.couleurNom)} ».</p>
<div class="choix">
  <div>
    <div class="grille-themes">
${cartes}
    </div>
    <p class="pied-apercus" id="pied-apercus">Le thème publié sur <code>dist/index.html</code> est celui de la cellule « Thème ».<br>Après modification de l’Excel : <code>npm run build</code>.</p>
  </div>
  <aside class="choix__cote">
    <section class="encart" id="choix-musique" hidden>
      <h2>Musique de fond</h2>
      <p>Écoutez et choisissez : la musique affichée jouera dans le thème que vous ouvrirez.</p>
      <div id="lecteur-musique"></div>
    </section>
    <section class="encart" id="choix-logo" hidden>
      <h2>Votre logo</h2>
      <p id="logo-etat">Vos initiales en monogramme, assorti à chaque thème.</p>
      <a class="btn btn--secondaire btn--petit" href="../client/logo.html">Personnaliser mon logo</a>
    </section>
    <section class="encart encart--suite" id="choix-suite" hidden>
      <h2>Et ensuite ?</h2>
      <p>Ouvrez un thème, puis « Choisir ce thème » : vous le publiez pour 19,99 €, une seule fois, et recevez son lien à partager et votre tableau de bord des réponses.</p>
      <a class="btn btn--texte" href="../client/formulaire.html">← Modifier mes informations</a>
    </section>
  </aside>
</div>
</main>
</div>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script src="../stockage.js"></script>
<script src="../sasson-firebase.js"></script>
<script src="../client/client.js"></script>
<script src="../client/entete.js"></script>
<script src="../client/lecteur-musique.js"></script>
<script src="../musique-perso.js"></script>
<script>
/* Si une invitation a ete configuree dans ce navigateur (espace client),
 * cette page (par ailleurs figee, generee depuis l'Excel) s'adapte : noms
 * du couple, couleur annoncee et theme marque comme "actif" deviennent
 * les siens. Sans donnees client, rien ne change (demo Excel intacte). */
(function () {
  try {
    var brut = window.localStorage && window.localStorage.getItem(CLE_STOCKAGE_DONNEES);
    if (!brut) return;
    var D = JSON.parse(brut);

    // Cote client (sans Excel), aucun theme n'est choisi a l'avance : on
    // retire tout badge/surbrillance "actif" (qui ne refleterait que la
    // valeur par defaut interne) -- chaque carte ci-dessous est un choix
    // ouvert, a comparer avec les vraies informations du client.
    document.querySelectorAll('.theme-carte--actif').forEach(function (c) {
      c.classList.remove('theme-carte--actif');
      var b = c.querySelector('.theme-carte__badge');
      if (b) b.remove();
    });

    var h1 = document.querySelector('h1');
    if (h1 && D.couple) h1.textContent = D.couple.marie.prenom + ' & ' + D.couple.mariee.prenom;
    // Les vignettes portent les prenoms du couple, dans la police de chaque theme.
    if (D.couple) document.querySelectorAll('.theme-carte__noms').forEach(function (n) {
      n.textContent = D.couple.marie.prenom + ' & ' + D.couple.mariee.prenom;
    });
    var sous = document.querySelector('p.sous');
    if (sous) sous.textContent = 'Vos prénoms dans chacun des 12 thèmes : ouvrez celui qui vous plaît pour découvrir votre carte complète.';
    // Mariage d'exemple : on ne propose PAS encore de creer un logo (trop
    // tot, le visiteur n'a rien saisi). Le logo s'aborde dans le
    // formulaire, puis apres avoir vu son invitation (bandeau « Vous
    // aimez votre logo ? » sur la page du theme, cf. src/app.js).
    if (!D.exemple) {
      document.getElementById('choix-logo').hidden = false;
      document.getElementById('choix-suite').hidden = false;
    } else if (sous) {
      sous.textContent = 'Un mariage d’exemple, affiché dans chacun des 12 thèmes. Ouvrez celui qui vous plaît, puis créez le vôtre.';
    }
    if (D.site.logo === 'aucun') document.getElementById('logo-etat').textContent = 'Vous avez choisi de ne pas afficher de logo.';
    else if (D.site.logo && D.site.logo.style) document.getElementById('logo-etat').textContent = 'Votre logo personnalisé s’affichera sur tous les thèmes.';

    // Lecteur de musique (avant les themes) : la piste affichee devient
    // celle de l'invitation (D.site.musique), donc celle qui jouera dans
    // le theme ouvert ensuite. Synchronise aussi le brouillon du
    // formulaire -- sauf pour "Voir un exemple", qui ne doit jamais
    // toucher a la saisie en cours du visiteur.
    var zoneMusique = document.getElementById('choix-musique');
    if (zoneMusique && D.site && typeof LecteurMusique !== 'undefined' && typeof ClientInvitation !== 'undefined') {
      var actuelle = String(D.site.musique || '').split('/').pop() || ClientInvitation.MUSIQUE_DEFAUT;
      zoneMusique.hidden = false;
      var creerLecteur = function (perso) {
       var pistes = ClientInvitation.MUSIQUES.slice();
       if (perso) pistes.unshift({ fichier: 'perso', nom: 'Ma musique — ' + perso.nom, url: perso.url });
       LecteurMusique.creer({
        conteneur: document.getElementById('lecteur-musique'),
        base: '../client/musique/',
        pistes: pistes,
        actuelle: actuelle,
        auChangement: function (fichier) {
          D.site.musique = fichier === 'perso' ? 'perso' : 'client/musique/' + fichier;
          try {
            window.localStorage.setItem(CLE_STOCKAGE_DONNEES, JSON.stringify(D));
            if (!D.exemple && window.localStorage.getItem(CLE_STOCKAGE_BROUILLON)) {
              var b = ClientInvitation.lireBrouillon();
              b.site.musique = fichier;
              ClientInvitation.ecrireBrouillon(b);
            }
          } catch (e) { /* ignore */ }
        },
       });
      };
      if (typeof MusiquePerso !== 'undefined' && !D.exemple) MusiquePerso.lire().then(creerLecteur);
      else creerLecteur(null);
    }
    var pied = document.getElementById('pied-apercus');
    if (pied) {
      pied.innerHTML = 'Vous pouvez revenir modifier <a href="../client/formulaire.html">vos informations</a> '
        + 'ou <a href="../client/configurateur.html">l’ordre de vos événements</a> à tout moment.';
    }
  } catch (e) { /* ignore */ }
})();
</script>
</body>
</html>
`;
}

/* ==================================================================
 * Utilitaires fichiers
 * ================================================================== */

async function copierDossier(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) await copierDossier(s, d);
    else await fs.copyFile(s, d);
  }
}

/** Vide dist/ sauf medias/ (deja rempli par la lecture du classeur). */
async function nettoyerDist() {
  if (!existsSync(DIST)) return;
  for (const e of await fs.readdir(DIST)) {
    if (e === 'medias') continue;
    await fs.rm(path.join(DIST, e), { recursive: true, force: true });
  }
}

/* ==================================================================
 * Programme principal
 * ================================================================== */

async function main() {
  if (!existsSync(XLSX)) {
    throw new Error(`Classeur introuvable : ${XLSX}`);
  }

  await fs.mkdir(DIST, { recursive: true });
  const { donnees, avertissements } = await lireClasseur();
  await nettoyerDist();

  // Surcharge de theme en memoire, pour tester sans toucher a l'Excel :
  //   THEME_OVERRIDE="Nuit étoilée" npm run build
  const surcharge = process.env.THEME_OVERRIDE;
  let themePrincipal = THEMES.find((t) => t.slug === donnees.site.themeSlug);
  if (surcharge) {
    const t = THEMES.find((x) => x.nom === surcharge || x.slug === surcharge);
    if (!t) throw new Error(`THEME_OVERRIDE "${surcharge}" inconnu.`);
    themePrincipal = t;
    donnees.site.theme = t.nom;
    donnees.site.themeSlug = t.slug;
    console.log(`  ! THEME_OVERRIDE actif : "${t.nom}" (l'Excel n'est pas modifié)`);
  }

  // Actifs communs
  await copierDossier(path.join(PROJECT, 'themes'), path.join(DIST, 'themes'));
  await fs.copyFile(path.join(PROJECT, 'src', 'base.css'), path.join(DIST, 'base.css'));
  await fs.copyFile(path.join(PROJECT, 'src', 'app.js'), path.join(DIST, 'app.js'));
  await fs.copyFile(path.join(PROJECT, 'src', 'versets.js'), path.join(DIST, 'versets.js'));
  await fs.copyFile(path.join(PROJECT, 'src', 'stockage.js'), path.join(DIST, 'stockage.js'));
  await fs.copyFile(path.join(PROJECT, 'src', 'musique-perso.js'), path.join(DIST, 'musique-perso.js'));
  await fs.copyFile(path.join(PROJECT, 'src', 'sasson-firebase.js'), path.join(DIST, 'sasson-firebase.js'));
  // Regles Netlify lues a coup sur depuis le dossier publie (en plus de
  // netlify.toml) : /i/<adresse> -> page de l'invitation publiee.
  // 1. L'ancienne adresse Netlify renvoie vers le domaine (301, forcee).
  // 2. /i/<adresse> -> page de l'invitation publiee.
  await fs.writeFile(path.join(DIST, '_redirects'), [
    'https://sasson.netlify.app/*  https://sasson-invit.fr/:splat  301!',
    // Page publiee : /i/index.html, personnalisee a la volee par l'Edge
    // Function netlify/edge-functions/invitation (titre, icone, invitation).
    '/i/*  /i/index.html  200',
    '',
  ].join('\n'), 'utf8');
  await copierDossier(path.join(PROJECT, 'src', 'client'), path.join(DIST, 'client'));
  // Icone Sasson a la racine : les navigateurs la demandent d'office
  // (/favicon.ico), meme sur les pages qui n'en declarent pas.
  await fs.copyFile(path.join(PROJECT, 'src', 'client', 'icones', 'favicon-48.png'), path.join(DIST, 'favicon.ico'));

  // data/invitation.json
  await fs.mkdir(path.join(DIST, 'data'), { recursive: true });
  const expose = JSON.parse(JSON.stringify(donnees));
  expose.evenements = expose.evenements.map(({ _tri, ...rest }) => rest);
  await fs.writeFile(path.join(DIST, 'data', 'invitation.json'), JSON.stringify(expose, null, 2) + '\n', 'utf8');

  const { marie, mariee } = donnees.couple;
  const titre = `${marie.prenom} & ${mariee.prenom} — Invitation`;

  // Page principale
  await fs.writeFile(
    path.join(DIST, 'index.html'),
    page({ donnees, theme: themePrincipal, base: '', titre }),
    'utf8',
  );

  // Apercus de tous les themes
  for (const t of THEMES) {
    const dir = path.join(DIST, 'apercu', t.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'index.html'),
      page({ donnees, theme: t, base: '../../', titre: `${titre} — ${t.nom}`, bandeau: bandeauApercu(t, donnees) }),
      'utf8',
    );
  }
  await fs.writeFile(path.join(DIST, 'apercu', 'index.html'), pageIndexApercus(donnees), 'utf8');
  await fs.mkdir(path.join(DIST, 'i'), { recursive: true });
  await fs.writeFile(path.join(DIST, 'i', 'index.html'), pagePublique(), 'utf8');
  // Cette page est personnalisee a la volee (titre, icone, ecran d'ouverture,
  // invitation) par l'Edge Function netlify/edge-functions/invitation.

  /* ---- Rapport ---- */
  console.log(`\n  Invitation ${donnees.id} — ${marie.prenom} & ${mariee.prenom}`);
  console.log(`  Thème       : ${themePrincipal.nom} (${themePrincipal.slug})`);
  console.log(`  Couleur     : ${donnees.site.couleurNom} ${donnees.site.couleurHex}`);
  console.log(`  Houppa      : ${donnees.compteARebours.dateFr} ${donnees.compteARebours.heure} (Paris) -> ${donnees.compteARebours.iso}`);
  console.log(`  Événements  : ${donnees.evenements.map((e) => e.titre).join(' -> ')}`);
  console.log(`  Musique     : ${donnees.site.musique || '— absente —'}`);
  console.log(`  Image       : ${donnees.site.image || '— absente —'}`);
  console.log(`  Pages       : dist/index.html + ${THEMES.length} aperçus`);
  for (const a of avertissements) console.log(`  ! ${a}`);
  console.log('');
}

main().catch((e) => {
  console.error('\n  ECHEC DU BUILD\n  ' + (e && e.message ? e.message : e) + '\n');
  process.exit(1);
});
