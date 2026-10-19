/**
 * Phrases et versets hebraiques reutilisables dans l'app (texte courbe, etc.).
 * Charge en script classique AVANT app.js (variable globale simple,
 * pour rester compatible file:// -- pas de modules ES ici).
 *
 * Ajouter une phrase : lui donner une cle ci-dessous, puis la referencer
 * dans src/app.js via VERSETS.maCle.
 */
var VERSETS = {
  aniLedodi: 'אני לדודי ודודי לי',                               // Je suis a mon bien-aime et mon bien-aime est a moi
  dodiLiVeani: 'דודי לי ואני לו',                                 // Mon bien-aime est a moi et je suis a lui
  matsatiEt: 'מצאתי את שאהבה נפשי',                               // J'ai trouve celui que mon ame aime
  simeniKahotam: 'שימני כחותם על לבך כחותם על זרועך',             // Mets-moi comme un sceau sur ton coeur, comme un sceau sur ton bras
  kiAzaKamavet: 'כי עזה כמוות אהבה',                              // Car l'amour est fort comme la mort
  mayimRabim: 'מים רבים לא יוכלו לכבות את האהבה',                 // Les grandes eaux ne peuvent eteindre l'amour
  hinakhYafaRayati: 'הנך יפה רעיתי',                              // Que tu es belle, mon amie
  kumiLakhRayati: 'קומי לך רעיתי יפתי ולכי לך',                   // Leve-toi, mon amie, ma belle, et viens
  kolSasson: 'קול ששון וקול שמחה קול חתן וקול כלה',               // Voix de joie et voix d'allegresse, voix du fiance et voix de la fiancee
  vearastikh: 'וארשתיך לי לעולם',                                 // Je te fiancerai a moi pour toujours
  oumssossHatan: 'ומשוש חתן על כלה ישיש עליך אלהיך',              // Comme la joie du fiance pour sa fiancee, ton Dieu se rejouira de toi
};
