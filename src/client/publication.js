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
    ['etat-chargement', 'etat-vide', 'etat-exemple', 'etat-compte', 'etat-choix', 'etat-paiement', 'etat-publiee'].forEach(function (x) {
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

  /* --- Icone de l'invitation (favicon) : le logo par defaut, ou une image
   *     televersee. Calculee avant tout enregistrement. --- */
  var apercuIcone = document.getElementById('icone-apercu');
  function memoriserDonnees() { try { window.localStorage.setItem(CLE_STOCKAGE_DONNEES, JSON.stringify(D)); } catch (e) { /* ignore */ } }
  function majIcone() {
    var image = brouillon.site && brouillon.site.faviconImage;
    document.getElementById('icone-logo').hidden = !image;
    document.getElementById('icone-source').textContent = image
      ? 'Votre image, affichée dans l’onglet et sur l’écran d’accueil du téléphone de vos invités.'
      : 'Votre logo, affiché dans l’onglet et sur l’écran d’accueil du téléphone de vos invités.';
    // Logo impossible a convertir : les initiales, plutot qu'aucune icone.
    var calcul = image ? Promise.resolve(image) : FaviconInvitation.depuisLogo(D).catch(function () { return FaviconInvitation.depuisInitiales(D); });
    return calcul.then(function (url) {
      D.site.favicon = url;
      apercuIcone.src = url;
      memoriserDonnees();
    }).catch(function () { D.site.favicon = image || null; });
  }
  var iconePrete = typeof FaviconInvitation !== 'undefined' ? majIcone() : Promise.resolve();
  document.getElementById('icone-fichier').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    iconePrete = FaviconInvitation.depuisFichier(f).then(function (url) {
      brouillon.site.faviconImage = url;
      ClientInvitation.ecrireBrouillon(brouillon);
      return majIcone();
    }, function (e) { erreur(e.message); });
  });
  document.getElementById('icone-logo').addEventListener('click', function () {
    delete brouillon.site.faviconImage;
    ClientInvitation.ecrireBrouillon(brouillon);
    iconePrete = majIcone();
  });
  if (!FB) { montrer('etat-compte'); erreur('Connexion indisponible pour le moment. Réessayez dans un instant.'); return; }

  Array.prototype.forEach.call(document.querySelectorAll('[data-ouvrir]'), function (b) {
    b.addEventListener('click', function () { SiteEntete.ouvrir(b.getAttribute('data-ouvrir')); });
  });

  function idLocal() { try { return window.localStorage.getItem(CLE_STOCKAGE_INVITATION) || null; } catch (e) { return null; } }
  function memoriserId(id) { try { window.localStorage.setItem(CLE_STOCKAGE_INVITATION, id); } catch (e) { /* ignore */ } }

  /** Nouvelle saisie (non liee) alors que le compte a deja une ou plusieurs
   *  invitations : on demande quoi faire, au lieu de dupliquer ou d'ecraser
   *  sans prevenir. Resout avec l'id a mettre a jour, ou null (nouvelle). */
  function choisirCible(liste) {
    return new Promise(function (resoudre) {
      var zone = document.getElementById('choix-options');
      zone.innerHTML = '';
      function option(titre, detail, principal, action) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'choix-option' + (principal ? ' choix-option--principal' : '');
        b.innerHTML = '<strong></strong><span></span>';
        b.querySelector('strong').textContent = titre;
        b.querySelector('span').textContent = detail;
        b.addEventListener('click', action);
        zone.appendChild(b);
      }
      var noms = function (inv) { return '« ' + ((inv.resume && inv.resume.noms) || 'Invitation') + ' »'; };
      liste.slice(0, 3).forEach(function (inv, i) {
        if (inv.statut === 'publiee') {
          option('Mettre à jour ' + noms(inv) + ' avec ces informations', 'Invitation déjà en ligne : gratuit, son lien ne change pas.', i === 0,
            function () { resoudre(inv.id); });
        } else {
          option('Remplacer mon brouillon ' + noms(inv) + ' par cette version', 'L’ancien brouillon est remplacé.', i === 0,
            function () { resoudre(inv.id); });
        }
      });
      var premier = liste[0];
      option('Reprendre ' + noms(premier) + ' telle qu’elle était', 'Cette nouvelle saisie est abandonnée.', false, function () {
        SiteEntete.lier(premier, SiteEntete.lireCompte().uid);
        window.location.href = SiteEntete.etapeDeReprise(premier);
      });
      option('Créer une nouvelle invitation', 'Une invitation de plus dans votre espace, à publier séparément (19,99 €).', false,
        function () { resoudre(null); });
      document.getElementById('choix-texte').textContent = liste.length > 1
        ? 'Votre compte contient déjà ' + liste.length + ' invitations. Que souhaitez-vous faire de cette saisie ?'
        : 'Votre compte contient déjà ' + noms(premier) + (premier.statut === 'publiee' ? ', en ligne.' : ', en brouillon.') + ' Que souhaitez-vous faire de cette saisie ?';
      montrer('etat-choix');
      window.setTimeout(function () { document.getElementById('etat-choix').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    });
  }

  /** Enregistre la saisie dans le compte. Saisie deja liee : mise a jour.
   *  Sinon : si le compte a deja des invitations, on demande ; s'il n'en a
   *  aucune, on en cree une. Lien a un autre compte : nouvelle invitation. */
  function enregistrer() {
    var id = idLocal();
    return iconePrete.then(function () {
      if (id) return id;
      return FB.mesInvitations().then(function (liste) { return liste.length ? choisirCible(liste) : null; });
    }).then(function (cible) {
      montrer('etat-chargement');
      return FB.enregistrer(cible, brouillon, D, { etape: 'publication.html' }).catch(function (e) {
        if (cible) return FB.enregistrer(null, brouillon, D, { etape: 'publication.html' });
        throw e;
      });
    }).then(function (nouvelId) {
      memoriserId(nouvelId);
      try { window.localStorage.setItem(CLE_STOCKAGE_PROPRIETAIRE, SiteEntete.lireCompte().uid); } catch (e) { /* ignore */ }
      // Musique importee : envoyee au serveur, puis l'invitation enregistree
      // pointe vers elle (les invites l'entendent). Jamais bloquant.
      return envoyerMusique(nouvelId).then(function (chemin) {
        if (!chemin) return nouvelId;
        var copie = JSON.parse(JSON.stringify(D));
        copie.site.musique = chemin;
        return FB.enregistrer(nouvelId, brouillon, copie, { etape: 'publication.html' }).then(function () { return nouvelId; });
      });
    });
  }

  /** Envoie la musique importee (si c'en est une) en morceaux de 3,5 Mo.
   *  Resout avec son chemin (« musique/<id>?v=… »), ou null. Deja envoyee
   *  (meme invitation, meme fichier) : rien a renvoyer. */
  var CLE_MUSIQUE_ENVOYEE = 'invitation-client:musique-envoyee';
  function envoyerMusique(id) {
    if (!D || !D.site || D.site.musique !== 'perso' || typeof MusiquePerso === 'undefined') return Promise.resolve(null);
    var etat = document.getElementById('musique-envoi');
    function info(t) { if (etat) { etat.textContent = t; etat.hidden = !t; } }
    return MusiquePerso.lireFichier().then(function (f) {
      if (!f) return null;
      var deja = null;
      try { deja = JSON.parse(window.localStorage.getItem(CLE_MUSIQUE_ENVOYEE) || 'null'); } catch (e) { deja = null; }
      if (deja && deja.id === id && deja.nom === f.nom && deja.taille === f.taille && deja.chemin) return deja.chemin;
      var TAILLE = 3.5 * 1024 * 1024;
      var parts = Math.ceil(f.taille / TAILLE), version = Date.now().toString(36);
      return FB.jeton().then(function (jeton) {
        var suite = Promise.resolve(null);
        for (var i = 0; i < parts; i++) {
          (function (i) {
            suite = suite.then(function () {
              info('Envoi de votre musique… ' + Math.round(i / parts * 100) + ' %');
              var q = '?invitation=' + encodeURIComponent(id) + '&v=' + version + '&part=' + i + '&parts=' + parts
                + '&type=' + encodeURIComponent(f.type) + '&nom=' + encodeURIComponent(f.nom || '');
              return fetch('/.netlify/functions/musique-envoi' + q, {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/octet-stream' },
                body: f.octets.slice(i * TAILLE, Math.min(f.taille, (i + 1) * TAILLE)),
              }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (j) {
                  if (!r.ok) throw new Error(j.erreur || 'Envoi impossible');
                  return j.chemin || null;
                });
              });
            });
          })(i);
        }
        return suite;
      }).then(function (chemin) {
        info('');
        if (chemin) { try { window.localStorage.setItem(CLE_MUSIQUE_ENVOYEE, JSON.stringify({ id: id, nom: f.nom, taille: f.taille, chemin: chemin })); } catch (e) { /* ignore */ } }
        return chemin;
      });
    }).catch(function (e) {
      info('Votre musique n’a pas pu être envoyée (' + ((e && e.message) || 'erreur') + ') : la musique par défaut sera utilisée. Réessayez plus tard depuis votre espace.');
      return null;
    });
  }

  var paiementMonte = false;
  /* Accord CGV + execution immediate (renonciation au droit de retractation,
   * art. L221-28 13° C. conso) : obligatoire avant d'afficher le paiement ;
   * transmis au serveur, qui l'enregistre avec la commande. */
  var accord = document.getElementById('accord-cgv');
  var idEnAttente = null;
  accord.addEventListener('change', function () {
    document.getElementById('paiement').setAttribute('aria-disabled', accord.checked ? 'false' : 'true');
    document.getElementById('accord-aide').hidden = accord.checked;
    if (accord.checked && idEnAttente) monterPaiement(idEnAttente);
  });
  function monterPaiement(invitationId) {
    montrer('etat-paiement');
    if (!accord.checked) { idEnAttente = invitationId; return; }
    if (paiementMonte) return;
    paiementMonte = true;
    if (typeof Stripe === 'undefined') { erreur('Le module de paiement ne s\'est pas chargé. Vérifiez votre connexion.'); return; }
    var stripe = Stripe(CLE_STRIPE);
    function secret() {
      return FB.jeton().then(function (jeton) {
        return fetch('/.netlify/functions/creer-paiement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton },
          body: JSON.stringify({ invitationId: invitationId, cgv: true }),
        });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.clientSecret) throw new Error(j.erreur || 'Paiement indisponible pour le moment.');
          return j.clientSecret;
        });
      });
    }
    // Session demandee AVANT d'afficher le formulaire Stripe : en cas
    // d'erreur, notre message s'affiche (et non le "Something went wrong"
    // generique de Stripe).
    var creer = stripe.createEmbeddedCheckoutPage ? 'createEmbeddedCheckoutPage' : 'initEmbeddedCheckout';
    secret()
      .then(function (cs) { return stripe[creer]({ fetchClientSecret: function () { return Promise.resolve(cs); } }); })
      .then(function (checkout) { checkout.mount('#paiement'); })
      .catch(function (e) {
        paiementMonte = false;
        erreur((e && e.message) || 'Paiement indisponible pour le moment.');
      });
  }

  SiteEntete.surCompte(function (compte) {
    erreur('');
    if (!compte) { montrer('etat-compte'); return; }
    montrer('etat-chargement');
    enregistrer().then(function (id) {
      return FB.lire(id).then(function (inv) {
        try { window.localStorage.setItem(CLE_STOCKAGE_STATUT, (inv && inv.statut) || 'brouillon'); } catch (e) { /* ignore */ }
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
      try { window.localStorage.removeItem(CLE_STOCKAGE_MODIF); } catch (e) { /* ignore */ }
      setTimeout(function () { window.location.href = 'espace.html'; }, 900);
    }, function () { b.disabled = false; erreur('Enregistrement impossible. Réessayez.'); });
  });
})();
