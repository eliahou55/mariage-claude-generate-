/**
 * POST /.netlify/functions/musique-envoi?invitation=<id>&v=<version>&part=<n>&parts=<total>&type=<mime>&nom=<titre>
 * En-tete Authorization: Bearer <jeton Firebase> ; corps : un morceau brut
 * du fichier audio (<= 3,5 Mo : limite de taille des requetes Netlify).
 *
 * Musique importee par les maries : envoyee en morceaux a la publication,
 * rangee dans Netlify Blobs (magasin « musiques »), puis servie aux invites
 * par l'Edge Function /musique/<id> (netlify/edge-functions/musique/).
 * Seul le proprietaire de l'invitation peut envoyer sa musique.
 *
 * Format « classique » (handler), comme les autres fonctions : le format
 * « v2 » (.mjs) n'empaquetait pas firebase-admin correctement (plantage
 * « require() of ES Module … jose » au demarrage).
 */
import { getStore, connectLambda } from '@netlify/blobs';
import { getDb, utilisateurDepuis, messageErreur, reponse } from '../lib/commun.js';

const MORCEAU_MAX = 3.6 * 1024 * 1024;
const PARTS_MAX = 3;                       // 3 x 3,5 Mo ~ 10 Mo (limite cote navigateur)

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return reponse(405, { erreur: 'Méthode non autorisée.' });
  try {
    connectLambda(event);
    const user = await utilisateurDepuis(event);
    const q = event.queryStringParameters || {};
    const id = q.invitation || '';
    const version = String(q.v || '').replace(/[^0-9a-z]/gi, '').slice(0, 20);
    const part = parseInt(q.part, 10), parts = parseInt(q.parts, 10);
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id) || !version || !(parts >= 1 && parts <= PARTS_MAX) || !(part >= 0 && part < parts)) {
      return reponse(400, { erreur: 'Paramètres invalides.' });
    }
    const doc = await getDb().collection('invitations').doc(id).get();
    if (!doc.exists || doc.data().ownerUid !== user.uid) return reponse(404, { erreur: 'Invitation introuvable.' });

    const octets = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'binary');
    if (!octets.length || octets.length > MORCEAU_MAX) return reponse(413, { erreur: 'Morceau trop lourd.' });

    const store = getStore('musiques');
    await store.set(`${id}/${version}/${part}`, octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.length));

    // Dernier morceau : la musique devient celle de l'invitation.
    if (part === parts - 1) {
      const type = /^audio\/[a-z0-9.+-]+$/i.test(q.type || '') ? q.type : 'audio/mpeg';
      await store.setJSON(`${id}/meta`, {
        version, parts, type,
        nom: String(q.nom || '').slice(0, 120),
        envoyeLe: new Date().toISOString(),
      });
      return reponse(200, { termine: true, chemin: `musique/${id}?v=${version}` });
    }
    return reponse(200, { termine: false });
  } catch (e) {
    console.error(e);
    return reponse(e.statut || 500, { erreur: messageErreur(e, 'Envoi de la musique impossible.') });
  }
};
