/**
 * Facture + e-mail de confirmation apres paiement.
 *
 * - Numerotation continue et sans trou (obligation legale) : compteur
 *   Firestore `compteurs/factures`, incremente dans une transaction.
 *   Numero : F-<annee>-<0001>.
 * - Facture en PDF (pdf-lib, polices standard : accents et « € » inclus),
 *   archivee dans Firestore (`factures/<numero>`, inaccessible aux clients).
 * - E-mail envoye par Resend (https://resend.com), domaine sasson-invit.fr.
 *
 * Variables d'environnement Netlify :
 *   RESEND_API_KEY      re_... (obligatoire pour l'envoi ; sans elle, la
 *                       facture est quand meme creee et archivee)
 *   SASSON_EMAIL_DE     expediteur, defaut « Sasson <confirmation@sasson-invit.fr> »
 *   SASSON_EMAIL_REPONSE  adresse de reponse (defaut : VENDEUR.email)
 *
 * MODELE A RETRAVAILLER : identite du vendeur (VENDEUR ci-dessous), SIREN/
 * SIRET, regime de TVA. Tant que ces champs sont vides, la facture affiche
 * « à compléter ».
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { FieldValue } from 'firebase-admin/firestore';

/* ------------------------------------------------------------------ *
 * Vendeur (a completer) — un seul endroit a modifier.
 * ------------------------------------------------------------------ */
export const VENDEUR = {
  nom: 'Sasson',
  raisonSociale: '',            // ex. « Prénom Nom (EI) » ou « Sasson SAS »
  adresse: '',                  // ex. « 12 rue …, 75000 Paris »
  siren: '',                    // 9 chiffres
  siret: '',                    // 14 chiffres
  tva: '',                      // n° de TVA intracommunautaire, si assujetti
  // Micro-entreprise en franchise de TVA : mention obligatoire. A changer si
  // l'entreprise facture la TVA (indiquer alors le taux et le montant HT/TVA).
  mentionTva: 'TVA non applicable, art. 293 B du CGI',
  email: 'contact@sasson-invit.fr',
  site: 'sasson-invit.fr',
};
const A_COMPLETER = 'à compléter';

const euros = (centimes) => (centimes / 100).toFixed(2).replace('.', ',') + ' €';
const dateFr = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
const echappe = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Numero de facture suivant (transaction : jamais deux fois le meme). */
export async function prochainNumero(db, date = new Date()) {
  const annee = date.getFullYear();
  const ref = db.collection('compteurs').doc('factures');
  const n = await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const d = doc.exists ? doc.data() : {};
    const suivant = (d.annee === annee ? d.dernier || 0 : 0) + 1;
    t.set(ref, { annee, dernier: suivant, majLe: FieldValue.serverTimestamp() });
    return suivant;
  });
  return `F-${annee}-${String(n).padStart(4, '0')}`;
}

/** Donnees de la facture a partir de la session Stripe et de l'invitation. */
export function donneesFacture({ numero, date, session, donnees, slug, origine }) {
  const c = donnees?.couple || {};
  const noms = [c.marie?.prenom, c.mariee?.prenom].filter(Boolean).join(' & ');
  const client = session?.customer_details || {};
  const adr = client.address || {};
  return {
    numero,
    date: date.toISOString(),
    client: {
      nom: client.name || '',
      email: client.email || session?.customer_email || '',
      adresse: [adr.line1, adr.line2, [adr.postal_code, adr.city].filter(Boolean).join(' '), adr.country && adr.country !== 'FR' ? adr.country : '']
        .filter(Boolean).join(', '),
    },
    lignes: [{
      libelle: 'Faire-part de mariage en ligne' + (noms ? ` — ${noms}` : ''),
      detail: 'Publication de l’invitation, lien à partager, réponses des invités et tableau de bord. Paiement unique.',
      quantite: 1,
      prixCentimes: session?.amount_total ?? 1999,
    }],
    totalCentimes: session?.amount_total ?? 1999,
    devise: (session?.currency || 'eur').toUpperCase(),
    paiement: { moyen: 'Carte bancaire (Stripe)', reference: session?.payment_intent || session?.id || '' },
    noms,
    lien: slug ? `${origine}/i/${slug}` : '',
  };
}

/* ------------------------------------------------------------------ *
 * PDF
 * ------------------------------------------------------------------ */
export async function facturePdf(f) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Facture ${f.numero}`);
  pdf.setAuthor(VENDEUR.nom);
  const page = pdf.addPage([595.28, 841.89]);   // A4
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const encre = rgb(0.09, 0.086, 0.078), doux = rgb(0.43, 0.41, 0.37), or = rgb(0.66, 0.53, 0.35);
  const G = 56, D = 595.28 - 56;
  const texte = (t, x, y, o = {}) => page.drawText(String(t), { x, y, size: o.taille || 10, font: o.police || normal, color: o.couleur || encre });
  const droite = (t, xDroite, y, o = {}) => { const p = o.police || normal, s = o.taille || 10; texte(t, xDroite - p.widthOfTextAtSize(String(t), s), y, o); };
  const ligne = (y, c = rgb(0.85, 0.83, 0.79)) => page.drawLine({ start: { x: G, y }, end: { x: D, y }, thickness: 0.6, color: c });
  /** Texte sur plusieurs lignes (largeur max). Renvoie le y suivant. */
  const paragraphe = (t, x, y, largeur, o = {}) => {
    const p = o.police || normal, s = o.taille || 10, h = o.interligne || s * 1.4;
    let courant = '';
    for (const mot of String(t).split(/\s+/)) {
      const essai = courant ? courant + ' ' + mot : mot;
      if (p.widthOfTextAtSize(essai, s) > largeur && courant) { texte(courant, x, y, o); y -= h; courant = mot; } else courant = essai;
    }
    if (courant) { texte(courant, x, y, o); y -= h; }
    return y;
  };

  let y = 790;
  texte('SASSON', G, y, { police: serif, taille: 26 });
  droite('FACTURE', D, y + 4, { police: gras, taille: 13, couleur: or });
  y -= 18;
  texte('Faire-part de mariage en ligne · ' + VENDEUR.site, G, y, { taille: 9, couleur: doux });
  droite(`N° ${f.numero}`, D, y, { police: gras, taille: 10 });
  y -= 14;
  droite(`Date : ${dateFr(new Date(f.date))}`, D, y, { taille: 9, couleur: doux });
  y -= 30;
  ligne(y);
  y -= 26;

  // Vendeur / client
  const col2 = 320;
  texte('ÉMETTEUR', G, y, { police: gras, taille: 8, couleur: or });
  texte('CLIENT', col2, y, { police: gras, taille: 8, couleur: or });
  y -= 16;
  const vendeur = [
    VENDEUR.raisonSociale || `${VENDEUR.nom} (raison sociale ${A_COMPLETER})`,
    VENDEUR.adresse || `Adresse : ${A_COMPLETER}`,
    `SIREN : ${VENDEUR.siren || A_COMPLETER}`,
    `SIRET : ${VENDEUR.siret || A_COMPLETER}`,
    VENDEUR.tva ? `TVA intracom. : ${VENDEUR.tva}` : '',
    VENDEUR.email,
  ].filter(Boolean);
  const client = [f.client.nom || 'Client', f.client.adresse, f.client.email].filter(Boolean);
  let yv = y, yc = y;
  for (const l of vendeur) { yv = paragraphe(l, G, yv, 230, { taille: 9.5 }); }
  for (const l of client) { yc = paragraphe(l, col2, yc, 220, { taille: 9.5 }); }
  y = Math.min(yv, yc) - 24;

  // Tableau
  page.drawRectangle({ x: G, y: y - 6, width: D - G, height: 22, color: rgb(0.97, 0.96, 0.93) });
  texte('Désignation', G + 10, y, { police: gras, taille: 9 });
  droite('Qté', 390, y, { police: gras, taille: 9 });
  droite('Prix unitaire', 470, y, { police: gras, taille: 9 });
  droite('Montant', D - 10, y, { police: gras, taille: 9 });
  y -= 28;
  for (const l of f.lignes) {
    const yHaut = y;
    y = paragraphe(l.libelle, G + 10, y, 300, { police: gras, taille: 10 });
    y = paragraphe(l.detail, G + 10, y + 2, 300, { taille: 8.5, couleur: doux });
    droite(String(l.quantite), 390, yHaut, { taille: 10 });
    droite(euros(l.prixCentimes), 470, yHaut, { taille: 10 });
    droite(euros(l.prixCentimes * l.quantite), D - 10, yHaut, { taille: 10 });
    y -= 10;
  }
  ligne(y);
  y -= 22;
  droite('Total', 470, y, { police: gras, taille: 11 });
  droite(euros(f.totalCentimes), D - 10, y, { police: gras, taille: 11 });
  y -= 16;
  droite(VENDEUR.mentionTva, D - 10, y, { taille: 8.5, couleur: doux });
  y -= 30;

  // Paiement
  texte('PAIEMENT', G, y, { police: gras, taille: 8, couleur: or });
  y -= 15;
  texte(`Payée le ${dateFr(new Date(f.date))} — ${f.paiement.moyen}`, G, y, { taille: 9.5 });
  y -= 13;
  if (f.paiement.reference) { texte(`Référence : ${f.paiement.reference}`, G, y, { taille: 8.5, couleur: doux }); y -= 13; }
  if (f.lien) { texte(`Votre invitation : ${f.lien}`, G, y, { taille: 9.5 }); y -= 13; }

  // Pied de page
  const pied = [
    'Facture acquittée. Aucun escompte pour paiement anticipé.',
    'En cas de retard de paiement : pénalités au taux légal et indemnité forfaitaire de 40 € pour frais de recouvrement (professionnels).',
    `${VENDEUR.raisonSociale || VENDEUR.nom} · SIRET ${VENDEUR.siret || A_COMPLETER} · ${VENDEUR.email}`,
  ];
  let yp = 70;
  for (const l of pied) { yp = paragraphe(l, G, yp, D - G, { taille: 7.5, couleur: doux, interligne: 10 }); }

  return pdf.save();
}

/* ------------------------------------------------------------------ *
 * E-mail
 * ------------------------------------------------------------------ */
export function emailConfirmation(f, { espace }) {
  const sujet = `Votre invitation est en ligne${f.noms ? ` — ${f.noms}` : ''} · Facture ${f.numero}`;
  const bouton = (href, libelle, plein) => `<a href="${echappe(href)}" style="display:inline-block;padding:13px 22px;margin:4px 6px 4px 0;background:${plein ? '#171614' : '#FFFFFF'};color:${plein ? '#F7F4EE' : '#171614'};border:1px solid #171614;text-decoration:none;font:500 13px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase">${echappe(libelle)}</a>`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F4EE;padding:28px 12px;font-family:Georgia,serif;color:#171614">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FDFCF9;border:1px solid #E6E0D4">
<tr><td style="padding:34px 32px 10px;text-align:center">
  <div style="font-size:22px;letter-spacing:.34em">SASSON</div>
  <div style="font-size:15px;color:#876A40;margin-top:4px">ששון</div>
</td></tr>
<tr><td style="padding:18px 32px 6px;text-align:center">
  <div style="font-size:30px;line-height:1.2">Mazal tov${f.noms ? `,<br><em>${echappe(f.noms)}</em>` : ''} !</div>
  <p style="font:15px/1.6 Arial,sans-serif;color:#6E695F;margin:16px 0 0">Votre paiement est confirmé et votre invitation est en ligne. Partagez son lien avec vos invités : leurs réponses arrivent directement dans votre espace.</p>
</td></tr>
<tr><td style="padding:22px 32px 8px;text-align:center">
  ${f.lien ? bouton(f.lien, 'Voir mon invitation', true) : ''}${bouton(espace, 'Mon espace', false)}
  ${f.lien ? `<p style="font:13px/1.5 Arial,sans-serif;color:#6E695F;margin:14px 0 0">Votre lien : <a href="${echappe(f.lien)}" style="color:#876A40">${echappe(f.lien)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:22px 32px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font:14px/1.5 Arial,sans-serif;border-top:1px solid #E6E0D4">
    <tr><td style="padding:12px 0 4px;color:#6E695F">Facture</td><td style="padding:12px 0 4px;text-align:right">${echappe(f.numero)}</td></tr>
    <tr><td style="padding:4px 0;color:#6E695F">${echappe(f.lignes[0].libelle)}</td><td style="padding:4px 0;text-align:right">${euros(f.totalCentimes)}</td></tr>
    <tr><td style="padding:4px 0 12px;color:#6E695F">Payée le ${dateFr(new Date(f.date))}</td><td style="padding:4px 0 12px;text-align:right;font-weight:bold">Total ${euros(f.totalCentimes)}</td></tr>
  </table>
  <p style="font:12px/1.5 Arial,sans-serif;color:#8A857B;margin:6px 0 0">La facture détaillée est jointe à cet e-mail (PDF). ${echappe(VENDEUR.mentionTva)}.</p>
</td></tr>
<tr><td style="padding:16px 32px 30px;text-align:center;font:12px/1.6 Arial,sans-serif;color:#8A857B;border-top:1px solid #E6E0D4">
  Une question ? Écrivez-nous à <a href="mailto:${echappe(VENDEUR.email)}" style="color:#876A40">${echappe(VENDEUR.email)}</a><br>${echappe(VENDEUR.nom)} · ${echappe(VENDEUR.site)}
</td></tr>
</table></td></tr></table></body></html>`;
  const texteBrut = [
    `Mazal tov${f.noms ? `, ${f.noms}` : ''} !`, '',
    'Votre paiement est confirmé et votre invitation est en ligne.',
    f.lien ? `Votre lien : ${f.lien}` : '', `Votre espace : ${espace}`, '',
    `Facture ${f.numero} — ${euros(f.totalCentimes)}, payée le ${dateFr(new Date(f.date))} (PDF joint).`,
    VENDEUR.mentionTva, '', `Une question ? ${VENDEUR.email}`, `${VENDEUR.nom} · ${VENDEUR.site}`,
  ].filter((l) => l !== null).join('\n');
  return { sujet, html, texte: texteBrut };
}

/** Envoi via l'API Resend. Renvoie { envoye, id?, raison? } (ne jette jamais). */
export async function envoyerEmail({ a, sujet, html, texte, pieceJointe }) {
  const cle = (process.env.RESEND_API_KEY || '').trim();
  if (!cle) return { envoye: false, raison: 'RESEND_API_KEY absente' };
  if (!a) return { envoye: false, raison: 'adresse du client inconnue' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.SASSON_EMAIL_DE || 'Sasson <confirmation@sasson-invit.fr>',
        to: [a],
        reply_to: process.env.SASSON_EMAIL_REPONSE || VENDEUR.email,
        subject: sujet,
        html,
        text: texte,
        ...(pieceJointe ? { attachments: [pieceJointe] } : {}),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { envoye: false, raison: `Resend ${r.status} : ${j.message || j.name || 'erreur'}` };
    return { envoye: true, id: j.id };
  } catch (e) {
    return { envoye: false, raison: String(e && e.message) };
  }
}

/**
 * Apres une publication payee (appele UNE fois, cf. publier()) : numero,
 * PDF, archivage, e-mail. Ne fait jamais echouer la publication.
 */
export async function facturerEtConfirmer(db, { invitationId, session, donnees, slug, origine }) {
  try {
    const date = new Date();
    const numero = await prochainNumero(db, date);
    const f = donneesFacture({ numero, date, session, donnees, slug, origine });
    const pdf = await facturePdf(f);
    const { sujet, html, texte } = emailConfirmation(f, { espace: `${origine}/client/espace.html` });
    const envoi = await envoyerEmail({
      a: f.client.email, sujet, html, texte,
      pieceJointe: { filename: `Facture-${numero}.pdf`, content: Buffer.from(pdf).toString('base64') },
    });
    await db.collection('factures').doc(numero).set({
      ...f, invitationId, sessionId: session?.id || null,
      pdfBase64: Buffer.from(pdf).toString('base64'),
      email: envoi, creeLe: FieldValue.serverTimestamp(),
    });
    await db.collection('invitations').doc(invitationId).update({ facture: { numero, date: f.date, emailEnvoye: envoi.envoye } });
    if (!envoi.envoye) console.warn('E-mail de confirmation non envoye :', envoi.raison);
    return { numero, emailEnvoye: envoi.envoye };
  } catch (e) {
    console.error('Facture / e-mail :', e);
    return { numero: null, emailEnvoye: false };
  }
}
