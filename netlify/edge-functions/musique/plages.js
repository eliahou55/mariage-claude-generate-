/**
 * Lecture partielle (« Range ») d'un fichier audio reconstitue a partir de
 * ses morceaux. Indispensable a Safari / iPhone, qui demande le son par
 * plages d'octets (bytes=0-1) avant de le jouer. Sans dependance (testable).
 */

/** Assemble les morceaux (ArrayBuffer[]) en un seul Uint8Array. */
export function assembler(morceaux) {
  const total = morceaux.reduce((n, m) => n + m.byteLength, 0);
  const tout = new Uint8Array(total);
  let pos = 0;
  for (const m of morceaux) { tout.set(new Uint8Array(m), pos); pos += m.byteLength; }
  return tout;
}

/** En-tete Range -> { debut, fin } (inclusifs), null si absent, false si invalide. */
export function lirePlage(entete, taille) {
  if (!entete) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(entete).trim());
  if (!m || (m[1] === '' && m[2] === '')) return false;
  let debut, fin;
  if (m[1] === '') { debut = Math.max(0, taille - parseInt(m[2], 10)); fin = taille - 1; }   // bytes=-500
  else { debut = parseInt(m[1], 10); fin = m[2] === '' ? taille - 1 : Math.min(parseInt(m[2], 10), taille - 1); }
  if (debut > fin || debut >= taille) return false;
  return { debut, fin };
}

/** Reponse complete (200), partielle (206) ou plage impossible (416). */
export function repondre(tout, type, enteteRange, entetesCommuns = {}) {
  const taille = tout.byteLength;
  const base = { 'content-type': type, 'accept-ranges': 'bytes', ...entetesCommuns };
  const plage = lirePlage(enteteRange, taille);
  if (plage === false) return new Response(null, { status: 416, headers: { ...base, 'content-range': `bytes */${taille}` } });
  if (!plage) return new Response(tout, { status: 200, headers: { ...base, 'content-length': String(taille) } });
  const morceau = tout.subarray(plage.debut, plage.fin + 1);
  return new Response(morceau, {
    status: 206,
    headers: { ...base, 'content-length': String(morceau.byteLength), 'content-range': `bytes ${plage.debut}-${plage.fin}/${taille}` },
  });
}
