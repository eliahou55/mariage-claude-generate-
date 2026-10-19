/**
 * Etape 2 : formulaire complet (couple, familles, site, puis un bloc par
 * evenement choisi a l'etape 1, dans l'ordre choisi). A la soumission :
 * calcule le JSON final (ClientInvitation.construireDonnees) et l'ecrit
 * dans CLE_STOCKAGE_DONNEES, puis redirige vers la galerie des 10 themes.
 */
(function () {
  'use strict';

  var brouillon = ClientInvitation.lireBrouillon();
  var form = document.getElementById('form-invitation');
  var erreurEl = document.getElementById('message-erreur');
  var selectVerset = document.getElementById('f-verset');
  var autreVersetInput = document.getElementById('f-verset-autre');
  var apercuVersetEl = document.getElementById('apercu-verset');

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function fixe(id, valeur) {
    var el = document.getElementById(id);
    if (el) el.value = valeur || '';
  }

  /* --- Pre-remplissage des champs simples depuis le brouillon --- */
  function preRemplir() {
    fixe('f-marie-prenom', brouillon.couple.marie.prenom);
    fixe('f-marie-nom', brouillon.couple.marie.nom);
    fixe('f-marie-hebreu', brouillon.couple.marie.hebreu);
    fixe('f-mariee-prenom', brouillon.couple.mariee.prenom);
    fixe('f-mariee-nom', brouillon.couple.mariee.nom);
    fixe('f-mariee-hebreu', brouillon.couple.mariee.hebreu);
    fixe('f-parents-marie', brouillon.familles.parentsMarie);
    fixe('f-parents-mariee', brouillon.familles.parentsMariee);
    fixe('f-gparents-marie', brouillon.familles.grandsParentsMarie);
    fixe('f-gparents-mariee', brouillon.familles.grandsParentsMariee);
    fixe('f-memoire', brouillon.familles.memoire);
    fixe('f-lien', brouillon.site.lien);
  }

  /* --- Thème (cartes radio) --- */
  function rendreThemes() {
    var zone = document.getElementById('zone-themes');
    zone.innerHTML = '';
    ClientInvitation.THEMES.forEach(function (t) {
      var id = 'theme-' + t.slug;
      var wrap = document.createElement('div');
      wrap.className = 'theme-case';
      var input = document.createElement('input');
      input.type = 'radio'; input.name = 'theme'; input.id = id; input.value = t.slug;
      if (brouillon.site.themeSlug === t.slug) input.checked = true;
      var label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = t.nom;
      wrap.appendChild(input);
      wrap.appendChild(label);
      zone.appendChild(wrap);
    });
  }

  /* --- Couleur principale (pastilles radio) --- */
  function rendreCouleurs() {
    var zone = document.getElementById('zone-couleurs');
    zone.innerHTML = '';
    ClientInvitation.COULEURS.forEach(function (c) {
      var nom = c[0], hex = c[1];
      var id = 'couleur-' + nom.replace(/[^a-zA-Z0-9]/g, '');
      var wrap = document.createElement('div');
      wrap.className = 'couleur-case';
      var input = document.createElement('input');
      input.type = 'radio'; input.name = 'couleur'; input.id = id; input.value = nom;
      if (brouillon.site.couleurNom === nom) input.checked = true;
      var label = document.createElement('label');
      label.setAttribute('for', id);
      var pastille = document.createElement('span');
      pastille.className = 'couleur-case__pastille';
      pastille.style.background = hex;
      var spanNom = document.createElement('span');
      spanNom.className = 'nom';
      spanNom.textContent = nom;
      label.appendChild(pastille);
      label.appendChild(spanNom);
      wrap.appendChild(input);
      wrap.appendChild(label);
      zone.appendChild(wrap);
    });
  }

  /* --- Verset (liste proposee + "Autre" en texte libre) --- */
  function rendreVersets() {
    selectVerset.innerHTML = '';
    ClientInvitation.VERSETS_PROPOSES.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      selectVerset.appendChild(opt);
    });
    var optAutre = document.createElement('option');
    optAutre.value = '__autre__';
    optAutre.textContent = 'Autre (texte libre)';
    selectVerset.appendChild(optAutre);

    var actuel = brouillon.site.verset || ClientInvitation.VERSETS_PROPOSES[0];
    var estConnu = ClientInvitation.VERSETS_PROPOSES.indexOf(actuel) !== -1;
    if (estConnu) {
      selectVerset.value = actuel;
      autreVersetInput.hidden = true;
    } else {
      selectVerset.value = '__autre__';
      autreVersetInput.hidden = false;
      autreVersetInput.value = actuel;
    }
    majApercuVerset();
  }

  function majApercuVerset() {
    var v = selectVerset.value === '__autre__' ? autreVersetInput.value : selectVerset.value;
    apercuVersetEl.textContent = v || '';
  }

  selectVerset.addEventListener('change', function () {
    autreVersetInput.hidden = selectVerset.value !== '__autre__';
    majApercuVerset();
  });
  autreVersetInput.addEventListener('input', majApercuVerset);

  /* --- Un bloc de champs par evenement choisi, dans l'ordre choisi --- */
  function champ(grille, id, libelle, type, valeur, requis, pleineLargeur) {
    var wrap = document.createElement('div');
    wrap.className = 'champ';
    if (pleineLargeur) wrap.style.gridColumn = '1 / -1';
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.appendChild(document.createTextNode(libelle));
    if (requis) {
      var req = document.createElement('span');
      req.className = 'req';
      req.textContent = ' *';
      lab.appendChild(req);
    }
    wrap.appendChild(lab);
    var input = document.createElement('input');
    input.type = type;
    input.id = id;
    if (requis) input.required = true;
    if (valeur) input.value = valeur;
    wrap.appendChild(input);
    grille.appendChild(wrap);
    return input;
  }

  function rendreEvenements() {
    var zone = document.getElementById('zone-evenements');
    while (zone.children.length > 1) zone.removeChild(zone.lastChild);   // garde le <h2>

    brouillon.ordreEvenements.forEach(function (cle) {
      var def = ClientInvitation.infoEvenement(cle);
      if (!def) return;
      var saisie = brouillon.evenementsDonnees[cle] || {};

      var bloc = document.createElement('div');
      bloc.className = 'evenement-bloc';

      var titre = document.createElement('p');
      titre.className = 'evenement-bloc__titre';
      titre.appendChild(document.createTextNode(def.titre));
      if (def.titreHe) {
        var span = document.createElement('span');
        span.setAttribute('dir', 'rtl');
        span.textContent = def.titreHe;
        titre.appendChild(span);
      }
      bloc.appendChild(titre);

      var grille = document.createElement('div');
      grille.className = 'grille-champs grille-champs--2';

      champ(grille, cle + '-date', 'Date', 'date', saisie.date, true);
      if (def.heure) champ(grille, cle + '-heure', 'Heure', 'time', saisie.heure, true);
      var dateHe = champ(grille, cle + '-datehe', 'Date hébraïque', 'text', saisie.dateHe, false);
      dateHe.dir = 'rtl';
      champ(grille, cle + '-lieu', 'Lieu', 'text', saisie.lieu, false);
      var adresse = champ(grille, cle + '-adresse', 'Adresse', 'text', saisie.adresse, false, true);
      adresse.placeholder = 'Numéro, rue, code postal, ville';

      bloc.appendChild(grille);
      zone.appendChild(bloc);
    });
  }

  /* --- Collecte : DOM -> brouillon --- */
  function collecter() {
    brouillon.couple.marie.prenom = val('f-marie-prenom');
    brouillon.couple.marie.nom = val('f-marie-nom');
    brouillon.couple.marie.hebreu = val('f-marie-hebreu');
    brouillon.couple.mariee.prenom = val('f-mariee-prenom');
    brouillon.couple.mariee.nom = val('f-mariee-nom');
    brouillon.couple.mariee.hebreu = val('f-mariee-hebreu');

    brouillon.familles.parentsMarie = val('f-parents-marie');
    brouillon.familles.parentsMariee = val('f-parents-mariee');
    brouillon.familles.grandsParentsMarie = val('f-gparents-marie');
    brouillon.familles.grandsParentsMariee = val('f-gparents-mariee');
    brouillon.familles.memoire = val('f-memoire');

    var themeCoche = document.querySelector('input[name="theme"]:checked');
    if (themeCoche) brouillon.site.themeSlug = themeCoche.value;
    var couleurCochee = document.querySelector('input[name="couleur"]:checked');
    if (couleurCochee) brouillon.site.couleurNom = couleurCochee.value;
    brouillon.site.verset = selectVerset.value === '__autre__' ? autreVersetInput.value.trim() : selectVerset.value;
    brouillon.site.lien = val('f-lien');

    brouillon.ordreEvenements.forEach(function (cle) {
      var def = ClientInvitation.infoEvenement(cle);
      brouillon.evenementsDonnees[cle] = {
        date: val(cle + '-date'),
        heure: def.heure ? val(cle + '-heure') : '',
        dateHe: val(cle + '-datehe'),
        lieu: val(cle + '-lieu'),
        adresse: val(cle + '-adresse'),
      };
    });
  }

  function sauvegarder() {
    collecter();
    ClientInvitation.ecrireBrouillon(brouillon);
  }

  /* --- Initialisation --- */
  preRemplir();
  rendreThemes();
  rendreCouleurs();
  rendreVersets();
  rendreEvenements();

  // Persistance continue (survit a un retour arriere vers le configurateur).
  form.addEventListener('change', sauvegarder);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    erreurEl.hidden = true;
    sauvegarder();

    if (!form.reportValidity()) {
      erreurEl.textContent = 'Merci de renseigner tous les champs obligatoires (*).';
      erreurEl.hidden = false;
      return;
    }

    var donnees = ClientInvitation.construireDonnees(brouillon);
    var aHouppa = donnees.evenements.some(function (ev) { return ev.cle === 'houppa'; });
    if (!aHouppa) {
      erreurEl.textContent = 'La date de la houppa est indispensable pour générer votre invitation.';
      erreurEl.hidden = false;
      return;
    }

    try {
      window.localStorage.setItem(CLE_STOCKAGE_DONNEES, JSON.stringify(donnees));
    } catch (err) {
      erreurEl.textContent = "Impossible d'enregistrer dans ce navigateur (stockage plein ou navigation privée).";
      erreurEl.hidden = false;
      return;
    }

    window.location.href = '../apercu/index.html';
  });
})();
