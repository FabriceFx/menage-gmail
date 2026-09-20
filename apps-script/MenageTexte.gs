/**
 * Ménage Gmail — adresses, domaines et correspondance de texte. Introduit en v1.0.
 *
 * Le fichier le plus modeste du projet, et celui qui portait le défaut le plus
 * coûteux : la version précédente cherchait ses marques par `includes()`, de
 * sorte que « actu**ally** » valait une occurrence de la marque « ally ». Un
 * message légitime contenant ce mot très courant se voyait attribuer un
 * conflit d'identité, lequel entraînait à lui seul la suppression définitive.
 *
 * D'où la règle que ce fichier applique : **une marque se cherche sur des mots
 * entiers, jamais en sous-chaîne.** La différence ne se voit pas à la lecture
 * d'un journal de recette ; elle se voit à la première perte de courrier.
 */

/**
 * Bornes de mot, en propriétés Unicode plutôt qu'en `\b`.
 *
 * `\b` se définit sur `[A-Za-z0-9_]` : il place une frontière entre « é » et
 * « e », si bien que « félicitations » contiendrait le mot « licitation ».
 * `\p{L}` et `\p{N}` couvrent les lettres accentuées et les alphabets non
 * latins ; le drapeau `u` est obligatoire pour qu'ils soient lus comme des
 * classes et non comme la lettre « p ».
 */
const MENAGE_AVANT_MOT_ = '(^|[^\\p{L}\\p{N}])';
const MENAGE_APRES_MOT_ = '([^\\p{L}\\p{N}]|$)';

/** Échappe ce qui, dans un terme du référentiel, serait lu comme de la syntaxe. */
const menageEchapperRegex_ = (valeur) => String(valeur ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Vrai si `terme` apparaît comme mot entier dans `texte`.
 *
 * Un terme composé — « geek squad », « carte cadeau » — fonctionne : seules
 * comptent les bornes aux deux extrémités, pas les espaces intérieurs.
 *
 * Les termes vides rendent `false` plutôt que `true` : une cellule laissée
 * vide dans l'onglet « Expressions » ne doit pas se mettre à correspondre à
 * tous les messages du compte.
 */
const menageContientMot_ = (texte, terme) => {
  const aiguille = String(terme ?? '').trim();
  if (aiguille === '') return false;

  const motif = new RegExp(
    `${MENAGE_AVANT_MOT_}${menageEchapperRegex_(aiguille)}${MENAGE_APRES_MOT_}`, 'iu');
  return motif.test(String(texte ?? ''));
};

/**
 * Extrait l'adresse d'un en-tête `From`.
 *
 * Deux passes, et la première a la priorité : c'est l'adresse entre chevrons
 * qui reçoit la réponse, pas celle qui traîne dans le nom affiché.
 *
 * **Le dernier groupe de chevrons, et non le premier.** Un en-tête de la forme
 * `"Service <fraude@exemple.test>" <reel@autre.test>` en porte deux : la
 * première est du texte d'affichage, que l'expéditeur écrit comme il veut ;
 * seule la dernière est l'adresse. Prendre la première revient à juger
 * l'expéditeur sur la partie qu'il contrôle librement — ce que le banc a
 * attrapé, et ce qui aurait innocenté n'importe quel usurpateur soigneux.
 */
const menageExtraireAdresse_ = (valeur) => {
  const texte = String(valeur ?? '');
  if (texte === '') return '';

  const chevrons = [...texte.matchAll(/<\s*([^<>@\s]+@[^<>@\s]+?)\s*>/g)];
  if (chevrons.length > 0) return chevrons[chevrons.length - 1][1].trim().toLowerCase();

  const nue = texte.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return nue ? nue[0].trim().toLowerCase() : '';
};

/** Le nom affiché, débarrassé de ses guillemets. */
const menageNomAffiche_ = (valeur) => {
  const texte = String(valeur ?? '').trim();
  if (texte === '') return '';

  const chevron = texte.indexOf('<');
  const brut = chevron >= 0 ? texte.substring(0, chevron) : texte;

  return brut.replace(/^\s*["']|["']\s*$/g, '').trim();
};

/**
 * Le domaine d'une adresse.
 *
 * `lastIndexOf('@')` parce que la partie locale d'une adresse peut, selon la
 * RFC 5321, contenir un `@` entre guillemets. C'est rare, et c'est justement
 * ce que produit une adresse forgée pour tromper un analyseur trop simple.
 */
const menageDomaine_ = (adresse) => {
  const texte = String(adresse ?? '');
  const coupe = texte.lastIndexOf('@');
  return coupe < 0 ? '' : texte.substring(coupe + 1).trim().toLowerCase();
};

/**
 * Vrai si `domaine` est `reference` ou l'un de ses sous-domaines.
 *
 * Le point avant la référence est ce qui distingue `mail.ebay.com` — un
 * sous-domaine légitime — de `ebay.com.exemple.test`, qui n'a rien à voir
 * avec eBay et que `endsWith('ebay.com')` seul ne rattraperait pas... mais
 * qu'un `endsWith('.ebay.com')` sans égalité laisserait passer dans l'autre
 * sens. Il faut les deux tests, et c'est l'oubli habituel.
 */
const menageDomaineCouvert_ = (domaine, reference) => {
  const sujet = String(domaine ?? '').toLowerCase();
  const cible = String(reference ?? '').toLowerCase();
  if (sujet === '' || cible === '') return false;
  return sujet === cible || sujet.endsWith(`.${cible}`);
};

/** Réduit les blancs d'un champ d'en-tête pour qu'il tienne sur une ligne de plan. */
const menageUneLigne_ = (valeur, maximum = 200) => {
  const texte = String(valeur ?? '').replace(/\s+/g, ' ').trim();
  return texte.length > maximum ? `${texte.substring(0, maximum - 1)}…` : texte;
};
