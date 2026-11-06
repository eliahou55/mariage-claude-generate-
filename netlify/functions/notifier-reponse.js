/**
 * POST /.netlify/functions/notifier-reponse  { invitationId, reponseId }
 *
 * Appelee par la page de l'invitation juste apres qu'un invite a repondu :
 * previent les maries par e-mail (Resend) S'ILS L'ONT DEMANDE (champ
 * invitations.notifications, case de leur espace, decochee par defaut), avec le detail de la reponse et
 * le total des reponses recues.
 * Anti-abus : la reponse doit exister reellement dans Firestore (ecrite par
 * l'invite selon les regles), et chaque reponse n'est notifiee qu'UNE fois
 * (marque `notifiee`, posee dans une transaction). Appeler cette adresse
 * ne permet donc d'envoyer aucun e-mail arbitraire.
 */
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb, reponse } from '../lib/commun.js';
import { envoyerEmail, VENDEUR } from '../lib/facture.js';

const echappe = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const idValide = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(s);

/** « 4 personnes », « 1 personne », « absent ». */
function presence(p) {
  if (!p) return null;
  if (!p.present) return 'ne sera pas présent';
  const n = Number(p.nombre) || 1;
  return `${n} personne${n > 1 ? 's' : ''}`;
}

export function emailReponse({ noms, r, totaux, aReception, espace }) {
  const invite = [r.prenom, r.nom].filter(Boolean).join(' ') || 'Un invité';
  const libHouppa = aReception ? 'Houppa & réception' : 'Houppa';
  const lignes = [
    r.mairie ? ['Mairie', presence(r.mairie)] : null,
    [libHouppa, presence(r.houppa)],
  ].filter(Boolean);
  const absent = r.houppa && !r.houppa.present && (!r.mairie || !r.mairie.present);
  const sujet = absent
    ? `${invite} ne pourra pas venir`
    : `${invite} a répondu : ${presence(r.houppa) || 'présent'}${aReception ? ' (houppa & réception)' : ''}`;

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F4EE;padding:24px 12px;font-family:Georgia,serif;color:#171614">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#FDFCF9;border:1px solid #E6E0D4">
<tr><td style="padding:28px 28px 6px;text-align:center">
  <div style="font-size:18px;letter-spacing:.34em">SASSON</div>
  <div style="font:12px/1.4 Arial,sans-serif;color:#876A40;letter-spacing:.14em;text-transform:uppercase;margin-top:14px">Nouvelle réponse${noms ? ` · ${echappe(noms)}` : ''}</div>
  <div style="font-size:26px;line-height:1.25;margin-top:8px">${echappe(invite)}</div>
</td></tr>
<tr><td style="padding:16px 28px 4px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font:15px/1.5 Arial,sans-serif">
    ${lignes.map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #EFEAE0;color:#6E695F">${echappe(k)}</td><td style="padding:8px 0;border-bottom:1px solid #EFEAE0;text-align:right">${echappe(v || '—')}</td></tr>`).join('')}
  </table>
  ${r.mot ? `<p style="font:italic 15px/1.6 Georgia,serif;color:#3A3630;margin:16px 0 0;padding:12px 14px;background:#F7F4EE;border-left:2px solid #A8875A">« ${echappe(r.mot)} »</p>` : ''}
</td></tr>
<tr><td style="padding:18px 28px 6px;font:13px/1.6 Arial,sans-serif;color:#6E695F;text-align:center">
  À ce jour : <strong style="color:#171614">${totaux.reponses} réponse${totaux.reponses > 1 ? 's' : ''}</strong> ·
  ${totaux.houppa} personne${totaux.houppa > 1 ? 's' : ''} ${aReception ? 'à la houppa & réception' : 'à la houppa'}${totaux.aMairie ? ` · ${totaux.mairie} à la mairie` : ''}
</td></tr>
<tr><td style="padding:14px 28px 26px;text-align:center">
  <a href="${echappe(espace)}" style="display:inline-block;padding:12px 22px;background:#171614;color:#F7F4EE;text-decoration:none;font:500 12px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase">Voir toutes les réponses</a>
</td></tr>
<tr><td style="padding:14px 28px 22px;text-align:center;font:11px/1.6 Arial,sans-serif;color:#8A857B;border-top:1px solid #E6E0D4">
  Vous recevez cet e-mail à chaque réponse d'un invité. ${echappe(VENDEUR.nom)} · ${echappe(VENDEUR.site)}
</td></tr>
</table></td></tr></table></body></html>`;
  const texte = [
    `Nouvelle réponse${noms ? ` — ${noms}` : ''} : ${invite}`, '',
    ...lignes.map(([k, v]) => `${k} : ${v || '—'}`),
    r.mot ? `\n« ${r.mot} »` : '', '',
    `À ce jour : ${totaux.reponses} réponse(s), ${totaux.houppa} personne(s) ${aReception ? 'à la houppa & réception' : 'à la houppa'}${totaux.aMairie ? `, ${totaux.mairie} à la mairie` : ''}.`,
    `Toutes les réponses : ${espace}`,
  ].join('\n');
  return { sujet, html, texte };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return reponse(405, { erreur: 'Méthode non autorisée.' });
  let corps = {};
  try { corps = JSON.parse(event.body || '{}'); } catch (e) { /* ignore */ }
  const { invitationId, reponseId } = corps;
  if (!idValide(invitationId) || !idValide(reponseId)) return reponse(400, { erreur: 'Paramètres invalides.' });
  try {
    const db = getDb();
    const invRef = db.collection('invitations').doc(invitationId);
    const repRef = invRef.collection('reponses').doc(reponseId);

    // Une seule notification par reponse reelle.
    const aNotifier = await db.runTransaction(async (t) => {
      const [inv, rep] = await Promise.all([t.get(invRef), t.get(repRef)]);
      if (!inv.exists || !rep.exists || inv.data().statut !== 'publiee' || rep.data().notifiee) return null;
      // Seulement si les maries l'ont demande (case dans leur espace, decochee par defaut).
      if (inv.data().notifications !== true) return null;
      t.update(repRef, { notifiee: FieldValue.serverTimestamp() });
      return { inv: inv.data(), r: rep.data() };
    });
    if (!aNotifier) return reponse(200, { envoye: false });

    const { inv, r } = aNotifier;
    let D = {};
    try { D = JSON.parse(inv.donneesJson || '{}'); } catch (e) { /* ignore */ }
    const noms = [D.couple?.marie?.prenom, D.couple?.mariee?.prenom].filter(Boolean).join(' & ');
    const aReception = (D.evenements || []).some((e) => e.cle === 'reception');

    // Totaux de toutes les reponses recues.
    const toutes = await invRef.collection('reponses').get();
    const totaux = { reponses: 0, houppa: 0, mairie: 0, aMairie: (D.evenements || []).some((e) => e.cle === 'mairie') };
    toutes.forEach((d) => {
      const x = d.data();
      totaux.reponses += 1;
      if (x.houppa?.present) totaux.houppa += Number(x.houppa.nombre) || 1;
      if (x.mairie?.present) totaux.mairie += Number(x.mairie.nombre) || 1;
    });

    // Adresse des maries : celle de leur compte, sinon celle du paiement.
    let email = '';
    try { email = (await getAuth().getUser(inv.ownerUid)).email || ''; } catch (e) { /* compte introuvable */ }
    if (!email) email = inv.paiement?.email || '';

    const origine = event.headers.origin || `https://${event.headers.host}`;
    const { sujet, html, texte } = emailReponse({ noms, r, totaux, aReception, espace: `${origine}/client/espace.html` });
    const envoi = await envoyerEmail({ a: email, sujet, html, texte });
    if (!envoi.envoye) console.warn('Notification de reponse non envoyee :', envoi.raison);
    return reponse(200, { envoye: envoi.envoye });
  } catch (e) {
    console.error(e);
    return reponse(500, { erreur: 'Notification impossible.' });
  }
};
