/**
 * Edge Function Netlify : GET /i/<adresse>
 *
 * S'execute au plus pres du visiteur et ne s'endort pas (l'ancienne
 * fonction classique faisait attendre ~5 s d'ecran blanc a son reveil).
 * Coquille : dist/i/index.html (regle « /i/*  /i/index.html  200 »),
 * obtenue par context.next(), completee avec la FICHE PUBLIQUE de
 * l'invitation (publiques/<adresse> : seulement ce que voient les invites ;
 * le dossier prive « invitations » n'est jamais lu ici).
 *
 * 1. Lecture directe de la fiche (API REST Firestore, document par son
 *    adresse : aucune liste possible).
 * 2. Fiche absente (invitation publiee avant la separation public/prive) :
 *    fonction /.netlify/functions/publique, qui la cree.
 * 3. Echec ou lenteur (> 2,5 s au total) : la coquille part telle quelle et
 *    le navigateur lit la fiche lui-meme.
 */
import { slugDepuisChemin, lireFiche, lireSecours, personnaliser } from './personnaliser.js';

const PROJET = 'e-faire-part';
// Cle publique du projet Firebase (la meme que dans src/sasson-firebase.js) :
// elle identifie le projet, les droits sont fixes par les regles Firestore.
const CLE_API = 'AIzaSyB29wzEammhctXG1nePiGRz17_cpVJGMqk';

async function chercherFiche(slug, origine, signal) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/publiques/${slug}?key=${CLE_API}`, { signal });
  if (r.ok) { const fiche = lireFiche(await r.json()); if (fiche) return fiche; }
  // 404 (fiche pas encore creee) ou 403 (regles pas encore installees) : secours.
  const s = await fetch(`${origine}/.netlify/functions/publique?slug=${encodeURIComponent(slug)}`, { signal });
  return s.ok ? lireSecours(await s.json()) : null;
}

export default async (request, context) => {
  const url = new URL(request.url);
  const slug = slugDepuisChemin(url.pathname);
  const coquille = await context.next();
  if (!slug || !coquille.ok) return coquille;

  const page = await coquille.text();
  const entetes = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' };
  try {
    const fiche = await chercherFiche(slug, url.origin, AbortSignal.timeout(2500));
    if (!fiche) return new Response(page, { status: 200, headers: entetes });
    return new Response(personnaliser(page, fiche, { slug, origine: url.origin }), { status: 200, headers: entetes });
  } catch (e) {
    console.error('invitation', slug, e && e.message);
    return new Response(page, { status: 200, headers: entetes });
  }
};

export const config = { path: '/i/*', excludedPath: ['/i/index.html'] };
