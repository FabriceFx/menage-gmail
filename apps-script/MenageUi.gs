/**
 * Ménage Gmail — les modales. Introduit en v1.1.
 *
 * Trois formes de dialogue, et la distinction entre elles porte tout le sens
 * de l'interface.
 *
 * **Une confirmation ne se demande que pour ce qui mérite d'être refusé.**
 * Demander « Préparer le plan ? » avant une opération qui ne modifie rien use
 * le seul geste qui compte : celui qui précède une suppression définitive.
 * Quand tout demande confirmation, plus rien ne la mérite, et l'utilisateur
 * finit par cliquer « Oui » sans lire — exactement au moment où il aurait dû.
 *
 * D'où `afficherTravail`, qui lance l'action tout de suite et montre son
 * avancement : c'est ce que réclament les opérations sans danger, et cela
 * laisse `afficherConfirmation` aux deux seules qui en méritent une —
 * appliquer le plan, et poser le déclencheur qui agira sans personne.
 */

/** Hauteurs par défaut, en pixels. Un résumé fait une vingtaine de lignes. */
const MENAGE_UI_HAUTEURS_ = { info: 400, confirmation: 320, travail: 520 };
const MENAGE_UI_LARGEUR_ = 560;

/**
 * Convertit un résumé en texte brut vers du HTML sûr.
 *
 * Deux choses en une, et c'est voulu : **tout ce qui n'a pas été écrit par ce
 * projet doit être échappé avant d'entrer dans une modale.** Un résumé porte
 * des noms d'onglets, des causes d'échec et des messages d'erreur, dont
 * certains recopient des cellules du classeur. Les injecter tels quels dans
 * `innerHTML` ferait rendre au dialogue un balisage que nous n'avons pas
 * écrit — et le jour où un résumé citera l'objet d'un message, ce serait le
 * balisage d'une escroquerie, affiché par l'outil censé nous en protéger.
 *
 * L'indentation est ensuite rétablie en espaces insécables : les résumés
 * alignent leurs blocs avec quatre espaces, que HTML réduirait à un seul. Un
 * `white-space: pre-wrap` sur le conteneur aurait aussi ramené l'indentation
 * du gabarit lui-même.
 */
const menageTexteVersHtml_ = (texte) => SocleTexte.echapperHtml(texte)
  .split('\n')
  .map((ligne) => ligne.replace(/^ +/, (blancs) => '&nbsp;'.repeat(blancs.length)))
  .join('<br>');

/**
 * Prépare le gabarit commun.
 *
 * Toutes les variables sont posées, y compris celles dont ce mode ne se sert
 * pas : un gabarit Apps Script lève « ReferenceError » sur une variable qu'il
 * lit sans qu'elle ait été définie, et l'erreur survient à l'évaluation, donc
 * sous les yeux de l'utilisateur.
 */
const menageGabarit_ = (mode, corps, action) => {
  const gabarit = HtmlService.createTemplateFromFile('Dialogue');
  gabarit.mode = mode;
  gabarit.corps = corps;
  gabarit.action = action || '';
  gabarit.texteOk = menageTraductions_('bouton_ok');
  gabarit.texteOui = menageTraductions_('bouton_oui');
  gabarit.texteNon = menageTraductions_('bouton_non');
  gabarit.texteChargement = menageTraductions_('chargement');
  gabarit.texteErreur = menageTraductions_('titre_echec');
  return gabarit;
};

const menageAfficher_ = (gabarit, titre, mode, options) => {
  const html = gabarit.evaluate()
    .setWidth(options.largeur || MENAGE_UI_LARGEUR_)
    .setHeight(options.hauteur || MENAGE_UI_HAUTEURS_[mode]);
  SpreadsheetApp.getUi().showModalDialog(html, titre);
};

const MenageUi = {
  /** Une information, un bouton pour fermer. */
  afficherMessage: (titre, corps, options = {}) => {
    menageAfficher_(menageGabarit_('info', corps, ''), titre, 'info', options);
  },

  /**
   * Une question, deux boutons. `action` est une clé de `MENAGE_MODALE_ACTIONS_`.
   *
   * À réserver à ce qui mérite d'être refusé.
   */
  afficherConfirmation: (titre, corps, action, options = {}) => {
    menageAfficher_(menageGabarit_('confirmation', corps, action), titre, 'confirmation', options);
  },

  /**
   * Lance l'action aussitôt et montre son avancement, puis son résultat.
   *
   * Le titre de la modale ne changera pas en cours de route : il est fixé par
   * `showModalDialog` et rendu par Sheets, hors de l'iframe. Rien de ce qui
   * s'exécute dedans ne peut l'atteindre — d'où un titre qui doit décrire
   * l'opération entière dès l'ouverture, et non son état.
   */
  afficherTravail: (titre, action, options = {}) => {
    const corps = menageTexteVersHtml_(menageTraductions_('chargement'));
    menageAfficher_(menageGabarit_('travail', corps, action), titre, 'travail', options);
  },
};
