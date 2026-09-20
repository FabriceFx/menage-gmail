/**
 * Ménage Gmail — pré-cochage et résumés. Introduit en v1.0.
 *
 * ## Le pré-cochage, et pourquoi il n'est pas une entorse
 *
 * Le motif « plan puis application » veut qu'une ligne non cochée ne soit
 * jamais traitée. Appliqué sans nuance à un ménage quotidien, il obligerait à
 * cocher chaque matin des dizaines de lignes qui ne font qu'exécuter une règle
 * déjà décidée — et personne ne le ferait longtemps : on finirait par tout
 * cocher sans lire, ce qui est pire que de ne pas cocher du tout.
 *
 * La ligne de partage n'est donc pas « irréversible ou non », elle est **qui a
 * décidé** :
 *
 *   - une ligne décidée par un réglage applique une politique qu'un humain a
 *     posée une fois, dans un onglet qu'il peut relire ; elle part cochée ;
 *   - une ligne décidée par le détecteur est un jugement de la machine sur des
 *     correspondances de texte ; elle ne part jamais cochée.
 *
 * Le pré-cochage est visible : la colonne « Décidée par » le dit en toutes
 * lettres, et le guide l'explique. Une automatisation qu'on ne peut pas voir
 * n'est pas une automatisation, c'est une surprise.
 *
 * ## Les résumés
 *
 * Un chiffre s'accompagne toujours de ce qui le produit. Annoncer « 42 lignes
 * au plan » sans dire combien de messages ont été examinés, combien ont été
 * laissés en place et si l'examen s'est arrêté avant la fin laisse croire à un
 * balayage complet là où il n'y a eu qu'un échantillon.
 */

/**
 * Coche les lignes décidées par un réglage, en une seule écriture.
 *
 * Une écriture par ligne coûterait un aller-retour par message ; sur un plan
 * de plusieurs centaines de lignes, cela suffit à consommer le budget de la
 * préparation et à la faire tuer avant qu'elle ait rendu la main.
 *
 * @returns {number} le nombre de lignes cochées
 */
const menagePrecocherLesDecisionsDeReglage_ = () => {
  const table = SocleErreurs.absorber(
    'lecture du plan à pré-cocher',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.plan),
    null);

  if (!table || table.lignes.length === 0) return 0;

  const colonneValider = table.index.Valider;
  const colonneDecideur = table.index['Décidée par'];

  if (colonneValider === undefined || colonneDecideur === undefined) {
    throw SocleErreurs.erreur({
      quoi: `Le plan « ${MENAGE_ONGLETS_.plan} » n’a pas ses colonnes « Valider » `
        + 'et « Décidée par ».',
      quoiFaire: 'Préparez le plan à nouveau depuis le menu ; il sera réécrit avec '
        + 'ses colonnes.',
    });
  }

  const cases = table.lignes.map((ligne) => [
    String(ligne['Décidée par'] ?? '').trim() === MENAGE_DECIDEURS_.reglage,
  ]);

  const cochees = cases.filter(([valeur]) => valeur).length;
  if (cochees === 0) return 0;

  table.feuille.getRange(2, colonneValider + 1, cases.length, 1).setValues(cases);
  SpreadsheetApp.flush();

  return cochees;
};

/** Compte les lignes cochées et en attente qui portent une action donnée. */
const menageCompterParAction_ = (action) => {
  const table = SocleErreurs.absorber(
    'comptage des actions du plan',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.plan),
    null);

  if (!table) return 0;

  return table.lignes.filter((ligne) => {
    if (ligne.Valider !== true) return false;
    const etat = String(ligne['État'] ?? '').trim();
    const enAttente = etat === '' || etat === PlanPuisApplication.etats.aFaire
      || etat === PlanPuisApplication.etats.aReprendre;
    return enAttente && String(ligne.Action ?? '').trim() === action;
  }).length;
};

/**
 * Ce que la préparation a fait, avec de quoi juger si elle a tout vu.
 *
 * L'arrêt anticipé se dit toujours, et il se dit en premier : une préparation
 * qui s'est arrêtée au bout de mille cinq cents messages a produit un plan
 * juste, mais partiel, et celui qui le relit doit le savoir avant d'en tirer
 * une conclusion sur l'état de sa corbeille.
 */
const menageResumePreparation_ = (prepare, precochees, archivees, purgees) => {
  const examines = MENAGE_PREPARATION_.corbeilleExaminee + MENAGE_PREPARATION_.spamExamine;
  const lignes = [];

  if (MENAGE_PREPARATION_.arret === 'budget') {
    lignes.push('EXAMEN INTERROMPU — le temps imparti à une exécution a été atteint.',
      'Relancez la préparation : elle reprendra sur ce qui reste.', '');
  } else if (MENAGE_PREPARATION_.arret === 'plafond') {
    lignes.push(`EXAMEN INTERROMPU — plafond de ${menageReglages_().examenMax} messages atteint.`,
      'Relancez la préparation, ou relevez le plafond dans l’onglet « Réglages ».', '');
  }

  if (!MENAGE_PREPARATION_.contactsComplets) {
    lignes.push('CONTACTS CHARGÉS PARTIELLEMENT — la protection des correspondants connus',
      'n’a pas pu s’appliquer entièrement. Aucune suppression n’a été proposée par le',
      'détecteur pendant cette préparation.', '');
  }

  lignes.push(
    `${prepare.lignes} ligne(s) au plan « ${prepare.onglet} », dont ${precochees} déjà cochée(s).`,
    '',
    'EXAMEN',
    `    Corbeille : ${MENAGE_PREPARATION_.corbeilleExaminee} message(s)`,
    `    Spam : ${MENAGE_PREPARATION_.spamExamine} message(s)`,
    `    Total : ${examines}`,
    `    Laissés en place : ${MENAGE_PREPARATION_.laisses}`,
    `    Contacts protégés : ${MENAGE_PREPARATION_.contacts}`,
    '',
    'LIGNES COCHÉES',
    '    Décidées par un réglage de rétention. Elles s’appliqueront telles quelles.',
    '',
    'LIGNES NON COCHÉES',
    '    Proposées par le détecteur. Relisez-les : une suppression définitive',
    '    ne se récupère pas. Cochez ce que vous approuvez, laissez le reste.',
  );

  if (archivees > 0) lignes.push('', `${archivees} ligne(s) du plan précédent archivée(s) au journal.`);
  if (purgees > 0) lignes.push(`${purgees} ligne(s) retirée(s) du registre de quarantaine.`);

  const echecs = SocleErreurs.bilan();
  if (echecs.total > 0) {
    lignes.push('', `${echecs.total} échec(s) absorbé(s) pendant l’examen :`);
    echecs.causes.forEach((cause) => lignes.push(`    ${cause.cause} ×${cause.occurrences}`));
  }

  return lignes.join('\n');
};

/** Ce que l'application a fait, et ce qu'il reste. */
const menageResumeApplication_ = (bilan) => {
  const lignes = [
    `${bilan.traitees} action(s) appliquée(s).`,
    `${bilan.restant} ligne(s) cochée(s) restent en attente.`,
  ];

  if (bilan.arret === 'budget') {
    lignes.push('', 'Le temps imparti à une exécution a été atteint.');
  }

  if (bilan.reprisePrevue) {
    lignes.push('Une reprise automatique est programmée dans la minute : '
      + 'elle repartira exactement où l’exécution s’est arrêtée.');
  }

  if (bilan.aVerifier > 0) {
    lignes.push('', `${bilan.aVerifier} ligne(s) à vérifier : l’exécution a été interrompue`,
      'entre l’action et son enregistrement. Impossible de savoir si elle a eu lieu.',
      'Vérifiez dans Gmail, puis corrigez l’état à la main.');
  }

  lignes.push('', 'PAR ÉTAT');
  Object.keys(bilan.parEtat).forEach((etat) => {
    lignes.push(`    ${etat || '(vide)'} : ${bilan.parEtat[etat]}`);
  });

  return lignes.join('\n');
};
