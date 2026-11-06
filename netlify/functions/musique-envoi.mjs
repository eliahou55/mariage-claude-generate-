/**
 * POST /.netlify/functions/musique-envoi?invitation=<id>&v=<version>&part=<n>&parts=<total>&type=<mime>&nom=<titre>
 * En-tete Authorization: Bearer <jeton Firebase> ; corps : un morceau brut
 * du fichier audio (<= 3,5 Mo : limite de taille des requetes Netlify).
 *
 * Musique importee par les maries : envoyee en morceaux a la publication,
 * rangee dans Netlify Blobs (magasin « musiques »), puis servie aux invites
 * par l'Edge Function /musique/<id> (netlify/edge-functions/musique.js).
 * Seul le proprietaire de l'invitation peut envoyer sa musique.
 */
import { getStore } from '@netlify/blobs';
import { getDb, utilisateurDepuis, messageErreur } from '../lib/commun.js';

const MORCEAU_MAX = 3.6 * 1024 * 1024;
const PARTS_MAX = 6;                       // 6 x 3,5 Mo ~ 20 Mo
const json = (statut, corps) => new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erreur: 'Méthode non autorisée.' });
  try {
    const user = await utilisateurDepuis({ headers: { authorization: req.headers.get('authorization') || '' } });
    const q = new URL(req.url).searchParams;
    const id = q.get('invitation') || '';
    const version = (q.get('v') || '').replace(/[^0-9a-z]/gi, '').slice(0, 20);
    const part = parseInt(q.get('part'), 10), parts = parseInt(q.get('parts'), 10);
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id) || !version || !(parts >= 1 && parts <= PARTS_MAX) || !(part >= 0 && part < parts)) {
      return json(400, { erreur: 'Paramètres invalides.' });
    }
    const doc = await getDb().collection('invitations').doc(id).get();
    if (!doc.exists || doc.data().ownerUid !== user.uid) return json(404, { erreur: 'Invitation introuvable.' });

    const octets = await req.arrayBuffer();
    if (!octets.byteLength || octets.byteLength > MORCEAU_MAX) return json(413, { erreur: 'Morceau trop lourd.' });

    const store = getStore('musiques');
    await store.set(`${id}/${version}/${part}`, octets);

    // Dernier morceau : la musique devient celle de l'invitation.
    if (part === parts - 1) {
      const type = /^audio\/[a-z0-9.+-]+$/i.test(q.get('type') || '') ? q.get('type') : 'audio/mpeg';
      await store.setJSON(`${id}/meta`, {
        version, parts, type,
        nom: String(q.get('nom') || '').slice(0, 120),
        envoyeLe: new Date().toISOString(),
      });
      return json(200, { termine: true, chemin: `musique/${id}?v=${version}` });
    }
    return json(200, { termine: false });
  } catch (e) {
    console.error(e);
    return json(e.statut || 500, { erreur: messageErreur(e, 'Envoi de la musique impossible.') });
  }
};
