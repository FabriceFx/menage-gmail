/**
 * Ménage Gmail — Interface Utilisateur Material Design 3.
 * Remplace SpreadsheetApp.getUi().alert() par des modales élégantes.
 */

const MenageUi = {
  /**
   * Affiche une modale d'information simple.
   */
  afficherMessage: (titre, corps, options = {}) => {
    const template = HtmlService.createTemplateFromFile('Dialogue');
    template.type = 'info';
    template.corps = corps; 
    template.texteOk = menageTraductions_('bouton_ok');
    
    // Fallbacks
    template.texteOui = '';
    template.texteNon = '';
    template.actionCallback = 'null';
    template.texteChargement = '""';

    const hauteur = options.hauteur || 350;
    const largeur = options.largeur || 500;

    const html = template.evaluate()
      .setWidth(largeur)
      .setHeight(hauteur);
      
    SpreadsheetApp.getUi().showModalDialog(html, titre);
  },

  /**
   * Affiche une modale de confirmation (Oui / Non).
   * L'action doit être le nom d'une fonction globale (ex: 'executerAppliquerPlan_')
   */
  afficherConfirmation: (titre, corps, actionCallback, options = {}) => {
    const template = HtmlService.createTemplateFromFile('Dialogue');
    template.type = 'confirmation';
    template.corps = corps;
    template.texteOui = menageTraductions_('bouton_oui');
    template.texteNon = menageTraductions_('bouton_non');
    template.texteOk = '';
    template.actionCallback = JSON.stringify(actionCallback);
    template.texteChargement = JSON.stringify(menageTraductions_('chargement'));

    const hauteur = options.hauteur || 300;
    const largeur = options.largeur || 500;

    const html = template.evaluate()
      .setWidth(largeur)
      .setHeight(hauteur);
      
    SpreadsheetApp.getUi().showModalDialog(html, titre);
  }
};
