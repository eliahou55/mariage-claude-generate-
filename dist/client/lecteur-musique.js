/**
 * Mini-lecteur de musique facon Spotify, pour ecouter et choisir la
 * musique de fond : titre de la piste, boutons precedent / lecture-pause /
 * suivant, barre de progression qui se remplit et sur laquelle on peut
 * cliquer ou glisser pour se deplacer dans le morceau.
 *
 * Script classique (pas de module ES, compatible file://). Utilise sur la
 * galerie des themes (apercu/index.html) et dans le formulaire client.
 *
 *   LecteurMusique.creer({
 *     conteneur: element,               // ou le lecteur est insere
 *     base: '../client/musique/',       // dossier des mp3
 *     pistes: ClientInvitation.MUSIQUES,// [{ fichier, nom }]
 *     actuelle: 'bereshit-olam.mp3',    // piste selectionnee au depart
 *     auChangement: function (fichier) {} // appelee a chaque prec./suiv.
 *   }) -> { definir(fichier), arreter() }
 */
var LecteurMusique = (function () {
  'use strict';

  var ICONE_LECTURE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
  var ICONE_PAUSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect fill="currentColor" x="6" y="5" width="4" height="14" rx="1.2"/><rect fill="currentColor" x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
  var ICONE_PREC = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect fill="currentColor" x="5" y="5" width="2.4" height="14" rx="1"/><path fill="currentColor" d="M19 6.2v11.6a1 1 0 0 1-1.55.83L9.2 13.03a1.2 1.2 0 0 1 0-2.06l8.25-5.6A1 1 0 0 1 19 6.2z"/></svg>';
  var ICONE_SUIV = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect fill="currentColor" x="16.6" y="5" width="2.4" height="14" rx="1"/><path fill="currentColor" d="M5 6.2v11.6a1 1 0 0 0 1.55.83l8.25-5.6a1.2 1.2 0 0 0 0-2.06l-8.25-5.6A1 1 0 0 0 5 6.2z"/></svg>';

  function temps(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function el(tag, classe, html) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (html) n.innerHTML = html;
    return n;
  }

  function creer(opts) {
    var pistes = opts.pistes || [];
    var index = 0;
    for (var i = 0; i < pistes.length; i++) if (pistes[i].fichier === opts.actuelle) index = i;

    var audio = new Audio();
    audio.preload = 'metadata';

    var racine = el('div', 'lecteur');
    var titre = el('p', 'lecteur__titre');
    var compteur = el('p', 'lecteur__compteur');

    var commandes = el('div', 'lecteur__commandes');
    var bPrec = el('button', 'lecteur__bouton', ICONE_PREC);
    var bLecture = el('button', 'lecteur__bouton lecteur__bouton--lecture', ICONE_LECTURE);
    var bSuiv = el('button', 'lecteur__bouton', ICONE_SUIV);
    [bPrec, bLecture, bSuiv].forEach(function (b) { b.type = 'button'; });
    bPrec.setAttribute('aria-label', 'Musique précédente');
    bSuiv.setAttribute('aria-label', 'Musique suivante');
    bLecture.setAttribute('aria-label', 'Écouter');
    commandes.appendChild(bPrec);
    commandes.appendChild(bLecture);
    commandes.appendChild(bSuiv);

    var ligne = el('div', 'lecteur__ligne');
    var tActuel = el('span', 'lecteur__temps', '0:00');
    var barre = el('div', 'lecteur__barre');
    barre.setAttribute('role', 'slider');
    barre.setAttribute('tabindex', '0');
    barre.setAttribute('aria-label', 'Position dans la musique');
    var rempli = el('div', 'lecteur__rempli');
    var poignee = el('div', 'lecteur__poignee');
    barre.appendChild(rempli);
    barre.appendChild(poignee);
    var tTotal = el('span', 'lecteur__temps', '0:00');
    ligne.appendChild(tActuel);
    ligne.appendChild(barre);
    ligne.appendChild(tTotal);

    racine.appendChild(titre);
    racine.appendChild(compteur);
    racine.appendChild(commandes);
    racine.appendChild(ligne);
    opts.conteneur.appendChild(racine);

    var glisse = false;

    function majBarre(fraction) {
      var pct = Math.max(0, Math.min(1, fraction)) * 100;
      rempli.style.width = pct + '%';
      poignee.style.left = pct + '%';
      barre.setAttribute('aria-valuenow', String(Math.round(pct)));
    }

    function majEtat() {
      var lecture = !audio.paused;
      bLecture.innerHTML = lecture ? ICONE_PAUSE : ICONE_LECTURE;
      bLecture.setAttribute('aria-label', lecture ? 'Pause' : 'Écouter');
      racine.classList.toggle('lecteur--lecture', lecture);
    }

    function charger(i, jouer) {
      index = (i + pistes.length) % pistes.length;
      var p = pistes[index];
      audio.src = p.url || opts.base + p.fichier;   // url : musique importee
      titre.textContent = p.nom;
      compteur.textContent = 'Musique ' + (index + 1) + ' / ' + pistes.length;
      tActuel.textContent = '0:00';
      tTotal.textContent = '0:00';
      majBarre(0);
      if (jouer) lire();
      majEtat();
    }

    function lire() {
      var pr = audio.play();
      if (pr && pr.catch) pr.catch(majEtat);
    }

    function changer(delta) {
      var enLecture = !audio.paused;
      charger(index + delta, enLecture);
      if (opts.auChangement) opts.auChangement(pistes[index].fichier);
    }

    bLecture.addEventListener('click', function () {
      if (audio.paused) lire(); else audio.pause();
    });
    bPrec.addEventListener('click', function () { changer(-1); });
    bSuiv.addEventListener('click', function () { changer(1); });

    audio.addEventListener('play', majEtat);
    audio.addEventListener('pause', majEtat);
    audio.addEventListener('ended', function () { audio.currentTime = 0; majBarre(0); majEtat(); });
    audio.addEventListener('loadedmetadata', function () { tTotal.textContent = temps(audio.duration); });
    audio.addEventListener('timeupdate', function () {
      if (glisse || !audio.duration) return;
      tActuel.textContent = temps(audio.currentTime);
      majBarre(audio.currentTime / audio.duration);
    });

    /* Deplacement dans le morceau : clic ou glissement (souris et doigt). */
    function fractionDepuis(e) {
      var r = barre.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    }
    function apercuPosition(f) {
      majBarre(f);
      if (audio.duration) tActuel.textContent = temps(f * audio.duration);
    }
    barre.addEventListener('pointerdown', function (e) {
      glisse = true;
      racine.classList.add('lecteur--glisse');
      barre.setPointerCapture(e.pointerId);
      apercuPosition(fractionDepuis(e));
    });
    barre.addEventListener('pointermove', function (e) {
      if (glisse) apercuPosition(fractionDepuis(e));
    });
    function finGlisse(e) {
      if (!glisse) return;
      glisse = false;
      racine.classList.remove('lecteur--glisse');
      if (audio.duration) audio.currentTime = fractionDepuis(e) * audio.duration;
    }
    barre.addEventListener('pointerup', finGlisse);
    barre.addEventListener('pointercancel', function () {
      glisse = false;
      racine.classList.remove('lecteur--glisse');
    });
    barre.addEventListener('keydown', function (e) {
      if (!audio.duration) return;
      if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      else if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
      else return;
      e.preventDefault();
    });

    charger(index, false);

    return {
      /* Selectionne une piste depuis l'exterieur (ex. liste deroulante). */
      definir: function (fichier) {
        for (var j = 0; j < pistes.length; j++) {
          if (pistes[j].fichier === fichier && j !== index) charger(j, !audio.paused);
        }
      },
      arreter: function () { audio.pause(); },
      detruire: function () { audio.pause(); audio.removeAttribute('src'); if (racine.parentNode) racine.parentNode.removeChild(racine); },
    };
  }

  return { creer: creer };
})();
