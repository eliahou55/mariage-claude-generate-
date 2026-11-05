/**
 * Outils partages par les fonctions Netlify (paiement Stripe + Firebase
 * Admin). Les secrets viennent UNIQUEMENT des variables d'environnement
 * Netlify (jamais du depot) :
 *   STRIPE_SECRET_KEY        sk_test_... puis sk_live_...
 *   STRIPE_WEBHOOK_SECRET    whsec_... (facultatif, pour le webhook)
 *   FIREBASE_CLIENT_EMAIL    compte de service Firebase (client_email)
 *   FIREBASE_PRIVATE_KEY     compte de service Firebase (private_key)
 *   RESEND_API_KEY           e-mail de confirmation + facture (cf. facture.js)
 */
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { facturerEtConfirmer } from './facture.js';

const PROJET = 'e-faire-part';
const PRIX_CENTIMES = 1999;

/** Erreur de configuration : message affiche tel quel (aucun secret dedans). */
function configErreur(message) { return Object.assign(new Error(message), { config: true }); }

/** Message renvoye au navigateur pour une erreur. */
function messageErreur(e, defaut) {
  if (e && e.statut) return e.message;
  if (e && e.config) return 'Configuration serveur : ' + e.message;
  if (e && e.type === 'StripeAuthenticationError') return 'Configuration serveur : STRIPE_SECRET_KEY invalide.';
  return defaut;
}

let stripe = null;
function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw configErreur('STRIPE_SECRET_KEY absente des variables Netlify (redéployer après l\'avoir ajoutée).');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim());
  }
  return stripe;
}

/** Cle privee telle que collee dans Netlify : guillemets retires, "\n"
 *  litteraux remis en vrais retours a la ligne. */
function clePrivee() {
  let cle = process.env.FIREBASE_PRIVATE_KEY.trim();
  if (cle.startsWith('"') && cle.endsWith('"')) cle = cle.slice(1, -1);
  cle = cle.replace(/\\n/g, '\n');
  if (!/-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(cle)) {
    throw configErreur('FIREBASE_PRIVATE_KEY mal copiée : elle doit commencer par -----BEGIN PRIVATE KEY----- et finir par -----END PRIVATE KEY-----.');
  }
  return cle;
}

function getDb() {
  if (!getApps().length) {
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw configErreur('FIREBASE_CLIENT_EMAIL ou FIREBASE_PRIVATE_KEY absente des variables Netlify (redéployer après les avoir ajoutées).');
    }
    const cle = clePrivee();
    try {
      initializeApp({ credential: cert({ projectId: PROJET, clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(), privateKey: cle }) });
    } catch (e) {
      throw configErreur('compte de service Firebase refusé (' + String(e.message).split('\n')[0] + ').');
    }
  }
  return getFirestore();
}

/** Verifie le jeton Firebase envoye par le navigateur ; renvoie l'utilisateur. */
async function utilisateurDepuis(event) {
  const h = event.headers.authorization || event.headers.Authorization || '';
  const jeton = h.replace(/^Bearer\s+/i, '');
  if (!jeton) throw Object.assign(new Error('Connexion requise.'), { statut: 401 });
  getDb();
  try {
    return await getAuth().verifyIdToken(jeton);
  } catch (e) {
    throw Object.assign(new Error('Session expirée, reconnectez-vous.'), { statut: 401 });
  }
}

/** Adresse publique lisible et unique : "ilan-yael", sinon "ilan-yael-x4k2". */
async function creerSlug(db, donnees) {
  const prenoms = [donnees?.couple?.marie?.prenom, donnees?.couple?.mariee?.prenom].filter(Boolean).join(' ');
  const base = (prenoms || 'mariage').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'mariage';
  for (let i = 0; i < 6; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const q = await db.collection('invitations').where('slug', '==', slug).limit(1).get();
    if (q.empty) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Contenu de la fiche publique `publiques/<adresse>` : seulement ce que
 *  voient les invites (l'icone, lourde, est servie par la fonction icone). */
function ficheDonnees(invitationId, ownerUid, donneesJson) {
  let D = {};
  try { D = JSON.parse(donneesJson || '{}'); } catch (e) { D = {}; }
  const aIcone = !!D.site?.favicon;
  D.site = { ...(D.site || {}), favicon: null };
  return { invitationId, ownerUid, aIcone, donneesJson: JSON.stringify(D), majLe: FieldValue.serverTimestamp() };
}

/** Publie l'invitation apres paiement confirme (idempotent).
 *  Le retour sur l'espace (confirmer-paiement) et le webhook Stripe peuvent
 *  arriver en meme temps : le passage a « publiee » se fait dans une
 *  transaction, et seul l'appel qui l'a effectue cree la facture et envoie
 *  l'e-mail de confirmation (jamais deux fois). */
async function publier(invitationId, session, origine = 'https://sasson-invit.fr') {
  const db = getDb();
  const ref = db.collection('invitations').doc(invitationId);
  const premier = await ref.get();
  if (!premier.exists) throw new Error('Invitation introuvable.');
  if (premier.data().statut === 'publiee') return { invitationId, slug: premier.data().slug };
  let donnees = {};
  try { donnees = JSON.parse(premier.data().donneesJson || '{}'); } catch (e) { /* ignore */ }
  const slugPropose = await creerSlug(db, donnees);

  const resultat = await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const inv = doc.data();
    if (inv.statut === 'publiee') return { slug: inv.slug, nouveau: false };
    t.update(ref, {
      statut: 'publiee',
      slug: slugPropose,
      payeLe: FieldValue.serverTimestamp(),
      paiement: { sessionId: session.id, montant: session.amount_total, devise: session.currency, email: session.customer_details?.email || null },
    });
    // Fiche publique (ce que voient les invites) : le dossier ci-dessus
    // reste prive (e-mail, paiement, saisie complete).
    t.set(db.collection('publiques').doc(slugPropose), ficheDonnees(invitationId, inv.ownerUid, inv.donneesJson));
    return { slug: slugPropose, nouveau: true };
  });

  if (resultat.nouveau) {
    await facturerEtConfirmer(db, { invitationId, session, donnees, slug: resultat.slug, origine });
  }
  return { invitationId, slug: resultat.slug };
}

function reponse(statut, corps) {
  return { statusCode: statut, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(corps) };
}

export { getStripe, getDb, utilisateurDepuis, publier, ficheDonnees, reponse, messageErreur, PRIX_CENTIMES };
