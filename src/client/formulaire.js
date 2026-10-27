/**
 * Etape 2 : formulaire complet (couple, familles, puis un bloc par GROUPE
 * d'evenements choisi a l'etape 1, dans l'ordre choisi -- un groupe fusionne
 * affiche un seul jeu de champs partage). A la soumission : calcule le JSON
 * final (ClientInvitation.construireDonnees) et l'ecrit dans
 * CLE_STOCKAGE_DONNEES, puis redirige vers la galerie des 10 themes (theme
 * et couleur se choisissent la-bas, plus dans ce formulaire).
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
    fixe('f-marie-hebreu', brouillon.couple.marie.hebreu);
    fixe('f-mariee-prenom', brouillon.couple.mariee.prenom);
    fixe('f-mariee-hebreu', brouillon.couple.mariee.hebreu);
    fixe('f-parents-marie', brouillon.familles.parentsMarie);
    fixe('f-parents-mariee', brouillon.familles.parentsMariee);
    fixe('f-gparents-marie-maman', brouillon.familles.grandsParentsMarieMaman);
    fixe('f-gparents-marie-papa', brouillon.familles.grandsParentsMariePapa);
    fixe('f-gparents-mariee-maman', brouillon.familles.grandsParentsMarieeMaman);
    fixe('f-gparents-mariee-papa', brouillon.familles.grandsParentsMarieePapa);
    fixe('f-memoire', brouillon.familles.memoire);
    fixe('f-lien', brouillon.site.lien);
  }

  /* --- Suggestions d'ecriture hebraique du prenom (cliquer pour inserer,
   *     le champ reste vide sinon -- chacun ecrit son prenom hebreu a sa
   *     facon). --- */
  function cablerSuggestionsHebreu(prenomId, hebreuId, conteneurId) {
    var prenomInput = document.getElementById(prenomId);
    var hebreuInput = document.getElementById(hebreuId);
    var conteneur = document.getElementById(conteneurId);
    if (!prenomInput || !hebreuInput || !conteneur) return;

    function actualiser() {
      var propositions = ClientInvitation.suggestionsHebreu(prenomInput.value);
      conteneur.innerHTML = '';
      if (!propositions.length) {
        conteneur.hidden = true;
        return;
      }
      propositions.forEach(function (texte) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'suggestion-hebreu';
        var etiquette = document.createElement('span');
        etiquette.className = 'suggestion-hebreu__etiquette';
        etiquette.textContent = 'Essayer :';
        chip.appendChild(etiquette);
        chip.appendChild(document.createTextNode(texte));
        chip.addEventListener('click', function () {
          hebreuInput.value = texte;
          hebreuInput.focus();
        });
        conteneur.appendChild(chip);
      });
      conteneur.hidden = false;
    }

    prenomInput.addEventListener('input', actualiser);
    actualiser();
  }

  /* --- Mise en forme automatique "papi robert et mami estelle" ->
   *     "Papi Robert & Mami Estelle" pour les champs famille. --- */
  function formaterNomFamille(texte) {
    if (!texte) return texte;
    return texte
      .replace(/\s+et\s+/gi, ' & ')
      .replace(/\b\p{L}/gu, function (c) { return c.toUpperCase(); });
  }

  function cablerAutoFormat() {
    var champs = document.querySelectorAll('[data-auto-format]');
    for (var i = 0; i < champs.length; i++) {
      champs[i].addEventListener('blur', function () {
        this.value = formaterNomFamille(this.value);
      });
    }
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

  /* --- Un bloc de champs par GROUPE d'evenements, dans l'ordre choisi.
   *     Un groupe fusionne (ex. houppa + reception) n'affiche qu'un seul
   *     jeu de champs : une date, un lieu, une adresse -- et une seule
   *     heure, celle de la houppa quand elle fait partie du groupe. --- */
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

  /** Cle "porteuse" des valeurs communes d'un groupe (houppa en priorite). */
  function cleAncrage(groupe) {
    return groupe.indexOf('houppa') !== -1 ? 'houppa' : groupe[0];
  }

  /** Cle qui porte l'heure commune du groupe (houppa en priorite parmi les
   *  evenements du groupe qui ont une heure), ou null si aucun n'en a. */
  function cleHeureDeGroupe(groupe) {
    var avecHeure = groupe.filter(function (c) {
      var d = ClientInvitation.infoEvenement(c);
      return d && d.heure;
    });
    if (!avecHeure.length) return null;
    return avecHeure.indexOf('houppa') !== -1 ? 'houppa' : avecHeure[0];
  }

  /** Remplit (ou met a jour) le champ "Date hebraique" a partir de la
   *  date gregorienne saisie, via le calendrier hebreu embarque. Reste
   *  modifiable ensuite -- c'est une conversion automatique, pas un verrou. */
  function majDateHebraique(dateInput, dateHeInput) {
    if (!dateInput.value || typeof CalendrierHebreu === 'undefined') return;
    var p = dateInput.value.split('-').map(Number);
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return;
    try {
      dateHeInput.value = CalendrierHebreu.versHebreu(p[0], p[1], p[2]).texte;
    } catch (e) { /* date hors plage : on laisse le champ tel quel */ }
  }

  function aide(parent, texte) {
    var s = document.createElement('span');
    s.className = 'aide';
    s.textContent = texte;
    parent.appendChild(s);
  }

  function rendreEvenements() {
    var zone = document.getElementById('zone-evenements');
    while (zone.children.length > 1) zone.removeChild(zone.lastChild);   // garde le <h2>

    brouillon.groupes.forEach(function (groupe) {
      var defs = groupe.map(ClientInvitation.infoEvenement).filter(Boolean);
      if (!defs.length) return;

      var prefixe = groupe.join('-');
      var ancrage = cleAncrage(groupe);
      var cleHeure = cleHeureDeGroupe(groupe);
      var saisie = brouillon.evenementsDonnees[ancrage] || {};

      var bloc = document.createElement('div');
      bloc.className = 'evenement-bloc';

      var titre = document.createElement('p');
      titre.className = 'evenement-bloc__titre';
      titre.appendChild(document.createTextNode(defs.map(function (d) { return d.titre; }).join(' & ')));
      var titresHe = defs.map(function (d) { return d.titreHe; }).filter(Boolean);
      if (titresHe.length) {
        var span = document.createElement('span');
        span.setAttribute('dir', 'rtl');
        span.textContent = titresHe.join(' / ');
        titre.appendChild(span);
      }
      bloc.appendChild(titre);

      if (groupe.length > 1) {
        var note = document.createElement('p');
        note.className = 'aide';
        note.style.margin = '-4px 0 10px';
        var libHeure = cleHeure ? ClientInvitation.infoEvenement(cleHeure).titre : '';
        note.textContent = 'Ces événements partagent la même carte : une seule date, un seul lieu'
          + (libHeure ? ', et l\'heure de ' + libHeure + '.' : '.');
        bloc.appendChild(note);
      }

      var grille = document.createElement('div');
      grille.className = 'grille-champs grille-champs--2';

      var dateInput = champ(grille, prefixe + '-date', 'Date', 'date', saisie.date, true);
      if (cleHeure) champ(grille, prefixe + '-heure', 'Heure', 'time', saisie.heure, true);
      var dateHeInput = champ(grille, prefixe + '-datehe', 'Date hébraïque', 'text', saisie.dateHe, false);
      dateHeInput.dir = 'rtl';
      champ(grille, prefixe + '-lieu', 'Lieu', 'text', saisie.lieu, false);
      var adresse = champ(grille, prefixe + '-adresse', 'Adresse', 'text', saisie.adresse, false, true);
      adresse.placeholder = 'Numéro, rue, code postal, ville';

      bloc.appendChild(grille);
      aide(bloc, 'La date hébraïque se calcule automatiquement — vous pouvez la corriger si besoin.');
      zone.appendChild(bloc);

      dateInput.addEventListener('change', function () { majDateHebraique(dateInput, dateHeInput); });
      if (!dateHeInput.value) majDateHebraique(dateInput, dateHeInput);
    });
  }

  /* --- Collecte : DOM -> brouillon --- */
  function collecter() {
    brouillon.couple.marie.prenom = val('f-marie-prenom');
    brouillon.couple.marie.hebreu = val('f-marie-hebreu');
    brouillon.couple.mariee.prenom = val('f-mariee-prenom');
    brouillon.couple.mariee.hebreu = val('f-mariee-hebreu');

    brouillon.familles.parentsMarie = val('f-parents-marie');
    brouillon.familles.parentsMariee = val('f-parents-mariee');
    brouillon.familles.grandsParentsMarieMaman = val('f-gparents-marie-maman');
    brouillon.familles.grandsParentsMariePapa = val('f-gparents-marie-papa');
    brouillon.familles.grandsParentsMarieeMaman = val('f-gparents-mariee-maman');
    brouillon.familles.grandsParentsMarieePapa = val('f-gparents-mariee-papa');
    brouillon.familles.memoire = val('f-memoire');

    brouillon.site.verset = selectVerset.value === '__autre__' ? autreVersetInput.value.trim() : selectVerset.value;
    brouillon.site.lien = val('f-lien');

    brouillon.groupes.forEach(function (groupe) {
      var prefixe = groupe.join('-');
      var cleHeure = cleHeureDeGroupe(groupe);
      var partage = {
        date: val(prefixe + '-date'),
        dateHe: val(prefixe + '-datehe'),
        lieu: val(prefixe + '-lieu'),
        adresse: val(prefixe + '-adresse'),
      };
      var heureCommune = cleHeure ? val(prefixe + '-heure') : '';
      groupe.forEach(function (cle) {
        brouillon.evenementsDonnees[cle] = {
          date: partage.date,
          heure: cle === cleHeure ? heureCommune : '',
          dateHe: partage.dateHe,
          lieu: partage.lieu,
          adresse: partage.adresse,
        };
      });
    });
  }

  function sauvegarder() {
    collecter();
    ClientInvitation.ecrireBrouillon(brouillon);
  }

  /* --- Initialisation --- */
  preRemplir();
  rendreVersets();
  rendreEvenements();
  cablerSuggestionsHebreu('f-marie-prenom', 'f-marie-hebreu', 'suggestions-marie');
  cablerSuggestionsHebreu('f-mariee-prenom', 'f-mariee-hebreu', 'suggestions-mariee');
  cablerAutoFormat();

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
