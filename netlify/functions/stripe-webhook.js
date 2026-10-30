/**
 * POST /.netlify/functions/stripe-webhook  (appele par Stripe)
 * Filet de securite : publie l'invitation meme si le client a ferme la
 * page avant de revenir sur son espace. Necessite STRIPE_WEBHOOK_SECRET
 * (Stripe -> Developpeurs -> Webhooks -> ajouter un endpoint vers cette
 * adresse, evenement "checkout.session.completed").
 */
import { getStripe, publier, reponse } from '../lib/commun.js';

export const handler = async (event) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return reponse(503, { erreur: 'Webhook non configuré.' });
  let evt;
  try {
    const corps = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    evt = getStripe().webhooks.constructEvent(corps, event.headers['stripe-signature'], secret);
  } catch (e) {
    return reponse(400, { erreur: 'Signature invalide.' });
  }
  try {
    if (evt.type === 'checkout.session.completed' && evt.data.object.payment_status === 'paid') {
      await publier(evt.data.object.metadata.invitationId, evt.data.object);
    }
    return reponse(200, { recu: true });
  } catch (e) {
    console.error(e);
    return reponse(500, { erreur: 'Publication impossible.' });
  }
};
