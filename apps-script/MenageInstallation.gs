/**
 * Ménage Gmail — installation des onglets. Introduit en v1.0.
 *
 * Pose ce qui manque, ne réécrit jamais ce qui est là. C'est la règle du
 * référentiel : le code ajoute les entrées nouvelles et ne touche pas à une
 * décision humaine. Quelqu'un qui a retiré la marque « enterprise » parce
 * qu'elle lui produisait des faux positifs ne doit pas la voir revenir à la
 * prochaine installation.
 *
 * L'installation est donc rejouable sans risque, et c'est ainsi qu'une version
 * nouvelle ajoute ses réglages aux classeurs existants.
 */

const MENAGE_ENTETE_MARQUES_ = ['Marque', 'Domaines légitimes'];
const MENAGE_ENTETE_EXPRESSIONS_ = ['Famille', 'Expression'];
const MENAGE_ENTETE_PROTEGES_ = ['Adresse ou domaine', 'Pourquoi'];

/**
 * Pose un onglet avec son en-tête et ses lignes de départ, s'il n'existe pas.
 *
 * Un onglet présent mais vide reçoit son en-tête : les confondre laisserait la
 * première donnée en ligne 1, où elle serait prise pour un titre de colonne et
 * ignorée à toutes les lectures suivantes.
 */
const menagePoserOnglet_ = (nom, entete, lignes) => {
  const { feuille, cree } = SocleFeuilles.onglet(nom);
  if (!cree && feuille.getLastRow() > 0) return false;

  feuille.getRange(1, 1, 1, entete.length).setValues([entete]).setFontWeight('bold');
  if (lignes.length > 0) {
    feuille.getRange(2, 1, lignes.length, entete.length).setValues(lignes);
  }
  feuille.setFrozenRows(1);
  entete.forEach((_, position) => feuille.setColumnWidth(position + 1, position === 0 ? 240 : 420));
  return true;
};

/**
 * Le guide, dans le classeur.
 *
 * Un outil s'explique là où l'on s'en sert. Un `README` sur un disque
 * n'accompagne pas celui qui a le plan sous les yeux et se demande si cocher
 * cette ligne-là va effacer quelque chose.
 */
const menageLignesGuide_ = () => [
  ['Ménage Gmail', `version ${MENAGE_VERSION_}`],
  ['', ''],
  ['Ce que fait cet outil',
    'Il vide la Corbeille et le Spam selon une politique de rétention que vous réglez, '
    + 'et propose la suppression des messages qui ressemblent à des escroqueries. '
    + 'Il ne touche jamais à la boîte de réception, et ne la lit même pas.'],
  ['', ''],
  ['1. Préparer le plan',
    'Menu « Ménage Gmail > Préparer le plan ». L’outil examine la Corbeille et le Spam '
    + 'et écrit une ligne par action envisagée. Rien n’est modifié à cette étape.'],
  ['2. Relire et valider',
    'Les lignes décidées par un réglage arrivent déjà cochées : la décision a été prise '
    + 'une fois pour toutes dans l’onglet « Réglages ». Les lignes décidées par le '
    + 'détecteur arrivent décochées et le resteront tant que personne ne les aura lues. '
    + 'Une ligne non cochée ne sera jamais traitée.'],
  ['3. Appliquer',
    'Menu « Ménage Gmail > Appliquer le plan ». Le nombre exact d’actions est annoncé '
    + 'avant confirmation, puis chaque ligne est marquée au moment où elle est traitée.'],
  ['', ''],
  ['Les deux actions possibles', ''],
  [MENAGE_ACTIONS_.supprimer,
    'Sans retour. Le message est effacé des serveurs de Google et ne se récupère pas.'],
  [MENAGE_ACTIONS_.quarantaine,
    'Réversible. Le message quitte la Corbeille pour le Spam, où il reste le nombre de '
    + 'jours réglé avant d’être supprimé. Vous pouvez l’en sortir à tout moment depuis '
    + 'Gmail. Le compte à rebours part du jour de la mise en quarantaine, pas de la date '
    + 'du message.'],
  ['', ''],
  ['Ce que l’outil ne peut pas faire', ''],
  ['Protéger de Gmail lui-même',
    'Gmail vide seul la Corbeille et le Spam au bout de 30 jours. Un message inscrit à '
    + 'l’onglet « Protégés » échappe à cet outil, jamais à cette purge. Pour conserver un '
    + 'message, sortez-le de la Corbeille.'],
  ['Retrouver un message supprimé',
    'La suppression définitive n’a pas de remède. C’est pourquoi le plan existe.'],
  ['', ''],
  ['Les onglets', ''],
  [MENAGE_ONGLETS_.reglages,
    'Durées de rétention et interrupteurs. Les modifier ne demande aucun déploiement.'],
  [MENAGE_ONGLETS_.marques,
    'Organisations dont on surveille l’usurpation, et leurs domaines légitimes. Une '
    + 'marque citée dans l’expéditeur ou l’objet, envoyée depuis un autre domaine, est '
    + 'un signal fort. Ajoutez-en, retirez celles qui vous produisent des faux positifs.'],
  [MENAGE_ONGLETS_.expressions,
    'Tournures d’appât, par famille. Elles sont cherchées en mots entiers.'],
  [MENAGE_ONGLETS_.proteges,
    'Adresses et domaines auxquels cet outil ne touche jamais. Une entrée sans « @ » est '
    + 'lue comme un domaine, sous-domaines compris.'],
  [MENAGE_ONGLETS_.quarantaine,
    'Date d’entrée en quarantaine de chaque message déplacé. C’est ce qui lui garantit '
    + 'ses jours de sursis. Ne pas modifier à la main.'],
  [MENAGE_ONGLETS_.journal,
    'Les plans passés, conservés après application. C’est la trace de ce qui a été fait.'],
  ['', ''],
  ['Les états d’une ligne de plan', ''],
  ['À faire', 'Validée, pas encore traitée.'],
  ['Fait', 'L’action a eu lieu et a été enregistrée.'],
  ['À reprendre', 'Erreur passagère : la reprise automatique la rejouera.'],
  ['À vérifier',
    'L’exécution a été interrompue entre l’action et son enregistrement. Impossible de '
    + 'savoir si elle a eu lieu. Vérifiez dans Gmail, puis corrigez l’état à la main.'],
  ['Abandonné', 'Trop de départs sans arrivée : l’outil a renoncé et le dit.'],
  ['Échec', 'Erreur définitive. La colonne « Détail » en donne la cause.'],
];

/**
 * Installe ou complète le classeur. Rejouable sans risque.
 *
 * @returns {{poses: string[], reglages: string[]}}
 */
const menageInstaller_ = () => {
  const poses = [];

  if (menagePoserOnglet_(MENAGE_ONGLETS_.marques, MENAGE_ENTETE_MARQUES_, MENAGE_MARQUES_DEPART_)) {
    poses.push(MENAGE_ONGLETS_.marques);
  }

  if (menagePoserOnglet_(
    MENAGE_ONGLETS_.expressions, MENAGE_ENTETE_EXPRESSIONS_, MENAGE_EXPRESSIONS_DEPART_)) {
    poses.push(MENAGE_ONGLETS_.expressions);
  }

  /*
   * L'onglet des protégés se pose **vide**.
   *
   * Une ligne d'exemple y serait une protection active que personne n'a
   * choisie : elle mettrait un domaine à l'abri sans que quiconque l'ait
   * décidé, et le jour où l'exemple ressemblerait à un vrai domaine, la
   * moitié du courrier cesserait d'être traitée sans explication. Le guide
   * dit quoi y écrire ; l'onglet, lui, ne décide de rien.
   */
  if (menagePoserOnglet_(MENAGE_ONGLETS_.proteges, MENAGE_ENTETE_PROTEGES_, [])) {
    poses.push(MENAGE_ONGLETS_.proteges);
  }

  if (menagePoserOnglet_(MENAGE_ONGLETS_.quarantaine, MENAGE_COLONNES_QUARANTAINE_, [])) {
    poses.push(MENAGE_ONGLETS_.quarantaine);
  }

  // Le guide se réécrit à chaque installation, lui : c'est de la documentation,
  // pas une décision. Une version nouvelle doit pouvoir corriger ce qu'elle
  // explique, et personne n'y a rien saisi qu'on pourrait perdre.
  const { feuille: guide } = SocleFeuilles.onglet(MENAGE_ONGLETS_.guide);
  const lignes = menageLignesGuide_();
  guide.clear();
  guide.getRange(1, 1, lignes.length, 2).setValues(lignes);
  guide.getRange(1, 1, 1, 2).setFontWeight('bold');
  guide.setColumnWidth(1, 260);
  guide.setColumnWidth(2, 700);

  const { poses: reglages } = SocleFeuilles.completerReglages(
    MENAGE_ONGLETS_.reglages, MENAGE_REGLAGES_DEFAUT_);

  menageOublierReferentiel_();
  return { poses, reglages };
};
