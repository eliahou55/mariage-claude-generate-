/**
 * Musique personnelle : le fichier MP3 importe par les maries dans le
 * formulaire, garde dans ce navigateur (IndexedDB, trop lourd pour
 * localStorage). Lu par le formulaire, l'etape 3 et les pages de theme
 * (app.js) quand site.musique vaut MUSIQUE_PERSO.
 *
 * Version sans serveur : le fichier n'est disponible que dans ce
 * navigateur. A la publication (paiement), il devra etre envoye au
 * serveur avec le reste de l'invitation.
 */
var MusiquePerso = (function () {
  'use strict';

  var BASE_DB = 'invitation-client', MAGASIN = 'fichiers', CLE = 'musique';
  var TAILLE_MAX = 20 * 1024 * 1024;   // 20 Mo

  function ouvrir() {
    return new Promise(function (ok, ko) {
      if (!window.indexedDB) { ko(new Error('IndexedDB indisponible')); return; }
      var r = indexedDB.open(BASE_DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(MAGASIN); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ko(r.error); };
    });
  }
  function transaction(mode, fn) {
    return ouvrir().then(function (db) {
      return new Promise(function (ok, ko) {
        var t = db.transaction(MAGASIN, mode), m = t.objectStore(MAGASIN), req = fn(m);
        t.oncomplete = function () { ok(req && req.result); db.close(); };
        t.onerror = function () { ko(t.error); db.close(); };
      });
    });
  }

  /** Enregistre le fichier choisi ; rejette si ce n'est pas un son ou s'il est trop lourd. */
  function enregistrer(fichier) {
    if (!fichier) return Promise.reject(new Error('Aucun fichier'));
    if (!/^audio\//.test(fichier.type) && !/\.(mp3|m4a|aac|wav|ogg)$/i.test(fichier.name)) {
      return Promise.reject(new Error('Ce fichier n\'est pas un fichier audio (MP3, M4A…).'));
    }
    if (fichier.size > TAILLE_MAX) return Promise.reject(new Error('Fichier trop lourd (20 Mo maximum).'));
    var nom = fichier.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
    var type = fichier.type || 'audio/mpeg';
    // Donnees brutes (ArrayBuffer) plutot que le fichier lui-meme : Safari
    // refuse de stocker un Blob dans IndexedDB dans certains cas
    // (navigation privee notamment).
    var lireOctets = fichier.arrayBuffer ? fichier.arrayBuffer() : new Promise(function (ok, ko) {
      var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { ko(fr.error); }; fr.readAsArrayBuffer(fichier);
    });
    return lireOctets
      .then(function (octets) { return transaction('readwrite', function (m) { return m.put({ octets: octets, nom: nom, type: type }, CLE); }); })
      .then(function () { return { nom: nom }; })
      .catch(function (err) {
        throw new Error((err && err.message && /quota/i.test(err.message))
          ? 'Plus assez de place dans ce navigateur pour ce fichier.'
          : 'Impossible d\'enregistrer ce fichier dans ce navigateur (navigation privée ?).');
      });
  }

  /** { url, nom } de la musique personnelle, ou null s'il n'y en a pas. */
  function lire() {
    return transaction('readonly', function (m) { return m.get(CLE); })
      .then(function (v) {
        if (!v) return null;
        var blob = v.octets ? new Blob([v.octets], { type: v.type || 'audio/mpeg' }) : v.blob;
        return blob ? { url: URL.createObjectURL(blob), nom: v.nom } : null;
      })
      .catch(function () { return null; });
  }

  function supprimer() {
    return transaction('readwrite', function (m) { return m.delete(CLE); }).catch(function () {});
  }

  return { CLE: 'perso', enregistrer: enregistrer, lire: lire, supprimer: supprimer };
})();
