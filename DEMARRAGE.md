# Ménage Gmail — guide de démarrage

Ce guide prend l'installation par la main, de la feuille vierge au premier
ménage. Il ne suppose rien de connu sur Apps Script. Pour les choix de
conception, voir [README.md](README.md).

Comptez vingt minutes, dont l'essentiel à lire le premier plan.

---

## Avant de commencer

Il faut un compte Google, et l'accès à la boîte Gmail dont on veut faire le
ménage. L'outil s'installe dans un classeur Google Sheets qui lui sert de poste
de commande : réglages, plan, journal et registre y vivent.

**Le classeur ne se partage pas.** Les actions s'exécutent sous l'identité de
qui les déclenche : c'est une protection, à condition que personne d'autre ne
puisse déclencher.

---

## 1. Créer le classeur et ouvrir l'éditeur

1. Créez un classeur sur [sheets.new](https://sheets.new).
2. Nommez-le, par exemple « Ménage Gmail ».
3. Menu **Extensions > Apps Script**. Un projet vide s'ouvre dans un nouvel
   onglet ; il est déjà lié à ce classeur, ce qui est précisément ce qu'on veut.

---

## 2. Copier le code

Dans l'éditeur Apps Script, pour **chaque** fichier du dossier `apps-script/` :

1. Cliquez sur **+** à côté de « Fichiers », puis **Script**.
2. Nommez-le comme le fichier source, **sans l'extension** : `MenageConfig`,
   `MenageMenu`, `MenageTexte`, et ainsi de suite.
3. Collez-y le contenu du fichier, en remplaçant le `function myFunction() {}`
   que l'éditeur y met d'office.

Le fichier `Code.gs` créé par défaut peut être supprimé une fois les autres
posés.

> **Pourquoi autant de fichiers ?** Parce qu'Apps Script les concatène tous :
> le découpage est pour celui qui lit, pas pour la machine. Vous pouvez tout
> coller dans un seul fichier, mais vous le regretterez à la première
> correction.

### Le manifeste

1. Icône **⚙ Paramètres du projet** (à gauche).
2. Cochez **Afficher le fichier manifeste « appsscript.json »**.
3. Revenez à **Éditeur**, ouvrez `appsscript.json`, et remplacez tout son
   contenu par celui de `apps-script/appsscript.json`.

C'est ce fichier qui active les services Gmail et People, et qui déclare les
autorisations demandées.

### Vérifier avant de continuer

Menu **Exécuter** en haut de l'éditeur : la liste déroulante doit proposer une
dizaine de fonctions, **et uniquement celles qui commencent par un verbe** —
`preparerLePlanDeMenage`, `installerLeClasseur`, `afficherAPropos`… Si vous y
voyez des noms comme `menageJuger_`, un fichier a été mal collé.

Si le menu déroulant est vide ou affiche une erreur, c'est que le projet ne se
charge pas : le plus souvent, un fichier a été collé deux fois. Deux fichiers
déclarant la même constante suffisent à empêcher **tout** le projet de
fonctionner.

---

## 3. Autoriser, puis installer

1. Dans la liste déroulante **Exécuter**, choisissez `installerLeClasseur`.
2. Cliquez sur **Exécuter**.
3. Google demande une autorisation. Cliquez **Examiner les autorisations**,
   choisissez votre compte.
4. L'écran « Google n'a pas validé cette application » apparaît : c'est normal
   pour un script personnel. Cliquez **Paramètres avancés**, puis **Accéder à
   Ménage Gmail (non sécurisé)**.
5. Lisez les autorisations demandées — elles sont expliquées dans le
   [README](README.md#les-portées-demandées-et-leur-coût) —, puis **Autoriser**.

> **Ce que vous accordez.** La portée la plus large est
> `https://mail.google.com/`, qui permet de lire **et de supprimer
> définitivement** votre courrier. Gmail n'en propose pas de plus étroite qui
> permette la suppression. L'outil n'envoie aucun message et n'interroge que la
> corbeille et le spam ; le banc d'essai refuse toute modification qui
> contredirait cela.

Revenez au classeur : six onglets y sont apparus — « Réglages », « Marques », « Expressions », « Protégés », « Quarantaine » et « Guide ». Les onglets « Plan » et « Journal » n'apparaîtront qu'au premier usage. Ouvrez **Guide** et lisez-le,
il tient en un écran.

---

## 4. Régler la rétention

Onglet **Réglages**. Les valeurs par défaut conviennent à la plupart des
usages ; celles qui méritent un instant de réflexion :

| Réglage | Défaut | Ce qu'il change |
| --- | --- | --- |
| Jours avant suppression depuis la Corbeille | 7 | Ne s'applique qu'aux messages **libellés**. Les autres passent par la quarantaine. |
| Jours de quarantaine dans le Spam | 7 | Le délai dont vous disposez pour récupérer un message déplacé à tort. |
| Messages examinés au maximum par préparation | 1500 | Un plafond, pour qu'une première exécution sur une corbeille énorme ne produise pas un plan illisible. |
| Proposer la suppression des déchets évidents | Non | À laisser sur **Non** pour commencer. Voir ci-dessous. |
| Protéger les messages des contacts | Oui | Un message d'un correspondant connu ne sera jamais proposé à la suppression. |

Onglet **Protégés** : inscrivez-y les adresses ou domaines auxquels l'outil ne
doit jamais toucher. Une entrée sans `@` est lue comme un domaine,
sous-domaines compris — `mon-employeur.fr` couvre `paie.mon-employeur.fr`.

> **Attention.** « Protégé » veut dire « cet outil n'y touche pas ». Gmail, lui,
> vide seul la Corbeille et le Spam au bout de trente jours, et aucun réglage
> n'y change rien. Pour conserver un message, sortez-le de la Corbeille.

---

## 5. Le premier plan

Retournez au classeur. Un menu **Ménage Gmail** est apparu dans la barre. S'il
manque, rechargez la page.

**Ménage Gmail > 1. Préparer le plan.**

Selon la taille de votre corbeille, comptez d'une seconde à deux minutes. Une
fenêtre résume ce qui a été examiné :

```
124 ligne(s) au plan « Plan — ménage », dont 118 déjà cochée(s).

EXAMEN
    Corbeille : 310 message(s)
    Spam : 41 message(s)
    Total : 351
    Laissés en place : 227
    Contacts protégés : 412
```

Si le résumé commence par **EXAMEN INTERROMPU**, tout va bien : le plan est
juste, mais partiel. Relancez la préparation après avoir appliqué celui-ci.

### Lire le plan

Ouvrez l'onglet **Plan — ménage**. Une ligne par action envisagée.

- **Les lignes cochées** appliquent vos réglages. La colonne « Décidée par »
  indique `Réglage`.
- **Les lignes décochées** sont des propositions du détecteur. Colonne
  « Décidée par » : `Détecteur`.

Lisez la colonne **Motif** : elle donne le score, le seuil, et chaque signal
avec son poids.

```
5/4 — se réclame de « norton » depuis xzkrvgthq.test (+3) ;
Menace de paiement : « payment failed » (+1) ; domaine peu prononçable (+1)
```

**Pour cette première fois, décochez tout et relisez.** C'est l'occasion de
vérifier que la politique correspond à ce que vous vouliez, sur vos vrais
messages. Cocher se fait ligne par ligne, ou en sélectionnant une plage de cases
et en appuyant sur **Entrée**.

---

## 6. Appliquer

**Ménage Gmail > 2. Appliquer le plan.**

Une confirmation annonce le nombre exact d'actions, dont les suppressions
définitives :

```
118 action(s) vont être exécutées, dont 12 suppression(s) définitive(s).

Une suppression définitive ne se récupère pas.

Continuer ?
```

Après application, chaque ligne du plan porte son état et l'heure à laquelle
elle a été traitée.

Si l'exécution atteint le plafond des six minutes, elle s'arrête proprement,
pose une reprise automatique dans la minute, et repart exactement où elle en
était. Vous n'avez rien à faire ; l'onglet **Plan** vous dira où elle en est.

---

## 7. Programmer le ménage quotidien

Une fois le premier plan appliqué et le résultat vérifié dans Gmail :

**Ménage Gmail > Programmer le ménage quotidien.**

Chaque nuit vers 4 h, l'outil préparera un plan et appliquera **ce qui est
pré-coché** — c'est-à-dire la seule politique de rétention. Les propositions du
détecteur resteront en attente dans le plan jusqu'à ce que vous les lisiez.

Pour arrêter : **Ménage Gmail > Arrêter le ménage quotidien**.

> **Un quota à connaître.** Les comptes personnels disposent de 90 minutes
> d'exécution de déclencheurs par jour, les comptes Workspace de 6 heures. Un
> ménage quotidien sur une boîte ordinaire en consomme quelques minutes. Sur une
> corbeille de plusieurs dizaines de milliers de messages, baissez le plafond
> d'examen plutôt que de laisser les reprises s'enchaîner.

---

## 8. Activer les propositions de suppression (facultatif)

Après quelques semaines, quand vous aurez vu ce que le détecteur propose et
constaté qu'il ne vous surprend plus, vous pouvez passer le réglage
**Proposer la suppression des déchets évidents** à `Oui`.

Cela ne supprime toujours rien automatiquement : les lignes du détecteur
arrivent décochées et le restent. Le réglage change seulement l'action proposée
— suppression plutôt que quarantaine — pour les messages qui franchissent le
seuil.

> **Est-ce utile ?** Assez peu, et c'est assumé. Un déchet non supprimé part en
> quarantaine et sera supprimé sept jours plus tard de toute façon. Le réglage
> ne gagne que ces sept jours. Il existe pour ceux que sept jours de spam
> encombrent, pas parce qu'il rendrait l'outil meilleur.

---

## Quand quelque chose ne va pas

**« Fonction de script introuvable ».** Deux causes, et aucune n'est celle qu'on
croit. Soit un fichier a été collé deux fois, et le projet entier refuse de se
charger — toutes les fonctions deviennent introuvables d'un coup. Soit le menu a
été créé avant l'ajout d'une fonction : rechargez le classeur.

**Le menu « Ménage Gmail » n'apparaît pas.** Rechargez la page du classeur.
S'il manque toujours, le projet ne se charge pas : ouvrez l'éditeur, le menu
**Exécuter** vous le dira.

**Des lignes « À vérifier » dans le plan.** L'exécution a été interrompue entre
l'action et l'enregistrement de son résultat : impossible de savoir si elle a eu
lieu. Vérifiez dans Gmail, puis corrigez la colonne « État » à la main. C'est le
seul verdict honnête pour une opération sans retour.

**Des lignes « À reprendre » qui ne passent jamais.** **Ménage Gmail > Remettre
en file ce qui a calé** remet en file ce qui a échoué de façon passagère, sans
toucher à ce qui a eu lieu.

**Le détecteur propose un message que vous vouliez garder.** Ne cochez pas la
ligne, et inscrivez l'expéditeur à l'onglet **Protégés**. Si une marque du
référentiel produit des faux positifs à répétition, retirez sa ligne de l'onglet
**Marques** : l'installation ne la remettra pas.

**Vous voulez tout arrêter.** **Ménage Gmail > Arrêter le ménage quotidien**
retire le déclencheur. Rien ne se passera plus sans vous.
