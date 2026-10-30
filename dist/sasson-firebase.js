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
  function google() {
    var p = new firebase.auth.GoogleAuthProvider();
    // Sur mobile, la fenetre surgissante est souvent bloquee : redirection.
    if (/iPhone|iPad|Android/i.test(navigator.userAgent)) return auth.signInWithRedirect(p);
    return auth.signInWithPopup(p).then(function (r) { return r.user; });
  }
  function motDePasseOublie(email) { return auth.sendPasswordResetEmail(email); }
  function deconnecter() { return auth.signOut(); }
  function jeton() { return auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null); }

  /* ---------------- Invitations ---------------- */

  var invitations = db.collection('invitations');

  /** Cree ou met a jour l'invitation du compte connecte avec la saisie en
   *  cours (brouillon + donnees). Renvoie l'id. Le statut et le paiement
   *  ne sont JAMAIS modifies ici (seulement par le serveur). */
  function enregistrer(id, brouillon, donnees) {
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
    if (id) return invitations.doc(id).update(contenu).then(function () { return id; });
    contenu.ownerUid = u.uid;
    contenu.statut = 'brouillon';
    contenu.creeLe = maintenant();
    return invitations.add(contenu).then(function (ref) { return ref.id; });
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
  function lireParSlug(slug) {
    return invitations.where('slug', '==', slug).where('statut', '==', 'publiee').limit(1).get()
      .then(function (q) { return q.empty ? null : versObjet(q.docs[0]); });
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
    enregistrer: enregistrer, lire: lire, lireParSlug: lireParSlug, mesInvitations: mesInvitations, supprimer: supprimer,
    envoyerReponse: envoyerReponse, ecouterReponses: ecouterReponses, supprimerReponse: supprimerReponse,
  };
})();
