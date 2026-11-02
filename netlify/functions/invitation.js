/**
 * GET /i/<adresse>  (reecrit vers /.netlify/functions/invitation?slug=<adresse>)
 * Sert la page de l'invitation publiee avec, deja dans le HTML, le titre
 * « Prenom & Prenom », une description et l'icone : WhatsApp, iMessage,
 * Facebook... n'executent pas le JavaScript pour fabriquer l'apercu d'un
 * lien. Le reste de la page (theme, reponses) est inchange.
 */
import PAGE from '../lib/page-publique.js';
import { getDb } from '../lib/commun.js';

const echappe = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function html(corps, maxAge) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': `public, max-age=${maxAge}` },
    body: corps,
  };
}

/** Adresse de l'invitation. Avec la reecriture /i/:slug -> fonction,
 *  Netlify ne transmet PAS toujours le parametre ?slug= : on le relit
 *  alors dans le chemin demande (/i/<adresse>), puis dans l'URL brute. */
function lireSlug(event) {
  const depuisChemin = (s) => (/\/i\/([^/?#]+)/.exec(String(s || '')) || [])[1] || '';
  let brut = event.queryStringParameters?.slug || depuisChemin(event.path) || depuisChemin(event.rawUrl)
    || depuisChemin(event.headers?.['x-nf-original-path']) || '';
  try { brut = decodeURIComponent(brut); } catch (e) { /* tel quel */ }
  return String(brut).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

export const handler = async (event) => {
  const slug = lireSlug(event);
  if (!slug) return html(PAGE, 60);
  try {
    const q = await getDb().collection('invitations').where('slug', '==', slug).where('statut', '==', 'publiee').limit(1).get();
    if (q.empty) return html(PAGE, 30);
    const inv = q.docs[0].data();
    let D = {};
    try { D = JSON.parse(inv.donneesJson || '{}'); } catch (e) { /* ignore */ }
    const c = D.couple || {};
    const noms = [c.marie?.prenom, c.mariee?.prenom].filter(Boolean).join(' & ') || 'Invitation de mariage';
    const date = D.compteARebours?.dateFr || '';
    const description = 'Vous êtes invités à notre mariage' + (date ? ` — ${date}` : '') + '.';
    const origine = `https://${event.headers.host}`;
    const icone = D.site?.favicon ? `${origine}/.netlify/functions/icone?slug=${slug}&v=${inv.majLe?.seconds || ''}` : '';

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

    // Ecran d'ouverture personnalise des le premier affichage (avant meme le
    // JavaScript) : prenoms, initiales et couleurs du theme.
    const initiales = [c.marie?.prenom, c.mariee?.prenom].map((p) => String(p || '').trim().charAt(0).toUpperCase()).join('');
    const theme = String(D.site?.themeSlug || '').replace(/[^a-z0-9-]/g, '');
    const page = PAGE.replace(/<title>[^<]*<\/title>/, meta)
      .replace('<body>', theme ? `<body data-theme="${theme}">` : '<body>')
      .replace('<!--NOMS-->', c.marie?.prenom && c.mariee?.prenom ? echappe(noms) : '')
      .replace('<!--INITIALES-->', echappe(initiales));
    return html(page, 60);
  } catch (e) {
    console.error(e);
    return html(PAGE, 10);   // la page se charge quand meme (lecture cote navigateur)
  }
};
