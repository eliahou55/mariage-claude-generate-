/**
 * Espace des maries : leurs invitations, statut, lien a partager,
 * tableau de bord et reponses des invites en direct (Firestore), export
 * CSV pour Excel. Confirme aussi le paiement au retour de Stripe
 * (?session_id=...).
 */
(function () {
  'use strict';

  var FB = typeof SassonFB !== 'undefined' ? SassonFB : null;
  var $ = function (id) { return document.getElementById(id); };
  var VUES = ['vue-chargement', 'vue-connexion', 'vue-aucune', 'vue-tableau'];
  function vue(id) { VUES.forEach(function (v) { $(v).hidden = v !== id; }); }

  var invitations = [];
  var courante = null;
  var reponses = [];
  var arreterEcoute = null;

  Array.prototype.forEach.call(document.querySelectorAll('[data-ouvrir]'), function (b) {
    b.addEventListener('click', function () { SiteEntete.ouvrir(b.getAttribute('data-ouvrir')); });
  });

  function bandeau(texte, type) {
    var b = $('bandeau');
    b.textContent = texte || '';
    b.className = 'espace__bandeau' + (type ? ' espace__bandeau--' + type : '');
    b.hidden = !texte;
  }

  function echappe(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dateCourte(ts) {
    if (!ts || !ts.toDate) return '';
    return ts.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + ts.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  function lienPublic(inv) { return window.location.origin + '/i/' + inv.slug; }

  /** Recopie l'invitation dans ce navigateur (pour la modifier / publier). */
  function chargerLocalement(inv) {
    try {
      if (inv.brouillon) window.localStorage.setItem(CLE_STOCKAGE_BROUILLON, JSON.stringify(inv.brouillon));
      if (inv.donnees) window.localStorage.setItem(CLE_STOCKAGE_DONNEES, JSON.stringify(inv.donnees));
      window.localStorage.setItem(CLE_STOCKAGE_INVITATION, inv.id);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- Paiement : retour de Stripe ---------------- */

  function confirmerPaiement() {
    var m = /[?&]session_id=([^&]+)/.exec(window.location.search);
    if (!m) return Promise.resolve();
    bandeau('Confirmation de votre paiement…');
    return FB.jeton().then(function (jeton) {
      return fetch('/.netlify/functions/confirmer-paiement?session_id=' + encodeURIComponent(m[1]), { headers: { Authorization: 'Bearer ' + jeton } });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        history.replaceState(null, '', window.location.pathname);
        if (r.ok) { bandeau('Paiement confirmé. Mazal tov, votre invitation est en ligne !', 'ok'); return j.invitationId; }
        bandeau(j.erreur || 'Le paiement n\'a pas pu être confirmé. Si vous avez été débité, il sera pris en compte automatiquement.', 'erreur');
      });
    }).catch(function () { bandeau('Vérification du paiement impossible pour le moment.', 'erreur'); });
  }

  /* ---------------- Affichage d'une invitation ---------------- */

  function afficher(inv) {
    courante = inv;
    var publiee = inv.statut === 'publiee';
    var D = inv.donnees || {};
    var theme = ClientInvitation.THEMES.filter(function (t) { return t.slug === (D.site && D.site.themeSlug); })[0];

    $('inv-statut').textContent = publiee ? 'En ligne' : 'Brouillon';
    $('inv-statut').className = 'etiquette-fine' + (publiee ? ' statut--ligne' : '');
    $('inv-noms').textContent = (inv.resume && inv.resume.noms) || 'Votre invitation';
    $('inv-infos').textContent = [D.compteARebours && D.compteARebours.dateFr, theme && theme.nom].filter(Boolean).join(' · ');

    $('bloc-publier').hidden = publiee;
    $('bloc-lien').hidden = !publiee;
    var voir = $('btn-voir');
    if (publiee) {
      var url = lienPublic(inv);
      $('lien-public').value = url;
      voir.href = url;
      var noms = (inv.resume && inv.resume.noms) || '';
      $('btn-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent((noms ? noms + ' — ' : '') + 'notre invitation de mariage : ' + url);
    } else {
      voir.href = '../apercu/' + ((D.site && D.site.themeSlug) || 'marbre-or') + '/index.html';
      voir.onclick = function () { chargerLocalement(inv); };
    }

    // Colonnes / chiffres selon les evenements
    var aMairie = (D.evenements || []).some(function (e) { return e.cle === 'mairie'; });
    var aReception = (D.evenements || []).some(function (e) { return e.cle === 'reception'; });
    $('th-mairie').hidden = !aMairie;
    $('ch-mairie-bloc').hidden = !aMairie;
    $('th-houppa').textContent = aReception ? 'Houppa & réception' : 'Houppa';
    $('ch-houppa-libelle').textContent = aReception ? 'personnes houppa & réception' : 'personnes à la houppa';

    if (arreterEcoute) { arreterEcoute(); arreterEcoute = null; }
    reponses = [];
    rendreReponses();
    if (publiee) {
      arreterEcoute = FB.ecouterReponses(inv.id, function (liste) { reponses = liste; rendreReponses(); },
        function () { $('reponses-vide').textContent = 'Impossible de lire les réponses (règles Firestore ?).'; });
    }
    Array.prototype.forEach.call(document.querySelectorAll('.espace__choix button'), function (b) {
      b.classList.toggle('actif', b.getAttribute('data-id') === inv.id);
    });
  }

  function rendreChoix() {
    var zone = $('choix-invitation');
    zone.hidden = invitations.length < 2;
    zone.innerHTML = '';
    invitations.forEach(function (inv) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-id', inv.id);
      b.textContent = ((inv.resume && inv.resume.noms) || 'Invitation') + (inv.statut === 'publiee' ? '' : ' (brouillon)');
      b.addEventListener('click', function () { afficher(inv); });
      zone.appendChild(b);
    });
  }

  /* ---------------- Reponses ---------------- */

  function presence(p) {
    if (!p) return '<span class="rep--vide">—</span>';
    return p.present ? '<span class="rep--oui">' + (p.nombre || 1) + ' pers.</span>' : '<span class="rep--non">Absent</span>';
  }

  function rendreReponses() {
    var aMairie = !$('th-mairie').hidden;
    var q = ($('recherche').value || '').trim().toLowerCase();
    var liste = reponses.filter(function (r) { return !q || (r.prenom + ' ' + r.nom).toLowerCase().indexOf(q) >= 0; });

    var houppa = 0, mairie = 0, absents = 0;
    reponses.forEach(function (r) {
      if (r.houppa && r.houppa.present) houppa += +r.houppa.nombre || 1;
      else if (r.houppa) absents += 1;
      if (r.mairie && r.mairie.present) mairie += +r.mairie.nombre || 1;
    });
    $('ch-reponses').textContent = reponses.length;
    $('ch-houppa').textContent = houppa;
    $('ch-mairie').textContent = mairie;
    $('ch-absents').textContent = absents;

    $('reponses-corps').innerHTML = liste.map(function (r) {
      return '<tr><td><strong>' + echappe(r.prenom) + ' ' + echappe(r.nom) + '</strong></td>' +
        (aMairie ? '<td>' + presence(r.mairie) + '</td>' : '') +
        '<td>' + presence(r.houppa) + '</td>' +
        '<td class="rep__mot">' + echappe(r.mot) + '</td>' +
        '<td class="rep__date">' + dateCourte(r.creeLe) + '</td>' +
        '<td><button type="button" class="rep__suppr" data-suppr="' + r.id + '" aria-label="Supprimer la réponse de ' + echappe(r.prenom) + '">×</button></td></tr>';
    }).join('');
    $('reponses-vide').hidden = reponses.length > 0;
  }

  $('reponses-corps').addEventListener('click', function (e) {
    var b = e.target.closest('[data-suppr]');
    if (!b || !courante) return;
    if (window.confirm('Supprimer cette réponse ?')) FB.supprimerReponse(courante.id, b.getAttribute('data-suppr'));
  });
  $('recherche').addEventListener('input', rendreReponses);

  /** Export CSV (separateur ; et BOM UTF-8 : s'ouvre proprement dans Excel). */
  $('btn-export').addEventListener('click', function () {
    var aMairie = !$('th-mairie').hidden;
    var ligne = function (cols) { return cols.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(';'); };
    var lignes = [ligne(['Prénom', 'Nom'].concat(aMairie ? ['Mairie', 'Personnes mairie'] : []).concat(['Houppa', 'Personnes houppa', 'Mot', 'Reçue le']))];
    reponses.forEach(function (r) {
      var m = r.mairie || {}, h = r.houppa || {};
      lignes.push(ligne([r.prenom, r.nom]
        .concat(aMairie ? [r.mairie ? (m.present ? 'Oui' : 'Non') : '', m.present ? m.nombre : ''] : [])
        .concat([h.present ? 'Oui' : 'Non', h.present ? h.nombre : '', r.mot || '', dateCourte(r.creeLe)])));
    });
    var blob = new Blob(['﻿' + lignes.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reponses-' + (((courante && courante.resume && courante.resume.noms) || 'invitation').replace(/[^\w]+/g, '-').toLowerCase()) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });

  /* ---------------- Actions ---------------- */

  $('btn-copier').addEventListener('click', function () {
    var champ = $('lien-public'), b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(champ.value) : Promise.reject()).catch(function () { champ.select(); document.execCommand('copy'); })
      .then(function () { b.textContent = 'Copié ✓'; setTimeout(function () { b.textContent = 'Copier'; }, 1600); });
  });
  $('btn-modifier').addEventListener('click', function () { chargerLocalement(courante); window.location.href = 'formulaire.html'; });
  $('btn-publier').addEventListener('click', function () { chargerLocalement(courante); window.location.href = 'publication.html'; });

  /* ---------------- Demarrage ---------------- */

  if (!FB) { vue('vue-connexion'); return; }
  SiteEntete.surCompte(function (compte) {
    if (!compte) { vue('vue-connexion'); return; }
    vue('vue-chargement');
    confirmerPaiement().then(function (idPayee) {
      return FB.mesInvitations().then(function (liste) {
        invitations = liste;
        if (!liste.length) { vue('vue-aucune'); return; }
        vue('vue-tableau');
        rendreChoix();
        var choisie = liste.filter(function (x) { return x.id === idPayee; })[0] || liste[0];
        afficher(choisie);
      });
    }).catch(function (e) {
      vue('vue-tableau');
      bandeau(e && e.code === 'permission-denied' ? 'Accès refusé par la base de données : les règles Firestore ne sont pas encore installées.' : 'Chargement impossible. Vérifiez votre connexion.', 'erreur');
    });
  });
})();
