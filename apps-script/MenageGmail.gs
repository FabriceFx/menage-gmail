/**
 * Ménage Gmail — accès à la messagerie. Introduit en v1.0.
 *
 * Tout ce qui parle à Gmail passe par ici : la recherche, la lecture d'un
 * message et les deux seules actions que ce projet exerce.
 *
 * ## Le plafond silencieux des 500 fils
 *
 * `GmailApp.search(requête)` sans bornes rend **au plus 500 fils**, et ne dit
 * rien quand il y en a davantage. Une corbeille de deux mille messages était
 * donc traitée au quart, exécution après exécution, sans qu'aucun compteur ne
 * le laisse voir : le journal annonçait « 500 examinés » et personne n'avait
 * de raison d'y lire un plafond.
 *
 * On pagine donc, et l'on rend le compte exact de ce qui a été vu — ainsi que
 * la mention explicite d'un arrêt anticipé, budget de temps ou plafond
 * d'examen.
 *
 * ## Pourquoi la recherche n'a lieu qu'en préparation
 *
 * Paginer une recherche pendant qu'on modifie ce qu'elle interroge fait sauter
 * des pages : retirer les cent premiers fils de la corbeille décale tous les
 * suivants, et demander ensuite la page commençant à l'indice 100 saute cent
 * fils qui ont pris leur place. Le découpage « plan puis application » élimine
 * le problème plutôt qu'il ne le contourne : la préparation ne fait que lire,
 * l'application ne travaille plus que sur des identifiants.
 */

/* --------------------------------------------------------------------------
 * Recherche
 * ----------------------------------------------------------------------- */

/** Temps réservé à une page de cent messages, pour le contrôle du budget. */
const MENAGE_DUREE_PAGE_MS_ = 45 * 1000;

/**
 * Parcourt une recherche Gmail page par page et appelle `traiter` sur chaque
 * message, jusqu'à épuisement, plafond d'examen ou fin du budget de temps.
 *
 * `traiter` peut rendre `false` pour demander l'arrêt ; c'est ainsi que
 * l'appelant fait respecter son propre plafond.
 *
 * @returns {{examines: number, arret: ?string}} `budget`, `plafond` ou `null`
 */
const menageParcourir_ = (requete, budget, plafond, traiter) => {
  let examines = 0;
  let depart = 0;
  let arret = null;

  while (examines < plafond) {
    // On ne démarre pas une page sur un budget entamé : une page interrompue
    // en son milieu n'aurait rien coûté de moins qu'une page entière.
    if (!budget.permet(MENAGE_DUREE_PAGE_MS_)) { arret = 'budget'; break; }

    const fils = SocleReprises.avecReprises(
      () => GmailApp.search(requete, depart, MENAGE_PAGE_RECHERCHE_));

    if (fils.length === 0) break;

    for (const fil of fils) {
      const messages = SocleReprises.avecReprises(() => fil.getMessages());

      // Les libellés se lisent une fois par fil, et non une fois par message :
      // `getLabels()` vit sur le fil, et l'appeler pour chacun de ses messages
      // multipliait l'appel par la longueur de la conversation.
      const libelles = SocleErreurs.absorber(
        'lecture des libellés d’un fil',
        () => fil.getLabels().map((libelle) => libelle.getName()),
        []);

      for (const message of messages) {
        if (examines >= plafond) { arret = 'plafond'; break; }
        examines += 1;
        if (traiter(message, libelles) === false) { arret = 'plafond'; break; }
      }

      if (arret) break;
    }

    if (arret) break;
    depart += fils.length;
  }

  return { examines, arret };
};

/* --------------------------------------------------------------------------
 * Lecture d'un message
 * ----------------------------------------------------------------------- */

/**
 * Rassemble d'un message tout ce dont la décision a besoin, en une fois.
 *
 * Un seul objet, construit une seule fois : les appels `getFrom()`,
 * `getSubject()` et consorts partent chacun vers les serveurs de Google, et
 * la version précédente en faisait plusieurs fois le tour — une fois pour
 * juger, une fois pour journaliser.
 *
 * Le corps est le seul champ dont l'absence est tolérée : un message dont le
 * texte brut ne se reconstitue pas — pièce jointe seule, encodage exotique —
 * reste jugeable sur son en-tête, et refuser de le traiter le laisserait dans
 * la corbeille pour toujours.
 */
const menageLireMessage_ = (message, libellesDuFil, contacts, maintenant) => {
  const expediteur = SocleReprises.avecReprises(() => message.getFrom() || '');
  const objet = SocleReprises.avecReprises(() => message.getSubject() || '');
  const adresse = menageExtraireAdresse_(expediteur);

  const corps = SocleErreurs.absorber(
    'lecture du corps d’un message',
    () => String(message.getPlainBody() ?? '').substring(0, MENAGE_LIMITE_CORPS_),
    '');

  return {
    identifiant: message.getId(),
    expediteur,
    objet,
    adresse,
    domaine: menageDomaine_(adresse),
    nomAffiche: menageNomAffiche_(expediteur),
    corps,
    texteAnalyse: `${expediteur}\n${objet}\n${corps}`,
    libelles: libellesDuFil,
    contact: adresse !== '' && contacts.has(adresse),
    authentification: menageAuthentification_(message),
    age: menageAge_(SocleReprises.avecReprises(() => message.getDate()), maintenant),
  };
};

/* --------------------------------------------------------------------------
 * Les deux seules actions exercées
 * ----------------------------------------------------------------------- */

/**
 * Vrai si l'erreur dit « ce message n'existe plus ».
 *
 * Un plan préparé hier porte des identifiants que l'utilisateur a pu vider
 * lui-même depuis, et Gmail répond alors 404. Ce n'est pas un échec : c'est le
 * résultat voulu, atteint sans nous. Les confondre ferait compter des échecs
 * imaginaires, et un rapport qui en compte n'est plus lu.
 *
 * On ne vérifie pas l'existence *avant* d'agir : ce serait un appel de plus
 * par message — doubler le trafic pour se prémunir d'un cas rare — et la
 * réponse pourrait de toute façon vieillir entre la vérification et l'action.
 */
const menageMessageDisparu_ = (erreur) => /not found|notfound|404|introuvable/i
  .test(String((erreur && erreur.message) || erreur));

/**
 * Supprime définitivement un message.
 *
 * `Gmail.Users.Messages.remove` et non `moveToTrash` : le message est déjà
 * dans la corbeille ou le spam, et c'est bien la suppression sans retour qui
 * est demandée. Il n'existe aucun moyen de revenir dessus, ce pourquoi rien
 * n'appelle cette fonction sans une ligne de plan validée.
 *
 * @returns {string} ce qui s'écrit dans la colonne « Détail » du plan
 */
const menageSupprimerDefinitivement_ = (identifiant) => {
  try {
    SocleReprises.avecReprises(() => Gmail.Users.Messages.remove('me', identifiant));
    return 'Supprimé';
  } catch (erreur) {
    if (menageMessageDisparu_(erreur)) return 'Déjà absent';
    throw erreur;
  }
};

/**
 * Déplace un message de la Corbeille vers le Spam.
 *
 * C'est la mise en quarantaine : réversible d'un clic par l'utilisateur, et
 * suivie sept jours plus tard d'une suppression si personne n'a réagi. Le
 * registre de quarantaine date l'entrée, faute de quoi ce délai serait fictif
 * — un message vieux de trois mois déplacé aujourd'hui serait supprimé dès la
 * prochaine exécution, sans que personne ait eu la moindre occasion de le
 * récupérer.
 *
 * @returns {string} ce qui s'écrit dans la colonne « Détail » du plan
 */
const menageMettreEnQuarantaine_ = (identifiant) => {
  try {
    SocleReprises.avecReprises(() => Gmail.Users.Messages.modify(
      { addLabelIds: ['SPAM'], removeLabelIds: ['TRASH'] }, 'me', identifiant));
    return 'Mis en quarantaine';
  } catch (erreur) {
    if (menageMessageDisparu_(erreur)) return 'Déjà absent';
    throw erreur;
  }
};
