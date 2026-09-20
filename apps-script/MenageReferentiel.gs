/**
 * Ménage Gmail — le référentiel éditable. Introduit en v1.0.
 *
 * Marques, expressions d'appât, domaines de messagerie gratuite, adresses
 * protégées : tout cela relève du jugement, pas de la mécanique. Une marque
 * qui manque, une expression qui produit des faux positifs, un correspondant
 * à mettre à l'abri — ces corrections doivent se faire dans un onglet, sans
 * déploiement, par quelqu'un qui n'ouvre jamais l'éditeur de script.
 *
 * Les listes livrées à l'installation sont des valeurs de départ, pas une
 * vérité : le code les pose si l'onglet est absent, puis n'y touche plus
 * jamais. Une décision humaine ne se réécrit pas.
 *
 * La lecture est mémorisée pour la durée de l'exécution : chaque message
 * interrogerait sinon le classeur trois fois, et une corbeille de mille
 * messages ferait trois mille lectures là où trois suffisent.
 */

const MENAGE_MEMOIRE_REFERENTIEL_ = {};

/* --------------------------------------------------------------------------
 * Valeurs de départ
 * ----------------------------------------------------------------------- */

/**
 * Marques et leurs domaines légitimes.
 *
 * Toute marque est cherchée **en mot entier** ; c'est ce qui rend tenable d'y
 * inscrire « ally » ou « aaa », que la version précédente cherchait en
 * sous-chaîne — et qui reconnaissait donc une banque dans « actually ».
 *
 * Une marque sans domaine connu ne sert à rien : elle produirait une
 * incohérence sur tous les expéditeurs, y compris les vrais. Le contrôle
 * d'installation refuse donc une ligne sans domaine.
 */
const MENAGE_MARQUES_DEPART_ = [
  ['aaa', 'aaa.com'],
  ['ally', 'ally.com'],
  ['banco ripley', 'ripley.cl'],
  ['carshield', 'carshield.com'],
  ['city of hope', 'coh.org, cityofhope.org'],
  ['ebay', 'ebay.com, ebay.fr'],
  ['elliman', 'elliman.com'],
  ['endurance', 'endurancewarranty.com'],
  ['enterprise', 'enterprise.com'],
  ['fidelity', 'fidelity.com'],
  ['geek squad', 'bestbuy.com, geeksquad.com'],
  ['google', 'google.com, googlemail.com, youtube.com'],
  ['lidl', 'lidl.com, lidl.fr'],
  ['mcafee', 'mcafee.com'],
  ['norton', 'norton.com, gen-digital.com, nortonlifelock.com'],
  ['paramount', 'paramount.com, paramountplus.com'],
  ['seguros ripley', 'ripley.cl'],
  ['shell', 'shell.com, shell.fr'],
  ['stardock', 'stardock.com'],
  ['t-mobile', 't-mobile.com'],
  ['unitedhealthcare', 'uhc.com, unitedhealthcare.com'],
  ['verizon', 'verizon.com'],
  ['walgreens', 'walgreens.com'],
];

/**
 * Expressions d'appât, par famille.
 *
 * Trois familles distinctes parce qu'elles ne pèsent pas pareil : une menace
 * sur un compte ou un paiement est le ressort classique de l'hameçonnage,
 * tandis qu'une promotion agressive n'est le plus souvent qu'une publicité.
 *
 * Les expressions les plus banales de la version précédente ont été retirées :
 * « membership », « prix » ou « congratulations » pris isolément décrivent
 * aussi bien une facture d'association qu'un message d'un collègue. Ce qui
 * reste porte une intention commerciale ou comminatoire difficile à confondre.
 */
const MENAGE_EXPRESSIONS_DEPART_ = [
  ['Menace de compte', 'account will be suspended'],
  ['Menace de compte', 'account will be closed'],
  ['Menace de compte', 'your account has been locked'],
  ['Menace de compte', 'verify your account now'],
  ['Menace de compte', 'le compte sera suspendu'],
  ['Menace de compte', 'le compte sera fermé'],
  ['Menace de compte', 'votre compte a été bloqué'],
  ['Menace de paiement', 'payment failed'],
  ['Menace de paiement', 'payment method has expired'],
  ['Menace de paiement', 'update your payment details'],
  ['Menace de paiement', 'billing problem'],
  ['Menace de paiement', 'renewal scheduled'],
  ['Menace de paiement', 'subscription continues automatically'],
  ['Menace de paiement', 'paiement échoué'],
  ['Menace de paiement', 'méthode de paiement expirée'],
  ['Menace de paiement', 'mettre à jour votre paiement'],
  ['Menace de paiement', 'problème de facturation'],
  ['Appât de gain', 'you have won'],
  ['Appât de gain', 'claim your prize'],
  ['Appât de gain', 'claim your reward'],
  ['Appât de gain', 'your reward awaits'],
  ['Appât de gain', 'selected customer'],
  ['Appât de gain', 'free gift card'],
  ['Appât de gain', 'vous avez gagné'],
  ['Appât de gain', 'réclamez votre récompense'],
  ['Appât de gain', 'client sélectionné'],
  ['Appât de gain', 'carte cadeau gratuite'],
];

/** Familles considérées comme comminatoires, par opposition à promotionnelles. */
const MENAGE_FAMILLES_MENACE_ = ['Menace de compte', 'Menace de paiement'];

/**
 * Messageries gratuites.
 *
 * Elles ne rendent pas un expéditeur suspect — la moitié des correspondants
 * légitimes en utilisent une. Elles servent à un seul test : une marque
 * commerciale qui écrit depuis une adresse gratuite n'est pas cette marque.
 */
const MENAGE_MESSAGERIES_GRATUITES_DEPART_ = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.fr', 'ymail.com',
  'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'live.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com', 'gmx.com', 'gmx.fr',
  'mail.ru', 'yandex.ru', 'protonmail.com', 'proton.me', 'orange.fr',
  'wanadoo.fr', 'free.fr', 'laposte.net', 'sfr.fr',
];

/* --------------------------------------------------------------------------
 * Lecture
 * ----------------------------------------------------------------------- */

/** Lit les réglages, en retombant sur les défauts pour toute clé absente. */
const menageReglages_ = () => {
  if (MENAGE_MEMOIRE_REFERENTIEL_.reglages) return MENAGE_MEMOIRE_REFERENTIEL_.reglages;

  const lus = SocleErreurs.absorber(
    'lecture des réglages',
    () => SocleFeuilles.lireReglages(MENAGE_ONGLETS_.reglages),
    {});

  const valeur = (cle) => (lus[cle] === undefined || lus[cle] === '' ? MENAGE_REGLAGES_DEFAUT_[cle] : lus[cle]);

  /**
   * Un entier, ou le défaut. Une cellule où quelqu'un a écrit « sept » ne doit
   * pas rendre `NaN` : toute comparaison avec `NaN` étant fausse, la rétention
   * cesserait silencieusement de s'appliquer et rien ne le signalerait.
   */
  const entier = (cle) => {
    const brut = Number(valeur(cle));
    return Number.isFinite(brut) && brut >= 0 ? Math.floor(brut) : MENAGE_REGLAGES_DEFAUT_[cle];
  };

  /** « Oui » seul vaut oui : toute autre écriture retombe sur non. */
  const oui = (cle) => /^(oui|yes|vrai|true|1)$/i.test(String(valeur(cle)).trim());

  MENAGE_MEMOIRE_REFERENTIEL_.reglages = {
    retentionCorbeille: entier(MENAGE_CLES_REGLAGES_.retentionCorbeille),
    retentionQuarantaine: entier(MENAGE_CLES_REGLAGES_.retentionQuarantaine),
    examenMax: Math.max(1, entier(MENAGE_CLES_REGLAGES_.examenMax)),
    suppressionHeuristique: oui(MENAGE_CLES_REGLAGES_.suppressionHeuristique),
    protegerContacts: oui(MENAGE_CLES_REGLAGES_.protegerContacts),
    protegerAuthentifies: oui(MENAGE_CLES_REGLAGES_.protegerAuthentifies),
  };

  return MENAGE_MEMOIRE_REFERENTIEL_.reglages;
};

/** Marques lues depuis l'onglet : `{ marque: [domaines] }`. */
const menageMarques_ = () => {
  if (MENAGE_MEMOIRE_REFERENTIEL_.marques) return MENAGE_MEMOIRE_REFERENTIEL_.marques;

  const table = SocleErreurs.absorber(
    'lecture des marques',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.marques),
    { lignes: [] });

  const marques = {};
  (table.lignes || []).forEach((ligne) => {
    const nom = String(ligne.Marque ?? '').trim().toLowerCase();
    const domaines = String(ligne['Domaines légitimes'] ?? '')
      .split(/[,;\s]+/).map((d) => d.trim().toLowerCase()).filter(Boolean);

    // Une marque sans domaine serait en conflit avec tout expéditeur, y
    // compris le sien : on l'ignore plutôt que de produire des verdicts faux.
    if (nom !== '' && domaines.length > 0) marques[nom] = domaines;
  });

  MENAGE_MEMOIRE_REFERENTIEL_.marques = marques;
  return marques;
};

/** Expressions lues depuis l'onglet : `[{ famille, expression }]`. */
const menageExpressions_ = () => {
  if (MENAGE_MEMOIRE_REFERENTIEL_.expressions) return MENAGE_MEMOIRE_REFERENTIEL_.expressions;

  const table = SocleErreurs.absorber(
    'lecture des expressions',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.expressions),
    { lignes: [] });

  MENAGE_MEMOIRE_REFERENTIEL_.expressions = (table.lignes || [])
    .map((ligne) => ({
      famille: String(ligne.Famille ?? '').trim(),
      expression: String(ligne.Expression ?? '').trim(),
    }))
    .filter((entree) => entree.famille !== '' && entree.expression !== '');

  return MENAGE_MEMOIRE_REFERENTIEL_.expressions;
};

/**
 * Adresses et domaines que ce script ne touche jamais.
 *
 * Une entrée sans `@` est lue comme un domaine, sous-domaines compris. C'est
 * la forme que prend le besoin réel : on protège « son employeur », pas
 * quinze adresses de son employeur.
 */
const menageProteges_ = () => {
  if (MENAGE_MEMOIRE_REFERENTIEL_.proteges) return MENAGE_MEMOIRE_REFERENTIEL_.proteges;

  const table = SocleErreurs.absorber(
    'lecture des protégés',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.proteges),
    { lignes: [] });

  const adresses = new Set();
  const domaines = new Set();

  (table.lignes || []).forEach((ligne) => {
    const entree = String(ligne['Adresse ou domaine'] ?? '').trim().toLowerCase();
    if (entree === '') return;
    if (entree.includes('@')) adresses.add(entree);
    else domaines.add(entree.replace(/^@/, ''));
  });

  MENAGE_MEMOIRE_REFERENTIEL_.proteges = { adresses, domaines };
  return MENAGE_MEMOIRE_REFERENTIEL_.proteges;
};

/** Vrai si cette adresse figure, elle ou son domaine, parmi les protégés. */
const menageEstProtege_ = (adresse) => {
  const cible = String(adresse ?? '').trim().toLowerCase();
  if (cible === '') return false;

  const { adresses, domaines } = menageProteges_();
  if (adresses.has(cible)) return true;

  const domaine = menageDomaine_(cible);
  for (const reference of domaines) {
    if (menageDomaineCouvert_(domaine, reference)) return true;
  }
  return false;
};

/** Messageries gratuites : liste figée, car elle ne relève pas du jugement local. */
const menageEstMessagerieGratuite_ = (domaine) => MENAGE_MESSAGERIES_GRATUITES_DEPART_
  .includes(String(domaine ?? '').toLowerCase());

/** Vide la mémoire du référentiel. Le banc s'en sert entre deux scénarios. */
const menageOublierReferentiel_ = () => {
  Object.keys(MENAGE_MEMOIRE_REFERENTIEL_).forEach((cle) => {
    delete MENAGE_MEMOIRE_REFERENTIEL_[cle];
  });
};
