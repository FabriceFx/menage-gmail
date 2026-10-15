/**
 * Ménage Gmail — banc d'essai.
 *
 *     node banc/test.js
 *
 * Les `.gs` sont chargés dans un contexte Node où les services Google sont
 * simulés, puis rejoués sur des données de la forme exacte que rendent les API
 * — des objets `Date` là où l'on a écrit des chaînes, une recherche qui
 * plafonne, un service qui lève sur un identifiant inconnu.
 *
 * **Chaque défaut corrigé a ici le cas qui l'aurait attrapé.** Les tests en
 * portent la mention : ils ne sont pas là pour couvrir des lignes, mais pour
 * qu'une régression précise redevienne visible. Le README explique comment
 * réintroduire chacun de ces défauts pour vérifier que le banc échoue.
 *
 * Deux pièges du procédé, payés une fois :
 *
 *   - les `const` de portée globale ne deviennent pas des propriétés de
 *     l'objet global : on les récupère par `vm.runInContext('nom', sandbox)` ;
 *   - le faux service doit refuser ce que le vrai refuse, sinon le banc valide
 *     du code faux. C'est le rôle de `banc/faux-google.js`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { construireSandbox } = require('./faux-google');

const RACINE = path.join(__dirname, '..');
const SOURCES = path.join(RACINE, 'apps-script');

/* --------------------------------------------------------------------------
 * Chargement
 * ----------------------------------------------------------------------- */

const fichiersSource = () => fs.readdirSync(SOURCES)
  .filter((nom) => nom.endsWith('.gs'))
  .sort();

/**
 * Charge le projet dans un contexte neuf.
 *
 * L'ordre alphabétique reproduit celui de l'éditeur Apps Script : si le projet
 * ne se charge que dans un autre ordre, c'est un défaut à corriger, pas une
 * commodité de banc.
 */
const chargerProjet = (options = {}) => {
  const contexte = construireSandbox(options);
  vm.createContext(contexte.sandbox);

  fichiersSource().forEach((nom) => {
    const code = fs.readFileSync(path.join(SOURCES, nom), 'utf8');
    try {
      vm.runInContext(code, contexte.sandbox, { filename: nom });
    } catch (erreur) {
      throw new Error(`Chargement de ${nom} : ${erreur.message}`);
    }
  });

  contexte.lire = (expression) => vm.runInContext(expression, contexte.sandbox);
  return contexte;
};

/* --------------------------------------------------------------------------
 * Assertions
 * ----------------------------------------------------------------------- */

const resultats = { passes: 0, echecs: [] };

const verifier = (intitule, operation) => {
  try {
    operation();
    resultats.passes += 1;
  } catch (erreur) {
    resultats.echecs.push({ intitule, message: erreur.message });
  }
};

const egal = (obtenu, attendu, precision = '') => {
  const a = JSON.stringify(obtenu);
  const b = JSON.stringify(attendu);
  if (a !== b) throw new Error(`attendu ${b}, obtenu ${a}${precision ? ` — ${precision}` : ''}`);
};

const vrai = (valeur, precision) => {
  if (valeur !== true) throw new Error(`attendu vrai, obtenu ${JSON.stringify(valeur)} — ${precision}`);
};

const faux = (valeur, precision) => {
  if (valeur !== false) throw new Error(`attendu faux, obtenu ${JSON.stringify(valeur)} — ${precision}`);
};

/* --------------------------------------------------------------------------
 * Fixtures
 * ----------------------------------------------------------------------- */

const LE_JOUR = new Date('2026-09-20T10:00:00Z');
const ilYA = (jours) => new Date(LE_JOUR.getTime() - jours * 24 * 3600 * 1000);

/** Installe le classeur et rend le contexte prêt à décider. */
const contexteInstalle = (options = {}) => {
  const contexte = chargerProjet(options);
  contexte.lire('menageInstaller_()');
  return contexte;
};

/** Construit l'objet « vu » que la décision attend, sans passer par Gmail. */
const vu = (contexte, champs) => {
  const base = {
    identifiant: 'm1',
    expediteur: 'Quelqu’un <quelquun@essai.test>',
    objet: 'Bonjour',
    corps: '',
    libelles: [],
    contact: false,
    authentification: { verdict: 'inconnu', brut: '' },
    dateMessage: ilYA(1),
    ...champs,
  };

  const adresse = contexte.lire('menageExtraireAdresse_')(base.expediteur);
  return {
    ...base,
    adresse,
    domaine: contexte.lire('menageDomaine_')(adresse),
    nomAffiche: contexte.lire('menageNomAffiche_')(base.expediteur),
    texteAnalyse: `${base.expediteur}\n${base.objet}\n${base.corps}`,
    age: contexte.lire('menageAge_')(base.dateMessage, LE_JOUR),
  };
};

/* ==========================================================================
 * 1. Correspondance de texte
 *    Défaut corrigé : les marques étaient cherchées en sous-chaîne, si bien
 *    que « actually » contenait « ally ». Un message légitime portant ce mot
 *    très courant était déclaré en conflit d'identité — motif qui, à lui seul,
 *    entraînait la suppression définitive immédiate.
 * ======================================================================= */

verifier('« actually » ne contient pas la marque « ally »', () => {
  const contexte = chargerProjet();
  faux(contexte.lire('menageContientMot_')('I actually agree with you', 'ally'),
    'la sous-chaîne ne doit jamais valoir une occurrence');
});

verifier('« Ally Bank » contient bien la marque « ally »', () => {
  const contexte = chargerProjet();
  vrai(contexte.lire('menageContientMot_')('Your Ally Bank statement', 'ally'),
    'le mot entier doit être reconnu');
});

verifier('les bornes de mot tiennent compte des accents', () => {
  const contexte = chargerProjet();
  faux(contexte.lire('menageContientMot_')('félicitations', 'licitation'),
    '\\b placerait une frontière entre é et e');
  vrai(contexte.lire('menageContientMot_')('Félicitations, vous avez gagné', 'félicitations'),
    'un terme accentué doit se retrouver');
});

verifier('une expression vide ne correspond à rien', () => {
  const contexte = chargerProjet();
  faux(contexte.lire('menageContientMot_')('n’importe quoi', ''),
    'une cellule vide du référentiel correspondrait à tous les messages');
  faux(contexte.lire('menageContientMot_')('n’importe quoi', '   '), 'idem pour des espaces');
});

verifier('l’adresse est lue dans les chevrons, pas dans le nom affiché', () => {
  const contexte = chargerProjet();
  egal(
    contexte.lire('menageExtraireAdresse_')('"Service <fraude@essai.test>" <reel@autre.test>'),
    'reel@autre.test',
    'juger sur la partie que l’usurpateur contrôle serait une faute');
});

verifier('un sous-domaine est couvert, un domaine qui l’imite ne l’est pas', () => {
  const contexte = chargerProjet();
  const couvert = contexte.lire('menageDomaineCouvert_');
  vrai(couvert('mail.ebay.com', 'ebay.com'), 'un vrai sous-domaine');
  vrai(couvert('ebay.com', 'ebay.com'), 'le domaine lui-même');
  faux(couvert('ebay.com.essai.test', 'ebay.com'), 'suffixe trompeur');
  faux(couvert('notebay.com', 'ebay.com'), 'suffixe sans point');
});

/* ==========================================================================
 * 2. Âge des messages
 *    Défaut corrigé : le plancher de plausibilité était fixé à 2020, si bien
 *    qu'un courriel authentiquement ancien avait un âge « inconnu » — et
 *    comme un âge inconnu n'autorise jamais la suppression, il ne quittait
 *    plus jamais la corbeille.
 * ======================================================================= */

verifier('un message de 2015 a un âge connu', () => {
  const contexte = chargerProjet();
  const age = contexte.lire('menageAge_')(new Date('2015-06-01T00:00:00Z'), LE_JOUR);
  vrai(age.connu, 'un vieux courriel n’est pas un horodatage aberrant');
});

verifier('un horodatage aberrant reste inconnu', () => {
  const contexte = chargerProjet();
  egal(contexte.lire('menageAge_')(new Date(0), LE_JOUR).connu, false, 'époque Unix');
  egal(contexte.lire('menageAge_')(new Date('pas une date'), LE_JOUR).connu, false, 'date illisible');
  egal(contexte.lire('menageAge_')(ilYA(-30), LE_JOUR).connu, false, 'trente jours dans le futur');
});

verifier('un âge inconnu n’autorise jamais la suppression', () => {
  const contexte = chargerProjet();
  const depasse = contexte.lire('menageAgeDepasse_');
  const inconnu = contexte.lire('menageAge_')(new Date('pas une date'), LE_JOUR);
  faux(depasse(inconnu, 7), 'une date illisible n’est pas une date ancienne');
  faux(depasse(inconnu, 0), 'même avec un seuil nul');
});

verifier('la frontière des sept jours se franchit strictement', () => {
  const contexte = chargerProjet();
  const depasse = contexte.lire('menageAgeDepasse_');
  const age = (j) => contexte.lire('menageAge_')(ilYA(j), LE_JOUR);
  faux(depasse(age(7), 7), 'sept jours pile : pas encore expiré');
  vrai(depasse(age(7.01), 7), 'sept jours et des poussières : expiré');
});

verifier('un âge non mesuré rend une cellule vide, jamais zéro', () => {
  const contexte = chargerProjet();
  const cellule = contexte.lire('menageAgePourCellule_');
  egal(cellule(contexte.lire('menageAge_')(new Date('x'), LE_JOUR)), '',
    'zéro classerait ces lignes en tête d’un tri par ancienneté');
  egal(cellule(contexte.lire('menageAge_')(ilYA(3), LE_JOUR)), 3);
});

/* ==========================================================================
 * 3. Détecteur
 *    Défaut corrigé : deux « signaux d'appui » suffisaient à supprimer
 *    définitivement, et ces signaux étaient triviaux à réunir — toute adresse
 *    en gmail.com valait « identité suspecte », le mot « congratulations »
 *    valait « appât ».
 * ======================================================================= */

verifier('un message d’un ami sur Gmail disant « congratulations » n’est pas un déchet', () => {
  const contexte = contexteInstalle();
  const verdict = contexte.lire('menageJuger_')(vu(contexte, {
    expediteur: 'Marie Dupont <marie.dupont@gmail.com>',
    objet: 'Congratulations on the new job!',
    corps: 'Bravo, on fête ça quand ?',
  }));
  faux(verdict.dechet,
    `un message d’anniversaire ne se supprime pas (score ${verdict.score}) : `
    + `${verdict.motifs.join(' ; ')}`);
});

verifier('une marque citée dans le corps ne suffit plus à créer un conflit', () => {
  const contexte = contexteInstalle();
  const verdict = contexte.lire('menageJuger_')(vu(contexte, {
    expediteur: 'Google <no-reply@google.com>',
    objet: 'Alerte de sécurité',
    corps: 'We actually noticed a new sign-in.',
  }));
  faux(verdict.dechet,
    'le conflit d’identité se cherche entre le nom affiché et l’objet, pas dans le corps');
});

verifier('une usurpation de marque caractérisée est détectée', () => {
  const contexte = contexteInstalle();
  const verdict = contexte.lire('menageJuger_')(vu(contexte, {
    expediteur: 'Norton Support <billing@xzkrvgthq.test>',
    objet: 'Your Norton subscription renewal — payment failed',
    corps: 'Update your payment details to avoid interruption.',
  }));
  vrai(verdict.dechet, `attendu déchet, score ${verdict.score} : ${verdict.motifs.join(' ; ')}`);
});

verifier('aucun signal ne suffit seul à franchir le seuil', () => {
  const contexte = contexteInstalle();
  const poids = contexte.lire('MENAGE_POIDS_');
  const seuil = contexte.lire('MENAGE_SEUIL_DECHET_');
  const plusFort = Math.max(...Object.values(poids));
  vrai(seuil > plusFort,
    `le seuil (${seuil}) doit dépasser le poids le plus fort (${plusFort})`);
});

verifier('un contact est à l’abri du détecteur', () => {
  const contexte = contexteInstalle();
  const verdict = contexte.lire('menageJuger_')(vu(contexte, {
    expediteur: 'Norton Support <billing@xzkrvgthq.test>',
    objet: 'Your Norton subscription renewal — payment failed',
    corps: 'Update your payment details.',
    contact: true,
  }));
  faux(verdict.dechet, 'la protection par les contacts doit primer sur le score');
  egal(verdict.protege, 'expéditeur dans les contacts');
});

verifier('un expéditeur protégé est à l’abri du détecteur', () => {
  const contexte = contexteInstalle();
  const feuille = contexte.classeur.getSheetByName('Protégés');
  feuille.appendRow(['xzkrvgthq.test', 'Essai']);
  contexte.lire('menageOublierReferentiel_()');

  const verdict = contexte.lire('menageJuger_')(vu(contexte, {
    expediteur: 'Norton Support <billing@xzkrvgthq.test>',
    objet: 'Your Norton subscription renewal — payment failed',
    corps: 'Update your payment details.',
  }));
  faux(verdict.dechet, 'un domaine protégé ne se juge pas');
});

verifier('DMARC en réussite neutralise les signaux d’usurpation', () => {
  const contexte = contexteInstalle();
  const champs = {
    expediteur: 'Norton Support <billing@xzkrvgthq.test>',
    objet: 'Your Norton subscription — payment failed',
    corps: 'Update your payment details.',
  };
  const signe = contexte.lire('menageJuger_')(vu(contexte, {
    ...champs, authentification: { verdict: 'pass', brut: 'dmarc=pass' },
  }));
  const nonSigne = contexte.lire('menageJuger_')(vu(contexte, {
    ...champs, authentification: { verdict: 'inconnu', brut: '' },
  }));

  vrai(nonSigne.dechet, 'sans authentification, l’usurpation doit être vue');
  vrai(signe.score < nonSigne.score,
    'une identité prouvée neutralise l’usurpation, sans pour autant innocenter');
  vrai(signe.score > 0,
    'les appâts continuent de compter : un escroc peut signer son propre domaine');
});

verifier('DMARC ne prononce un échec que sur un dmarc=fail explicite', () => {
  const contexte = contexteInstalle();
  const lire = (entetes) => contexte.lire('menageAuthentification_')({
    getHeader: (nom) => entetes[nom] || '',
  });
  egal(lire({ 'Authentication-Results': 'spf=fail dkim=fail' }).verdict, 'inconnu',
    'un transfert de courrier casse légitimement SPF');
  egal(lire({ 'Authentication-Results': 'dmarc=fail' }).verdict, 'fail');
  egal(lire({ 'Authentication-Results': 'spf=pass dkim=pass' }).verdict, 'pass');
  egal(lire({}).verdict, 'inconnu', 'un en-tête absent n’est pas un échec');
});

verifier('un domaine ordinaire n’est pas jugé illisible', () => {
  const contexte = contexteInstalle();
  const illisible = contexte.lire('menageDomaineIllisible_');
  faux(illisible('web3.essai.fr'), 'lettres et chiffres mêlés ne valent pas hasard');
  faux(illisible('123-reg.co.uk'), 'un registraire connu');
  faux(illisible('laposte.net'), 'un domaine parfaitement prononçable');
  vrai(illisible('xzkrvgthqbz.test'), 'là, oui');
});

/* ==========================================================================
 * 4. Décisions
 * ======================================================================= */

verifier('un message libellé reste en corbeille avant expiration', () => {
  const contexte = contexteInstalle();
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const decision = contexte.lire('menageDeciderCorbeille_')(
    vu(contexte, { libelles: ['Factures'], dateMessage: ilYA(3) }));
  egal(decision.action, actions.laisser);
});

verifier('un message libellé est supprimé après expiration', () => {
  const contexte = contexteInstalle();
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const decision = contexte.lire('menageDeciderCorbeille_')(
    vu(contexte, { libelles: ['Factures'], dateMessage: ilYA(10) }));
  egal(decision.action, actions.supprimer);
  egal(decision.decideur, 'Réglage');
});

verifier('un libellé nommé « Important » compte comme libellé utilisateur', () => {
  const contexte = contexteInstalle();
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const decision = contexte.lire('menageDeciderCorbeille_')(
    vu(contexte, { libelles: ['Important'], dateMessage: ilYA(3) }));
  egal(decision.action, actions.laisser,
    'getLabels() ne rend que les libellés utilisateur : filtrer sur les noms système '
    + 'écartait à tort un libellé légitimement nommé ainsi');
});

verifier('un message ni libellé ni protégé part en quarantaine', () => {
  const contexte = contexteInstalle();
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const decision = contexte.lire('menageDeciderCorbeille_')(vu(contexte, { dateMessage: ilYA(400) }));
  egal(decision.action, actions.quarantaine, 'même très ancien, il passe par la quarantaine');
});

verifier('le détecteur ne propose aucune suppression tant que le réglage vaut Non', () => {
  const contexte = contexteInstalle();
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const decision = contexte.lire('menageDeciderCorbeille_')(vu(contexte, {
    expediteur: 'Norton Support <billing@xzkrvgthq.test>',
    objet: 'Your Norton subscription renewal — payment failed',
    corps: 'Update your payment details.',
  }));
  egal(decision.action, actions.quarantaine,
    'le défaut d’installation ne doit jamais supprimer sur heuristique');
});

verifier('réglage à Oui, le détecteur propose — et la ligne n’est pas pré-cochée', () => {
  const contexte = contexteInstalle();
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const feuille = contexte.classeur.getSheetByName('Réglages');
  const cles = contexte.lire('MENAGE_CLES_REGLAGES_');

  const table = feuille.getRange(1, 1, feuille.getLastRow(), 2).getValues();
  const rang = table.findIndex(([cle]) => cle === cles.suppressionHeuristique);
  feuille.getRange(rang + 1, 2, 1, 1).setValues([['Oui']]);
  contexte.lire('menageOublierReferentiel_()');

  const decision = contexte.lire('menageDeciderCorbeille_')(vu(contexte, {
    expediteur: 'Norton Support <billing@xzkrvgthq.test>',
    objet: 'Your Norton subscription renewal — payment failed',
    corps: 'Update your payment details.',
  }));
  egal(decision.action, actions.supprimer);
  egal(decision.decideur, 'Détecteur', 'une décision du détecteur ne se pré-coche jamais');
});

verifier('le banc vit à la date qu’on lui donne', () => {
  // Défaut du banc lui-même : `maintenant` était accepté sans être lu, et
  // tout cas daté s'exécutait en réalité à la date du jour. Un banc dont
  // l'horloge ment valide du code faux, ou condamne du code juste.
  const contexte = contexteInstalle({ maintenant: LE_JOUR });
  egal(contexte.lire('SocleDates.maintenantJour()'), '2026-09-20');
  vrai(contexte.lire('new Date()') instanceof Date,
    'la date du projet reste une Date pour le code');
});

/* ==========================================================================
 * 5. Quarantaine
 *    Défaut corrigé : la quarantaine était fictive. Le délai se comptait
 *    depuis la date du message, et le Spam était traité dans la même
 *    exécution que la Corbeille — de sorte qu'un courriel ancien déplacé à
 *    9 h 03 était supprimé définitivement à 9 h 04.
 * ======================================================================= */

verifier('un message mis en quarantaine aujourd’hui n’est pas supprimable aussitôt', () => {
  // L'inscription et la décision doivent vivre le même jour. Sans horloge
  // commune, l'inscription prenait la date réelle et paraissait, vue du
  // 20 septembre, datée du futur : le cas échouait trois semaines après
  // avoir été écrit.
  const contexte = contexteInstalle({ maintenant: LE_JOUR });
  const actions = contexte.lire('MENAGE_ACTIONS_');

  contexte.lire('menageInscrireEnQuarantaine_')({
    identifiant: 'm-quarantaine',
    expediteur: 'Inconnu <inconnu@essai.test>',
    objet: 'Objet',
    ageEntree: 90,
  });

  const decision = contexte.lire('menageDeciderSpam_')(
    vu(contexte, { identifiant: 'm-quarantaine', dateMessage: ilYA(90) }), LE_JOUR);

  egal(decision.action, actions.laisser,
    'un message vieux de 90 jours déplacé aujourd’hui doit garder ses 7 jours de sursis');
});

verifier('la quarantaine expire au terme réglé', () => {
  const contexte = contexteInstalle({ maintenant: LE_JOUR });
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const feuille = contexte.classeur.getSheetByName('Quarantaine');

  // Entrée écrite huit jours plus tôt, sous la forme exacte que rend Sheets :
  // un objet `Date`, et non la chaîne qu'on croit avoir écrite.
  feuille.appendRow(['m-vieux', '2026-09-12', 'Inconnu <inconnu@essai.test>', 'Objet', 90]);

  const decision = contexte.lire('menageDeciderSpam_')(
    vu(contexte, { identifiant: 'm-vieux', dateMessage: ilYA(90) }), LE_JOUR);

  egal(decision.action, actions.supprimer, 'huit jours de quarantaine, seuil à sept');
});

verifier('une date de quarantaine illisible ne fait pas sauter le sursis', () => {
  // Défaut corrigé : la ligne à date illisible était écartée du registre, et
  // le message jugé sur sa date de réception — 90 jours, donc suppression
  // définitive le jour même de sa mise en quarantaine.
  const contexte = contexteInstalle({ maintenant: LE_JOUR });
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const feuille = contexte.classeur.getSheetByName('Quarantaine');
  feuille.appendRow(['m-illisible', 'à vérifier', 'Inconnu <inconnu@essai.test>', 'Objet', 90]);

  const decision = contexte.lire('menageDeciderSpam_')(
    vu(contexte, { identifiant: 'm-illisible', dateMessage: ilYA(90) }), LE_JOUR);

  egal(decision.action, actions.laisser, 'une quarantaine de date inconnue ne s’abrège pas');
  vrai(/à vérifier/.test(decision.motif), `le motif dit quoi faire : « ${decision.motif} »`);

  contexte.lire('menagePurgerQuarantaine_')([], LE_JOUR);
  vrai(contexte.lire('menageRegistreQuarantaine_()').has('m-illisible'),
    'et la purge garde la ligne, sans quoi le sursis tomberait au passage suivant');
});

verifier('la date de quarantaine survit au passage par Sheets', () => {
  const contexte = contexteInstalle();
  const feuille = contexte.classeur.getSheetByName('Quarantaine');
  feuille.appendRow(['m-date', '2026-09-12', 'x', 'y', 1]);

  const cellule = feuille.getRange(feuille.getLastRow(), 2, 1, 1).getValues()[0][0];
  vrai(cellule instanceof Date, 'Sheets rend un objet Date, pas la chaîne écrite');

  const registre = contexte.lire('menageRegistreQuarantaine_()');
  egal(registre.get('m-date'), '2026-09-12',
    'la normalisation doit avoir lieu à la lecture');
});

verifier('un spam sans ligne de registre est jugé sur sa propre date', () => {
  const contexte = contexteInstalle();
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const decision = contexte.lire('menageDeciderSpam_')(
    vu(contexte, { identifiant: 'm-spam-naturel', dateMessage: ilYA(30) }), LE_JOUR);
  egal(decision.action, actions.supprimer,
    'le registre ne sert qu’à retarder une suppression, jamais à l’avancer');
});

/* ==========================================================================
 * 6. Pagination
 *    Défaut corrigé : `GmailApp.search(requête)` sans bornes plafonne à 500
 *    fils en silence. Une corbeille plus grande était traitée partiellement,
 *    sans qu'aucun compteur ne le laisse voir.
 * ======================================================================= */

verifier('la recherche dépasse le plafond des 500 fils', () => {
  const contexte = contexteInstalle();
  const { PLAFOND_RECHERCHE_SANS_BORNES } = require('./faux-google');
  const total = PLAFOND_RECHERCHE_SANS_BORNES + 120;

  for (let i = 0; i < total; i += 1) {
    contexte.gmail.ajouterFil([{
      id: `m${i}`, dossier: 'trash', expediteur: 'a@essai.test', objet: 'x', date: ilYA(2),
    }]);
  }

  const budget = { permet: () => true };
  let vus = 0;
  const parcours = contexte.lire('menageParcourir_')('in:trash', budget, 10000, () => {
    vus += 1;
    return true;
  });

  egal(parcours.examines, total, 'le plafond de 500 doit être franchi par pagination');
  egal(vus, total);
});

verifier('le plafond d’examen arrête le parcours et le dit', () => {
  const contexte = contexteInstalle();
  for (let i = 0; i < 50; i += 1) {
    contexte.gmail.ajouterFil([{
      id: `p${i}`, dossier: 'trash', expediteur: 'a@essai.test', objet: 'x', date: ilYA(2),
    }]);
  }

  const parcours = contexte.lire('menageParcourir_')(
    'in:trash', { permet: () => true }, 20, () => true);

  egal(parcours.examines, 20);
  egal(parcours.arret, 'plafond', 'un arrêt anticipé doit se dire, jamais se taire');
});

verifier('un budget épuisé arrête le parcours avant la page suivante', () => {
  const contexte = contexteInstalle();
  for (let i = 0; i < 300; i += 1) {
    contexte.gmail.ajouterFil([{
      id: `b${i}`, dossier: 'trash', expediteur: 'a@essai.test', objet: 'x', date: ilYA(2),
    }]);
  }

  let restant = 2;
  const budget = { permet: () => { restant -= 1; return restant > 0; } };
  const parcours = contexte.lire('menageParcourir_')('in:trash', budget, 10000, () => true);

  egal(parcours.arret, 'budget');
  vrai(parcours.examines < 300, 'le parcours doit s’arrêter avant la fin');
});

verifier('les libellés sont lus une fois par fil, pas une fois par message', () => {
  const contexte = contexteInstalle();
  let appels = 0;
  const messages = [1, 2, 3, 4, 5].map((n) => ({
    id: `f${n}`, dossier: 'trash', expediteur: 'a@essai.test', objet: 'x', date: ilYA(2),
  }));
  contexte.gmail.ajouterFil(messages, ['Factures']);

  // L'espion se pose sur le prototype : `filsDe()` reconstruit un objet à
  // chaque recherche, exactement comme Gmail rend de nouveaux GmailThread.
  const prototype = Object.getPrototypeOf(contexte.gmail.fils[0]);
  const original = prototype.getLabels;
  prototype.getLabels = function espion() { appels += 1; return original.call(this); };

  try {
    contexte.lire('menageParcourir_')('in:trash', { permet: () => true }, 100, () => true);
  } finally {
    prototype.getLabels = original;
  }
  egal(appels, 1, 'cinq messages dans un fil ne font qu’une lecture de libellés');
});

/* ==========================================================================
 * 7. Application
 * ======================================================================= */

verifier('appliquer une ligne « supprimer » supprime, et une seule fois', () => {
  const contexte = contexteInstalle();
  contexte.gmail.ajouterFil([{
    id: 'a1', dossier: 'trash', expediteur: 'a@essai.test', objet: 'x', date: ilYA(30),
  }]);

  const actions = contexte.lire('MENAGE_ACTIONS_');
  const detail = contexte.lire('menageAppliquerUnite_')({
    Identifiant: 'a1', Action: actions.supprimer,
  });

  egal(detail, 'Supprimé');
  egal(contexte.gmail.supprimes, ['a1']);
});

verifier('un message déjà disparu n’est pas compté comme échec', () => {
  const contexte = contexteInstalle();
  const actions = contexte.lire('MENAGE_ACTIONS_');
  const detail = contexte.lire('menageAppliquerUnite_')({
    Identifiant: 'jamais-existe', Action: actions.supprimer,
  });
  egal(detail, 'Déjà absent',
    'un rapport qui compte des échecs imaginaires ne sera plus lu');
});

verifier('appliquer une quarantaine déplace puis inscrit au registre', () => {
  const contexte = contexteInstalle();
  contexte.gmail.ajouterFil([{
    id: 'q1', dossier: 'trash', expediteur: 'a@essai.test', objet: 'x', date: ilYA(30),
  }]);

  const actions = contexte.lire('MENAGE_ACTIONS_');
  contexte.lire('menageAppliquerUnite_')({
    Identifiant: 'q1', Action: actions.quarantaine, Expéditeur: 'a@essai.test',
    Objet: 'x', 'Âge (jours)': 30,
  });

  egal(contexte.gmail.deplaces, ['q1']);
  vrai(contexte.lire('menageRegistreQuarantaine_()').has('q1'),
    'sans inscription, la quarantaine ne durerait qu’une nuit');
});

verifier('une action inconnue est refusée, pas interprétée', () => {
  const contexte = contexteInstalle();
  let leve = null;
  try {
    contexte.lire('menageAppliquerUnite_')({ Identifiant: 'x', Action: 'Faire autre chose' });
  } catch (erreur) { leve = erreur; }
  vrai(leve !== null, 'une ligne modifiée à la main doit être refusée');
  vrai(String(leve.message).includes('Faire autre chose'), 'l’erreur doit nommer la valeur reçue');
});

verifier('une ligne sans identifiant est refusée avec son remède', () => {
  const contexte = contexteInstalle();
  let leve = null;
  try {
    contexte.lire('menageAppliquerUnite_')({ Identifiant: '', Action: 'Supprimer définitivement' });
  } catch (erreur) { leve = erreur; }
  vrai(leve !== null, 'une ligne sans identifiant ne peut rien appliquer');
});

/* ==========================================================================
 * 8. Contacts
 *    Défaut corrigé : la portée contacts.readonly était demandée pour
 *    produire une colonne de journal dont aucune décision ne tenait compte.
 * ======================================================================= */

verifier('les contacts chargés protègent effectivement', () => {
  const contexte = contexteInstalle({ contacts: ['ami@essai.test'] });
  const charges = contexte.lire('menageContacts_()');
  vrai(charges.complet, 'chargement sans incident');
  vrai(charges.adresses.has('ami@essai.test'), 'la liste doit être exploitable');
});

// Ce cas fait écrire au code son avertissement « Contacts chargés
// partiellement » sur la sortie du banc. C'est voulu : cet avertissement est
// précisément ce qu'on vérifie, et le voir passer prouve qu'il partirait bien
// vers le journal d'exécution en production.
verifier('un chargement partiel des contacts se dit', () => {
  const contexte = contexteInstalle({ contactsEnEchec: true });
  const charges = contexte.lire('menageContacts_()');
  faux(charges.complet,
    'une liste vide et une liste inconnue ne se traitent pas pareil');
  egal(charges.adresses.size, 0);
});

/* ==========================================================================
 * 9. Cohérence du projet
 * ======================================================================= */

verifier('la version affichée vaut le fichier VERSION', () => {
  const contexte = chargerProjet();
  const fichier = fs.readFileSync(path.join(RACINE, 'VERSION'), 'utf8').trim();
  egal(contexte.lire('MENAGE_VERSION_'), fichier,
    'une version affichée et fausse est pire que pas de version');
});

verifier('la fonction de reprise existe et porte le nom déclaré', () => {
  const contexte = chargerProjet();
  const nom = contexte.lire('MENAGE_FONCTION_REPRISE_');
  const source = fichiersSource()
    .map((fichier) => fs.readFileSync(path.join(SOURCES, fichier), 'utf8')).join('\n');

  vrai(new RegExp(`^function ${nom}\\(`, 'm').test(source),
    `un déclencheur est résolu par son nom global : « ${nom} » doit être une function déclarée`);
});

/**
 * Les cibles de menu, lues sur l'appel `addItem` quelle que soit la forme du
 * libellé — littéral ou appel de traduction. La version précédente du banc
 * n'acceptait qu'un littéral, et le passage au bilinguisme l'a rendue aveugle :
 * elle ne trouvait plus aucune cible et déclarait toutes les fonctions
 * intruses. Un contrôle qui cesse de voir doit échouer, pas se taire — d'où le
 * cas suivant, qui vérifie qu'il en trouve.
 */
const ciblesDeMenu = (source) => [...source.matchAll(/addItem\([^,]+,\s*'([^']+)'\)/g)]
  .map((trouve) => trouve[1]);

/** Les noms passés aux modales, donc appelés par `google.script.run`. */
const ciblesDeModale = (source) => [...source.matchAll(
  /MenageUi\.afficher(?:Travail|Confirmation)\([\s\S]*?'([a-zA-Z]+)'\s*\)/g)]
  .map((trouve) => trouve[1]);

verifier('les cibles de menu et de déclencheur sont des function déclarées', () => {
  const source = fichiersSource()
    .map((fichier) => fs.readFileSync(path.join(SOURCES, fichier), 'utf8')).join('\n');

  const cibles = ciblesDeMenu(source);
  vrai(cibles.length > 5, `le menu doit exposer ses points d’entrée (trouvé ${cibles.length})`);

  [...cibles, 'onOpen', 'executerLeMenageQuotidien'].forEach((nom) => {
    if (!new RegExp(`^function ${nom}\\(`, 'm').test(source)) {
      throw new Error(`« ${nom} » est cité au menu mais n’est pas une function déclarée`);
    }
  });
});

/*
 * Le cas qui manquait, et qui a coûté une version.
 *
 * `google.script.run` ne peut pas appeler une fonction dont le nom se termine
 * par un trait de soulignement : elle est privée, et son nom n'est jamais
 * envoyé au client. L'appel devient `undefined()`, ce qui lève côté navigateur
 * — hors de portée de `withFailureHandler`, qui n'écoute que le serveur. La
 * modale reste figée sur son rouet, boutons déjà masqués.
 *
 * Rien dans le projet ne signalait cela : le code se chargeait, la syntaxe
 * était juste, et le banc était vert.
 */
verifier('la cible de google.script.run est publique et déclarée', () => {
  const source = fichiersSource()
    .map((fichier) => fs.readFileSync(path.join(SOURCES, fichier), 'utf8')).join('\n');
  const gabarit = fs.readFileSync(path.join(SOURCES, 'Dialogue.html'), 'utf8');

  /*
   * Les maillons de la chaîne sont les lignes qui commencent par un point.
   *
   * Ni une borne en caractères ni une coupe au premier point-virgule ne
   * tiennent : les gestionnaires passés à `withSuccessHandler` sont des
   * fonctions entières, qui contiennent leurs propres `;` et leurs propres
   * appels de méthode. C'est l'indentation qui distingue la chaîne de ce
   * qu'elle transporte.
   */
  vrai(gabarit.includes('google.script.run'), 'le gabarit doit appeler le serveur');
  const appelees = [...gabarit.matchAll(/^\s*\.([A-Za-z0-9_]+)\(/gm)]
    .map((trouve) => trouve[1])
    .filter((nom) => !['withSuccessHandler', 'withFailureHandler', 'withUserObject'].includes(nom));

  vrai(appelees.length > 0, 'le gabarit doit appeler au moins une fonction serveur');

  appelees.forEach((nom) => {
    if (nom.endsWith('_')) {
      throw new Error(
        `« ${nom} » se termine par un trait de soulignement : google.script.run ne peut `
        + 'pas l’appeler, son nom n’est jamais envoyé au client');
    }
    if (!new RegExp(`^function ${nom}\\(`, 'm').test(source)) {
      throw new Error(`« ${nom} » est appelée par le gabarit mais n’est pas une function déclarée`);
    }
  });
});

verifier('toute action de modale existe dans la table du menu', () => {
  const contexte = chargerProjet();
  const source = fichiersSource()
    .map((fichier) => fs.readFileSync(path.join(SOURCES, fichier), 'utf8')).join('\n');

  const table = contexte.lire('MENAGE_MODALE_ACTIONS_');
  const demandees = [...new Set(ciblesDeModale(source))];

  vrai(demandees.length > 0, 'le menu doit lancer au moins une action');
  demandees.forEach((nom) => {
    if (typeof table[nom] !== 'function') {
      throw new Error(`« ${nom} » est passée à une modale mais n’est pas dans la table`);
    }
  });
});

verifier('une action inconnue est refusée en nommant celles qui existent', () => {
  const contexte = contexteInstalle();
  let leve = null;
  try {
    contexte.lire('menageExecuterAction')('nImporteQuoi');
  } catch (erreur) { leve = erreur; }

  vrai(leve !== null, 'un nom venu du navigateur ne doit jamais être exécuté à l’aveugle');
  vrai(String(leve.message).includes('preparer'),
    'l’erreur doit nommer les actions connues, pour qu’on sache quoi corriger');
});

verifier('aucune fonction interne n’encombre le menu d’exécution', () => {
  const source = fichiersSource()
    .map((fichier) => fs.readFileSync(path.join(SOURCES, fichier), 'utf8')).join('\n');

  const declarees = [...source.matchAll(/^function ([A-Za-z0-9_]+)\(/gm)].map((m) => m[1]);
  const attendues = [
    ...ciblesDeMenu(source),
    'onOpen',
    'executerLeMenageQuotidien',
    'reprendreLApplicationDuMenage',
    // Cible de `google.script.run` : elle n'a pas le choix d'être publique.
    'menageExecuterAction',
  ];

  const intruses = declarees.filter((nom) => !attendues.includes(nom));
  egal(intruses, [],
    'tout l’interne doit être en const fléchée, invisible du menu d’exécution');
});

/* ==========================================================================
 * 10. Traductions
 *    Une clé manquante ne casse rien : elle retombe sur l'anglais, puis sur
 *    son propre nom, et l'utilisateur lit « texte_confirmer » dans un
 *    dialogue. Un défaut qui ne casse rien est un défaut qu'on livre.
 * ======================================================================= */

const dictionnaires = () => chargerProjet().lire('MENAGE_TRADUCTIONS_');

verifier('les deux langues portent exactement les mêmes clés', () => {
  const { fr, en } = dictionnaires();
  egal(Object.keys(fr).filter((cle) => !(cle in en)), [], 'clés absentes de l’anglais');
  egal(Object.keys(en).filter((cle) => !(cle in fr)), [], 'clés absentes du français');
});

verifier('les jetons {0}, {1}… sont accordés entre les deux langues', () => {
  const { fr, en } = dictionnaires();
  const jetons = (texte) => [...new Set([...String(texte).matchAll(/\{(\d+)\}/g)]
    .map((trouve) => trouve[1]))].sort();

  Object.keys(fr).forEach((cle) => {
    const cote = jetons(fr[cle]);
    const autre = jetons(en[cle]);
    if (JSON.stringify(cote) !== JSON.stringify(autre)) {
      throw new Error(`« ${cle} » attend ${JSON.stringify(cote)} en français `
        + `et ${JSON.stringify(autre)} en anglais : un jeton resterait littéral`);
    }
  });
});

verifier('toute clé citée dans le code existe, et aucune n’est orpheline', () => {
  const { fr } = dictionnaires();
  const source = fs.readdirSync(SOURCES)
    .filter((nom) => nom.endsWith('.gs') || nom.endsWith('.html'))
    .map((nom) => fs.readFileSync(path.join(SOURCES, nom), 'utf8')).join('\n');

  const citees = [...new Set([...source.matchAll(/menageTraductions_\(\s*'([^']+)'/g)]
    .map((trouve) => trouve[1]))];
  egal(citees.filter((cle) => !(cle in fr)), [], 'clés citées mais absentes du dictionnaire');

  /*
   * Pour les orphelines, on cherche le littéral où qu'il soit : une clé peut
   * être choisie par un ternaire — `menageTraductions_(x ? 'oui' : 'non')` —
   * et la regex d'appel ne voit alors que la première.
   */
  const horsDictionnaire = fs.readdirSync(SOURCES)
    .filter((nom) => nom !== 'MenageTraductions.gs' && (nom.endsWith('.gs') || nom.endsWith('.html')))
    .map((nom) => fs.readFileSync(path.join(SOURCES, nom), 'utf8')).join('\n');

  egal(Object.keys(fr).filter((cle) => !horsDictionnaire.includes(`'${cle}'`)), [],
    'clés du dictionnaire que plus personne n’affiche');
});

verifier('une locale illisible retombe sur l’anglais sans lever', () => {
  // Une exception dans onOpen ferait disparaître le menu entier.
  const contexte = chargerProjet();
  contexte.sandbox.Session.getActiveUserLocale = () => { throw new Error('No user'); };
  egal(contexte.lire('menageTraductions_')('bouton_ok'), 'Close',
    'le menu doit survivre à une locale indisponible');
});

/* ==========================================================================
 * 11. Échappement des modales
 * ======================================================================= */

verifier('un résumé est échappé avant d’entrer dans une modale', () => {
  const contexte = chargerProjet();
  const rendu = contexte.lire('menageTexteVersHtml_')('<script>alert(1)</script>');
  faux(rendu.includes('<script'),
    'une modale ne doit jamais rendre du balisage qu’elle n’a pas écrit');
  vrai(rendu.includes('&lt;script'), 'le texte doit rester lisible une fois échappé');
});

verifier('l’indentation d’un résumé survit au passage en HTML', () => {
  const contexte = chargerProjet();
  const rendu = contexte.lire('menageTexteVersHtml_')('EXAMEN\n    Corbeille : 3');
  vrai(rendu.includes('<br>'), 'les sauts de ligne deviennent des <br>');
  vrai(rendu.includes('&nbsp;&nbsp;&nbsp;&nbsp;Corbeille'),
    'HTML réduirait les quatre espaces à un seul');
});

verifier('le gabarit n’injecte jamais un message d’erreur en innerHTML', () => {
  const gabarit = fs.readFileSync(path.join(SOURCES, 'Dialogue.html'), 'utf8');
  const bloc = gabarit
    .slice(gabarit.indexOf('withFailureHandler'), gabarit.indexOf('.menageExecuterAction'))
    // Sans quoi c'est le commentaire expliquant qu'on n'en veut pas qui
    // déclenche le contrôle — le piège est exactement celui du « in:inbox »
    // cité dans le texte d'« À propos ».
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  faux(/innerHTML/.test(bloc),
    'un message d’erreur recopie parfois une cellule du classeur : textContent, pas innerHTML');
});

verifier('le gabarit ne charge aucune ressource externe', () => {
  const gabarit = fs.readFileSync(path.join(SOURCES, 'Dialogue.html'), 'utf8');
  faux(/<link[^>]+href="https?:/.test(gabarit), 'aucune feuille de style distante');
  faux(/<script[^>]+src="https?:/.test(gabarit), 'aucun script distant');
});

verifier('le projet n’envoie aucun message et ne lit pas la boîte de réception', () => {
  const source = fichiersSource()
    .filter((nom) => nom.startsWith('Menage'))
    .map((fichier) => fs.readFileSync(path.join(SOURCES, fichier), 'utf8')).join('\n');

  // La compensation annoncée dans « À propos » doit être vérifiable d'un grep.
  // Si elle cesse de l'être, c'est la documentation qui devient fausse.
  const code = source.split('\n').filter((ligne) => !/^\s*[*/]/.test(ligne)).join('\n');

  faux(/MailApp\.|\.sendEmail\(|createDraft|\.forward\(|\.reply(All)?\(/.test(code),
    'aucun envoi de courriel');
  faux(/getInboxThreads|getPriorityInboxThreads/.test(code),
    'aucune lecture directe de la boîte de réception');

  // Toute recherche Gmail du projet doit viser la corbeille ou le spam. C'est
  // la compensation que « À propos » annonce à l'utilisateur en échange d'une
  // portée mail.google.com : si elle cesse d'être vraie, c'est la
  // documentation qui devient mensongère, et ce cas la rattrape.
  const dossiers = [...code.matchAll(/in:([a-z]+)/g)].map((trouve) => trouve[1]);
  const etrangers = [...new Set(dossiers)].filter((nom) => !['trash', 'spam'].includes(nom));
  egal(etrangers, [], 'seuls in:trash et in:spam sont admis');
});

verifier('aucune constante globale n’est déclarée deux fois', () => {
  const compte = new Map();
  fichiersSource().forEach((fichier) => {
    const source = fs.readFileSync(path.join(SOURCES, fichier), 'utf8');
    [...source.matchAll(/^const ([A-Za-z0-9_$]+)/gm)].forEach((trouve) => {
      compte.set(trouve[1], (compte.get(trouve[1]) || 0) + 1);
    });
  });

  const doublons = [...compte.entries()].filter(([, n]) => n > 1).map(([nom]) => nom);
  egal(doublons, [],
    'deux fichiers déclarant la même constante empêchent le projet entier de se charger');
});

verifier('aucun String(valeur).slice(0, 10) sur un horodatage', () => {
  const source = fichiersSource()
    .map((fichier) => fs.readFileSync(path.join(SOURCES, fichier), 'utf8')).join('\n');
  faux(/String\([^)]*\)\.slice\(0,\s*10\)/.test(source),
    'Sheets rend des Date : cette découpe produit « Thu May 14 2026 »');
});

verifier('l’installation est rejouable sans écraser une décision humaine', () => {
  const contexte = contexteInstalle();
  const marques = contexte.classeur.getSheetByName('Marques');

  const avant = marques.getLastRow();
  marques.appendRow(['ma marque à moi', 'chezmoi.test']);
  contexte.lire('menageInstaller_()');

  egal(marques.getLastRow(), avant + 1,
    'une marque ajoutée à la main doit survivre à une réinstallation');
});

verifier('le référentiel écarte une marque sans domaine', () => {
  const contexte = contexteInstalle();
  contexte.classeur.getSheetByName('Marques').appendRow(['sans domaine', '']);
  contexte.lire('menageOublierReferentiel_()');

  const marques = contexte.lire('menageMarques_()');
  faux('sans domaine' in marques,
    'une marque sans domaine serait en conflit avec tout expéditeur, y compris le sien');
});

verifier('un réglage illisible retombe sur son défaut', () => {
  const contexte = contexteInstalle();
  const feuille = contexte.classeur.getSheetByName('Réglages');
  const cles = contexte.lire('MENAGE_CLES_REGLAGES_');

  const table = feuille.getRange(1, 1, feuille.getLastRow(), 2).getValues();
  const rang = table.findIndex(([cle]) => cle === cles.retentionCorbeille);
  feuille.getRange(rang + 1, 2, 1, 1).setValues([['sept']]);
  contexte.lire('menageOublierReferentiel_()');

  egal(contexte.lire('menageReglages_()').retentionCorbeille, 7,
    'NaN rendrait toute comparaison fausse et désactiverait la rétention en silence');
});

/* --------------------------------------------------------------------------
 * Verdict
 * ----------------------------------------------------------------------- */

const total = resultats.passes + resultats.echecs.length;

if (resultats.echecs.length === 0) {
  console.log(`Banc d'essai — ${total} cas, tous passés.`);
  process.exit(0);
}

console.log(`Banc d'essai — ${resultats.passes}/${total} cas passés, `
  + `${resultats.echecs.length} échec(s) :\n`);
resultats.echecs.forEach(({ intitule, message }) => {
  console.log(`  ÉCHEC  ${intitule}`);
  console.log(`         ${message}\n`);
});
process.exit(1);
