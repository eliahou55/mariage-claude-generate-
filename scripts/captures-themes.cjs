/**
 * Captures de la page d'accueil de chaque theme (src/client/apercus/<slug>.jpg),
 * affichees dans les telephones de la page d'accueil du site sur mobile, et
 * dans la galerie (des pages vivantes en iframe y feraient planter Safari
 * sur iPhone : trop de memoire).
 *
 * A relancer apres une modification visuelle d'un theme, APRES npm run build :
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/captures-themes.cjs
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RACINE = path.resolve(__dirname, '..');
const DIST = path.join(RACINE, 'dist');
const SORTIE = path.join(RACINE, 'src', 'client', 'apercus');
const THEMES = fs.readdirSync(path.join(RACINE, 'themes')).filter((t) => fs.existsSync(path.join(RACINE, 'themes', t, 'theme.css')));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const srv = require('http').createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    fs.readFile(path.join(DIST, u), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(d); });
  }).listen(0);
  const port = srv.address().port;
  const b = await chromium.launch();
  // Meme proportions que l'ecran des telephones de site.css (390 x 852).
  const p = await b.newPage({ viewport: { width: 390, height: 852 }, deviceScaleFactor: 2 });
  for (const t of THEMES) {
    await p.goto(`http://localhost:${port}/apercu/${t}/index.html`, { waitUntil: 'load' });
    await p.evaluate(() => { const bar = document.querySelector('.apercu-bar'); if (bar) bar.remove(); });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(SORTIE, `${t}.jpg`), type: 'jpeg', quality: 80 });
    console.log('  ' + t);
  }
  await b.close(); srv.close();
})();
