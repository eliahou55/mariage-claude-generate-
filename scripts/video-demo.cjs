/**
 * Enregistre la video de demonstration du configurateur (etape 1 :
 * composition du deroule) : src/client/demo/composition.mp4 + .jpg (affiche).
 *
 * Le configurateur reel est pilote par Playwright (vrais clics, vrais
 * glisser-deposer), avec un curseur visible et des sous-titres ajoutes
 * a la page le temps de l'enregistrement.
 *
 * Usage (depuis la racine du depot, dist/ a jour) :
 *   npx --yes serve dist -l 8765 &   (ou python3 -m http.server 8765 -d dist)
 *   node scripts/video-demo.cjs
 * Necessite ffmpeg pour la conversion WebM -> MP4 (H.264, lisible partout).
 */
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const URL_PAGE = process.env.DEMO_URL || 'http://localhost:8765/client/configurateur.html';
const SORTIE = path.join(__dirname, '..', 'src', 'client', 'demo');
const L = 480, H = 600;   // format 4:5, comme le cadre de la page

const CSS_ENREGISTREMENT = `
  #entete-site, .titre, .chapo, .demo-deroule, .conf-boite__aide, .barre-actions, .message-erreur { display: none !important; }
  html, body { background: #F7F4EE !important; }
  body.site { padding: 0 !important; }
  body.site .page { margin: 0 !important; padding: 96px 22px 20px !important; box-shadow: none !important; border-radius: 0 !important; max-width: none !important; min-height: 100vh; }
  .conf-repere { font-size: 17px !important; }
  #demo-legende {
    position: fixed; top: 0; left: 0; right: 0; z-index: 200; min-height: 78px;
    display: flex; align-items: center; gap: 12px; padding: 14px 20px;
    background: #171614; color: #F7F4EE; font: 400 16px/1.35 Jost, system-ui, sans-serif;
    transition: opacity .25s ease;
  }
  #demo-legende b { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #C9A44C; color: #171614; font-weight: 600; }
  #demo-legende b:empty { display: none; }
  #demo-curseur {
    position: fixed; z-index: 300; left: 0; top: 0; width: 26px; height: 26px; margin: -4px 0 0 -4px; pointer-events: none;
    transition: transform .12s ease;
  }
  #demo-curseur.appui { transform: scale(.82); }
  #demo-curseur::after {
    content: ''; position: absolute; left: -10px; top: -10px; width: 36px; height: 36px; border-radius: 50%;
    background: rgba(201, 164, 76, .35); opacity: 0; transition: opacity .12s ease;
  }
  #demo-curseur.appui::after { opacity: 1; }
`;

const JS_ENREGISTREMENT = `
  (function () {
    var leg = document.createElement('div'); leg.id = 'demo-legende'; leg.innerHTML = '<b></b><span></span>';
    var cur = document.createElement('div'); cur.id = 'demo-curseur';
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7 19 2.6-8.1L21 10z" fill="#171614" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(leg); document.body.appendChild(cur);
    function pos(e) { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; }
    document.addEventListener('pointermove', pos, true);
    document.addEventListener('pointerdown', function (e) { pos(e); cur.classList.add('appui'); }, true);
    document.addEventListener('pointerup', function () { cur.classList.remove('appui'); }, true);
    window.demoLegende = function (num, texte) {
      leg.style.opacity = 0;
      setTimeout(function () { leg.querySelector('b').textContent = num; leg.querySelector('span').innerHTML = texte; leg.style.opacity = 1; }, 220);
    };
  })();
`;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(SORTIE, { recursive: true });
  const dossierVideo = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-video-'));

  const navigateur = await chromium.launch();
  const contexte = await navigateur.newContext({
    viewport: { width: L, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: dossierVideo, size: { width: L, height: H } },
  });
  // Etat neuf : brouillon vide (houppa seule), indication de premiere visite deja vue.
  await contexte.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('demo-init')) {
        localStorage.clear();
        localStorage.setItem('invitation-client:glisser-vu', '1');
        sessionStorage.setItem('demo-init', '1');
      }
    } catch (e) { /* ignore */ }
  });
  const page = await contexte.newPage();
  const debut = Date.now();
  await page.goto(URL_PAGE, { waitUntil: 'load', timeout: 30000 });
  await page.addStyleTag({ content: CSS_ENREGISTREMENT });
  await page.evaluate(JS_ENREGISTREMENT);
  await page.mouse.move(L * 0.7, H * 0.85);
  await pause(300);
  const tDebutUtile = (Date.now() - debut) / 1000;

  const legende = (num, texte) => page.evaluate(([n, t]) => window.demoLegende(n, t), [num, texte]);
  const centre = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
  const allerA = async (x, y, steps = 22) => { await page.mouse.move(x, y, { steps }); };
  const carte = (texte) => page.locator('li.conf-item', { hasText: texte }).first();

  async function glisser(source, versX, versY) {
    const s = await centre(source);
    await allerA(s.x - 40, s.y);
    await pause(250);
    await page.mouse.down();
    await pause(200);
    await page.mouse.move(versX, versY, { steps: 40 });
    await pause(650);
    await page.mouse.up();
  }

  // 0. Point de depart
  await legende('', 'Votre déroulé commence avec la <u>houppa</u>, indispensable.');
  await pause(2600);

  // 1. Ajouter des evenements
  await legende('1', 'Ajoutez vos événements avec les boutons « + ».');
  await pause(1300);
  for (const nom of ['Mairie', 'Henné', 'Réception', "Chabbat 'Hatan"]) {
    const bouton = page.locator('.chip', { hasText: nom }).first();
    const c = await centre(bouton);
    await allerA(c.x, c.y);
    await pause(220);
    await page.mouse.down(); await pause(90); await page.mouse.up();
    await pause(650);
  }
  await legende('', 'Chacun se range à sa place habituelle.');
  await pause(2200);

  // 2. Reordonner : Henne au-dessus de la Mairie
  await legende('2', 'Glissez une carte pour changer l’ordre.');
  await pause(1200);
  {
    const mairie = await centre(carte('Mairie'));
    await glisser(carte('Henné'), mairie.x - 40, mairie.b.y + 4);
  }
  await pause(1500);

  // 3. Fusion : Reception deposee au centre de la Houppa
  await legende('3', 'Déposez la réception <u>au centre</u> de la houppa pour les réunir.');
  await pause(1600);
  {
    const houppa = await centre(carte('Houppa'));
    await glisser(carte('Réception'), houppa.x - 40, houppa.y);
  }
  await pause(700);
  await legende('', 'Houppa &amp; Réception : <u>une seule carte</u>, une seule adresse.');
  await pause(2800);

  // 4. Separer / retirer
  await legende('⤢', 'Ce bouton les sépare. La croix ✕ retire un événement.');
  {
    const bouton = page.locator('li.conf-item--fusion .conf-item__suppr').first();
    const c = await centre(bouton);
    await allerA(c.x, c.y, 26);
  }
  await pause(2800);

  await legende('✓', '1 ligne = 1 carte sur votre invitation. À vous !');
  await allerA(L * 0.72, H * 0.9, 20);
  await pause(2600);

  const duree = (Date.now() - debut) / 1000;
  await page.close();
  const webm = await page.video().path();
  await contexte.close();
  await navigateur.close();

  // Conversion : on retire le chargement initial, H.264 + faststart (lecture
  // immediate sur le web), sans piste audio.
  const mp4 = path.join(SORTIE, 'composition.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', tDebutUtile.toFixed(2), '-i', webm,
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  // Affiche : une image du milieu de la demo (cartes ajoutees).
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '9', '-i', mp4, '-frames:v', '1', '-q:v', '4', path.join(SORTIE, 'composition.jpg')]);
  fs.rmSync(dossierVideo, { recursive: true, force: true });
  console.log(`Video : ${mp4} (${(fs.statSync(mp4).size / 1024).toFixed(0)} Ko, ~${(duree - tDebutUtile).toFixed(0)} s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
