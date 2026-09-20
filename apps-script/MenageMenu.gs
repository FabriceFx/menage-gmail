/**
 * Ménage Gmail — points d'entrée. Introduit en v1.0.
 *
 * Le seul fichier du projet qui déclare des `function`. L'éditeur Apps Script
 * ne propose au menu d'exécution que celles-là ; tout l'interne est écrit en
 * `const nom_ = (…) => …` et reste invisible. La séparation entre ce qu'on
 * lance et ce qui est appelé se lit donc dans la forme du code.
 *
 * ## Trois sortes de noms qui n'ont pas le choix d'être globaux
 *
 * Une fonction n'est appelable par son nom, depuis l'extérieur du script, que
 * si elle est déclarée au niveau supérieur **et** ne se termine pas par un
 * trait de soulignement. Quatre mécanismes le réclament :
 *
 *   - `onOpen`, déclencheur simple ;
 *   - les gestionnaires de menu, résolus par leur nom au clic ;
 *   - les cibles de déclencheurs, résolues au réveil ;
 *   - et `menageExecuterAction`, cible de `google.script.run`.
 *
 * Ce dernier cas a coûté une version. Les six actions de modale s'appelaient
 * `executerAppliquerPlan_`, `executerInstallerClasseur_`… et la documentation
 * est formelle : « les fonctions serveur dont le nom se termine par un trait
 * de soulignement sont considérées comme privées ; elles ne peuvent pas être
 * appelées par `google.script` et leurs noms ne sont jamais envoyés au
 * client ». Le client appelait donc `undefined()`, ce qui lève une erreur
 * **côté navigateur** — que `withFailureHandler` ne rattrape pas, puisqu'il
 * n'écoute que le serveur. Les boutons étaient déjà masqués : la modale
 * restait figée sur son rouet, et les six actions du menu étaient mortes.
 *
 * D'où un seul nom exposé, qui aiguille sur une table fermée. Un nom de plus
 * au menu d'exécution au lieu de six, et la liste des actions atteignables
 * depuis le navigateur se lit d'un coup d'œil.
 */

/** Déclencheur simple : aucune autorisation demandée, aucune identité empruntée. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(menageTraductions_('titre_outil'))
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
 * Ce que les modales peuvent lancer
 * ----------------------------------------------------------------------- */

/**
 * La table des actions atteignables depuis une modale.
 *
 * Fermée, et c'est le point : `menageExecuterAction` ne peut rien appeler qui
 * ne figure pas ici. Le nom vient du navigateur, et l'on n'exécute jamais
 * quelque chose que l'on n'a pas nommé soi-même à l'avance.
 *
 * Chaque action rend `{ corps }`, du HTML prêt à l'affichage, ou rien du tout
 * — auquel cas la modale se ferme. Ce qui vient d'ailleurs que des
 * traductions passe par `menageTexteVersHtml_`, qui échappe.
 */
const MENAGE_MODALE_ACTIONS_ = {
  preparer: () => {
    const resultat = SocleExecution.sousVerrou(() => {
      const archivees = menageArchiverPlan_();
      const purgees = menagePurgerQuarantaine_(menageIdentifiantsTraites_(), new Date());
      const prepare = menageOperation_().preparer({ remplacer: true });
      const precochees = menagePrecocherLesDecisionsDeReglage_();
      return { archivees, purgees, prepare, precochees };
    });

    if (!resultat.pris) throw new Error(menageTraductions_('erreur_verrou'));

    const { archivees, purgees, prepare, precochees } = resultat.valeur;
    return {
      corps: menageTexteVersHtml_(
        menageResumePreparation_(prepare, precochees, archivees, purgees)),
    };
  },

  appliquer: () => {
    const resultat = SocleExecution.sousVerrou(() => menageOperation_().appliquer());
    if (!resultat.pris) throw new Error(menageTraductions_('erreur_verrou'));
    return { corps: menageTexteVersHtml_(menageResumeApplication_(resultat.valeur)) };
  },

  installer: () => {
    const { poses, reglages } = menageInstaller_();
    return {
      corps: menageTraductions_('texte_installer',
        poses.length > 0 ? poses.join(', ') : menageTraductions_('aucun_tout_la'),
        reglages.length > 0 ? reglages.join(', ') : menageTraductions_('aucun'),
        MENAGE_ONGLETS_.guide),
    };
  },

  oublier: () => {
    const resultat = menageOperation_().oublierEtat();
    return { corps: menageTraductions_('texte_oublier', resultat.remises, resultat.declencheurs) };
  },

  programmer: () => {
    menageRetirerDeclencheursQuotidiens_();
    ScriptApp.newTrigger('executerLeMenageQuotidien').timeBased().atHour(4).everyDays(1).create();
    return { corps: menageTraductions_('texte_programmer') };
  },

  arreter: () => {
    const retires = menageRetirerDeclencheursQuotidiens_();
    return {
      corps: retires === 0
        ? menageTraductions_('texte_arreter_aucun')
        : menageTraductions_('texte_arreter_fait', retires),
    };
  },
};

/**
 * Le seul nom que `google.script.run` peut atteindre.
 *
 * Sans trait de soulignement final, donc visible au menu d'exécution de
 * l'éditeur : c'est le prix, et il est payé une fois plutôt que six. Lancée
 * de là, sans argument, elle échoue en nommant ce qu'elle attendait — plutôt
 * que de laisser croire qu'elle n'a rien fait.
 *
 * @param {string} nom une clé de `MENAGE_MODALE_ACTIONS_`
 * @returns {{corps: string}}
 */
function menageExecuterAction(nom) {
  const action = MENAGE_MODALE_ACTIONS_[nom];

  if (typeof action !== 'function') {
    throw SocleErreurs.erreur({
      quoi: menageTraductions_('erreur_action_inconnue', nom),
      quoiFaire: `Les actions connues sont : ${Object.keys(MENAGE_MODALE_ACTIONS_).join(', ')}. `
        + 'Cette fonction est appelée par les modales, pas depuis le menu d’exécution.',
    });
  }

  return action();
}

/* --------------------------------------------------------------------------
 * Les deux temps
 * ----------------------------------------------------------------------- */

/**
 * Prépare le plan.
 *
 * Aucune confirmation : la préparation ne modifie rien, et la demander userait
 * le seul geste qui compte — celui qui précède une suppression définitive.
 */
function preparerLePlanDeMenage() {
  MenageUi.afficherTravail(menageTraductions_('titre_preparation'), 'preparer');
}

/** Applique les lignes cochées, après avoir annoncé leur nombre exact. */
function appliquerLePlanDeMenage() {
  const bilan = menageOperation_().bilan();

  if (bilan.aTraiter === 0) {
    MenageUi.afficherMessage(
      menageTraductions_('titre_confirmer'),
      menageTraductions_('erreur_rien_a_traiter', bilan.onglet, bilan.lignes, bilan.validees));
    return;
  }

  MenageUi.afficherConfirmation(
    menageTraductions_('titre_confirmer'),
    menageTraductions_('texte_confirmer', bilan.aTraiter, menageCompterParAction_(MENAGE_ACTIONS_.supprimer)),
    'appliquer');
}

/**
 * Cible du déclencheur de reprise.
 *
 * Doit rester une `function` déclarée portant exactement le nom inscrit dans
 * `MENAGE_FONCTION_REPRISE_` : un déclencheur est résolu par son nom global au
 * moment où il se réveille, et rien ne signale l'erreur avant.
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

/** Retire les déclencheurs quotidiens et dit combien. */
const menageRetirerDeclencheursQuotidiens_ = () => {
  const vises = ScriptApp.getProjectTriggers()
    .filter((declencheur) => declencheur.getHandlerFunction() === 'executerLeMenageQuotidien');
  vises.forEach((declencheur) => ScriptApp.deleteTrigger(declencheur));
  return vises.length;
};

/**
 * Cible du déclencheur quotidien : prépare, puis applique ce qui est pré-coché.
 *
 * Les lignes proposées par le détecteur ne sont pas cochées et ne partent donc
 * pas : elles attendent dans le plan qu'on les relise. Une exécution
 * automatique n'exerce que la politique de rétention, jamais un jugement.
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
      + echecs.causes.map((cause) => `${cause.cause} ×${cause.occurrences}`).join(', '));
  }
}

/**
 * Programme le ménage quotidien.
 *
 * Confirmation demandée : c'est la seule action, avec l'application du plan,
 * qui engage l'outil à agir **sans personne devant l'écran**.
 */
function programmerLeMenageQuotidien() {
  MenageUi.afficherConfirmation(
    menageTraductions_('titre_planification'),
    menageTraductions_('question_programmer'),
    'programmer');
}

/** Retire le déclencheur quotidien. Réversible, donc sans confirmation. */
function arreterLeMenageQuotidien() {
  MenageUi.afficherTravail(menageTraductions_('titre_planification'), 'arreter');
}

/* --------------------------------------------------------------------------
 * Consultation et entretien
 * ----------------------------------------------------------------------- */

/** Dit où en est le plan, sans rien modifier. */
function afficherLEtatDuPlan() {
  const bilan = menageOperation_().bilan();

  const parEtat = Object.keys(bilan.parEtat)
    .map((etat) => `• ${SocleTexte.echapperHtml(etat || '(vide)')} : ${bilan.parEtat[etat]}`)
    .join('<br>');

  MenageUi.afficherMessage(
    menageTraductions_('titre_etat'),
    menageTraductions_('texte_etat',
      SocleTexte.echapperHtml(bilan.onglet),
      bilan.lignes,
      bilan.validees,
      bilan.aTraiter,
      parEtat,
      menageTraductions_(bilan.reprisePrevue ? 'oui' : 'non')));
}

/** Remet en file ce qui a calé, sans toucher à ce qui a eu lieu. */
function oublierLEtatDuPlan() {
  MenageUi.afficherTravail(menageTraductions_('titre_oubli'), 'oublier');
}

/** Installe ou complète les onglets du classeur. Rejouable sans risque. */
function installerLeClasseur() {
  MenageUi.afficherTravail(menageTraductions_('titre_installation'), 'installer');
}

/**
 * Ce qui tourne, et sous quelles portées.
 *
 * La version s'affiche là où l'on se demande ce qui tourne : un déploiement
 * Apps Script sert une copie figée du code, et c'est le seul moyen de savoir
 * laquelle. Les portées y figurent parce qu'elles ont un coût que
 * l'utilisateur a le droit de peser — assorti d'une compensation vérifiable.
 */
function afficherAPropos() {
  const reglages = menageReglages_();

  MenageUi.afficherMessage(
    menageTraductions_('titre_propos', MENAGE_VERSION_),
    menageTraductions_('texte_propos',
      MENAGE_VERSION_,
      reglages.retentionCorbeille,
      reglages.retentionQuarantaine,
      reglages.examenMax,
      menageTraductions_(reglages.suppressionHeuristique ? 'oui' : 'non'),
      menageTraductions_(reglages.protegerContacts ? 'oui' : 'non')),
    { hauteur: 620, largeur: 620 });
}
