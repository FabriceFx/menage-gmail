/**
 * Ménage Gmail — points d'entrée. Introduit en v1.0.
 *
 * Le seul fichier du projet qui déclare des `function`. L'éditeur Apps Script
 * ne propose au menu d'exécution que celles-là ; tout l'interne du projet est
 * écrit en `const nom_ = (…) => …` et reste invisible. La séparation entre ce
 * qu'on lance et ce qui est appelé se lit donc dans la forme du code, et l'on
 * ne déclenche plus par mégarde une fonction interne à la place d'un point
 * d'entrée — ce qui, ici, ferait tourner le traitement hors de tout verrou.
 *
 * Les cibles de déclencheurs et les gestionnaires de menu sont résolus par
 * leur nom global au moment où ils se réveillent : ils n'ont pas le choix
 * d'être des `function` déclarées.
 *
 * ## Pourquoi un projet lié au classeur
 *
 * Un projet lié donne `onOpen()` comme déclencheur simple : le menu apparaît
 * sans rien installer, et chaque action s'exécute sous l'identité de qui la
 * déclenche. Un projet autonome exigerait un déclencheur installable, lequel
 * s'exécute sous l'identité de celui qui l'a posé — de sorte que toute
 * personne à qui l'on partagerait le classeur agirait sur **sa** boîte Gmail
 * à lui. Pour un outil qui supprime définitivement du courrier, c'est une
 * faute, et la bonne défense est celle qu'on n'a pas eu à coder.
 *
 * Le ménage automatique, lui, demande un déclencheur temporel : c'est la seule
 * chose qui s'installe, et elle s'installe depuis le menu, par le propriétaire.
 */

/** Déclencheur simple : aucune autorisation demandée, aucune identité empruntée. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Ménage Gmail')
    .addItem(menageTraductions_('menu_preparer'), 'preparerLePlanDeMenage')
    .addItem(menageTraductions_('menu_appliquer'), 'appliquerLePlanDeMenage')
    .addSeparator()
    .addItem(menageTraductions_('menu_etat'), 'afficherLEtatDuPlan')
    .addItem(menageTraductions_('menu_oublier'), 'oublierLEtatDuPlan')
    .addSeparator()
    .addItem(menageTraductions_('menu_installer'), 'installerLeClasseur')
    .addItem(menageTraductions_('menu_programmer'), 'programmerLeMenageQuotidien')
    .addItem(menageTraductions_('menu_arreter'), 'arreterLeMenageQuotidien')
    .addSeparator()
    .addItem(menageTraductions_('menu_propos'), 'afficherAPropos')
    .addToUi();
}

/* --------------------------------------------------------------------------
 * Les deux temps
 * ----------------------------------------------------------------------- */

/** Lance la préparation en arrière-plan via la modale. */
function preparerLePlanDeMenage() {
  MenageUi.afficherConfirmation(
    menageTraductions_('titre_erreur'),
    menageTraductions_('menu_preparer') + ' ?',
    'executerPreparerPlan_'
  );
}

/** Fonction globale appelée par la modale pour préparer le plan. */
function executerPreparerPlan_() {
  const resultat = SocleExecution.sousVerrou(() => {
    const archivees = menageArchiverPlan_();
    const purgees = menagePurgerQuarantaine_(menageIdentifiantsTraites_(), new Date());
    const prepare = menageOperation_().preparer({ remplacer: true });
    const precochees = menagePrecocherLesDecisionsDeReglage_();
    return { archivees, purgees, prepare, precochees };
  });

  if (!resultat.pris) {
    throw new Error(menageTraductions_('erreur_verrou'));
  }

  const { archivees, purgees, prepare, precochees } = resultat.valeur;
  
  return {
    titre: menageTraductions_('titre_preparation'),
    corps: menageResumePreparation_(prepare, precochees, archivees, purgees).replace(/\n/g, '<br>')
  };
}

/** Applique les lignes cochées, après avoir annoncé leur nombre exact. */
function appliquerLePlanDeMenage() {
  const bilan = menageOperation_().bilan();

  if (bilan.aTraiter === 0) {
    MenageUi.afficherMessage(
      menageTraductions_('titre_erreur'),
      menageTraductions_('erreur_rien_a_traiter', bilan.onglet, bilan.lignes, bilan.validees)
    );
    return;
  }

  const suppressions = menageCompterParAction_(MENAGE_ACTIONS_.supprimer);
  
  MenageUi.afficherConfirmation(
    menageTraductions_('titre_confirmer'),
    menageTraductions_('texte_confirmer', bilan.aTraiter, suppressions),
    'executerAppliquerPlan_'
  );
}

/** Fonction globale appelée par la modale pour appliquer le plan. */
function executerAppliquerPlan_() {
  const resultat = SocleExecution.sousVerrou(() => menageOperation_().appliquer());

  if (!resultat.pris) {
    throw new Error(menageTraductions_('erreur_verrou'));
  }

  return {
    titre: menageTraductions_('titre_application'),
    corps: menageResumeApplication_(resultat.valeur).replace(/\n/g, '<br>')
  };
}

/**
 * Cible du déclencheur de reprise.
 */
function reprendreLApplicationDuMenage() {
  const resultat = SocleExecution.sousVerrou(() => menageOperation_().reprendre());
  if (!resultat.pris) {
    console.log('Reprise renoncée : une autre exécution tient le verrou.');
    return;
  }
  console.log(menageResumeApplication_(resultat.valeur));
}

/* --------------------------------------------------------------------------
 * Ménage automatique
 * ----------------------------------------------------------------------- */

/**
 * Cible du déclencheur quotidien : prépare, puis applique ce qui est pré-coché.
 */
function executerLeMenageQuotidien() {
  const resultat = SocleExecution.sousVerrou(() => {
    menageArchiverPlan_();
    menagePurgerQuarantaine_(menageIdentifiantsTraites_(), new Date());
    const prepare = menageOperation_().preparer({ remplacer: true });
    const precochees = menagePrecocherLesDecisionsDeReglage_();
    const applique = menageOperation_().appliquer();
    return { prepare, precochees, applique };
  });

  if (!resultat.pris) {
    console.log('Ménage quotidien renoncé : une autre exécution tient le verrou.');
    return;
  }

  const { prepare, precochees, applique } = resultat.valeur;
  console.log(`Ménage Gmail v${MENAGE_VERSION_} — ${prepare.lignes} ligne(s) au plan, `
    + `${precochees} pré-cochée(s), ${applique.traitees} appliquée(s), `
    + `${applique.restant} en attente.`);
  const echecs = SocleErreurs.bilan();
  if (echecs.total > 0) {
    console.warn(`${echecs.total} échec(s) absorbé(s) : `
      + echecs.causes.map((c) => `${c.cause} ×${c.occurrences}`).join(', '));
  }
}

/** Pose le déclencheur quotidien, après avoir retiré les précédents. */
function programmerLeMenageQuotidien() {
  MenageUi.afficherConfirmation(
    menageTraductions_('titre_erreur'),
    menageTraductions_('texte_programmer'),
    'executerProgrammerMenage_'
  );
}

function executerProgrammerMenage_() {
  ScriptApp.getProjectTriggers()
    .filter((declencheur) => declencheur.getHandlerFunction() === 'executerLeMenageQuotidien')
    .forEach((declencheur) => ScriptApp.deleteTrigger(declencheur));

  ScriptApp.newTrigger('executerLeMenageQuotidien').timeBased().atHour(4).everyDays(1).create();
  
  return {
    titre: menageTraductions_('titre_erreur'),
    corps: menageTraductions_('texte_programmer')
  };
}

/** Retire le déclencheur quotidien. */
function arreterLeMenageQuotidien() {
  MenageUi.afficherConfirmation(
    menageTraductions_('titre_erreur'),
    menageTraductions_('menu_arreter') + ' ?',
    'executerArreterMenage_'
  );
}

function executerArreterMenage_() {
  const retires = ScriptApp.getProjectTriggers()
    .filter((declencheur) => declencheur.getHandlerFunction() === 'executerLeMenageQuotidien');

  retires.forEach((declencheur) => ScriptApp.deleteTrigger(declencheur));

  return {
    titre: menageTraductions_('titre_erreur'),
    corps: retires.length === 0 ? menageTraductions_('texte_arreter_aucun') : menageTraductions_('texte_arreter_fait', retires.length)
  };
}

/* --------------------------------------------------------------------------
 * Consultation et entretien
 * ----------------------------------------------------------------------- */

/** Dit où en est le plan, sans rien modifier. */
function afficherLEtatDuPlan() {
  const bilan = menageOperation_().bilan();

  const parEtat = Object.keys(bilan.parEtat)
    .map((etat) => `• ${etat || '(vide)'} : ${bilan.parEtat[etat]}`)
    .join('<br>');

  MenageUi.afficherMessage(
    menageTraductions_('titre_etat'),
    menageTraductions_('texte_etat', 
      bilan.onglet, 
      bilan.lignes, 
      bilan.validees, 
      bilan.aTraiter, 
      parEtat, 
      bilan.reprisePrevue ? menageTraductions_('oui') : menageTraductions_('non')
    )
  );
}

/** Remet en file ce qui a calé, sans toucher à ce qui a eu lieu. */
function oublierLEtatDuPlan() {
  MenageUi.afficherConfirmation(
    menageTraductions_('titre_erreur'),
    menageTraductions_('menu_oublier') + ' ?',
    'executerOublierEtat_'
  );
}

function executerOublierEtat_() {
  const resultat = menageOperation_().oublierEtat();
  return {
    titre: menageTraductions_('titre_erreur'),
    corps: menageTraductions_('texte_oublier', resultat.remises, resultat.declencheurs)
  };
}

/** Installe ou complète les onglets du classeur. Rejouable sans risque. */
function installerLeClasseur() {
  MenageUi.afficherConfirmation(
    menageTraductions_('titre_erreur'),
    menageTraductions_('menu_installer') + ' ?',
    'executerInstallerClasseur_'
  );
}

function executerInstallerClasseur_() {
  const { poses, reglages } = menageInstaller_();
  
  const textePoses = poses.length > 0 ? poses.join(', ') : menageTraductions_('aucun_tout_la');
  const texteReglages = reglages.length > 0 ? reglages.join(', ') : menageTraductions_('aucun');
  
  return {
    titre: menageTraductions_('titre_erreur'),
    corps: menageTraductions_('texte_installer', textePoses, texteReglages, MENAGE_ONGLETS_.guide)
  };
}

/**
 * Ce qui tourne, et sous quelles portées.
 */
function afficherAPropos() {
  const reglages = menageReglages_();

  MenageUi.afficherMessage(
    menageTraductions_('titre_propos', MENAGE_VERSION_),
    menageTraductions_('texte_propos',
      reglages.retentionCorbeille,
      reglages.retentionQuarantaine,
      reglages.examenMax,
      reglages.suppressionHeuristique ? menageTraductions_('oui') : menageTraductions_('non'),
      reglages.protegerContacts ? menageTraductions_('oui') : menageTraductions_('non')
    ),
    { hauteur: 550, largeur: 600 }
  );
}
