/**
 * Ménage Gmail — l'âge d'un message. Introduit en v1.0.
 *
 * Une seule règle, et elle commande toute la sûreté de l'outil : **un âge
 * inconnu n'autorise jamais une suppression.** Une date illisible n'est pas
 * une date ancienne, et la confusion entre les deux est exactement la façon
 * dont un outil de rétention se met à effacer ce qu'il ne comprend pas.
 *
 * D'où un objet de retour qui porte `connu` à côté de la valeur, et jamais un
 * nombre seul : un appelant qui reçoit `0` ne peut pas savoir s'il lit « reçu
 * aujourd'hui » ou « je n'ai pas su ». Une colonne vide veut dire « non
 * mesuré », jamais « rien trouvé ».
 */

const MENAGE_MS_PAR_JOUR_ = 24 * 60 * 60 * 1000;

const MENAGE_AGE_INCONNU_ = {
  dateInvalide: 'DATE_ILLISIBLE',
  avantPlancher: 'DATE_ANTÉRIEURE_AU_PLANCHER',
  futur: 'DATE_DANS_LE_FUTUR',
};

/**
 * Rend l'âge d'une date, ou dit pourquoi il n'est pas mesurable.
 *
 * `maintenant` est un paramètre et non un `new Date()` interne : sans cela le
 * banc devrait attendre pour observer un vieillissement, et les cas limites —
 * exactement sept jours, une seconde de plus — ne seraient pas testables.
 *
 * @param {Date|*} valeur date à mesurer, telle que la rend `getDate()`
 * @param {Date} [maintenant] instant de référence
 * @returns {{connu: boolean, jours: ?number, date: ?Date, cause: ?string}}
 */
const menageAge_ = (valeur, maintenant = new Date()) => {
  const date = valeur instanceof Date ? valeur : new Date(valeur);

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { connu: false, jours: null, date: null, cause: MENAGE_AGE_INCONNU_.dateInvalide };
  }

  if (date.getTime() < MENAGE_DATE_PLANCHER_MS_) {
    return { connu: false, jours: null, date, cause: MENAGE_AGE_INCONNU_.avantPlancher };
  }

  const plafondFutur = maintenant.getTime() + MENAGE_JOURS_FUTUR_TOLERES_ * MENAGE_MS_PAR_JOUR_;
  if (date.getTime() > plafondFutur) {
    return { connu: false, jours: null, date, cause: MENAGE_AGE_INCONNU_.futur };
  }

  return {
    connu: true,
    jours: (maintenant.getTime() - date.getTime()) / MENAGE_MS_PAR_JOUR_,
    date,
    cause: null,
  };
};

/**
 * Vrai si l'âge est connu **et** dépasse la rétention.
 *
 * Le seul endroit du projet où se compare un âge à un seuil. La comparaison
 * est ailleurs trop facile à écrire à l'envers, et une inégalité inversée
 * supprime ce qui vient d'arriver au lieu de ce qui a expiré.
 */
const menageAgeDepasse_ = (age, jours) => age.connu && age.jours > jours;

/**
 * L'âge tel qu'il s'écrit dans une cellule de plan.
 *
 * Un nombre quand il est mesuré — pour qu'il se trie et se filtre —, une
 * chaîne vide quand il ne l'est pas. Surtout pas `0` : une colonne numérique
 * où « non mesuré » vaudrait zéro ferait apparaître ces lignes en tête d'un
 * tri par ancienneté, à l'endroit exact où l'œil cherche ce qui est à
 * supprimer.
 */
const menageAgePourCellule_ = (age) => (age.connu ? Number(age.jours.toFixed(2)) : '');

/** L'âge tel qu'il se lit dans un motif, cause comprise. */
const menageAgeLisible_ = (age) => {
  if (age.connu) return `${age.jours.toFixed(2)} j`;
  return age.cause ? `âge inconnu (${age.cause})` : 'âge inconnu';
};
