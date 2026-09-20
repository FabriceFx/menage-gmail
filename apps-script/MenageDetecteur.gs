/**
 * Ménage Gmail — détecteur de déchets. Introduit en v1.0.
 *
 * Ce fichier décide si un message ressemble à une escroquerie. Il ne décide
 * jamais de le supprimer : son verdict est une proposition inscrite au plan,
 * qu'un humain coche ou ne coche pas. La distinction n'est pas une précaution
 * de style — c'est la seule qui rende acceptable un jugement fondé sur des
 * correspondances de texte.
 *
 * ## Ce que la version précédente faisait, et ce qu'il en coûtait
 *
 * Elle supprimait définitivement sur deux « signaux d'appui », et ces signaux
 * étaient bien plus faciles à réunir qu'il n'y paraît. Toute adresse en
 * `gmail.com` valait « identité suspecte », parce que la fonction rendait
 * `true` pour toute messagerie gratuite. Le mot « congratulations » valait
 * « appât ». Un message d'anniversaire envoyé par un ami depuis Gmail, jeté à
 * la corbeille, réunissait donc les deux — et disparaissait sans retour.
 *
 * ## Un score, et le détail de son calcul
 *
 * Chaque signal porte un poids, le total se compare à un seuil, et le motif
 * écrit dans le plan liste les signaux retenus avec leur poids. Un verdict qui
 * ne sait pas dire pourquoi il est ce qu'il est ne survit pas à la première
 * contestation — et ici, la contestation vient de celui qui relit le plan
 * avant de cocher.
 *
 * Aucun signal ne suffit seul : le seuil est fixé au-dessus du poids le plus
 * fort. C'est délibéré. Le détecteur se trompera, et l'on préfère qu'il se
 * trompe en laissant passer.
 */

/**
 * Poids des signaux.
 *
 * Les trois premiers valent une usurpation caractérisée, les autres ne sont
 * que des présomptions. Un fait et une présomption ne se mélangent pas.
 */
const MENAGE_POIDS_ = {
  usurpationMarque: 3,
  conflitIdentite: 3,
  authentificationEchouee: 2,
  marqueDepuisMessagerieGratuite: 2,
  appatMenace: 1,
  appatPromotion: 1,
  domaineIllisible: 1,
  adresseInterminable: 1,
};

/**
 * Seuil du verdict, strictement supérieur au poids le plus fort.
 *
 * Il faut donc soit deux signaux caractérisés, soit un signal caractérisé et
 * une présomption. Abaisser ce seuil à 3 rendrait la seule mention d'une
 * marque suffisante, ce qui est exactement le défaut corrigé.
 */
const MENAGE_SEUIL_DECHET_ = 4;

/** Longueur au-delà de laquelle une adresse est, en elle-même, une anomalie. */
const MENAGE_ADRESSE_LONGUE_ = 70;

/* --------------------------------------------------------------------------
 * Authentification de l'expéditeur
 * ----------------------------------------------------------------------- */

/**
 * Lit ce que les serveurs de Google ont conclu de SPF, DKIM et DMARC.
 *
 * C'est le seul signal de ce fichier qui ne soit pas une devinette : il est
 * produit par la chaîne de réception, pas par une correspondance de mots. La
 * version précédente avait bien une fonction de lecture d'en-tête — mais elle
 * n'était appelée nulle part.
 *
 * DMARC prime : SPF s'évalue sur le domaine d'enveloppe, qui n'est pas celui
 * que le lecteur voit. Un message dont le SPF passe pour `envois.exemple.test`
 * peut parfaitement afficher « Google » en expéditeur. Seul DMARC vérifie
 * l'alignement avec l'adresse affichée, et c'est cet alignement — pas la
 * livrabilité — qui nous intéresse.
 *
 * @returns {{verdict: string, brut: string}} `pass`, `fail` ou `inconnu`
 */
const menageAuthentification_ = (message) => {
  const brut = SocleErreurs.absorber(
    'lecture de l’en-tête Authentication-Results',
    () => String(message.getHeader('Authentication-Results') ?? ''),
    '');

  if (brut === '') return { verdict: 'inconnu', brut: '' };

  const normalise = brut.toLowerCase();
  const dmarc = normalise.match(/dmarc=(\w+)/);

  if (dmarc) {
    if (dmarc[1] === 'pass') return { verdict: 'pass', brut };
    if (dmarc[1] === 'fail') return { verdict: 'fail', brut };
    return { verdict: 'inconnu', brut };
  }

  // Sans DMARC, on n'accorde le « pass » qu'à la conjonction des deux autres,
  // et l'on ne prononce jamais d'échec : SPF seul ne dit rien de l'adresse
  // affichée, et un transfert de courrier le casse légitimement.
  const spf = /spf=pass/.test(normalise);
  const dkim = /dkim=pass/.test(normalise);
  return { verdict: spf && dkim ? 'pass' : 'inconnu', brut };
};

/* --------------------------------------------------------------------------
 * Signaux
 * ----------------------------------------------------------------------- */

/**
 * Marques citées dans un texte, en mots entiers.
 *
 * @param {string} texte
 * @returns {string[]}
 */
const menageMarquesCitees_ = (texte) => Object.keys(menageMarques_())
  .filter((marque) => menageContientMot_(texte, marque));

/**
 * Marques dont l'expéditeur se réclame sans en avoir le domaine.
 *
 * Cherchées dans le **nom affiché et l'objet** seulement, jamais dans le
 * corps. C'est une correction de fond : un pied de page mentionnant Google,
 * une citation de message, un lien vers YouTube suffisaient auparavant à
 * déclarer l'incohérence — sur des messages parfaitement légitimes, dont
 * beaucoup venaient précisément de ces services.
 */
const menageUsurpations_ = (nomAffiche, objet, domaine) => {
  const marques = menageMarques_();
  const vitrine = `${nomAffiche}\n${objet}`;

  /*
   * On ne dispense pas une marque au motif qu'elle figure dans l'adresse.
   *
   * Ce filtre a existé — « c'est le même expéditeur qui se nomme deux fois » —
   * et le banc a montré ce qu'il coûtait : `news@norton.fr.exemple.test`
   * contient « norton », donc échappait à la détection. C'est très exactement
   * ce qu'un usurpateur soigneux met dans son domaine. Le seul filtre légitime
   * est celui des domaines déclarés, juste au-dessus.
   */
  return Object.keys(marques)
    .filter((marque) => menageContientMot_(vitrine, marque))
    .filter((marque) => !marques[marque].some((legitime) => menageDomaineCouvert_(domaine, legitime)));
};

/**
 * Deux marques différentes, l'une dans le nom affiché, l'autre dans l'objet.
 *
 * Le motif classique du message qui se présente comme un service pour parler
 * d'un autre. La version précédente comparait le nom affiché au corps entier,
 * ce qui déclenchait sur toute citation — et faisait de ce signal, à lui seul
 * suffisant pour supprimer, le plus destructeur du lot.
 */
const menageConflitIdentite_ = (nomAffiche, objet) => {
  const cotePorteur = menageMarquesCitees_(nomAffiche);
  const coteObjet = menageMarquesCitees_(objet);
  if (cotePorteur.length === 0 || coteObjet.length === 0) return null;

  for (const porteur of cotePorteur) {
    for (const annoncee of coteObjet) {
      if (porteur !== annoncee) return { porteur, annoncee };
    }
  }
  return null;
};

/** Expressions d'appât trouvées, une par famille au plus. */
const menageAppats_ = (texte) => {
  const parFamille = {};
  menageExpressions_().forEach(({ famille, expression }) => {
    if (parFamille[famille]) return;
    if (menageContientMot_(texte, expression)) parFamille[famille] = expression;
  });
  return parFamille;
};

/**
 * Un libellé de domaine qui ne se prononce pas.
 *
 * Le seul critère retenu est la rareté des voyelles, sur un libellé assez long
 * pour que la mesure ait un sens. Le test « des lettres et des chiffres » de
 * la version précédente a été retiré : il rendait `web3`, `covid19`, `m6` et
 * `123-reg` suspects, pour un gain nul.
 */
const menageDomaineIllisible_ = (domaine) => {
  const libelles = String(domaine ?? '').toLowerCase().split('.');
  if (libelles.length < 2) return false;

  // On ignore le suffixe : `co.uk` et `fr` n'ont rien à prouver.
  return libelles.slice(0, -1).some((libelle) => {
    const lettres = libelle.replace(/[^a-z]/g, '');
    if (lettres.length < 8) return false;
    const voyelles = (lettres.match(/[aeiouy]/g) || []).length;
    return voyelles / lettres.length < 0.15;
  });
};

/* --------------------------------------------------------------------------
 * Verdict
 * ----------------------------------------------------------------------- */

/**
 * Pèse un message et rend son verdict, motifs compris.
 *
 * @param {Object} vu ce qu'on a lu du message, déjà normalisé
 * @returns {{dechet: boolean, score: number, seuil: number, motifs: string[], protege: ?string}}
 */
const menageJuger_ = (vu) => {
  const reglages = menageReglages_();
  const motifs = [];
  let score = 0;

  const retenir = (poids, libelle) => { score += poids; motifs.push(`${libelle} (+${poids})`); };

  /*
   * Les protections passent avant tout calcul, et elles sont définitives.
   *
   * Rendre le score malgré tout serait un piège : on finirait par le comparer
   * au seuil quelque part, et la protection ne tiendrait plus.
   */
  if (menageEstProtege_(vu.adresse)) {
    return { dechet: false, score: 0, seuil: MENAGE_SEUIL_DECHET_, motifs: [], protege: 'expéditeur protégé' };
  }

  if (reglages.protegerContacts && vu.contact) {
    return { dechet: false, score: 0, seuil: MENAGE_SEUIL_DECHET_, motifs: [], protege: 'expéditeur dans les contacts' };
  }

  /*
   * L'authentification n'innocente pas : un escroc peut signer correctement
   * son propre domaine. Elle établit seulement que l'expéditeur est bien
   * celui qu'il affiche — elle neutralise donc les signaux d'usurpation, et
   * eux seuls. Les appâts continuent de compter.
   */
  const authentifie = reglages.protegerAuthentifies && vu.authentification.verdict === 'pass';

  if (!authentifie) {
    const usurpees = menageUsurpations_(vu.nomAffiche, vu.objet, vu.domaine);
    usurpees.forEach((marque) => retenir(
      MENAGE_POIDS_.usurpationMarque,
      `se réclame de « ${marque} » depuis ${vu.domaine || 'un domaine inconnu'}`));

    const conflit = menageConflitIdentite_(vu.nomAffiche, vu.objet);
    if (conflit) {
      retenir(MENAGE_POIDS_.conflitIdentite,
        `se présente comme « ${conflit.porteur} » mais parle de « ${conflit.annoncee} »`);
    }

    if (usurpees.length > 0 && menageEstMessagerieGratuite_(vu.domaine)) {
      retenir(MENAGE_POIDS_.marqueDepuisMessagerieGratuite,
        `marque commerciale écrite depuis une messagerie gratuite (${vu.domaine})`);
    }
  }

  if (vu.authentification.verdict === 'fail') {
    retenir(MENAGE_POIDS_.authentificationEchouee, 'DMARC en échec');
  }

  const appats = menageAppats_(vu.texteAnalyse);
  Object.keys(appats).forEach((famille) => {
    const poids = MENAGE_FAMILLES_MENACE_.includes(famille)
      ? MENAGE_POIDS_.appatMenace
      : MENAGE_POIDS_.appatPromotion;
    retenir(poids, `${famille} : « ${appats[famille]} »`);
  });

  if (menageDomaineIllisible_(vu.domaine)) {
    retenir(MENAGE_POIDS_.domaineIllisible, `domaine peu prononçable (${vu.domaine})`);
  }

  if (vu.adresse.length >= MENAGE_ADRESSE_LONGUE_) {
    retenir(MENAGE_POIDS_.adresseInterminable, `adresse de ${vu.adresse.length} caractères`);
  }

  return {
    dechet: score >= MENAGE_SEUIL_DECHET_,
    score,
    seuil: MENAGE_SEUIL_DECHET_,
    motifs,
    protege: null,
  };
};

/** Le verdict tel qu'il s'écrit dans la colonne « Motif » du plan. */
const menageMotifLisible_ = (verdict) => {
  if (verdict.protege) return verdict.protege;
  if (verdict.motifs.length === 0) return 'aucun signal';
  return `${verdict.score}/${verdict.seuil} — ${verdict.motifs.join(' ; ')}`;
};
