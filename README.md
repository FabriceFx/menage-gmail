<a id="francais"></a>

# Ménage Gmail

📖 Français (ci-dessous) · [🇬🇧 English version](#english)

Vide la Corbeille et le Spam d'une boîte Gmail selon une politique de rétention
que l'on règle, et propose la suppression des messages qui ressemblent à des
escroqueries. La boîte de réception n'est jamais touchée, et n'est même pas
interrogée.

Pour l'installer et s'en servir, voir **[DEMARRAGE.md](DEMARRAGE.md)**. Ce
fichier-ci explique les choix de conception, et surtout **pourquoi** ils sont ce
qu'ils sont.

## Le problème, tel qu'il se pose

Un outil qui supprime définitivement du courrier travaille sans filet. Gmail ne
garde aucune copie d'un message effacé par l'API, il n'existe aucune commande
d'annulation, et le propriétaire de la boîte ne s'aperçoit de la perte que
lorsqu'il cherche le message — c'est-à-dire des mois plus tard, quand plus rien
n'est récupérable et que le journal d'exécution a été purgé.

Trois conséquences commandent toute la conception.

**Une heuristique n'a pas le droit de supprimer.** Un détecteur d'escroquerie
qui travaille sur des correspondances de texte se trompera : la seule question
est de savoir ce que coûte son erreur. Ici elle coûterait un message perdu sans
trace. Le détecteur propose donc, et quelqu'un décide.

**Un doute ne vaut jamais une suppression.** Une date illisible n'est pas une
date ancienne ; une liste de contacts partiellement chargée n'est pas une liste
vide ; un échec de lecture n'est pas une absence de signal. Chacune de ces
confusions transforme une incertitude en motif d'effacement, et chacune était
présente dans la version d'origine.

**Ce qui n'est pas écrit n'a pas eu lieu.** Une exécution Apps Script dure six
minutes au plus, et passé ce délai elle n'est pas interrompue : elle est
**tuée**. Aucun `catch`, aucun `finally`. L'état doit donc être écrit au fur et
à mesure, et là où un humain peut le relire.

## Les trois temps

1. **Préparer.** Le script parcourt la Corbeille et le Spam, décide de chaque
   message, et écrit une ligne par action envisagée dans l'onglet du plan. Rien
   n'est modifié.
2. **Relire.** Les lignes qui ne font qu'appliquer un réglage arrivent cochées ;
   celles que propose le détecteur arrivent décochées et le restent tant que
   personne ne les a lues. Une ligne non cochée ne sera jamais traitée.
3. **Appliquer.** Le nombre exact d'actions est annoncé, dont le nombre de
   suppressions définitives, puis chaque ligne est marquée au moment où elle est
   traitée.

Ce découpage n'a pas été choisi pour la forme : il règle trois défauts d'un
coup.

La suppression irréversible cesse d'être automatique. **La pagination cesse de
sauter des messages** — paginer une recherche qu'on modifie en la parcourant
fait glisser les indices, et retirer les cent premiers fils de la corbeille
décale tous les suivants ; ici la préparation ne fait que lire, l'application ne
travaille plus que sur des identifiants. Et **le plafond des six minutes cesse
de perdre du travail**, puisque l'état vit dans l'onglet, ligne par ligne.

## Le pré-cochage, et où passe la ligne

Appliquer sans nuance la règle « rien sans une case cochée » obligerait à cocher
chaque matin des dizaines de lignes qui ne font qu'exécuter une décision déjà
prise. Personne ne le ferait longtemps : on finirait par tout cocher sans lire,
ce qui est pire que de ne pas cocher du tout.

La ligne de partage n'est donc pas « irréversible ou non », elle est **qui a
décidé** :

| Décidée par | Ce que c'est | Arrive cochée |
| --- | --- | --- |
| `Réglage` | Une politique de rétention qu'un humain a posée une fois, dans un onglet qu'il peut relire. | oui |
| `Détecteur` | Un jugement de la machine sur des correspondances de texte. | non |

Le pré-cochage est visible : la colonne « Décidée par » le dit en toutes
lettres. Une automatisation qu'on ne peut pas voir n'est pas une automatisation,
c'est une surprise.

## La quarantaine, et pourquoi elle a besoin d'un registre

Un message de la corbeille ni libellé ni protégé part vers le Spam, où il
dispose de sept jours avant suppression. C'est réversible : l'utilisateur l'en
sort d'un clic.

Encore faut-il que ces sept jours existent. Ils se comptent depuis le jour où
l'on a décidé de se méfier — pas depuis la date d'écriture du message, qui peut
être ancienne de plusieurs mois. Cette date de mise en quarantaine n'existe
nulle part dans Gmail : ni les libellés, ni les en-têtes ne la portent. Elle est
donc tenue dans un onglet, et écrite **immédiatement après** chaque
déplacement — jamais avant, jamais par lots.

L'ordre n'est pas indifférent. Une interruption entre le déplacement et
l'inscription fait perdre sa quarantaine à un message ; l'ordre inverse
laisserait au registre des lignes pour des messages restés en corbeille, qui
bloqueraient leur suppression sans que rien ne le signale. On préfère le défaut
qui se voit.

## Le détecteur

Chaque signal porte un poids, le total se compare à un seuil, et le motif écrit
dans le plan liste les signaux retenus avec leur poids et le total. Un verdict
qui ne sait pas dire pourquoi il est ce qu'il est ne survit pas à la première
contestation — et ici, la contestation vient de celui qui relit avant de cocher.

| Signal | Poids |
| --- | --- |
| Se réclame d'une marque depuis un domaine qui n'est pas le sien | 3 |
| Se présente comme une marque mais parle d'une autre | 3 |
| DMARC en échec | 2 |
| Marque commerciale écrite depuis une messagerie gratuite | 2 |
| Menace sur un compte ou un paiement | 1 |
| Appât promotionnel | 1 |
| Domaine peu prononçable | 1 |
| Adresse de plus de 70 caractères | 1 |

Le seuil est à **4**, strictement au-dessus du poids le plus fort : aucun signal
ne suffit seul. Le banc le vérifie plutôt que de le supposer.

Trois choses le neutralisent : un expéditeur inscrit à l'onglet « Protégés », un
expéditeur figurant dans les contacts, et — pour les seuls signaux d'usurpation
— une authentification DMARC réussie. Cette dernière n'innocente pas : un escroc
peut signer correctement son propre domaine. Elle établit seulement que
l'expéditeur est bien celui qu'il affiche, ce qui rend sans objet le reproche
d'usurpation, et rien d'autre.

Les marques et les expressions vivent dans des onglets. Ce qui relève du
jugement ne se met pas dans une constante : corriger un faux positif ne doit
demander aucun déploiement, et le code n'ajoute que les entrées nouvelles — il
ne réécrit jamais une décision humaine.

## Ce que l'outil ne peut pas faire

**Protéger un message de Gmail lui-même.** Gmail vide seul la Corbeille et le
Spam au bout de trente jours. Un message inscrit à l'onglet « Protégés »
échappe à cet outil, jamais à cette purge. Pour conserver un message, il faut le
sortir de la Corbeille — et l'outil le dit, dans son guide, plutôt que de
laisser croire à une protection qu'il n'a pas.

**Annoncer le quota de suppression restant.** Apps Script expose le quota
d'envoi de courriels (`MailApp.getRemainingDailyQuota`), pas celui des appels à
l'API Gmail. Plutôt que d'afficher un chiffre inventé, l'outil n'en affiche
aucun : le budget de temps et le plafond d'examen bornent le travail par
d'autres moyens.

**Retrouver un message supprimé.** Il n'y a pas de remède. C'est pourquoi le
plan existe.

## Les portées demandées, et leur coût

| Portée | Pourquoi |
| --- | --- |
| `https://mail.google.com/` | Lire et **supprimer définitivement**. Gmail ne propose rien de plus étroit : `gmail.modify` autorise la mise à la corbeille, pas l'effacement. |
| `contacts.readonly` | Protéger les correspondants connus. |
| `spreadsheets.currentonly` | Le classeur porteur, et lui seul. |
| `script.scriptapp` | Poser le déclencheur quotidien et les reprises. |

La première est la plus large que Gmail propose, et il n'existe pas de version
en lecture seule qui permette la suppression. Le dire vaut mieux que le
maquiller. La compensation offerte est **vérifiable** : le banc refuse toute
recherche Gmail visant un autre dossier que `in:trash` ou `in:spam`, et tout
appel d'envoi de courriel. Si la compensation cessait d'être vraie, c'est la
documentation qui deviendrait mensongère — et ce cas de test la rattrape.

## Lié au classeur, et non autonome

Un projet lié donne `onOpen()` comme déclencheur simple : le menu apparaît sans
rien installer, et **chaque action s'exécute sous l'identité de qui la
déclenche**.

Un projet autonome exigerait un déclencheur installable, lequel s'exécute sous
l'identité de celui qui l'a posé. Toute personne à qui l'on partagerait le
classeur agirait alors sur la boîte Gmail de cette personne-là. Pour un outil
qui supprime définitivement du courrier, c'est une faute — et la bonne défense
est celle qu'on n'a pas eu à coder.

## Organisation des fichiers

```
apps-script/
  MenageConfig.gs         noms, défauts, version — que des littéraux
  MenageMenu.gs           les seuls points d'entrée du projet
  MenageOperation.gs      déclaration du plan, préparation, application
  MenageDecision.gs       l'arbre de décision, sans appel à Gmail
  MenageDetecteur.gs      le score et ses signaux
  MenageReferentiel.gs    lecture des onglets éditables
  MenageQuarantaine.gs    le registre des mises en quarantaine
  MenageGmail.gs          recherche paginée, lecture, les deux actions
  MenageContacts.gs       API People, et ce qu'un chargement partiel implique
  MenageAges.gs           l'âge, et le refus de deviner
  MenageTexte.gs          adresses, domaines, correspondance en mots entiers
  MenageJournal.gs        archivage des plans appliqués
  MenageRapport.gs        pré-cochage et résumés
  MenageInstallation.gs   pose des onglets et du guide
  PlanPuisApplication.gs  recopié de plan-puis-application, non modifié
  Socle*.gs               recopiés du socle Apps Script, non modifiés
banc/
  faux-google.js          les simulateurs, qui refusent ce que les vrais refusent
  test.js                 51 cas
```

Les fichiers `Socle*.gs` et `PlanPuisApplication.gs` sont des copies conformes.
Les corriger ici serait les faire diverger de leur dépôt d'origine : une
correction qui les concerne se fait là-bas, puis se recopie.

Le fichier `Code.gs` d'origine, qui portait tout le projet en un seul bloc, a
été retiré : `apps-script/` le remplace intégralement. Le [CHANGELOG](CHANGELOG.md)
garde le relevé de ce qu'il faisait et de ce qui a été corrigé.

## Le banc d'essai

```bash
node banc/test.js
```

Les `.gs` sont chargés dans un contexte Node où les services Google sont
simulés, puis rejoués sur des données de la forme exacte que rendent les API.

**Chaque défaut corrigé a ici le cas qui l'aurait attrapé.** C'est la seule
chose qui rende un banc utile : il ne s'agit pas de couvrir des lignes, mais
qu'une régression précise redevienne visible. Le contrôle se refait à la main —
réintroduire un défaut doit faire échouer le banc :

| Défaut à réintroduire | Cas qui doit échouer |
| --- | --- |
| Chercher les marques par `includes()` | « actually » ne contient pas la marque « ally » |
| Compter la quarantaine depuis la date du message | un message mis en quarantaine aujourd'hui n'est pas supprimable aussitôt |
| Remonter le plancher des dates à 2020 | un message de 2015 a un âge connu |
| Appeler `GmailApp.search` sans bornes | la recherche dépasse le plafond des 500 fils |
| Ramener le seuil du détecteur à 2 | un message d'un ami sur Gmail disant « congratulations » n'est pas un déchet |
| Déclarer une fonction interne en `function` | aucune fonction interne n'encombre le menu d'exécution |

Deux pièges du procédé, payés une fois. Les `const` de portée globale ne
deviennent pas des propriétés de l'objet global : on les récupère par
`vm.runInContext('nom', sandbox)`. Et **le faux service doit refuser ce que le
vrai refuse** — le faux classeur rend des objets `Date` là où l'on a écrit des
chaînes, la fausse recherche plafonne à 500 sans bornes, le faux service Gmail
lève sur un identifiant inconnu. Chaque fois qu'on a été tenté d'assouplir l'un
de ces points pour faire passer un test, c'est le test qui avait tort.

Avant tout envoi vers Apps Script, le contrôle qui évite de découvrir
« Fonction de script introuvable » une minute trop tard :

```bash
cat apps-script/*.gs > /tmp/menage.js && node --check /tmp/menage.js
```

Deux fichiers qui déclarent la même constante globale suffisent à empêcher le
projet entier de se charger — et **toutes** ses fonctions deviennent
introuvables d'un coup, y compris celles qui n'ont rien à voir. Le banc vérifie
aussi cela.

## Licence

Elastic License 2.0 — voir [LICENSE](LICENSE).

---

<a id="english"></a>

# Gmail Cleanup

🇬🇧 English (below) · [📖 Version française](#francais)

Empties the Trash and Spam folders of a Gmail account according to a retention
policy you configure, and proposes deletion for messages that look like scams.
The inbox is never touched, and never even queried.

To install and use it, see **[DEMARRAGE.md](DEMARRAGE.md)** (in French). This
file explains the design decisions, and above all **why** they are what they are.

## The problem

A tool that permanently deletes mail works without a safety net. Gmail keeps no
copy of a message erased through the API, there is no undo, and the mailbox
owner only notices the loss when looking for the message — months later, when
nothing is recoverable and the execution log has been purged.

Three consequences drive the whole design.

**A heuristic has no right to delete.** A scam detector working on text matches
will be wrong sometimes; the only question is what its mistakes cost. Here they
would cost a message lost without a trace. So the detector proposes, and a
person decides.

**A doubt is never grounds for deletion.** An unreadable date is not an old
date; a partially loaded contact list is not an empty one; a failed read is not
an absence of signal. Each of these confusions turns uncertainty into grounds
for erasure, and each was present in the original version.

**What is not written down did not happen.** An Apps Script execution lasts at
most six minutes, after which it is not interrupted but **killed** — no `catch`,
no `finally`. State must therefore be written as it goes, somewhere a human can
read it.

## The three phases

1. **Prepare.** The script walks the Trash and Spam folders, decides about each
   message, and writes one row per intended action into the plan sheet. Nothing
   is modified.
2. **Review.** Rows that merely apply a setting arrive checked; rows proposed by
   the detector arrive unchecked and stay that way until someone reads them. An
   unchecked row is never processed.
3. **Apply.** The exact number of actions is announced, including how many are
   permanent deletions, then each row is marked at the moment it is processed.

This split solves three defects at once: irreversible deletion stops being
automatic; pagination stops skipping messages (paginating a search while
modifying what it queries shifts the indices); and the six-minute ceiling stops
losing work, since state lives in the sheet, row by row.

## Pre-checking, and where the line falls

The dividing line is not "irreversible or not" — it is **who decided**. A row
decided by a *setting* applies a policy a human established once, in a sheet
they can re-read; it arrives checked. A row decided by the *detector* is a
machine judgement about text matches; it never arrives checked. The
"Décidée par" column says which, in plain words.

## Quarantine needs a register

A trashed message that is neither labelled nor protected moves to Spam, where it
gets seven days before deletion. Those days must be counted from the day we
decided to distrust it — not from the message's own date, which may be months
old. That quarantine date exists nowhere in Gmail, so it is kept in a sheet and
written **immediately after** each move, never before and never in batches.

## What the tool cannot do

**Protect a message from Gmail itself.** Gmail empties Trash and Spam after
thirty days on its own. A protected sender escapes this tool, never that purge.
To keep a message, take it out of the Trash.

**Report the remaining deletion quota.** Apps Script exposes the email *sending*
quota, not the Gmail API call quota. Rather than display an invented figure, the
tool displays none.

**Recover a deleted message.** There is no remedy. That is why the plan exists.

## Scopes, and what they cost

`https://mail.google.com/` is required: Gmail offers nothing narrower that
permits permanent deletion — `gmail.modify` allows trashing, not erasing.
Saying so is better than dressing it up. The compensation offered is
**verifiable**: the test bench rejects any Gmail search targeting a folder other
than `in:trash` or `in:spam`, and any mail-sending call.

`contacts.readonly` protects known correspondents — in the original version this
scope was requested to produce a log column no decision ever consulted.

## Test bench

```bash
node banc/test.js
```

51 cases. **Every corrected defect has the case that would have caught it**, and
the French section above lists how to reintroduce each defect to verify the
bench fails. Two pitfalls, paid for once: globally scoped `const` bindings do
not become properties of the global object (retrieve them with
`vm.runInContext`), and **the fake service must refuse what the real one
refuses** — otherwise the bench validates broken code.

## Licence

Elastic License 2.0 — see [LICENSE](LICENSE).
