/**
 * Etape 4 : publication. Recapitulatif -> compte -> enregistrement dans
 * Firestore -> paiement Stripe integre (Apple Pay / Google Pay / carte) ->
 * retour sur l'espace client, qui confirme le paiement et publie.
 * Si l'invitation est deja publiee : simple mise a jour du contenu.
 */
(function () {
  'use strict';

  var CLE_STRIPE = 'pk_test_51UWH5GGW7kgIPyXWdrBWUlNsRDjNY3j4d35N79c5nrZ6Z3KG7XAmoCa6GiWJMbBGKSHBCe4Wf9IIfd61Tm5mgFEY00SnnNVA3D';
  var FB = typeof SassonFB !== 'undefined' ? SassonFB : null;

  var D = null;
  try { D = JSON.parse(window.localStorage.getItem(CLE_STOCKAGE_DONNEES) || 'null'); } catch (e) { /* ignore */ }
  var brouillon = ClientInvitation.lireBrouillon();
  var erreurEl = document.getElementById('erreur');

  function montrer(id) {
    ['etat-chargement', 'etat-vide', 'etat-exemple', 'etat-compte', 'etat-paiement', 'etat-publiee'].forEach(function (x) {
      document.getElementById(x).hidden = x !== id;
    });
  }
  function erreur(msg) { erreurEl.textContent = msg; erreurEl.hidden = !msg; }

  /* --- Recapitulatif --- */
  if (D) {
    var c = D.couple || {};
    document.getElementById('recap-noms').textContent = [c.marie && c.marie.prenom, c.mariee && c.mariee.prenom].filter(Boolean).join(' & ') || '—';
    var theme = ClientInvitation.THEMES.filter(function (t) { return t.slug === (D.site && D.site.themeSlug); })[0];
    document.getElementById('recap-theme').textContent = theme ? theme.nom : '—';
    document.getElementById('recap-evenements').textContent = (D.evenements || []).map(function (e) { return e.titre; }).join(' · ') || '—';
    var m = String((D.site && D.site.musique) || '');
    var piste = ClientInvitation.MUSIQUES.filter(function (x) { return m.split('/').pop() === x.fichier; })[0];
    document.getElementById('recap-musique').textContent = m === 'perso' ? 'Votre musique importée' : piste ? piste.nom : '—';
  }

  if (!D) { montrer('etat-vide'); return; }
  if (D.exemple) { montrer('etat-exemple'); return; }
  if (!FB) { montrer('etat-compte'); erreur('Connexion indisponible pour le moment. Réessayez dans un instant.'); return; }

  Array.prototype.forEach.call(document.querySelectorAll('[data-ouvrir]'), function (b) {
    b.addEventListener('click', function () { SiteEntete.ouvrir(b.getAttribute('data-ouvrir')); });
  });

  function idLocal() { try { return window.localStorage.getItem(CLE_STOCKAGE_INVITATION) || null; } catch (e) { return null; } }
  function memoriserId(id) { try { window.localStorage.setItem(CLE_STOCKAGE_INVITATION, id); } catch (e) { /* ignore */ } }

  /** Enregistre la saisie dans le compte ; si l'id memorise n'est pas a ce
   *  compte (autre compte connecte), cree une nouvelle invitation. */
  function enregistrer() {
    var id = idLocal();
    return FB.enregistrer(id, brouillon, D).catch(function (e) {
      if (id) return FB.enregistrer(null, brouillon, D);
      throw e;
    }).then(function (nouvelId) { memoriserId(nouvelId); return nouvelId; });
  }

  var paiementMonte = false;
  function monterPaiement(invitationId) {
    montrer('etat-paiement');
    if (paiementMonte) return;
    paiementMonte = true;
    if (typeof Stripe === 'undefined') { erreur('Le module de paiement ne s\'est pas chargé. Vérifiez votre connexion.'); return; }
    var stripe = Stripe(CLE_STRIPE);
    function secret() {
      return FB.jeton().then(function (jeton) {
        return fetch('/.netlify/functions/creer-paiement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton },
          body: JSON.stringify({ invitationId: invitationId }),
        });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.clientSecret) throw new Error(j.erreur || 'Paiement indisponible pour le moment.');
          return j.clientSecret;
        });
      });
    }
    var creer = stripe.createEmbeddedCheckoutPage ? 'createEmbeddedCheckoutPage' : 'initEmbeddedCheckout';
    stripe[creer]({ fetchClientSecret: secret })
      .then(function (checkout) { checkout.mount('#paiement'); })
      .catch(function (e) { paiementMonte = false; erreur(e.message || 'Paiement indisponible pour le moment.'); });
  }

  SiteEntete.surCompte(function (compte) {
    erreur('');
    if (!compte) { montrer('etat-compte'); return; }
    montrer('etat-chargement');
    enregistrer().then(function (id) {
      return FB.lire(id).then(function (inv) {
        if (inv && inv.statut === 'publiee') montrer('etat-publiee');
        else monterPaiement(id);
      });
    }).catch(function (e) {
      montrer('');
      erreur('Enregistrement impossible : ' + (e && e.code === 'permission-denied'
        ? 'accès refusé par la base de données (règles Firestore à installer).'
        : 'vérifiez votre connexion et réessayez.'));
      var re = document.createElement('button');
      re.type = 'button';
      re.className = 'btn btn--secondaire btn--petit';
      re.style.marginTop = '14px';
      re.textContent = 'Réessayer';
      re.addEventListener('click', function () { window.location.reload(); });
      erreurEl.appendChild(document.createElement('br'));
      erreurEl.appendChild(re);
    });
  });

  document.getElementById('btn-mettre-a-jour').addEventListener('click', function () {
    var b = this;
    b.disabled = true;
    enregistrer().then(function () {
      b.textContent = 'Modifications enregistrées ✓';
      setTimeout(function () { window.location.href = 'espace.html'; }, 900);
    }, function () { b.disabled = false; erreur('Enregistrement impossible. Réessayez.'); });
  });
})();
