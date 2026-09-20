/**
 * Ménage Gmail — noms, défauts et version. Introduit en v1.0.
 *
 * Ce fichier ne porte que des littéraux. Aucune de ses constantes n'appelle
 * une fonction définie ailleurs : l'éditeur Apps Script concatène les fichiers
 * du projet dans un ordre qu'il ne garantit pas, et une `const` fléchée n'est
 * pas remontée. Une constante qui invoquerait un module voisin ferait échouer
 * le chargement du projet entier — et **toutes** ses fonctions deviendraient
 * « introuvables » d'un coup, y compris celles qui n'ont rien à voir.
 *
 * Les noms sont longs et préfixés pour la même raison : deux fichiers qui
 * déclarent la même constante globale suffisent à empêcher le chargement.
 */

/**
 * Le seul numéro de version courant du projet.
 *
 * Le banc vérifie qu'il vaut le fichier `VERSION`. Un déploiement Apps Script
 * sert une copie figée du code : ce numéro, affiché dans « À propos » et en
 * tête du journal, est le seul moyen de savoir laquelle tourne.
 */
const MENAGE_VERSION_ = '1.1.1';

/* --------------------------------------------------------------------------
 * Onglets du classeur
 * ----------------------------------------------------------------------- */

const MENAGE_ONGLETS_ = {
  reglages: 'Réglages',
  marques: 'Marques',
  expressions: 'Expressions',
  proteges: 'Protégés',
  quarantaine: 'Quarantaine',
  plan: 'Plan — ménage',
  journal: 'Journal',
  guide: 'Guide',
};

/* --------------------------------------------------------------------------
 * Réglages — le référentiel n'est pas dans le code
 * ----------------------------------------------------------------------- */

/**
 * Clés de l'onglet « Réglages », retrouvées par leur libellé, jamais par leur
 * position : une ligne insérée à la main ne doit décaler aucune lecture.
 *
 * Ces libellés sont l'interface de réglage de l'outil. Les renommer dans le
 * code sans les renommer dans l'onglet fait retomber silencieusement sur les
 * défauts ci-dessous — d'où le contrôle d'installation, qui ajoute les clés
 * manquantes et ne réécrit jamais une valeur déjà posée.
 */
const MENAGE_CLES_REGLAGES_ = {
  retentionCorbeille: 'Jours avant suppression depuis la Corbeille',
  retentionQuarantaine: 'Jours de quarantaine dans le Spam',
  examenMax: 'Messages examinés au maximum par préparation',
  suppressionHeuristique: 'Proposer la suppression des déchets évidents (Oui / Non)',
  protegerContacts: 'Protéger les messages des contacts (Oui / Non)',
  protegerAuthentifies: 'Protéger les messages authentifiés SPF+DKIM (Oui / Non)',
};

const MENAGE_REGLAGES_DEFAUT_ = {
  [MENAGE_CLES_REGLAGES_.retentionCorbeille]: 7,
  [MENAGE_CLES_REGLAGES_.retentionQuarantaine]: 7,
  [MENAGE_CLES_REGLAGES_.examenMax]: 1500,
  [MENAGE_CLES_REGLAGES_.suppressionHeuristique]: 'Non',
  [MENAGE_CLES_REGLAGES_.protegerContacts]: 'Oui',
  [MENAGE_CLES_REGLAGES_.protegerAuthentifies]: 'Oui',
};

/* --------------------------------------------------------------------------
 * Actions et emplacements
 * ----------------------------------------------------------------------- */

/**
 * Les trois verdicts possibles, écrits en toutes lettres dans le plan.
 *
 * Des libellés lisibles plutôt que des codes : le plan est relu par un humain
 * qui coche des cases, et « SUPPR_DEF » ne dit pas assez clairement que
 * l'opération est sans retour.
 */
const MENAGE_ACTIONS_ = {
  supprimer: 'Supprimer définitivement',
  quarantaine: 'Mettre en quarantaine (Spam)',
  laisser: 'Laisser en place',
};

const MENAGE_EMPLACEMENTS_ = {
  corbeille: 'Corbeille',
  spam: 'Spam',
};

/**
 * Qui a décidé de la ligne, et donc si elle part pré-validée.
 *
 * Une décision de réglage a déjà été prise par un humain, une fois pour
 * toutes, dans l'onglet « Réglages » : la revalider chaque matin rendrait
 * l'outil inutilisable. Une décision du détecteur est un jugement de la
 * machine sur des correspondances de texte : elle n'emporte jamais d'elle-même
 * une suppression irréversible.
 */
const MENAGE_DECIDEURS_ = {
  reglage: 'Réglage',
  detecteur: 'Détecteur',
};

/* --------------------------------------------------------------------------
 * Colonnes du plan
 * ----------------------------------------------------------------------- */

/**
 * L'identifiant est en dernier parce que personne ne le lit : ce qui décide
 * de la validation, ce sont l'expéditeur, l'objet et le motif.
 */
const MENAGE_COLONNES_PLAN_ = [
  'Emplacement',
  'Action',
  'Décidée par',
  'Expéditeur',
  'Objet',
  'Âge (jours)',
  'Libellés',
  'Contact',
  'Motif',
  'Identifiant',
];

/* --------------------------------------------------------------------------
 * Bornes de plausibilité des dates
 * ----------------------------------------------------------------------- */

/**
 * Plancher de plausibilité, en millisecondes depuis l'époque.
 *
 * `Date.UTC` et non `new Date('1995-01-01T00:00:00')` : une date-heure sans
 * décalage est interprétée comme **locale** par V8, si bien que la même
 * constante ne vaudrait pas la même chose selon le fuseau du script.
 *
 * 1995 et non 2020 : le rôle de ce plancher est d'écarter les horodatages
 * aberrants — époque Unix, année 1601 — et non les vieux courriels. Un
 * plancher trop haut rend « inconnu » l'âge d'un message authentiquement
 * ancien, et comme un âge inconnu n'autorise jamais la suppression, ce message
 * ne quitterait plus jamais la Corbeille par ce script.
 */
const MENAGE_DATE_PLANCHER_MS_ = Date.UTC(1995, 0, 1);

/** Tolérance au futur : une horloge d'expéditeur mal réglée n'est pas un défaut. */
const MENAGE_JOURS_FUTUR_TOLERES_ = 2;

/* --------------------------------------------------------------------------
 * Bornes techniques
 * ----------------------------------------------------------------------- */

/** Caractères de corps analysés. Au-delà, l'appât a déjà été vu ou ne viendra pas. */
const MENAGE_LIMITE_CORPS_ = 12000;

/**
 * Taille d'une page de recherche Gmail.
 *
 * `GmailApp.search(query)` sans bornes plafonne à 500 fils **en silence** : un
 * dossier plus grand est traité partiellement sans que rien ne le signale. On
 * pagine donc toujours, et par lots de 100 — de quoi rendre la main au budget
 * de temps entre deux pages.
 */
const MENAGE_PAGE_RECHERCHE_ = 100;

/** Nom de la fonction de reprise. Doit rester une `function` déclarée du projet. */
const MENAGE_FONCTION_REPRISE_ = 'reprendreLApplicationDuMenage';
