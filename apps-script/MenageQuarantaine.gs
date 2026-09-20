/**
 * Ménage Gmail — le registre de quarantaine. Introduit en v1.0.
 *
 * ## Le défaut que ce fichier corrige
 *
 * La version précédente annonçait une quarantaine : un message de la corbeille
 * qui n'était ni un déchet évident ni libellé partait vers le Spam, où il
 * disposait de sept jours avant suppression. Elle ne l'a jamais accordée.
 *
 * Le délai s'y comptait depuis la **date du message**, et le Spam était traité
 * dans la même exécution que la corbeille. Un courriel reçu il y a trois mois,
 * déplacé vers le Spam à 9 h 03, était donc examiné à 9 h 04 par la boucle
 * suivante, déclaré vieux de quatre-vingt-dix jours, et supprimé
 * définitivement — la même minute. Le journal annonçait « DÉPLACER VERS SPAM »
 * puis « SUPPRIMER SPAM », deux lignes qu'aucun lecteur ne rapprochait.
 *
 * ## Ce qu'il fallait
 *
 * Une quarantaine ne se compte pas depuis la date d'écriture du message mais
 * depuis **la date où l'on a décidé de s'en méfier**. Cette date n'existe
 * nulle part dans Gmail : ni les libellés, ni les en-têtes ne la portent. Elle
 * est donc tenue ici, dans un onglet — pas dans `PropertiesService`, dont les
 * 9 Ko par valeur ne tiendraient pas mille identifiants, et qu'aucun humain
 * ne peut relire.
 */

/** Colonnes du registre. L'identifiant d'abord : c'est la clé. */
const MENAGE_COLONNES_QUARANTAINE_ = [
  'Identifiant',
  'Entré en quarantaine le',
  'Expéditeur',
  'Objet',
  'Âge du message à l’entrée (jours)',
];

const MENAGE_MEMOIRE_QUARANTAINE_ = {};

/**
 * Lit le registre en une fois, sous forme de `Map` identifiant → date d'entrée.
 *
 * Une `Map` et non un balayage par message : le registre se consulte une fois
 * par message examiné, et une recherche linéaire sur plusieurs milliers
 * d'entrées transformerait la préparation en travail quadratique.
 */
const menageRegistreQuarantaine_ = () => {
  if (MENAGE_MEMOIRE_QUARANTAINE_.registre) return MENAGE_MEMOIRE_QUARANTAINE_.registre;

  const table = SocleErreurs.absorber(
    'lecture du registre de quarantaine',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.quarantaine),
    { lignes: [] });

  const registre = new Map();
  (table.lignes || []).forEach((ligne) => {
    const identifiant = String(ligne.Identifiant ?? '').trim();
    if (identifiant === '') return;

    // Normaliser à la lecture, jamais à l'écriture : Sheets rend un objet
    // `Date` là où l'on avait écrit une chaîne, et `String(valeur)` donnerait
    // « Thu May 14 2026 » — qui se trie sur le nom du jour.
    const jour = SocleDates.jour(ligne['Entré en quarantaine le']);
    if (jour) registre.set(identifiant, jour);
  });

  MENAGE_MEMOIRE_QUARANTAINE_.registre = registre;
  return registre;
};

/**
 * L'âge à retenir pour un message du Spam : celui de sa quarantaine si elle
 * est enregistrée, celui du message sinon.
 *
 * Un spam arrivé naturellement n'a pas de ligne au registre, et c'est sa date
 * de réception qui compte — c'est bien ce qu'on veut. Le registre ne sert qu'à
 * *retarder* une suppression, jamais à l'avancer.
 */
const menageAgeEnQuarantaine_ = (identifiant, ageDuMessage, maintenant) => {
  const entree = menageRegistreQuarantaine_().get(identifiant);
  if (!entree) return { age: ageDuMessage, depuisQuarantaine: false };

  const age = menageAge_(new Date(`${entree}T12:00:00Z`), maintenant);
  if (!age.connu) return { age: ageDuMessage, depuisQuarantaine: false };

  return { age, depuisQuarantaine: true };
};

/**
 * Inscrit un message au registre, immédiatement après son déplacement.
 *
 * Une écriture par message, et non un lot en fin d'exécution. Le lot serait
 * plus rapide et c'est exactement ce qui le disqualifie : une exécution tuée
 * par le plafond des six minutes emporterait le tampon, et les messages déjà
 * déplacés se retrouveraient au Spam sans date d'entrée — donc jugés sur leur
 * propre date, donc supprimés dès le lendemain. Leur quarantaine aurait duré
 * une nuit.
 *
 * **Le curseur n'avance qu'après l'écriture**, et ici l'écriture suit l'action.
 * Une interruption entre les deux fait perdre la quarantaine d'un message —
 * jamais celle de tous. L'ordre inverse laisserait au contraire des lignes de
 * registre pour des messages restés en corbeille, qui bloqueraient leur
 * suppression sans que rien ne le signale.
 *
 * La feuille est mémorisée pour l'exécution : la retrouver par son nom à
 * chaque ligne ferait un aller-retour de plus par message.
 */
const menageInscrireEnQuarantaine_ = (entree) => {
  if (!MENAGE_MEMOIRE_QUARANTAINE_.feuille) {
    const { feuille } = SocleFeuilles.onglet(MENAGE_ONGLETS_.quarantaine);

    // Un onglet présent mais vide n'est pas un onglet absent : les confondre
    // laisserait la première inscription en ligne 1, où elle serait prise pour
    // un titre de colonne et ignorée à toutes les lectures suivantes.
    if (feuille.getLastRow() < 1) {
      feuille.getRange(1, 1, 1, MENAGE_COLONNES_QUARANTAINE_.length)
        .setValues([MENAGE_COLONNES_QUARANTAINE_]).setFontWeight('bold');
      feuille.setFrozenRows(1);
    }
    MENAGE_MEMOIRE_QUARANTAINE_.feuille = feuille;
  }

  MENAGE_MEMOIRE_QUARANTAINE_.feuille.appendRow([
    entree.identifiant,
    SocleDates.maintenantJour(),
    menageUneLigne_(entree.expediteur),
    menageUneLigne_(entree.objet),
    entree.ageEntree === undefined ? '' : entree.ageEntree,
  ]);

  delete MENAGE_MEMOIRE_QUARANTAINE_.registre;
};

/**
 * Retire du registre les lignes devenues inutiles.
 *
 * Deux cas : le message a été supprimé — sa ligne ne protège plus rien —, ou
 * sa quarantaine est expirée depuis assez longtemps pour qu'il ait été traité.
 * Sans cette purge, l'onglet croît indéfiniment et sa lecture finit par coûter
 * plus cher que le travail lui-même.
 *
 * La purge ne consulte pas Gmail : elle ne travaille que sur des dates. Aller
 * vérifier l'existence de chaque message ferait un appel par ligne, pour ne
 * gagner que quelques jours sur une ligne qui s'effacera d'elle-même.
 */
const menagePurgerQuarantaine_ = (identifiantsTraites, maintenant) => {
  const table = SocleErreurs.absorber(
    'purge du registre de quarantaine',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.quarantaine),
    null);

  if (!table || table.lignes.length === 0) return 0;

  const traites = new Set(identifiantsTraites);
  const reglages = menageReglages_();

  // Une marge après l'expiration : la ligne doit survivre à la préparation qui
  // décidera de la suppression, sans quoi le message perdrait sa quarantaine
  // juste avant d'être jugé.
  const gardeJours = reglages.retentionQuarantaine + 30;

  const gardees = table.lignes.filter((ligne) => {
    const identifiant = String(ligne.Identifiant ?? '').trim();
    if (identifiant === '' || traites.has(identifiant)) return false;

    const jour = SocleDates.jour(ligne['Entré en quarantaine le']);
    if (!jour) return false;

    const age = menageAge_(new Date(`${jour}T12:00:00Z`), maintenant);
    return !menageAgeDepasse_(age, gardeJours);
  });

  const retirees = table.lignes.length - gardees.length;
  if (retirees === 0) return 0;

  SocleFeuilles.ecrireTable(
    MENAGE_ONGLETS_.quarantaine,
    MENAGE_COLONNES_QUARANTAINE_,
    gardees.map((ligne) => MENAGE_COLONNES_QUARANTAINE_.map((nom) => ligne[nom] ?? '')));

  delete MENAGE_MEMOIRE_QUARANTAINE_.registre;
  return retirees;
};
