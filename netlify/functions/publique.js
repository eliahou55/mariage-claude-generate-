/**
 * GET /.netlify/functions/publique?slug=<adresse>
 *
 * Fiche publique d'une invitation (ce que voient les invites), pour l'Edge
 * Function /i/<adresse> quand la fiche `publiques/<adresse>` n'existe pas
 * encore : c'est le cas des invitations publiees AVANT la separation
 * public / prive. La fiche est alors creee a partir du dossier prive
 * (compte de service), puis renvoyee. Aucune donnee privee n'est renvoyee.
 */
import { getDb, ficheDonnees } from '../lib/commun.js';

const json = (statut, corps) => ({
  statusCode: statut,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(corps),
});

export const handler = async (event) => {
  const slug = String(event.queryStringParameters?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  if (!slug) return json(400, { erreur: 'Adresse manquante.' });
  try {
    const db = getDb();
    const ref = db.collection('publiques').doc(slug);
    let fiche = await ref.get();
    if (!fiche.exists) {
      const q = await db.collection('invitations').where('slug', '==', slug).where('statut', '==', 'publiee').limit(1).get();
      if (q.empty) return json(404, { erreur: 'Invitation introuvable.' });
      const doc = q.docs[0];
      await ref.set(ficheDonnees(doc.id, doc.data().ownerUid, doc.data().donneesJson));
      fiche = await ref.get();
    }
    const f = fiche.data();
    return json(200, {
      invitationId: f.invitationId,
      aIcone: !!f.aIcone,
      donneesJson: f.donneesJson,
      majSecondes: f.majLe?.seconds || '',
    });
  } catch (e) {
    console.error(e);
    return json(500, { erreur: 'Lecture impossible.' });
  }
};
