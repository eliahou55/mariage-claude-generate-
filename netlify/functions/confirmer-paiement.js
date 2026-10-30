/**
 * GET /.netlify/functions/confirmer-paiement?session_id=cs_...
 * En-tete Authorization: Bearer <jeton Firebase>
 * Appelee au retour du paiement (espace client) : verifie aupres de Stripe
 * que la session est payee, puis publie l'invitation (adresse publique).
 */
import { getStripe, utilisateurDepuis, publier, reponse } from '../lib/commun.js';

export const handler = async (event) => {
  try {
    const user = await utilisateurDepuis(event);
    const id = event.queryStringParameters?.session_id;
    if (!id) return reponse(400, { erreur: 'Session manquante.' });

    const session = await getStripe().checkout.sessions.retrieve(id);
    if (session.metadata?.uid !== user.uid) return reponse(403, { erreur: 'Paiement d\'un autre compte.' });
    if (session.payment_status !== 'paid') return reponse(402, { erreur: 'Paiement non abouti.', statut: session.status });

    const resultat = await publier(session.metadata.invitationId, session);
    return reponse(200, resultat);
  } catch (e) {
    console.error(e);
    return reponse(e.statut || 500, { erreur: e.statut ? e.message : 'Vérification du paiement impossible.' });
  }
};
