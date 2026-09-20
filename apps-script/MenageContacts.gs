/**
 * Ménage Gmail — les contacts. Introduit en v1.0.
 *
 * ## Une portée qui ne servait à rien
 *
 * La version précédente chargeait la totalité des contacts par l'API People,
 * calculait pour chaque message si l'expéditeur en faisait partie, écrivait
 * `Contact=true` au journal — et n'en tenait aucun compte pour décider. La
 * portée `contacts.readonly` était donc demandée à l'utilisateur, avec l'écran
 * d'autorisation qui l'accompagne, pour produire une colonne décorative.
 *
 * Demander une portée dont on ne se sert pas est une faute : chaque
 * autorisation demandée sans nécessité use la vigilance de celui qui la
 * donne, et prépare le jour où il accordera sans lire.
 *
 * Ici, être un contact protège : aucun message d'un correspondant connu ne
 * peut être proposé à la suppression par le détecteur. C'est la protection la
 * plus efficace du projet, parce qu'elle couvre exactement la population de
 * messages dont la perte serait grave.
 */

const MENAGE_MEMOIRE_CONTACTS_ = {};

/** Pagination de l'API People : le maximum admis, pour faire le moins d'appels. */
const MENAGE_PAGE_CONTACTS_ = 1000;

/**
 * Charge les adresses de tous les contacts, en minuscules.
 *
 * Un `Set` parce que la question posée est toujours « celle-ci en fait-elle
 * partie ? », jamais « lesquelles ? ».
 *
 * Un échec est absorbé et rend un ensemble vide — mais l'appelant doit savoir
 * que la protection est alors inopérante, faute de quoi il s'en croirait
 * couvert. C'est ce que dit `complet`. Une liste vide et une liste inconnue ne
 * se confondent pas : la première signifie « aucun contact », la seconde
 * « je n'ai pas su », et les deux ne se traitent pas pareil.
 *
 * @returns {{adresses: Set<string>, complet: boolean}}
 */
const menageContacts_ = () => {
  if (MENAGE_MEMOIRE_CONTACTS_.charge) return MENAGE_MEMOIRE_CONTACTS_.charge;

  const adresses = new Set();
  let complet = true;
  let jeton = null;

  try {
    do {
      const options = { personFields: 'emailAddresses', pageSize: MENAGE_PAGE_CONTACTS_ };
      if (jeton) options.pageToken = jeton;

      const reponse = SocleReprises.avecReprises(
        () => People.People.Connections.list('people/me', options));

      (reponse.connections || []).forEach((personne) => {
        (personne.emailAddresses || []).forEach((entree) => {
          const valeur = String(entree.value ?? '').trim().toLowerCase();
          if (valeur !== '') adresses.add(valeur);
        });
      });

      jeton = reponse.nextPageToken || null;
    } while (jeton);
  } catch (erreur) {
    /*
     * Une page manquée laisse une liste partielle, qui est pire qu'une liste
     * vide : on croirait protégés des contacts qui ne le seraient plus. On
     * note donc l'incomplétude, et la préparation refusera de proposer la
     * moindre suppression heuristique tant qu'elle dure.
     */
    complet = false;
    console.warn(`Contacts chargés partiellement : ${erreur && erreur.message}`);
  }

  MENAGE_MEMOIRE_CONTACTS_.charge = { adresses, complet };
  return MENAGE_MEMOIRE_CONTACTS_.charge;
};
