/**
 * Edge Function Netlify : GET /musique/<invitationId>?v=<version>
 * Sert la musique importee par les maries (Netlify Blobs, magasin
 * « musiques », envoyee par netlify/functions/musique-envoi.mjs), avec la
 * lecture partielle (Range) qu'exigent Safari et l'iPhone.
 * L'adresse change a chaque nouvelle musique (?v=…) : cache long autorise.
 */
import { getStore } from '@netlify/blobs';
import { assembler, repondre } from './plages.js';

export default async (request) => {
  const url = new URL(request.url);
  const m = /^\/musique\/([A-Za-z0-9_-]{6,64})\/?$/.exec(url.pathname);
  if (!m) return new Response('Introuvable', { status: 404 });
  const id = m[1];
  try {
    const store = getStore('musiques');
    const meta = await store.get(`${id}/meta`, { type: 'json' });
    if (!meta || !meta.parts) return new Response('Musique introuvable', { status: 404 });
    const morceaux = await Promise.all(
      Array.from({ length: meta.parts }, (_, i) => store.get(`${id}/${meta.version}/${i}`, { type: 'arrayBuffer' })),
    );
    if (morceaux.some((x) => !x)) return new Response('Musique incomplète', { status: 404 });
    // Version demandee = version actuelle : cache long ; sinon cache court.
    const cache = url.searchParams.get('v') === meta.version ? 'public, max-age=31536000, immutable' : 'public, max-age=60';
    return repondre(assembler(morceaux), meta.type || 'audio/mpeg', request.headers.get('range'), { 'cache-control': cache });
  } catch (e) {
    console.error('musique', id, e && e.message);
    return new Response('Erreur', { status: 500 });
  }
};

export const config = { path: '/musique/*' };
