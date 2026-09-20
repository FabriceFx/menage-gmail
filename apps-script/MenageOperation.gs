/**
 * Ménage Gmail — l'opération. Introduit en v1.0.
 *
 * Le plan se prépare en lecture seule, un humain le relit, puis l'application
 * traite ligne à ligne en marquant chaque unité au moment où elle est traitée.
 * Le module `PlanPuisApplication` tient la mécanique ; ce fichier dit ce qu'il
 * y a à faire.
 *
 * ## Pourquoi ce découpage n'est pas une précaution de plus
 *
 * Il règle trois défauts d'un coup, et c'est ce qui l'a fait choisir.
 *
 * **La suppression irréversible cesse d'être automatique.** Elle passe par une
 * ligne qu'on relit et une case qu'on coche — pour ce que le détecteur
 * propose, du moins ; la rétention par âge reste appliquée sans confirmation
 * quotidienne, parce que cette décision-là a été prise une fois dans les
 * réglages et qu'un outil qui demanderait chaque matin ne servirait à rien.
 *
 * **La pagination cesse de sauter des messages.** Paginer une recherche qu'on
 * modifie en la parcourant fait glisser les indices : retirer les cent
 * premiers fils décale tous les suivants. Ici la préparation ne fait que lire,
 * et l'application ne travaille plus que sur des identifiants.
 *
 * **Le plafond des six minutes cesse de perdre du travail.** L'état vit dans
 * l'onglet, ligne par ligne, et la reprise repart où elle s'était arrêtée.
 */

/**
 * Compteurs de la préparation, qui ne passent pas par le plan.
 *
 * `construirePlan` ne rend qu'un tableau de lignes ; tout ce qui n'y figure
 * pas — les messages laissés en place, l'arrêt sur budget — se transmet par
 * cet objet muté en place. Un objet `const` et non des `let` de portée
 * globale : ces dernières traversent mal les fichiers d'un même projet.
 */
const MENAGE_PREPARATION_ = {
  corbeilleExaminee: 0,
  spamExamine: 0,
  laisses: 0,
  arret: null,
  contactsComplets: true,
  contacts: 0,
};

const MENAGE_MEMOIRE_OPERATION_ = {};

/**
 * L'opération, construite à la première demande et mémorisée.
 *
 * Surtout pas un `const OPERATION = PlanPuisApplication.declarer(…)` évalué au
 * chargement : cela créerait une dépendance à l'ordre des fichiers, que
 * l'éditeur Apps Script ne garantit pas. `PlanPuisApplication` pourrait n'être
 * pas encore défini, le projet entier échouerait à se charger, et **toutes**
 * ses fonctions deviendraient « introuvables » d'un coup — y compris celles
 * qui n'ont rien à voir.
 */
const menageOperation_ = () => {
  if (MENAGE_MEMOIRE_OPERATION_.operation) return MENAGE_MEMOIRE_OPERATION_.operation;

  MENAGE_MEMOIRE_OPERATION_.operation = PlanPuisApplication.declarer({
    cle: 'menageGmail',
    onglet: MENAGE_ONGLETS_.plan,
    colonnes: MENAGE_COLONNES_PLAN_,
    fonctionDeReprise: MENAGE_FONCTION_REPRISE_,

    /*
     * `verifier` et non `rejouer` : une suppression définitive interrompue
     * entre l'action et l'écriture de son état ne se rejoue pas. Si le message
     * est parti, le rejeu échouera sur un identifiant absent ; s'il n'est pas
     * parti, personne ne le sait. La ligne sort de la file et attend un
     * humain, ce qui est le seul verdict honnête.
     */
    surInterruption: 'verifier',

    construirePlan: () => menageConstruirePlan_(),
    appliquerUnite: (ligne) => menageAppliquerUnite_(ligne),

    /*
     * Le tri vaut la reprise. Rejouer trois fois ce qui n'a aucune chance
     * d'aboutir — un identifiant qui n'existe plus, une portée refusée —
     * consomme 2,4 secondes d'attente pure par ligne, et c'est ainsi qu'on
     * dépasse le plafond des six minutes en croyant se montrer robuste.
     */
    estTransitoire: (erreur) => SocleReprises.estTransitoire(erreur),

    cloture: (bilan) => {
      console.log(`Ménage appliqué : ${bilan.traitees} action(s) sur « ${bilan.onglet} ».`);
    },
  });

  return MENAGE_MEMOIRE_OPERATION_.operation;
};

/* --------------------------------------------------------------------------
 * Préparation
 * ----------------------------------------------------------------------- */

/**
 * Parcourt la Corbeille et le Spam, et rend les lignes à soumettre.
 *
 * Seules les lignes qui appellent une action entrent au plan. Les messages
 * laissés en place sont comptés, jamais listés : un plan où neuf lignes sur
 * dix ne demandent rien ne se relit plus, et un plan qu'on ne relit plus ne
 * protège de rien. Le compte, lui, figure au bilan — parce qu'une colonne
 * vide veut dire « non mesuré », et qu'il fallait pouvoir dire « mesuré,
 * et rien à faire ».
 */
const menageConstruirePlan_ = () => {
  const maintenant = new Date();
  const reglages = menageReglages_();
  const budget = SocleExecution.budget();

  const { adresses: contacts, complet } = menageContacts_();

  Object.assign(MENAGE_PREPARATION_, {
    corbeilleExaminee: 0,
    spamExamine: 0,
    laisses: 0,
    arret: null,
    contactsComplets: complet,
    contacts: contacts.size,
  });

  const lignes = [];
  let reste = reglages.examenMax;

  /* --- Corbeille ---------------------------------------------------------
   *
   * Toute la corbeille, sans filtre d'ancienneté : un message non libellé y
   * part en quarantaine quel que soit son âge, et `older_than` le laisserait
   * indéfiniment en place.
   */
  const corbeille = menageParcourir_('in:trash', budget, reste, (message, libelles) => {
    const vu = menageLireMessage_(message, libelles, contacts, maintenant);
    const decision = menageDeciderCorbeille_(vu);

    if (decision.action === MENAGE_ACTIONS_.laisser) {
      MENAGE_PREPARATION_.laisses += 1;
      return true;
    }

    /*
     * Une liste de contacts incomplète désarme la protection sans le dire :
     * on refuse alors de proposer la moindre suppression heuristique, et le
     * message part en quarantaine comme les autres. Il sera repris demain,
     * quand People répondra.
     */
    if (decision.decideur === MENAGE_DECIDEURS_.detecteur && !complet) {
      lignes.push(menageLignePlan_(MENAGE_EMPLACEMENTS_.corbeille, vu, {
        action: MENAGE_ACTIONS_.quarantaine,
        decideur: MENAGE_DECIDEURS_.reglage,
        motif: `contacts chargés partiellement : suppression non proposée — ${decision.motif}`,
      }));
      return true;
    }

    lignes.push(menageLignePlan_(MENAGE_EMPLACEMENTS_.corbeille, vu, decision));
    return true;
  });

  MENAGE_PREPARATION_.corbeilleExaminee = corbeille.examines;
  MENAGE_PREPARATION_.arret = corbeille.arret;
  reste -= corbeille.examines;

  /* --- Spam --------------------------------------------------------------
   *
   * `older_than` restreint la recherche aux seuls candidats : sans lui, on
   * lirait chaque jour les milliers de spams récents pour conclure à chaque
   * fois qu'il n'y a rien à en faire. Gmail compte en jours pleins, d'où le
   * `-1` — mieux vaut examiner un jour de trop que manquer la frontière.
   *
   * Les messages mis en quarantaine y figurent aussi, puisqu'ils portent la
   * date de leur message d'origine ; c'est le registre, consulté par la
   * décision, qui leur rend leurs sept jours.
   */
  if (!MENAGE_PREPARATION_.arret && reste > 0) {
    const seuil = Math.max(1, reglages.retentionQuarantaine - 1);
    const spam = menageParcourir_(`in:spam older_than:${seuil}d`, budget, reste, (message, libelles) => {
      const vu = menageLireMessage_(message, libelles, contacts, maintenant);
      const decision = menageDeciderSpam_(vu, maintenant);

      if (decision.action === MENAGE_ACTIONS_.laisser) {
        MENAGE_PREPARATION_.laisses += 1;
        return true;
      }

      lignes.push(menageLignePlan_(MENAGE_EMPLACEMENTS_.spam, vu, decision));
      return true;
    });

    MENAGE_PREPARATION_.spamExamine = spam.examines;
    MENAGE_PREPARATION_.arret = spam.arret;
  }

  return lignes;
};

/* --------------------------------------------------------------------------
 * Application
 * ----------------------------------------------------------------------- */

/**
 * Exécute une ligne du plan.
 *
 * Le verbe est lu dans la ligne, pas recalculé : le plan est ce qui a été
 * relu et validé, et refaire le calcul ici ouvrirait l'écart entre ce qu'un
 * humain a approuvé et ce qui a lieu. Une ligne modifiée à la main — un
 * « Supprimer définitivement » changé en autre chose — est refusée plutôt
 * qu'interprétée.
 *
 * @returns {string} ce qui s'écrit dans la colonne « Détail »
 */
const menageAppliquerUnite_ = (ligne) => {
  const identifiant = String(ligne.Identifiant ?? '').trim();
  if (identifiant === '') {
    throw SocleErreurs.erreur({
      quoi: 'Ligne de plan sans identifiant de message.',
      quoiFaire: 'Supprimez cette ligne, puis préparez le plan à nouveau.',
    });
  }

  const action = String(ligne.Action ?? '').trim();

  if (action === MENAGE_ACTIONS_.supprimer) {
    return menageSupprimerDefinitivement_(identifiant);
  }

  if (action === MENAGE_ACTIONS_.quarantaine) {
    const detail = menageMettreEnQuarantaine_(identifiant);

    // L'inscription suit le déplacement, jamais l'inverse : une quarantaine
    // sans message n'aurait aucun sens, un message sans quarantaine en a un,
    // même mauvais.
    if (detail !== 'Déjà absent') {
      menageInscrireEnQuarantaine_({
        identifiant,
        expediteur: ligne.Expéditeur,
        objet: ligne.Objet,
        ageEntree: ligne['Âge (jours)'],
      });
    }
    return detail;
  }

  throw SocleErreurs.erreur({
    quoi: `Action « ${action} » inconnue.`,
    quoiFaire: `Les seules actions applicables sont « ${MENAGE_ACTIONS_.supprimer} » `
      + `et « ${MENAGE_ACTIONS_.quarantaine} ». Corrigez la cellule, ou préparez le plan à nouveau.`,
  });
};
