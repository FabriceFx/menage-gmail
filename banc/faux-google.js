/**
 * Banc d'essai — simulateurs des services Google.
 *
 * **Un faux service complaisant valide du code faux.** C'est la seule règle
 * qui compte ici, et elle se décline :
 *
 *   - le faux classeur rend des objets `Date` là où l'on a écrit une chaîne,
 *     comme le vrai, faute de quoi le banc validerait un code qui casse dès
 *     la première lecture réelle ;
 *   - `GmailApp.search` plafonne à 500 sans bornes, exactement comme le vrai,
 *     puisque c'est précisément ce plafond qu'on veut prouver contourné ;
 *   - `Gmail.Users.Messages.remove` lève sur un identifiant inconnu, avec le
 *     message qu'un vrai 404 porte ;
 *   - `getHeader` rend la chaîne vide pour un en-tête absent, jamais
 *     `undefined`.
 *
 * Chaque fois qu'on a été tenté d'assouplir l'un de ces points pour faire
 * passer un test, c'est le test qui avait tort.
 */

'use strict';

/* --------------------------------------------------------------------------
 * Classeur
 * ----------------------------------------------------------------------- */

const EST_JOUR = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reproduit la conversion que Sheets applique en stockant une valeur.
 *
 * Une chaîne `yyyy-MM-dd` écrite dans une cellule revient en objet `Date` :
 * c'est le comportement qui fait rendre « Thu May 14 2026 » à `String(valeur)`
 * et rend tout tri alphabétique faux. Le banc doit le reproduire, sans quoi il
 * validerait un code qui ne normalise pas à la lecture.
 */
const commeSheets = (valeur) => {
  if (typeof valeur === 'string' && EST_JOUR.test(valeur)) {
    return new Date(`${valeur}T00:00:00Z`);
  }
  return valeur;
};

class FausseePlage {
  constructor(feuille, ligne, colonne, hauteur, largeur) {
    Object.assign(this, { feuille, ligne, colonne, hauteur, largeur });
  }

  setValues(valeurs) {
    if (valeurs.length !== this.hauteur) {
      throw new Error(
        `The number of rows in the data does not match the number of rows in the range. `
        + `(données ${valeurs.length}, plage ${this.hauteur})`);
    }
    valeurs.forEach((cellules, decalage) => {
      if (cellules.length !== this.largeur) {
        throw new Error(
          'The number of columns in the data does not match the number of columns in the range. '
          + `(données ${cellules.length}, plage ${this.largeur})`);
      }
      const ligne = this.ligne + decalage - 1;
      while (this.feuille.cellules.length <= ligne) this.feuille.cellules.push([]);
      cellules.forEach((valeur, position) => {
        this.feuille.cellules[ligne][this.colonne - 1 + position] = commeSheets(valeur);
      });
    });
    return this;
  }

  getValues() {
    const sortie = [];
    for (let l = 0; l < this.hauteur; l += 1) {
      const source = this.feuille.cellules[this.ligne - 1 + l] || [];
      const ligne = [];
      for (let c = 0; c < this.largeur; c += 1) {
        const valeur = source[this.colonne - 1 + c];
        ligne.push(valeur === undefined ? '' : valeur);
      }
      sortie.push(ligne);
    }
    return sortie;
  }

  setFontWeight() { return this; }
  setDataValidation() { return this; }
  setNumberFormat() { return this; }
}

class FausseFeuille {
  constructor(nom) {
    this.nom = nom;
    this.cellules = [];
  }

  getName() { return this.nom; }

  getLastRow() {
    for (let l = this.cellules.length - 1; l >= 0; l -= 1) {
      const ligne = this.cellules[l] || [];
      if (ligne.some((v) => v !== undefined && v !== '')) return l + 1;
    }
    return 0;
  }

  getLastColumn() {
    return this.cellules.reduce((max, ligne) => Math.max(max, (ligne || []).length), 0);
  }

  getRange(ligne, colonne, hauteur = 1, largeur = 1) {
    if (ligne < 1 || colonne < 1) {
      throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    }
    return new FausseePlage(this, ligne, colonne, hauteur, largeur);
  }

  appendRow(cellules) {
    this.cellules[this.getLastRow()] = cellules.map(commeSheets);
    return this;
  }

  clear() { this.cellules = []; return this; }
  setFrozenRows() { return this; }
  setColumnWidth() { return this; }
}

class FauxClasseur {
  constructor() { this.feuilles = new Map(); }

  getSheetByName(nom) { return this.feuilles.get(nom) || null; }

  insertSheet(nom) {
    if (this.feuilles.has(nom)) {
      throw new Error(`A sheet with the name "${nom}" already exists. Please enter another name.`);
    }
    const feuille = new FausseFeuille(nom);
    this.feuilles.set(nom, feuille);
    return feuille;
  }

  getSheets() { return [...this.feuilles.values()]; }
}

/* --------------------------------------------------------------------------
 * Gmail
 * ----------------------------------------------------------------------- */

class FauxMessage {
  constructor(donnees) {
    this.donnees = {
      entetes: {}, corps: '', libelles: [], objet: '', expediteur: '', ...donnees,
    };
  }

  getId() { return this.donnees.id; }
  getFrom() { return this.donnees.expediteur; }
  getSubject() { return this.donnees.objet; }
  getPlainBody() { return this.donnees.corps; }
  getDate() { return this.donnees.date; }

  /** Un en-tête absent rend la chaîne vide, jamais `undefined`. */
  getHeader(nom) {
    const cle = Object.keys(this.donnees.entetes)
      .find((present) => present.toLowerCase() === String(nom).toLowerCase());
    return cle ? this.donnees.entetes[cle] : '';
  }

  /** `GmailMessage` n'a pas de `isInSpam()`. L'inventer masquerait une erreur. */
  isInTrash() { return this.donnees.dossier === 'trash'; }
}

class FauxFil {
  constructor(messages, libelles) {
    this.messages = messages;
    this.libelles = libelles || [];
  }

  getMessages() { return this.messages; }

  /** Ne rend que les libellés créés par l'utilisateur, comme le vrai. */
  getLabels() { return this.libelles.map((nom) => ({ getName: () => nom })); }
}

/** Plafond réel d'une recherche sans bornes. C'est ce qu'on veut prouver contourné. */
const PLAFOND_RECHERCHE_SANS_BORNES = 500;

class FauxGmail {
  constructor() {
    this.fils = [];
    this.appels = { search: 0, remove: 0, modify: 0 };
    this.supprimes = [];
    this.deplaces = [];
  }

  ajouterFil(messages, libelles) {
    this.fils.push(new FauxFil(messages.map((m) => new FauxMessage(m)), libelles));
    return this;
  }

  /** Les messages encore vivants, dossier par dossier. */
  messagesDe(dossier) {
    return this.fils.flatMap((fil) => fil.getMessages())
      .filter((message) => message.donnees.dossier === dossier
        && !this.supprimes.includes(message.getId()));
  }

  filsDe(dossier) {
    return this.fils
      .map((fil) => {
        const gardes = fil.getMessages().filter((message) => message.donnees.dossier === dossier
          && !this.supprimes.includes(message.getId()));
        return gardes.length > 0 ? new FauxFil(gardes, fil.libelles) : null;
      })
      .filter(Boolean);
  }

  search(requete, depart, maximum) {
    this.appels.search += 1;

    const dossier = requete.includes('in:trash') ? 'trash' : 'spam';
    let fils = this.filsDe(dossier);

    // `older_than:Nd` filtre côté Gmail : le banc doit le faire aussi, sinon
    // il validerait un code qui compte sur un filtre inexistant.
    const anciennete = requete.match(/older_than:(\d+)d/);
    if (anciennete) {
      const seuil = Date.now() - Number(anciennete[1]) * 24 * 3600 * 1000;
      fils = fils.filter((fil) => fil.getMessages().some((m) => m.getDate().getTime() < seuil));
    }

    if (depart === undefined) return fils.slice(0, PLAFOND_RECHERCHE_SANS_BORNES);
    return fils.slice(depart, depart + maximum);
  }
}

/* --------------------------------------------------------------------------
 * Assemblage du bac à sable
 * ----------------------------------------------------------------------- */

const construireSandbox = ({ maintenant, contacts = [], contactsEnEchec = false } = {}) => {
  const classeur = new FauxClasseur();

  // L'horloge du projet. `maintenant` a longtemps été accepté sans être lu :
  // le code s'exécutait à la date réelle, et un cas écrit le 20 septembre
  // pour « aujourd'hui » échouait trois semaines plus tard. L'horloge est
  // décalée plutôt que figée, pour que le temps continue de passer : le
  // budget des six minutes se mesure en temps écoulé.
  const decalage = maintenant ? maintenant.getTime() - Date.now() : 0;
  const DateDuProjet = class extends Date {
    constructor(...valeurs) {
      if (valeurs.length) super(...valeurs);
      else super(Date.now() + decalage);
    }
    static now() { return Date.now() + decalage; }
    // Les dates rendues par le faux classeur sont des Date de Node : elles
    // doivent rester des `Date` pour le code, comme chez Google.
    static [Symbol.hasInstance](valeur) { return valeur instanceof Date; }
  };
  const gmail = new FauxGmail();
  const declencheurs = [];
  const proprietes = new Map();

  const sandbox = {
    console,
    Date: DateDuProjet,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    JSON,
    RegExp,
    Error,
    isNaN,
    parseInt,
    parseFloat,
    undefined,

    // --- Services Apps Script ---
    SpreadsheetApp: {
      getActive: () => classeur,
      flush: () => {},
      newDataValidation: () => ({ requireCheckbox: () => ({ build: () => ({}) }) }),
      getUi: () => { throw new Error('Cannot call SpreadsheetApp.getUi() from this context.'); },
    },

    GmailApp: {
      search: (requete, depart, maximum) => gmail.search(requete, depart, maximum),
    },

    Gmail: {
      Users: {
        Messages: {
          remove: (utilisateur, identifiant) => {
            gmail.appels.remove += 1;
            const existe = gmail.fils.flatMap((f) => f.getMessages())
              .some((m) => m.getId() === identifiant);
            if (!existe || gmail.supprimes.includes(identifiant)) {
              throw new Error(`Not Found: message ${identifiant}`);
            }
            gmail.supprimes.push(identifiant);
          },
          modify: (corps, utilisateur, identifiant) => {
            gmail.appels.modify += 1;
            const message = gmail.fils.flatMap((f) => f.getMessages())
              .find((m) => m.getId() === identifiant);
            if (!message || gmail.supprimes.includes(identifiant)) {
              throw new Error(`Not Found: message ${identifiant}`);
            }
            // Un `modify` sans corps est refusé par le vrai service : le faux
            // doit refuser ce que le vrai refuse.
            if (!corps || !corps.addLabelIds) {
              throw new Error('Invalid value for: resource');
            }
            message.donnees.dossier = corps.addLabelIds.includes('SPAM') ? 'spam' : 'trash';
            gmail.deplaces.push(identifiant);
          },
        },
      },
    },

    People: {
      People: {
        Connections: {
          list: () => {
            if (contactsEnEchec) throw new Error('Quota exceeded for quota metric');
            return {
              connections: contacts.map((adresse) => ({ emailAddresses: [{ value: adresse }] })),
            };
          },
        },
      },
    },

    Utilities: {
      formatDate: (date, fuseau, motif) => {
        const deux = (n) => String(n).padStart(2, '0');
        const remplacements = {
          'yyyy-MM-dd HH:mm:ss': () => `${date.getUTCFullYear()}-${deux(date.getUTCMonth() + 1)}-`
            + `${deux(date.getUTCDate())} ${deux(date.getUTCHours())}:${deux(date.getUTCMinutes())}:`
            + `${deux(date.getUTCSeconds())}`,
          'yyyy-MM-dd': () => `${date.getUTCFullYear()}-${deux(date.getUTCMonth() + 1)}-`
            + `${deux(date.getUTCDate())}`,
        };
        if (!remplacements[motif]) throw new Error(`Motif de date non simulé : ${motif}`);
        return remplacements[motif]();
      },
      sleep: () => {},
    },

    Session: { getScriptTimeZone: () => 'UTC' },

    LockService: {
      getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
    },

    ScriptApp: {
      getProjectTriggers: () => declencheurs,
      deleteTrigger: (cible) => {
        const position = declencheurs.indexOf(cible);
        if (position >= 0) declencheurs.splice(position, 1);
      },
      newTrigger: (nom) => {
        const construit = {
          timeBased: () => ({
            after: () => construit,
            atHour: () => construit,
            everyDays: () => construit,
            create: () => {
              const declencheur = { getHandlerFunction: () => nom };
              declencheurs.push(declencheur);
              return declencheur;
            },
          }),
        };
        return construit;
      },
    },

    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (cle) => (proprietes.has(cle) ? proprietes.get(cle) : null),
        setProperty: (cle, valeur) => proprietes.set(cle, String(valeur)),
        deleteProperty: (cle) => proprietes.delete(cle),
      }),
    },
  };

  sandbox.globalThis = sandbox;
  return {
    sandbox, classeur, gmail, declencheurs, maintenant: maintenant || new Date(),
  };
};

module.exports = {
  construireSandbox,
  FauxMessage,
  PLAFOND_RECHERCHE_SANS_BORNES,
  commeSheets,
};
