/**
 * Prenoms francais -> hebreu : complement du dictionnaire de client.js
 * (PRENOMS_HEBREU) et translitteration phonetique de secours.
 *
 * - PRENOMS_HEBREU_PLUS : prenoms courants dans les familles juives de
 *   France (traditionnels sefarades, israeliens, francais). Quand un prenom
 *   a deux usages, les deux sont proposes : le prenom hebraique traditionnel
 *   d'abord, puis l'ecriture phonetique (ex. Albert -> אברהם, אלברט).
 * - translitererHebreu(nom) : ecriture phonetique d'un prenom inconnu
 *   (Kenzo -> קנזו), pour qu'il y ait toujours une proposition sensee.
 *
 * Script classique (pas de module), charge AVANT client.js.
 */
var PRENOMS_HEBREU_PLUS = {
  // ---------------- masculins ----------------
  ruben: ['ראובן'], rouben: ['ראובן'], reouven: ['ראובן'], reuven: ['ראובן'],
  abel: ['הבל'], adrien: ['אדריאן'], alain: ['אלן'], alan: ['אלן'], alexis: ['אלכסיס'],
  albert: ['אברהם', 'אלברט'], amos: ['עמוס'], amram: ['עמרם'], amit: ['עמית'],
  andy: ['אנדי'], anthony: ['אנתוני'], arie: ['אריה'], arieh: ['אריה'], arye: ['אריה'],
  arnaud: ['ארנו'], arthur: ['ארתור'], avi: ['אבי'], avichai: ['אבישי'], avishai: ['אבישי'],
  avner: ['אבנר'], axel: ['אקסל'], barak: ['ברק'], ben: ['בן'], benny: ['בני'], beni: ['בני'],
  bryan: ['בראיין'], brian: ['בראיין'], chlomo: ['שלמה'], dov: ['דב'], dylan: ['דילן'],
  efraim: ['אפרים'], ephraim: ['אפרים'], elad: ['אלעד'], eli: ['אלי'], eliaou: ['אליהו'],
  eliyahou: ['אליהו'], eliyahu: ['אליהו'], elior: ['אליאור'], eliott: ['אליוט'], elliot: ['אליוט'],
  eliot: ['אליוט'], elisha: ['אלישע'], eric: ['אריק'], evan: ['אוון'], franck: ['פרנק'],
  fabrice: ['פבריס'], gael: ['גאל'], gil: ['גיל'], gilad: ['גלעד'], gilles: ['ז\'יל'],
  gregory: ['גרגורי'], hai: ['חי'], hayim: ['חיים'], hillel: ['הלל'], ido: ['עידו'],
  igal: ['יגאל'], yigal: ['יגאל'], illan: ['אילן'], israel: ['ישראל'], itai: ['איתי'],
  itay: ['איתי'], jason: ['ג\'ייסון'], jeremy: ['ירמיהו', 'ג\'רמי'], jeremie: ['ירמיהו'],
  johan: ['יוחנן'], johann: ['יוחנן'], yohan: ['יוחנן'], yohann: ['יוחנן'], jordan: ['ירדן'],
  joshua: ['יהושע'], yehoshua: ['יהושע'], kevin: ['קווין'], kenny: ['קני'], liel: ['ליאל'],
  lior: ['ליאור'], lyor: ['ליאור'], ludovic: ['לודוביק'], makhlouf: ['מכלוף'], maklouf: ['מכלוף'],
  mathieu: ['מתתיהו'], matthieu: ['מתתיהו'], matthias: ['מתתיה'], max: ['מקס'],
  menahem: ['מנחם'], menachem: ['מנחם'], menache: ['מנשה'], messaoud: ['מסעוד'], mimoun: ['מימון'],
  mikhael: ['מיכאל'], mordechai: ['מרדכי'], nahman: ['נחמן'], nachman: ['נחמן'],
  nathanael: ['נתנאל'], nethanel: ['נתנאל'], neria: ['נריה'], neriah: ['נריה'], ofir: ['אופיר'],
  omer: ['עומר'], oren: ['אורן'], ouriel: ['אוריאל'], uriel: ['אוריאל'], rafael: ['רפאל'],
  rahamim: ['רחמים'], raoul: ['ראול'], roland: ['רולאן'], ron: ['רון'], roni: ['רוני'],
  ronny: ['רוני'], ryan: ['ראיין'], sam: ['שמואל', 'סם'], sammy: ['סמי'], samy: ['סמי'],
  sami: ['סמי'], sebastien: ['סבסטיאן'], serge: ['סרג\''], shai: ['שי'], chai: ['שי'],
  shmouel: ['שמואל'], sion: ['ציון'], tsion: ['ציון'], steve: ['סטיב'], steven: ['סטיבן'],
  sylvain: ['סילבן'], sydney: ['סידני'], tal: ['טל'], teddy: ['טדי'], thierry: ['טיירי'],
  thibault: ['טיבו'], william: ['ויליאם'], xavier: ['קסבייה'], yaacov: ['יעקב'], yacov: ['יעקב'],
  yair: ['יאיר'], yanis: ['יאניס'], yann: ['יאן'], yannick: ['יאניק'], yehuda: ['יהודה'],
  yeshaya: ['ישעיהו'], yonatan: ['יונתן'], yoni: ['יוני'], yossef: ['יוסף'], yosef: ['יוסף'],
  ziv: ['זיו'], zohar: ['זוהר'], mendel: ['מנדל'], mendy: ['מנדי'], moche: ['משה'],
  mouchi: ['משה'], aron: ['אהרן'], gabi: ['גבי'], gaby: ['גבי'], tom: ['תום'], noam: ['נועם'],
  michel: ['מיכאל', 'מישל'], maurice: ['משה', 'מוריס'], henri: ['צבי', 'אנרי'],
  robert: ['ראובן', 'רובר'], marcel: ['מרדכי', 'מרסל'], jacques: ['יעקב', 'ז\'אק'],
  leon: ['אריה', 'לאון'], victor: ['אביגדור', 'ויקטור'], felix: ['ברוך', 'פליקס'],
  emile: ['אמיל'], gaston: ['גסטון'], raymond: ['רפאל', 'ריימונד'], jean: ['יוחנן', 'ז\'אן'],
  nathan: ['נתן'], ethan: ['איתן'], eytan: ['איתן'], elie: ['אליהו', 'אלי'],
  // ---------------- feminins ----------------
  alexandra: ['אלכסנדרה'], alyssa: ['אליסה'], alicia: ['אליסיה'], amandine: ['אמנדין'],
  anais: ['אנאיס'], annabelle: ['אנבל'], ariane: ['אריאן'], audrey: ['אודרי'], avital: ['אביטל'],
  axelle: ['אקסל'], ayala: ['איילה'], batsheva: ['בת שבע'], betty: ['בטי'], bracha: ['ברכה'],
  carole: ['קרול'], cassandra: ['קסנדרה'], celia: ['סליה'], chana: ['חנה'], chaya: ['חיה'],
  haya: ['חיה'], cindy: ['סינדי'], cynthia: ['סינתיה'], dafna: ['דפנה'], daphne: ['דפנה'],
  dalia: ['דליה'], daniela: ['דניאלה'], debora: ['דבורה'], dvora: ['דבורה'], dinah: ['דינה'],
  eden: ['עדן'], efrat: ['אפרת'], elisa: ['אליסה'], elise: ['אליז'], eloise: ['אלואיז'],
  elsa: ['אלזה'], emilie: ['אמילי'], emmanuelle: ['עמנואלה'], eva: ['חוה'], eve: ['חוה'],
  hava: ['חוה'], gabrielle: ['גבריאלה'], galit: ['גלית'], hadar: ['הדר'], hadassa: ['הדסה'],
  hadassah: ['הדסה'], hanna: ['חנה'], hila: ['הילה'], ilana: ['אילנה'], inbal: ['ענבל'],
  iris: ['איריס'], jennifer: ['ג\'ניפר'], jessica: ['ג\'סיקה'], johanna: ['יוחנה'],
  joyce: ['ג\'ויס'], julia: ['יוליה'], karen: ['קרן'], keren: ['קרן'], kelly: ['קלי'],
  laly: ['לאלי'], laura: ['לורה'], lauren: ['לורן'], leah: ['לאה'], liat: ['ליאת'],
  lihi: ['ליהי'], lily: ['לילי'], lili: ['לילי'], lisa: ['ליסה'], lola: ['לולה'],
  malka: ['מלכה'], manon: ['מנון'], margot: ['מרגו'], maya: ['מאיה'], maia: ['מאיה'],
  mazal: ['מזל'], melanie: ['מלני'], meirav: ['מירב'], merav: ['מירב'], michaela: ['מיכאלה'],
  mikhal: ['מיכל'], mira: ['מירה'], miryam: ['מרים'], morgane: ['מורגן'], nadia: ['נדיה'],
  nava: ['נאוה'], nelly: ['נלי'], noa: ['נועה'], noah: ['נח', 'נועה'], oceane: ['אושן'],
  ophelie: ['אופלי'], orit: ['אורית'], orly: ['אורלי'], orli: ['אורלי'], ornella: ['אורנלה'],
  pauline: ['פולין'], penina: ['פנינה'], perle: ['פנינה'], perla: ['פנינה'], priscilla: ['פריסילה'],
  raphaelle: ['רפאלה'], revital: ['רויטל'], rina: ['רינה'], rose: ['שושנה', 'רוז'],
  roxane: ['רוקסן'], ruth: ['רות'], rut: ['רות'], sabrina: ['סברינה'], salome: ['שלומית'],
  sandra: ['סנדרה'], sapir: ['ספיר'], shani: ['שני'], shirel: ['שיראל'], shirley: ['שירלי'],
  sigal: ['סיגל'], sivan: ['סיון'], sophia: ['סופיה'], stella: ['סטלה'], tali: ['טלי'],
  tamara: ['תמרה'], tehila: ['תהילה'], tova: ['טובה'], valentine: ['ולנטין'], vanessa: ['ונסה'],
  vered: ['ורד'], victoria: ['ויקטוריה'], yaelle: ['יעל'], yafa: ['יפה'], yaffa: ['יפה'],
  yasmine: ['יסמין'], jasmine: ['יסמין'], yolande: ['יולנד'], zohra: ['זוהרה'], freha: ['פריחה'],
  fortunee: ['מזל'], hannah: ['חנה'], shirine: ['שירין'], lea: ['לאה'], leia: ['לאה'],
  marie: ['מרים', 'מרי'], simone: ['שמחה', 'סימון'], estelle: ['אסתר', 'אסטל'],
  suzanne: ['שושנה', 'סוזן'], colette: ['רחל', 'קולט'], jeanne: ['חנה', 'ז\'אן'],
};

/** Ecriture phonetique d'un prenom francais en lettres hebraiques
 *  (approximation : a proposer, jamais imposee). `nom` deja normalise
 *  (minuscules, sans accents). */
function translitererHebreu(nom) {
  var s = String(nom || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return '';
  var finE = /ee$/.test(s);                   // -ee (de -ée) : son « é » final
  s = s.replace(/(.)\1+/g, '$1');            // lettres doublees : une seule
  if (s.length > 3) s = s.replace(/[sx]$/, ''); // s / x muets en fin de mot
  var VOY = 'aeiouy';
  var out = '';
  var i = 0;
  function voy(c) { return !!c && VOY.indexOf(c) !== -1; }
  while (i < s.length) {
    var c = s[i], n = s[i + 1] || '', n2 = s[i + 2] || '';
    var debut = i === 0, fin = i === s.length - 1;
    // groupes de lettres
    if ((c === 'c' || c === 's') && n === 'h') { out += 'ש'; i += 2; continue; }
    if (c === 'k' && n === 'h') { out += 'ח'; i += 2; continue; }
    if (c === 'p' && n === 'h') { out += 'פ'; i += 2; continue; }
    if (c === 't' && n === 'h') { out += 'ת'; i += 2; continue; }
    if (c === 't' && (n === 'z' || n === 's')) { out += 'צ'; i += 2; continue; }
    if (c === 'q' && n === 'u') { out += 'ק'; i += 2; continue; }
    if (c === 'g' && n === 'n') { out += 'ני'; i += 2; continue; }
    if (c === 'o' && n === 'u') { out += debut ? 'או' : 'ו'; i += 2; continue; }
    if (c === 'o' && n === 'i') { out += debut ? 'ואו' : 'וא'; i += 2; continue; }
    if ((c === 'a' || c === 'e') && n === 'i') { out += debut ? 'אי' : 'י'; i += 2; continue; }
    if (c === 'a' && n === 'u') { out += debut ? 'או' : 'ו'; i += 2; continue; }
    if (c === 'e' && n === 'a' && n2 === 'u') { out += debut ? 'או' : 'ו'; i += 3; continue; }
    // voyelle juste apres un « i » voyelle (Kylian, Danyel) : ecrite avec א ;
    // pas apres un « y » initial consonne (Yaniv).
    var apresI = i > 0 && (s[i - 1] === 'i' || s[i - 1] === 'y') && !(i === 1 && s[0] === 'y');
    if ((c === 'a' || c === 'e') && (n === 'n' || n === 'm') && !voy(n2)) { out += (debut || apresI ? 'א' : '') + 'נ'; i += 2; continue; }
    // voyelles
    if (voy(c)) {
      if ((c === 'a' || c === 'e') && apresI && !fin) out += 'א';   // Kylian, Danyel
      else if (c === 'a') out += debut ? 'א' : fin ? 'ה' : '';
      else if (c === 'e') out += debut ? 'א' : (fin && finE) ? 'ה' : '';
      else if (c === 'y' && debut && voy(n)) out += 'י';   // Yaniv, Yoann : consonne
      else if (c === 'i' || c === 'y') out += debut ? 'אי' : 'י';
      else if (c === 'o' || c === 'u') out += debut ? 'או' : 'ו';
      i += 1; continue;
    }
    // consonnes
    var m = {
      b: 'ב', d: 'ד', f: 'פ', h: 'ה', j: 'ז\'', k: 'ק', l: 'ל', m: 'מ', n: 'נ', p: 'פ',
      q: 'ק', r: 'ר', s: 'ס', t: 'ט', v: 'ו', w: 'ו', x: 'קס', z: 'ז',
    };
    if (c === 'v') out += fin ? 'ב' : 'ו';   // Yaniv, Aviv / Kevin, Marvin
    else if (c === 'c') out += (n === 'e' || n === 'i' || n === 'y') ? 'ס' : 'ק';
    else if (c === 'g') out += (n === 'e' || n === 'i' || n === 'y') ? 'ז\'' : 'ג';
    else out += m[c] || '';
    i += 1;
  }
  // lettres finales
  out = out.replace(/כ$/, 'ך').replace(/מ$/, 'ם').replace(/נ$/, 'ן').replace(/פ$/, 'ף').replace(/צ$/, 'ץ');
  return out;
}
