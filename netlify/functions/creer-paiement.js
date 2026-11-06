/**
 * POST /.netlify/functions/creer-paiement  { invitationId }
 * En-tete Authorization: Bearer <jeton Firebase>
 * -> { clientSecret } pour Stripe Embedded Checkout (paiement dans la page :
 *    Apple Pay / Google Pay / carte, selon l'appareil).
 */
import { FieldValue } from 'firebase-admin/firestore';
import { getStripe, getDb, utilisateurDepuis, reponse, PRIX_CENTIMES, messageErreur } from '../lib/commun.js';

// Version des CGV acceptees (cf. src/client/cgv.html) : a changer avec elles.
const VERSION_CGV = '1 (2026-11-06)';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return reponse(405, { erreur: 'Méthode non autorisée.' });
  try {
    const user = await utilisateurDepuis(event);
    const { invitationId, cgv } = JSON.parse(event.body || '{}');
    if (!invitationId) return reponse(400, { erreur: 'Invitation manquante.' });
    // Accord CGV + execution immediate (renonciation au droit de retractation) obligatoire.
    if (cgv !== true) return reponse(400, { erreur: 'Merci d’accepter les conditions générales de vente.' });

    const ref = getDb().collection('invitations').doc(invitationId);
    const doc = await ref.get();
    if (!doc.exists || doc.data().ownerUid !== user.uid) return reponse(404, { erreur: 'Invitation introuvable.' });
    if (doc.data().statut === 'publiee') return reponse(409, { erreur: 'Cette invitation est déjà publiée.' });

    // Preuve de l'accord (date, version des CGV, compte).
    await ref.update({ accordCgv: { le: FieldValue.serverTimestamp(), version: VERSION_CGV, executionImmediate: true, uid: user.uid } });

    let couple = {};
    try { couple = JSON.parse(doc.data().donneesJson || '{}').couple || {}; } catch (e) { /* ignore */ }
    const noms = [couple.marie?.prenom, couple.mariee?.prenom].filter(Boolean).join(' & ');
    const origine = event.headers.origin || `https://${event.headers.host}`;

    const session = await getStripe().checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: 'payment',
      // Moyens de paiement (carte, Apple Pay, Google Pay...) : regles dans
      // le tableau de bord Stripe (Parametres -> Moyens de paiement) ; Stripe
      // n'accepte plus de les choisir ici.
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
      metadata: { invitationId, uid: user.uid, cgv: VERSION_CGV, execution_immediate: 'oui' },
      payment_intent_data: { metadata: { invitationId, uid: user.uid } },
      return_url: `${origine}/client/espace.html?session_id={CHECKOUT_SESSION_ID}`,
    });
    return reponse(200, { clientSecret: session.client_secret });
  } catch (e) {
    console.error(e);
    return reponse(e.statut || 500, { erreur: messageErreur(e, 'Paiement indisponible pour le moment.') });
  }
};
