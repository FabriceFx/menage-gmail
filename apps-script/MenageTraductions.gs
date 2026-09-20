/**
 * Ménage Gmail — dictionnaire de traductions. Introduit en v1.1.
 *
 * Deux langues, un seul dictionnaire, et une règle qui tient tout : **les deux
 * tables portent exactement les mêmes clés**. Le banc le vérifie, parce qu'une
 * clé absente ne provoque aucune erreur — elle retombe sur l'anglais, puis sur
 * son propre nom, et l'utilisateur voit s'afficher `texte_confirmer` au milieu
 * d'un dialogue. Un défaut qui ne casse rien est un défaut qu'on livre.
 *
 * Le banc vérifie aussi l'accord des jetons `{0}`, `{1}` : une traduction qui
 * en attend trois là où l'autre en attend deux laisse un `{2}` littéral dans
 * la phrase, visible seulement par qui lit dans cette langue-là.
 *
 * ## Ce qui est du HTML, et ce qui ne l'est pas
 *
 * Les valeurs de ce fichier sont du HTML de confiance : elles sont écrites
 * ici, relues ici, et peuvent porter `<b>` ou un lien. Tout ce qui vient
 * d'ailleurs — résumé d'exécution, nom d'onglet, message d'erreur — passe par
 * `menageTexteVersHtml_`, qui échappe. La frontière est à cet endroit précis,
 * et nulle part ailleurs.
 */

const MENAGE_TRADUCTIONS_ = {
  fr: {
    menu_preparer: '1. Préparer le plan',
    menu_appliquer: '2. Appliquer le plan',
    menu_etat: 'Où en est le plan ?',
    menu_oublier: 'Remettre en file ce qui a calé',
    menu_installer: 'Installer ou compléter le classeur',
    menu_programmer: 'Programmer le ménage quotidien',
    menu_arreter: 'Arrêter le ménage quotidien',
    menu_propos: 'À propos',

    titre_outil: 'Ménage Gmail',
    titre_preparation: 'Préparation du plan',
    titre_confirmer: 'Appliquer le plan',
    titre_etat: 'Où en est le plan',
    titre_oubli: 'Remise en file',
    titre_installation: 'Installation du classeur',
    titre_planification: 'Ménage quotidien',
    titre_propos: 'Ménage Gmail v{0}',
    titre_echec: 'L’opération a échoué.',

    erreur_verrou: 'Une autre exécution est en cours. Réessayez dans un instant.',
    erreur_rien_a_traiter: 'Aucune ligne cochée n’attend d’être traitée dans « {0} ».<br><br>Le plan porte {1} ligne(s), dont {2} cochée(s).',
    erreur_action_inconnue: 'Action « {0} » inconnue.',

    texte_confirmer: '<b>{0}</b> action(s) vont être exécutées, dont <b>{1}</b> suppression(s) définitive(s).<br><br>Une suppression définitive ne se récupère pas.<br><br>Continuer ?',
    texte_etat: 'Onglet « {0} »<br><br>Lignes : <b>{1}</b><br>Cochées : <b>{2}</b><br>Cochées et en attente : <b>{3}</b><br><br>Par état :<br>{4}<br><br>Reprise automatique programmée : {5}',
    texte_oublier: '<b>{0}</b> ligne(s) remise(s) en file, <b>{1}</b> reprise(s) retirée(s).<br><br>Les lignes « Fait », « À vérifier » et « Échec » n’ont pas été touchées : les deux premières parce qu’une action a pu avoir lieu, la troisième parce qu’elle nomme une cause qui n’a pas disparu.',
    texte_installer: 'Onglets posés : {0}.<br>Réglages ajoutés : {1}.<br><br>Le guide de l’onglet « {2} » a été mis à jour.',

    question_programmer: 'Le ménage quotidien s’exécuterait chaque nuit vers 4 h, <b>sans vous le demander</b>.<br><br>Il n’applique que la politique de rétention réglée dans l’onglet « Réglages ». Les suppressions proposées par le détecteur resteront en attente dans le plan tant que vous ne les aurez pas cochées.<br><br>Le programmer ?',
    texte_programmer: 'Ménage quotidien programmé.<br><br>Il s’exécutera chaque nuit vers 4 h et appliquera la politique de rétention. Vous pouvez l’arrêter à tout moment par le menu.',
    texte_arreter_aucun: 'Aucun ménage quotidien n’était programmé.',
    texte_arreter_fait: 'Ménage quotidien arrêté ({0} déclencheur(s) retiré(s)).<br><br>Plus rien ne se passera sans vous.',

    texte_propos: `Développé par <a href="https://faucheux.bzh" target="_blank" rel="noopener">Fabrice Faucheux</a>.<br><br><i>23 h, tu regardes tes messages un par un dans l’espoir de trier ton courrier, et tu te demandes pourquoi ça te prend autant de temps…</i> Ce module met fin à la corvée.<br><br>Il vide la Corbeille et le Spam selon une politique de rétention, et propose la suppression des messages qui ressemblent à des escroqueries.<br><br><b>RÉGLAGES ACTUELS</b><br>• Corbeille : {1} jours<br>• Quarantaine : {2} jours<br>• Examen par préparation : {3} messages<br>• Suppressions suggérées : {4}<br>• Contacts protégés : {5}<br><br><b>AUTORISATIONS</b><br>• <i>https://mail.google.com/</i> : lecture et suppression. Gmail ne propose rien de plus étroit permettant la suppression définitive.<br>• <i>contacts.readonly</i> : pour protéger vos correspondants.<br><br>En échange de cette portée large, une garantie <b>vérifiable</b> : le banc d’essai du projet refuse toute recherche visant un autre dossier que la corbeille ou le spam, et tout appel d’envoi de courriel. La boîte de réception n’est jamais touchée.<br><br>Version {0}.`,

    oui: 'oui',
    non: 'non',
    aucun_tout_la: 'aucun, tout était déjà là',
    aucun: 'aucun',
    bouton_ok: 'Fermer',
    bouton_oui: 'Oui, appliquer',
    bouton_non: 'Annuler',
    chargement: 'Traitement en cours…',
  },

  en: {
    menu_preparer: '1. Prepare the plan',
    menu_appliquer: '2. Apply the plan',
    menu_etat: 'Plan status',
    menu_oublier: 'Reset stalled items',
    menu_installer: 'Install or update spreadsheet',
    menu_programmer: 'Schedule daily cleanup',
    menu_arreter: 'Stop daily cleanup',
    menu_propos: 'About',

    titre_outil: 'Gmail Cleanup',
    titre_preparation: 'Preparing the plan',
    titre_confirmer: 'Apply the plan',
    titre_etat: 'Plan status',
    titre_oubli: 'Resetting stalled items',
    titre_installation: 'Spreadsheet setup',
    titre_planification: 'Daily cleanup',
    titre_propos: 'Gmail Cleanup v{0}',
    titre_echec: 'The operation failed.',

    erreur_verrou: 'Another execution is in progress. Please try again in a moment.',
    erreur_rien_a_traiter: 'No checked row is waiting to be processed in "{0}".<br><br>The plan has {1} row(s), of which {2} are checked.',
    erreur_action_inconnue: 'Unknown action "{0}".',

    texte_confirmer: '<b>{0}</b> action(s) will be executed, including <b>{1}</b> permanent deletion(s).<br><br>A permanent deletion cannot be undone.<br><br>Continue?',
    texte_etat: 'Sheet "{0}"<br><br>Rows: <b>{1}</b><br>Checked: <b>{2}</b><br>Checked and waiting: <b>{3}</b><br><br>By status:<br>{4}<br><br>Scheduled automatic resume: {5}',
    texte_oublier: '<b>{0}</b> row(s) reset, <b>{1}</b> resume(s) removed.<br><br>"Done", "To check" and "Failed" rows were not modified: the first two because an action might have occurred, the third because the cause has not disappeared.',
    texte_installer: 'Sheets added: {0}.<br>Settings added: {1}.<br><br>The guide in the "{2}" sheet has been updated.',

    question_programmer: 'The daily cleanup would run every night around 4 AM, <b>without asking you</b>.<br><br>It only applies the retention policy set in the "Settings" sheet. Deletions suggested by the detector will remain pending in the plan until you check them.<br><br>Schedule it?',
    texte_programmer: 'Daily cleanup scheduled.<br><br>It will run every night around 4 AM and apply the retention policy. You can stop it at any time from the menu.',
    texte_arreter_aucun: 'No daily cleanup was scheduled.',
    texte_arreter_fait: 'Daily cleanup stopped ({0} trigger(s) removed).<br><br>Nothing will happen without you from now on.',

    texte_propos: `Developed by <a href="https://faucheux.bzh" target="_blank" rel="noopener">Fabrice Faucheux</a>.<br><br><i>11 PM, you go through your messages one by one hoping to sort your mail, wondering why it takes so long…</i> This tool ends the chore.<br><br>It empties the Trash and Spam folders according to a retention policy, and suggests deletion for messages that look like scams.<br><br><b>CURRENT SETTINGS</b><br>• Trash: {1} days<br>• Quarantine: {2} days<br>• Scan limit per preparation: {3} messages<br>• Suggested deletions: {4}<br>• Protected contacts: {5}<br><br><b>PERMISSIONS</b><br>• <i>https://mail.google.com/</i>: read and delete. Gmail offers nothing narrower that allows permanent deletion.<br>• <i>contacts.readonly</i>: to protect your known correspondents.<br><br>In exchange for this broad scope, a <b>verifiable</b> guarantee: the project's test bench rejects any search targeting a folder other than trash or spam, and any mail-sending call. The inbox is never touched.<br><br>Version {0}.`,

    oui: 'yes',
    non: 'no',
    aucun_tout_la: 'none, everything was already there',
    aucun: 'none',
    bouton_ok: 'Close',
    bouton_oui: 'Yes, apply',
    bouton_non: 'Cancel',
    chargement: 'Working…',
  },
};

/**
 * Rend le texte de la clé, dans la langue de qui exécute.
 *
 * `Session.getActiveUserLocale()` ne demande aucune autorisation — c'est ce
 * qui permet de l'appeler depuis `onOpen()`, un déclencheur simple qui n'en a
 * aucune. Une exception y ferait disparaître le menu entier, d'où le repli sur
 * l'anglais plutôt qu'une lecture directe de la chaîne rendue.
 *
 * Les jetons sont remplacés par une fonction et non par une chaîne : dans un
 * remplacement littéral, `$&` et `` $` `` sont des motifs, et un argument qui
 * en contiendrait injecterait un morceau de la phrase dans elle-même.
 */
const menageTraductions_ = (cle, ...args) => {
  const locale = SocleErreurs.absorber('lecture de la langue', () => Session.getActiveUserLocale(), '');
  const langue = String(locale ?? '').toLowerCase().startsWith('fr') ? 'fr' : 'en';

  let texte = MENAGE_TRADUCTIONS_[langue][cle] ?? MENAGE_TRADUCTIONS_.en[cle] ?? cle;
  args.forEach((valeur, rang) => {
    texte = texte.replace(new RegExp(`\\{${rang}\\}`, 'g'), () => String(valeur));
  });
  return texte;
};
