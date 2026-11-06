/**
 * Firebase (comptes + base de donnees) pour Sasson. Script classique,
 * charge APRES les scripts "compat" de Firebase (CDN gstatic) :
 *   firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js
 *
 * La configuration web ci-dessous n'est PAS secrete (elle identifie le
 * projet ; la securite repose sur les regles Firestore, voir
 * firestore.rules). Aucune cle secrete (Stripe, compte de service) ici.
 *
 * Modele de donnees (Firestore) :
 *   invitations/{id}
 *     ownerUid, statut ('brouillon' | 'publiee'), slug (adresse publique),
 *     donneesJson (le JSON lu par app.js, en texte : Firestore refuse les
 *     tableaux imbriques), brouillonJson (la saisie du formulaire), resume
 *     { noms, themeSlug, dateFr } pour l'espace client,
 *     creeLe, majLe, payeLe
 *   invitations/{id}/reponses/{rid}
 *     prenom, nom, mairie {present, nombre} | null, houppa {present, nombre},
 *     mot, creeLe
 */
var SassonFB = (function () {
  'use strict';

  var CONFIG = {
    apiKey: 'AIzaSyB29wzEammhctXG1nePiGRz17_cpVJGMqk',
    authDomain: 'e-faire-part.firebaseapp.com',
    projectId: 'e-faire-part',
    storageBucket: 'e-faire-part.firebasestorage.app',
    messagingSenderId: '840103164576',
    appId: '1:840103164576:web:6c529c5d7d39c01d0027c5',
  };

  if (typeof firebase === 'undefined') return null;   // CDN injoignable : le site reste utilisable sans compte
  if (!firebase.apps.length) firebase.initializeApp(CONFIG);
  var auth = firebase.auth();
  var db = firebase.firestore();
  auth.languageCode = 'fr';
  var maintenant = function () { return firebase.firestore.FieldValue.serverTimestamp(); };

  /* ---------------- Comptes ---------------- */

  var MESSAGES = {
    'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse. Connectez-vous.',
    'auth/invalid-email': 'Adresse e-mail invalide.',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
    'auth/user-not-found': 'Aucun compte avec cette adresse.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/invalid-credential': 'Adresse e-mail ou mot de passe incorrect.',
    'auth/invalid-login-credentials': 'Adresse e-mail ou mot de passe incorrect.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
    'auth/popup-closed-by-user': 'Connexion Google annulée.',
    'auth/popup-blocked': 'Fenêtre Google bloquée par le navigateur.',
    'auth/network-request-failed': 'Connexion internet indisponible.',
    'auth/unauthorized-domain': 'Ce site n\'est pas encore autorisé dans Firebase (domaines autorisés).',
    'auth/operation-not-allowed': 'Ce mode de connexion n\'est pas activé dans Firebase.',
  };
  function messageErreur(err) {
    return (err && MESSAGES[err.code]) || 'Une erreur est survenue. Réessayez.';
  }

  function surUtilisateur(cb) { return auth.onAuthStateChanged(cb); }
  function utilisateur() { return auth.currentUser; }

  function inscrire(prenom, email, mdp) {
    return auth.createUserWithEmailAndPassword(email, mdp).then(function (r) {
      return r.user.updateProfile({ displayName: prenom }).then(function () { return r.user; });
    });
  }
  function connecter(email, mdp) { return auth.signInWithEmailAndPassword(email, mdp).then(function (r) { return r.user; }); }
  /** Connexion Google par fenetre surgissante, sur ordinateur comme sur
   *  mobile : la redirection echoue quand le site et Firebase ne sont pas
   *  sur le meme domaine (Safari / Chrome bloquent le stockage tiers) et
   *  ramene l'utilisateur deconnecte. Repli sur la redirection seulement
   *  si la fenetre est bloquee. A appeler directement dans le clic. */
  function google() {
    var p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return auth.signInWithPopup(p).then(function (r) { return r.user; }, function (e) {
      if (e && e.code === 'auth/popup-blocked') return auth.signInWithRedirect(p);
      throw e;
    });
  }
  // Retour d'une eventuelle redirection : remonte l'erreur dans la console.
  auth.getRedirectResult().catch(function (e) { if (window.console) console.warn('Connexion Google :', e.code || e); });
  function motDePasseOublie(email) { return auth.sendPasswordResetEmail(email); }
  function deconnecter() { return auth.signOut(); }
  function jeton() { return auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null); }

  /* ---------------- Invitations ---------------- */

  var invitations = db.collection('invitations');

  /** Cree ou met a jour l'invitation du compte connecte avec la saisie en
   *  cours (brouillon + donnees). Renvoie l'id. Le statut et le paiement
   *  ne sont JAMAIS modifies ici (seulement par le serveur). extra.etape :
   *  derniere etape atteinte, pour reprendre plus tard. */
  function enregistrer(id, brouillon, donnees, extra) {
    var u = auth.currentUser;
    if (!u) return Promise.reject(new Error('Non connecté'));
    var couple = (donnees && donnees.couple) || {};
    var contenu = {
      donneesJson: JSON.stringify(donnees),
      brouillonJson: JSON.stringify(brouillon || {}),
      resume: {
        noms: [couple.marie && couple.marie.prenom, couple.mariee && couple.mariee.prenom].filter(Boolean).join(' & '),
        themeSlug: (donnees && donnees.site && donnees.site.themeSlug) || '',
        dateFr: (donnees && donnees.compteARebours && donnees.compteARebours.dateFr) || '',
      },
      majLe: maintenant(),
    };
    // Etape atteinte (pour « reprendre la ou vous vous etiez arrete »).
    if (extra && extra.etape) contenu.etape = String(extra.etape);
    if (id) return invitations.doc(id).update(contenu).then(function () { return majFichePublique(id, donnees); }).then(function () { return id; });
    contenu.ownerUid = u.uid;
    contenu.statut = 'brouillon';
    contenu.creeLe = maintenant();
    return invitations.add(contenu).then(function (ref) { return ref.id; });
  }

  /** Fiche publique (collection « publiques », sous l'adresse /i/<adresse>) :
   *  uniquement ce que voient les invites. Le dossier « invitations » reste
   *  prive (e-mail, paiement, saisie). Mise a jour quand les maries modifient
   *  leur invitation deja publiee ; sans effet pour un brouillon. Une erreur
   *  ici ne bloque jamais l'enregistrement. */
  var publiques = db.collection('publiques');
  function sansIcone(donnees) {
    var d = Object.assign({}, donnees || {});
    d.site = Object.assign({}, d.site || {}, { favicon: null });
    return d;
  }
  function majFichePublique(id, donnees) {
    return invitations.doc(id).get().then(function (d) {
      var x = d.exists ? d.data() : null;
      if (!x || x.statut !== 'publiee' || !x.slug) return null;
      return publiques.doc(x.slug).set({
        invitationId: id,
        ownerUid: x.ownerUid,
        aIcone: !!(donnees && donnees.site && donnees.site.favicon),
        donneesJson: JSON.stringify(sansIcone(donnees)),
        majLe: maintenant(),
      });
    }).catch(function (e) { if (window.console) console.warn('Fiche publique non mise a jour :', e && (e.code || e.message)); });
  }

  /** Document Firestore -> objet, avec donnees / brouillon deja relus. */
  function versObjet(d) {
    var x = Object.assign({ id: d.id }, d.data());
    try { x.donnees = JSON.parse(x.donneesJson || 'null'); } catch (e) { x.donnees = null; }
    try { x.brouillon = JSON.parse(x.brouillonJson || 'null'); } catch (e) { x.brouillon = null; }
    return x;
  }
  function lire(id) {
    return invitations.doc(id).get().then(function (d) { return d.exists ? versObjet(d) : null; });
  }
  /** Invitation publiee, pour la page des invites : la fiche publique. */
  function lireParSlug(slug) {
    return publiques.doc(slug).get().then(function (d) {
      if (!d.exists) return null;
      var x = d.data(), donnees = null;
      try { donnees = JSON.parse(x.donneesJson || 'null'); } catch (e) { donnees = null; }
      return { id: x.invitationId, donnees: donnees };
    });
  }
  function mesInvitations() {
    var u = auth.currentUser;
    if (!u) return Promise.resolve([]);
    return invitations.where('ownerUid', '==', u.uid).get().then(function (q) {
      return q.docs.map(versObjet)
        .sort(function (a, b) { return ((b.majLe && b.majLe.seconds) || 0) - ((a.majLe && a.majLe.seconds) || 0); });
    });
  }
  function supprimer(id) { return invitations.doc(id).delete(); }
  /** E-mail aux maries a chaque reponse d'invite (choix des maries, desactive par defaut). */
  function definirNotifications(id, actif) { return invitations.doc(id).update({ notifications: !!actif }); }

  /* ---------------- Reponses des invites ---------------- */

  function envoyerReponse(invitationId, reponse) {
    reponse.creeLe = maintenant();
    return invitations.doc(invitationId).collection('reponses').add(reponse);
  }
  /** Ecoute en direct les reponses (proprietaire seulement). cb(liste) */
  function ecouterReponses(invitationId, cb, erreur) {
    return invitations.doc(invitationId).collection('reponses').orderBy('creeLe', 'desc')
      .onSnapshot(function (q) {
        cb(q.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }));
      }, erreur);
  }
  function supprimerReponse(invitationId, reponseId) {
    return invitations.doc(invitationId).collection('reponses').doc(reponseId).delete();
  }

  return {
    auth: auth, db: db, messageErreur: messageErreur,
    surUtilisateur: surUtilisateur, utilisateur: utilisateur, inscrire: inscrire, connecter: connecter,
    google: google, motDePasseOublie: motDePasseOublie, deconnecter: deconnecter, jeton: jeton,
    enregistrer: enregistrer, lire: lire, lireParSlug: lireParSlug, mesInvitations: mesInvitations, supprimer: supprimer, definirNotifications: definirNotifications,
    envoyerReponse: envoyerReponse, ecouterReponses: ecouterReponses, supprimerReponse: supprimerReponse,
  };
})();
