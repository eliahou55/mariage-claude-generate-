/**
 * POST /.netlify/functions/creer-paiement  { invitationId }
 * En-tete Authorization: Bearer <jeton Firebase>
 * -> { clientSecret } pour Stripe Embedded Checkout (paiement dans la page :
 *    Apple Pay / Google Pay / carte, selon l'appareil).
 */
import { getStripe, getDb, utilisateurDepuis, reponse, PRIX_CENTIMES } from '../lib/commun.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return reponse(405, { erreur: 'Méthode non autorisée.' });
  try {
    const user = await utilisateurDepuis(event);
    const { invitationId } = JSON.parse(event.body || '{}');
    if (!invitationId) return reponse(400, { erreur: 'Invitation manquante.' });

    const doc = await getDb().collection('invitations').doc(invitationId).get();
    if (!doc.exists || doc.data().ownerUid !== user.uid) return reponse(404, { erreur: 'Invitation introuvable.' });
    if (doc.data().statut === 'publiee') return reponse(409, { erreur: 'Cette invitation est déjà publiée.' });

    let couple = {};
    try { couple = JSON.parse(doc.data().donneesJson || '{}').couple || {}; } catch (e) { /* ignore */ }
    const noms = [couple.marie?.prenom, couple.mariee?.prenom].filter(Boolean).join(' & ');
    const origine = event.headers.origin || `https://${event.headers.host}`;

    const session = await getStripe().checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: 'payment',
      // Carte uniquement : Apple Pay et Google Pay en font partie (affiches
      // automatiquement sur les appareils compatibles). Pas de Klarna,
      // Bancontact, Link... pour un paiement sobre en un geste.
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: PRIX_CENTIMES,
          product_data: {
            name: 'Invitation de mariage en ligne',
            description: noms ? `Faire-part de ${noms} — tout compris, paiement unique` : 'Tout compris, paiement unique',
          },
        },
      }],
      customer_email: user.email || undefined,
      metadata: { invitationId, uid: user.uid },
      payment_intent_data: { metadata: { invitationId, uid: user.uid } },
      return_url: `${origine}/client/espace.html?session_id={CHECKOUT_SESSION_ID}`,
    });
    return reponse(200, { clientSecret: session.client_secret });
  } catch (e) {
    console.error(e);
    return reponse(e.statut || 500, { erreur: e.statut ? e.message : 'Paiement indisponible pour le moment.' });
  }
};
