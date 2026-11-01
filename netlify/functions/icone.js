/**
 * GET /.netlify/functions/icone?slug=<adresse>
 * Icone de l'invitation publiee en vraie image PNG (pour l'apercu WhatsApp
 * et l'onglet du navigateur) : decodee depuis site.favicon (data URL).
 */
import { getDb } from '../lib/commun.js';

export const handler = async (event) => {
  const slug = String(event.queryStringParameters?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  try {
    if (!slug) throw new Error('slug');
    const q = await getDb().collection('invitations').where('slug', '==', slug).where('statut', '==', 'publiee').limit(1).get();
    if (q.empty) throw new Error('absente');
    let D = {};
    try { D = JSON.parse(q.docs[0].data().donneesJson || '{}'); } catch (e) { /* ignore */ }
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(D.site?.favicon || '');
    if (!m) throw new Error('sans icone');
    return {
      statusCode: 200,
      headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=3600' },
      body: m[2],
      isBase64Encoded: true,
    };
  } catch (e) {
    return { statusCode: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Icône introuvable' };
  }
};
