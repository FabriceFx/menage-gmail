/**
 * Ménage Gmail — dictionnaire de traductions.
 *
 * Le bilinguisme (FR/EN) est assuré par ce module. La langue par défaut
 * est déterminée par la locale de l'utilisateur.
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
    titre_preparation: 'Plan préparé',
    titre_application: 'Ménage appliqué',
    titre_erreur: 'Ménage Gmail',
    erreur_verrou: 'Une autre exécution est en cours. Réessayez dans un instant.',
    erreur_rien_a_traiter: 'Aucune ligne cochée n’attend d’être traitée dans « {0} ».<br><br>Le plan porte {1} ligne(s), dont {2} cochée(s).',
    titre_confirmer: 'Appliquer le plan',
    texte_confirmer: '<b>{0}</b> action(s) vont être exécutées, dont <b>{1}</b> suppression(s) définitive(s).<br><br>Une suppression définitive ne se récupère pas.<br><br>Continuer ?',
    titre_etat: 'Où en est le plan',
    texte_etat: 'Onglet « {0} »<br><br>Lignes : <b>{1}</b><br>Cochées : <b>{2}</b><br>Cochées et en attente : <b>{3}</b><br><br>Par état :<br>{4}<br><br>Reprise automatique programmée : {5}',
    oui: 'oui',
    non: 'non',
    texte_oublier: '<b>{0}</b> ligne(s) remise(s) en file, <b>{1}</b> reprise(s) retirée(s).<br><br>Les lignes « Fait », « À vérifier » et « Échec » n’ont pas été touchées : les deux premières parce qu’une action a pu avoir lieu, la troisième parce qu’elle nomme une cause qui n’a pas disparu.',
    texte_installer: 'Onglets posés : {0}.<br>Réglages ajoutés : {1}.<br><br>Le guide de l’onglet « {2} » a été mis à jour.',
    aucun_tout_la: 'aucun, tout était déjà là',
    aucun: 'aucun',
    texte_programmer: 'Le ménage quotidien s’exécutera chaque nuit, vers 4 h.<br><br>Il applique la politique de rétention réglée dans l’onglet « Réglages ». Les suppressions proposées par le détecteur, elles, resteront en attente dans le plan tant que vous ne les aurez pas cochées.',
    texte_arreter_aucun: 'Aucun ménage quotidien n’était programmé.',
    texte_arreter_fait: 'Ménage quotidien arrêté ({0} déclencheur(s) retiré(s)).',
    titre_propos: 'Ménage Gmail v{0}',
    texte_propos: `Développé par <a href="https://faucheux.bzh" target="_blank" rel="noopener">Fabrice Faucheux</a>.<br><br><i>23h, tu regardes tes statuts un par un dans l'espoir de trier ton courrier, et tu te demandes pourquoi ça te prend autant de temps...</i> Ce module met fin à la corvée.<br><br>Il vide la Corbeille et le Spam selon une politique de rétention, et propose la suppression des messages qui ressemblent à des escroqueries.<br><br><b>RÉGLAGES ACTUELS</b><br>• Corbeille : {1} jours<br>• Quarantaine : {2} jours<br>• Examen par préparation : {3} messages<br>• Suppressions suggérées : {4}<br>• Contacts protégés : {5}<br><br><b>AUTORISATIONS</b><br>• <i>https://mail.google.com/</i> : lecture et suppression. Gmail ne propose rien de plus étroit permettant la suppression définitive.<br>• <i>contacts.readonly</i> : pour protéger vos correspondants.<br><br>La boîte de réception n’est jamais touchée.`,
    bouton_ok: 'Fermer',
    bouton_oui: 'Oui, appliquer',
    bouton_non: 'Annuler',
    chargement: 'Traitement en cours...'
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
    titre_preparation: 'Plan prepared',
    titre_application: 'Cleanup applied',
    titre_erreur: 'Gmail Cleanup',
    erreur_verrou: 'Another execution is in progress. Please try again in a moment.',
    erreur_rien_a_traiter: 'No checked row is waiting to be processed in "{0}".<br><br>The plan has {1} row(s), of which {2} are checked.',
    titre_confirmer: 'Apply the plan',
    texte_confirmer: '<b>{0}</b> action(s) will be executed, including <b>{1}</b> permanent deletion(s).<br><br>A permanent deletion cannot be undone.<br><br>Continue?',
    titre_etat: 'Plan status',
    texte_etat: 'Sheet "{0}"<br><br>Rows: <b>{1}</b><br>Checked: <b>{2}</b><br>Checked and waiting: <b>{3}</b><br><br>By status:<br>{4}<br><br>Scheduled automatic resume: {5}',
    oui: 'yes',
    non: 'no',
    texte_oublier: '<b>{0}</b> row(s) reset, <b>{1}</b> resume(s) removed.<br><br>"Done", "To check", and "Failed" rows were not modified: the first two because an action might have occurred, the third because the cause has not disappeared.',
    texte_installer: 'Sheets added: {0}.<br>Settings added: {1}.<br><br>The guide in the "{2}" sheet has been updated.',
    aucun_tout_la: 'none, everything was already there',
    aucun: 'none',
    texte_programmer: 'The daily cleanup will run every night, around 4 AM.<br><br>It applies the retention policy set in the "Settings" sheet. Deletions suggested by the detector will remain pending in the plan until you check them.',
    texte_arreter_aucun: 'No daily cleanup was scheduled.',
    texte_arreter_fait: 'Daily cleanup stopped ({0} trigger(s) removed).',
    titre_propos: 'Gmail Cleanup v{0}',
    texte_propos: `Developed by <a href="https://faucheux.bzh" target="_blank" rel="noopener">Fabrice Faucheux</a>.<br><br><i>11 PM, you're looking at your emails one by one hoping to sort them, wondering why it takes so much time...</i> This add-on ends the chore.<br><br>It empties the Trash and Spam folders according to a retention policy, and suggests the deletion of messages that look like scams.<br><br><b>CURRENT SETTINGS</b><br>• Trash: {1} days<br>• Quarantine: {2} days<br>• Scan limit per prep: {3} messages<br>• Suggested deletions: {4}<br>• Protected contacts: {5}<br><br><b>PERMISSIONS</b><br>• <i>https://mail.google.com/</i>: read and delete. Gmail offers nothing narrower for permanent deletion.<br>• <i>contacts.readonly</i>: to protect your known contacts.<br><br>The inbox is never touched.`,
    bouton_ok: 'Close',
    bouton_oui: 'Yes, apply',
    bouton_non: 'Cancel',
    chargement: 'Processing...'
  }
};

/** 
 * Détecte la langue et rend le texte correspondant. 
 * Les chaînes avec {0}, {1} etc. sont remplacées par les arguments.
 */
const menageTraductions_ = (cle, ...args) => {
  const langue = Session.getActiveUserLocale().startsWith('fr') ? 'fr' : 'en';
  let texte = MENAGE_TRADUCTIONS_[langue][cle] || MENAGE_TRADUCTIONS_['en'][cle] || cle;
  args.forEach((arg, index) => {
    texte = texte.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
  });
  return texte;
};
