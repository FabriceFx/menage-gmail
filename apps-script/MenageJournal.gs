/**
 * Ménage Gmail — l'archive des plans. Introduit en v1.0.
 *
 * Préparer un plan efface le précédent. Sans archive, la trace de ce qui a été
 * supprimé hier disparaîtrait ce matin — pour une opération irréversible,
 * c'est inacceptable : le jour où quelqu'un cherche ce qu'est devenu un
 * message, c'est la seule réponse possible.
 *
 * Le journal d'exécution d'Apps Script ne suffit pas. Il est tronqué au-delà
 * d'un certain volume, il n'est pas consultable par qui n'ouvre pas l'éditeur
 * de script, et il s'efface. La version précédente n'écrivait que là.
 */

const MENAGE_COLONNES_JOURNAL_ = [
  'Archivé le',
  'Version',
  ...MENAGE_COLONNES_PLAN_,
  'État',
  'Détail',
];

/**
 * Recopie le plan courant à la fin du journal, puis rend le nombre de lignes.
 *
 * N'archive que ce qui a été engagé — traité, échoué, abandonné. Les lignes
 * restées « À faire » n'ont rien produit : les garder ferait un journal où
 * l'on ne distinguerait plus ce qui a eu lieu de ce qui a été envisagé, et
 * un journal qui ne permet pas cette distinction ne sert plus à rien.
 */
const menageArchiverPlan_ = () => {
  const table = SocleErreurs.absorber(
    'lecture du plan à archiver',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.plan),
    null);

  if (!table || table.lignes.length === 0) return 0;

  const engages = table.lignes.filter((ligne) => {
    const etat = String(ligne['État'] ?? '').trim();
    return etat !== '' && etat !== PlanPuisApplication.etats.aFaire;
  });

  if (engages.length === 0) return 0;

  const { feuille } = SocleFeuilles.onglet(MENAGE_ONGLETS_.journal);
  if (feuille.getLastRow() < 1) {
    feuille.getRange(1, 1, 1, MENAGE_COLONNES_JOURNAL_.length)
      .setValues([MENAGE_COLONNES_JOURNAL_]).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }

  const horodatage = SocleDates.maintenantHorodatage();
  const lignes = engages.map((ligne) => [
    horodatage,
    MENAGE_VERSION_,
    ...MENAGE_COLONNES_PLAN_.map((nom) => ligne[nom] ?? ''),
    ligne['État'] ?? '',
    ligne['Détail'] ?? '',
  ]);

  // Une seule écriture pour tout le bloc, jamais ligne par ligne.
  feuille.getRange(feuille.getLastRow() + 1, 1, lignes.length, MENAGE_COLONNES_JOURNAL_.length)
    .setValues(lignes);

  // La perte serait coûteuse : le plan va être effacé juste après.
  SpreadsheetApp.flush();

  return lignes.length;
};

/**
 * Les identifiants des messages effectivement supprimés, d'après le plan.
 *
 * Sert à purger le registre de quarantaine : une ligne de registre qui
 * désigne un message supprimé ne protège plus rien et ne fait que grossir
 * l'onglet.
 */
const menageIdentifiantsTraites_ = () => {
  const table = SocleErreurs.absorber(
    'lecture du plan appliqué',
    () => SocleFeuilles.lireTable(MENAGE_ONGLETS_.plan),
    null);

  if (!table) return [];

  return table.lignes
    .filter((ligne) => String(ligne['État'] ?? '').trim() === PlanPuisApplication.etats.fait)
    .filter((ligne) => String(ligne.Action ?? '').trim() === MENAGE_ACTIONS_.supprimer)
    .map((ligne) => String(ligne.Identifiant ?? '').trim())
    .filter(Boolean);
};
