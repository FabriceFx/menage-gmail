/**
 * Ménage Gmail — l'arbre de décision. Introduit en v1.0.
 *
 * Une fonction pure, et c'est le point : elle reçoit ce qu'on a lu du message
 * et rend le verdict, sans jamais appeler Gmail ni le classeur. C'est ce qui
 * rend la politique de rétention vérifiable au banc, cas limite par cas limite
 * — sept jours pile, âge inconnu, message déjà en quarantaine — là où une
 * décision imbriquée dans la boucle de traitement ne se teste qu'en production,
 * sur du vrai courrier, et une seule fois.
 *
 * ## Les règles, dans l'ordre où elles s'appliquent
 *
 * BOÎTE DE RÉCEPTION : jamais touchée. Le script ne l'interroge même pas.
 *
 * CORBEILLE
 *   expéditeur protégé          → laisser
 *   libellé par l'utilisateur   → laisser jusqu'à expiration, puis supprimer
 *   déchet caractérisé          → proposer la suppression (jamais l'appliquer seul)
 *   sinon                       → mettre en quarantaine dans le Spam
 *
 * SPAM
 *   expéditeur protégé          → laisser
 *   quarantaine à date illisible → laisser, à vérifier
 *   quarantaine expirée         → supprimer
 *   message expiré              → supprimer
 *   sinon                       → laisser
 *
 * ## Ce qu'un âge inconnu vaut
 *
 * Jamais une suppression. Un message dont la date est illisible reste où il
 * est, indéfiniment. C'est un choix : il fait grossir la corbeille de quelques
 * messages exotiques, et il évite qu'un horodatage mal formé ne devienne un
 * motif d'effacement.
 */

/**
 * Décide du sort d'un message de la Corbeille.
 *
 * L'âge a déjà été mesuré à la lecture : la décision n'a pas besoin de savoir
 * quelle heure il est, ce qui la rend rejouable telle quelle au banc.
 *
 * @param {Object} vu message lu par `menageLireMessage_`
 * @returns {{action: string, decideur: ?string, motif: string, verdict: ?Object}}
 */
const menageDeciderCorbeille_ = (vu) => {
  const reglages = menageReglages_();

  if (menageEstProtege_(vu.adresse)) {
    return { action: MENAGE_ACTIONS_.laisser, decideur: null, motif: 'expéditeur protégé', verdict: null };
  }

  /*
   * Un libellé posé à la main est une intention explicite : la personne a
   * rangé ce message avant de le jeter. On lui laisse la rétention complète,
   * et le détecteur n'a pas voix au chapitre — c'est le seul endroit où un
   * jugement humain déjà exprimé l'emporte sur l'analyse automatique.
   *
   * `getLabels()` ne rend que les libellés créés par l'utilisateur ; le filtre
   * sur les noms système de la version précédente ne servait à rien, et aurait
   * écarté un libellé que quelqu'un aurait nommé « Important ».
   */
  if (vu.libelles.length > 0) {
    if (menageAgeDepasse_(vu.age, reglages.retentionCorbeille)) {
      return {
        action: MENAGE_ACTIONS_.supprimer,
        decideur: MENAGE_DECIDEURS_.reglage,
        motif: `libellé, dans la corbeille depuis ${menageAgeLisible_(vu.age)}`
          + ` (seuil ${reglages.retentionCorbeille} j)`,
        verdict: null,
      };
    }
    return {
      action: MENAGE_ACTIONS_.laisser,
      decideur: null,
      motif: `libellé (${vu.libelles.join(', ')}), ${menageAgeLisible_(vu.age)}`,
      verdict: null,
    };
  }

  /*
   * Le détecteur ne propose une suppression que si le réglage l'y autorise, et
   * ce réglage vaut « Non » à l'installation.
   *
   * La raison tient en une phrase : un déchet non supprimé aujourd'hui part en
   * quarantaine et sera supprimé dans sept jours de toute façon. La suppression
   * immédiate ne gagne donc que ces sept jours — au prix d'une perte sans
   * retour chaque fois que l'heuristique se trompe. Le marché est mauvais, et
   * c'est pourquoi le défaut penche de l'autre côté.
   */
  const verdict = menageJuger_(vu);

  if (verdict.dechet && reglages.suppressionHeuristique) {
    return {
      action: MENAGE_ACTIONS_.supprimer,
      decideur: MENAGE_DECIDEURS_.detecteur,
      motif: menageMotifLisible_(verdict),
      verdict,
    };
  }

  return {
    action: MENAGE_ACTIONS_.quarantaine,
    decideur: MENAGE_DECIDEURS_.reglage,
    motif: verdict.dechet
      ? `déchet probable — ${menageMotifLisible_(verdict)}`
      : `ni libellé ni protégé — ${menageMotifLisible_(verdict)}`,
    verdict,
  };
};

/**
 * Décide du sort d'un message du Spam.
 *
 * Le seul verbe possible est « supprimer » : rien ne sort du Spam par ce
 * script. Un message qui s'y trouve à tort se récupère depuis Gmail, d'un
 * clic, et c'est très exactement ce que la quarantaine sert à rendre possible.
 */
const menageDeciderSpam_ = (vu, maintenant) => {
  const reglages = menageReglages_();

  if (menageEstProtege_(vu.adresse)) {
    return { action: MENAGE_ACTIONS_.laisser, decideur: null, motif: 'expéditeur protégé', verdict: null };
  }

  const { age, depuisQuarantaine } = menageAgeEnQuarantaine_(vu.identifiant, vu.age, maintenant);

  if (depuisQuarantaine && !age.connu) {
    return {
      action: MENAGE_ACTIONS_.laisser,
      decideur: null,
      motif: `en quarantaine, mais ${menageAgeLisible_(age)} — date à vérifier dans l'onglet ${MENAGE_ONGLETS_.quarantaine}`,
      verdict: null,
    };
  }

  if (menageAgeDepasse_(age, reglages.retentionQuarantaine)) {
    return {
      action: MENAGE_ACTIONS_.supprimer,
      decideur: MENAGE_DECIDEURS_.reglage,
      motif: depuisQuarantaine
        ? `en quarantaine depuis ${menageAgeLisible_(age)} (seuil ${reglages.retentionQuarantaine} j)`
        : `dans le spam depuis ${menageAgeLisible_(age)} (seuil ${reglages.retentionQuarantaine} j)`,
      verdict: null,
    };
  }

  return {
    action: MENAGE_ACTIONS_.laisser,
    decideur: null,
    motif: depuisQuarantaine
      ? `en quarantaine depuis ${menageAgeLisible_(age)}`
      : `dans le spam depuis ${menageAgeLisible_(age)}`,
    verdict: null,
  };
};

/**
 * Transforme un verdict en ligne de plan.
 *
 * L'ordre des colonnes suit celui de `MENAGE_COLONNES_PLAN_`, mais les valeurs
 * sont posées par nom : une colonne insérée à la main dans l'onglet ne doit
 * décaler aucune écriture.
 */
const menageLignePlan_ = (emplacement, vu, decision) => ({
  Emplacement: emplacement,
  Action: decision.action,
  'Décidée par': decision.decideur || '',
  Expéditeur: menageUneLigne_(vu.expediteur),
  Objet: menageUneLigne_(vu.objet),
  'Âge (jours)': menageAgePourCellule_(vu.age),
  Libellés: vu.libelles.join(', '),
  Contact: vu.contact ? 'Oui' : '',
  Motif: menageUneLigne_(decision.motif, 400),
  Identifiant: vu.identifiant,
});
