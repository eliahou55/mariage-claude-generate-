/**
 * Edge Function Netlify : GET /i/<adresse>
 *
 * Remplace l'ancienne fonction serveur (netlify/functions/invitation.js),
 * qui s'endormait faute de visites : le premier invite attendait son reveil
 * (plusieurs secondes d'ecran blanc). Une Edge Function s'execute au plus
 * pres du visiteur et ne s'endort pas ; elle lit l'invitation par l'API
 * REST publique de Firestore (meme lecture que le navigateur des invites).
 *
 * Coquille : dist/i/index.html (regle « /i/*  /i/index.html  200 »),
 * obtenue par context.next(). Si Firestore tarde (> 2,5 s) ou echoue, la
 * coquille part telle quelle et le navigateur lit l'invitation lui-meme.
 */
import { slugDepuisChemin, requeteFirestore, lireReponse, personnaliser } from './personnaliser.js';

const PROJET = 'e-faire-part';
// Cle publique du projet Firebase (la meme que dans src/sasson-firebase.js) :
// elle identifie le projet, les droits sont fixes par les regles Firestore.
const CLE_API = 'AIzaSyB29wzEammhctXG1nePiGRz17_cpVJGMqk';

export default async (request, context) => {
  const url = new URL(request.url);
  const slug = slugDepuisChemin(url.pathname);
  const coquille = await context.next();
  if (!slug || !coquille.ok) return coquille;

  const page = await coquille.text();
  const entetes = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' };
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents:runQuery?key=${CLE_API}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requeteFirestore(slug)),
      signal: AbortSignal.timeout(2500),
    });
    const inv = r.ok ? lireReponse(await r.json()) : null;
    if (!inv) return new Response(page, { status: 200, headers: entetes });
    return new Response(personnaliser(page, inv, { slug, origine: url.origin }), { status: 200, headers: entetes });
  } catch (e) {
    console.error('invitation', slug, e && e.message);
    return new Response(page, { status: 200, headers: entetes });
  }
};

export const config = { path: '/i/*', excludedPath: ['/i/index.html'] };
