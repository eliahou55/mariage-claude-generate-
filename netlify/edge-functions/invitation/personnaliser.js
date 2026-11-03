/**
 * Personnalisation de la page d'une invitation publiee (/i/<adresse>),
 * sans dependance : utilisee par l'Edge Function invitation.js (et testable
 * a part). A partir de la coquille statique (dist/i/index.html) :
 *  - titre « Prenom & Prenom », description, icone (apercus WhatsApp...) ;
 *  - ecran d'ouverture (prenoms, initiales, couleurs du theme) ;
 *  - l'invitation elle-meme (#invitation-prechargee), affichee par le
 *    navigateur sans attendre Firebase.
 */

const echappe = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Adresse de l'invitation a partir du chemin /i/<adresse>. */
export function slugDepuisChemin(chemin) {
  const m = /^\/i\/([^/?#]+)\/?$/.exec(String(chemin || ''));
  if (!m || m[1] === 'index.html') return '';
  let brut = m[1];
  try { brut = decodeURIComponent(brut); } catch (e) { /* tel quel */ }
  return String(brut).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

/** Requete Firestore (API REST) : l'invitation publiee de cette adresse.
 *  Meme lecture publique que celle du navigateur des invites (regle :
 *  lecture autorisee si statut == 'publiee'). */
export function requeteFirestore(slug) {
  const egal = (champ, valeur) => ({ fieldFilter: { field: { fieldPath: champ }, op: 'EQUAL', value: { stringValue: valeur } } });
  return {
    structuredQuery: {
      from: [{ collectionId: 'invitations' }],
      where: { compositeFilter: { op: 'AND', filters: [egal('slug', slug), egal('statut', 'publiee')] } },
      limit: 1,
    },
  };
}

/** Reponse REST de runQuery -> { id, D, majSecondes } ou null. */
export function lireReponse(json) {
  const doc = Array.isArray(json) && json[0] && json[0].document;
  if (!doc || !doc.fields) return null;
  let D = {};
  try { D = JSON.parse((doc.fields.donneesJson && doc.fields.donneesJson.stringValue) || '{}'); } catch (e) { D = {}; }
  const t = doc.fields.majLe && doc.fields.majLe.timestampValue;
  return { id: String(doc.name || '').split('/').pop(), D, majSecondes: t ? Math.floor(Date.parse(t) / 1000) : '' };
}

/** Injecte titre, icone, ecran d'ouverture et invitation dans la coquille. */
export function personnaliser(page, { id, D, majSecondes }, { slug, origine }) {
  const c = D.couple || {};
  const p1 = c.marie && c.marie.prenom, p2 = c.mariee && c.mariee.prenom;
  const noms = [p1, p2].filter(Boolean).join(' & ') || 'Invitation de mariage';
  const date = (D.compteARebours && D.compteARebours.dateFr) || '';
  const description = 'Vous êtes invités à notre mariage' + (date ? ` — ${date}` : '') + '.';
  const icone = D.site && D.site.favicon ? `${origine}/.netlify/functions/icone?slug=${slug}&v=${majSecondes}` : '';

  const meta = [
    `<title>${echappe(noms)}</title>`,
    `<meta name="description" content="${echappe(description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Sasson">`,
    `<meta property="og:title" content="${echappe(noms)}">`,
    `<meta property="og:description" content="${echappe(description)}">`,
    `<meta property="og:url" content="${origine}/i/${slug}">`,
    icone ? `<meta property="og:image" content="${icone}">` : '',
    icone ? `<meta property="og:image:width" content="192"><meta property="og:image:height" content="192">` : '',
    `<meta name="twitter:card" content="summary">`,
    icone ? `<link rel="icon" type="image/png" href="${icone}"><link rel="apple-touch-icon" href="${icone}">` : '',
  ].filter(Boolean).join('\n');

  const initiales = [p1, p2].map((p) => String(p || '').trim().charAt(0).toUpperCase()).join('');
  const theme = String((D.site && D.site.themeSlug) || '').replace(/[^a-z0-9-]/g, '');
  // L'icone (image lourde) n'est pas recopiee : servie par la fonction icone.
  const prechargee = { id, donnees: { ...D, site: { ...(D.site || {}), favicon: null } } };
  const json = JSON.stringify(prechargee).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  return page
    .replace(/<title>[^<]*<\/title>/, meta)
    .replace('<!--INVITATION-->', `<script type="application/json" id="invitation-prechargee">${json}</script>`)
    .replace('<body>', theme ? `<body data-theme="${theme}">` : '<body>')
    .replace('<!--NOMS-->', p1 && p2 ? echappe(noms) : '')
    .replace('<!--INITIALES-->', echappe(initiales));
}
