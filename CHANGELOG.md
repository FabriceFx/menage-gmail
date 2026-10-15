# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

## [1.1.2] - 2026-10-15

### Corrigé

- **Une date de quarantaine illisible faisait sauter le sursis de sept
  jours.** Si la cellule « Entré en quarantaine le » ne se lisait plus —
  retouchée à la main, abîmée —, le message sortait du registre et était jugé
  sur sa date de réception : un vieux courriel mis en quarantaine le matin
  même était proposé à la suppression définitive, avec un motif faux. Il est
  désormais laissé en place, avec le motif « date à vérifier dans l'onglet
  Quarantaine », et la purge garde sa ligne jusqu'à ce qu'on la corrige.
- **Le banc ignorait la date qu'on lui donnait.** Le faux Google acceptait
  l'option `maintenant` sans la lire : un cas daté s'exécutait en réalité à la
  date du jour. Le cas « un message mis en quarantaine aujourd'hui n'est pas
  supprimable aussitôt », juste le 20 septembre, échouait depuis début octobre.
  L'horloge du banc suit désormais la date demandée, et un cas le vérifie.
  Le code de l'outil n'est pas en cause.

## [1.1.1] - 2026-09-20

Version corrective. La 1.1.0 ne fonctionnait pas : aucune de ses fenêtres ne
pouvait exécuter l'action qu'elle proposait.

### Corrigé

- **Les six boutons de confirmation étaient morts.** Les cibles appelées depuis
  les modales — `executerAppliquerPlan_`, `executerInstallerClasseur_`… —
  portaient un trait de soulignement final. Or la documentation d'Apps Script
  est formelle : « les fonctions serveur dont le nom se termine par un trait de
  soulignement sont considérées comme privées ; elles ne peuvent pas être
  appelées par `google.script` et leurs noms ne sont jamais envoyés au client ».

  Le navigateur appelait donc `undefined()`. L'erreur naissait **côté client**,
  hors de portée de `withFailureHandler` qui n'écoute que le serveur, et les
  boutons avaient déjà été masqués : la fenêtre restait figée sur son rouet,
  sans autre issue que de la fermer. Les six actions du menu étaient
  inopérantes.

  Un seul nom est désormais exposé, `menageExecuterAction`, qui aiguille sur
  une table fermée. Un nom de plus au menu d'exécution au lieu de six, et la
  liste de ce qui est atteignable depuis le navigateur se lit d'un coup d'œil.

- **Le banc ne pouvait pas voir ce défaut, et il ne voyait plus le menu non
  plus.** Il extrayait les cibles de menu par une expression régulière qui
  n'acceptait qu'un libellé littéral ; le passage au bilinguisme l'a rendu
  aveugle, et il déclarait alors toutes les fonctions intruses. Un contrôle qui
  cesse de voir doit échouer, jamais se taire — il vérifie maintenant qu'il
  trouve bien ses cibles, et onze cas ont été ajoutés : la règle du trait de
  soulignement, l'accord des deux dictionnaires, l'échappement des résumés,
  l'absence de ressource externe dans le gabarit.

- **Le titre rendu par les callbacks n'était jamais affiché.** Le gabarit posait
  `document.title`, mais la barre de titre d'une modale est rendue par Sheets,
  hors de l'iframe, et fixée une fois par `showModalDialog`. Les titres décrivent
  désormais l'opération entière dès l'ouverture, au lieu de son état.

- **Les résumés perdaient leur mise en forme.** `menageResumePreparation_` aligne
  ses blocs avec quatre espaces, que HTML réduit à un seul : les sections
  « EXAMEN » et « PAR ÉTAT » arrivaient en pavé.

- **Le guide d'installation faisait échouer l'installation.** Il demandait de
  créer *chaque* fichier par le bouton « Script ». `Dialogue.html` doit être
  créé par le bouton « HTML » — du HTML collé dans un `.gs` empêche le projet
  entier de se charger, et toutes ses fonctions deviennent introuvables d'un
  coup. Ni `Dialogue`, ni `MenageUi`, ni `MenageTraductions` n'étaient mentionnés
  dans la documentation.

- **Le journal décrivait ce qui n'existe pas.** La 1.1.0 annonçait des effets
  « ripple » et des « transitions fluides » : il n'y a aucun ripple dans le
  gabarit, seulement une transition de couleur au survol. Entrée corrigée.

- **« À propos » avait perdu sa compensation vérifiable.** Le texte énonçait
  toujours que `mail.google.com` est la portée la plus étroite disponible, mais
  la phrase disant *comment le vérifier* avait disparu. Une portée large ne
  s'accepte qu'en échange d'une garantie qu'on peut contrôler.

### Modifié

- **Les confirmations sont réservées à ce qui mérite d'être refusé.** La 1.1.0
  demandait « Préparer le plan ? » avant une opération qui ne modifie rien, et
  « Installer ou compléter le classeur ? » avant une opération rejouable sans
  risque. Quand tout demande confirmation, plus rien ne la mérite : on finit par
  cliquer « Oui » sans lire, et c'est devant la suppression définitive qu'on
  aurait dû s'arrêter. Seules l'application du plan et la programmation du
  ménage quotidien posent désormais une question ; les autres actions passent
  par `afficherTravail`, qui lance et rend compte.

- **Les textes venus d'ailleurs sont échappés avant d'entrer dans une fenêtre.**
  Les valeurs du dictionnaire restent du HTML de confiance ; tout le reste —
  résumé, nom d'onglet, message d'erreur — passe par `menageTexteVersHtml_`.
  Côté client, un message d'erreur s'écrit en `textContent` et non plus en
  `innerHTML` : il recopie parfois une cellule du classeur, et un outil qui
  rendrait le balisage d'une escroquerie serait une curieuse façon de s'en
  protéger.

- **Le dialogue ne charge plus de police distante.** Une requête vers Google
  Fonts par ouverture, pour une fenêtre qui vit quelques secondes : la police
  arrivait rarement à temps, et le texte changeait de graisse quand elle
  arrivait.

- `texte_programmer` ne s'affiche plus deux fois : la question est au
  conditionnel avant l'action, la confirmation au passé après.
- `titre_erreur`, qui servait de titre à six dialogues qui n'étaient pas des
  erreurs, devient `titre_outil`.
- `SocleTexte.gs` recopié du socle, pour son échappement HTML.

## [1.1.0] - 2026-09-20

### Modifié
- **Bilinguisme (FR/EN)** : Centralisation des traductions dans `MenageTraductions.gs` avec détection automatique de la locale de l'utilisateur.
- **Refonte de l'interface** : Remplacement intégral des alertes Google Sheets natives par des fenêtres modales HTML/CSS asynchrones via `MenageUi.gs` et `Dialogue.html`, avec un indicateur d'avancement pour les actions longues.
- **Menu À propos** : Ajout de la mention obligatoire du développeur, et renforcement du discours autour du gain de temps procuré par l'automatisation.

### Ajouté
- Fichier `.gitignore` protégeant les configurations de l'outil `clasp` (`.clasp.json`, `.clasprc.json`).

## [1.0.0] - 2026-09-20

Réécriture complète du fichier `Code.gs` d'origine. La politique de rétention
est restée la même — sept jours dans la corbeille, sept jours de quarantaine,
boîte de réception jamais touchée —, mais aucune des mécaniques qui
l'appliquaient n'a survécu telle quelle : cinq d'entre elles perdaient du
courrier ou promettaient une protection qu'elles n'accordaient pas.

### Corrigé

- **La quarantaine n'existait pas.** Un message de la corbeille ni libellé ni
  jugé déchet partait vers le Spam, où il devait disposer de sept jours. Mais
  le délai s'y comptait depuis la **date du message**, et `traiterSpam()`
  s'exécutait dans la foulée de `traiterCorbeille()`, dans la même exécution :
  un courriel reçu trois mois plus tôt, déplacé à 9 h 03, était examiné à
  9 h 04, déclaré vieux de quatre-vingt-dix jours, et supprimé définitivement.
  Le journal l'annonçait en deux lignes — « DÉPLACER VERS SPAM » puis
  « SUPPRIMER SPAM » — que rien ne rapprochait.

  Une quarantaine se compte depuis le jour où l'on a décidé de se méfier, et
  cette date n'existe nulle part dans Gmail : ni les libellés, ni les en-têtes
  ne la portent. Elle est désormais tenue dans l'onglet « Quarantaine », écrite
  immédiatement après chaque déplacement.

- **Le détecteur supprimait définitivement sur des correspondances de
  sous-chaînes.** Les marques surveillées étaient cherchées par `includes()`,
  si bien que « actu**ally** » valait une occurrence de la marque « ally »,
  « nut**shell** » une occurrence de « shell », et que le mot anglais
  « enterprise » en était une à lui seul. Un message dont le nom d'expéditeur
  portait une marque et dont le corps en contenait une autre par accident
  déclenchait `CONFLIT_IDENTITE_EXPEDITEUR_CORPS`, motif qui entraînait à lui
  seul la suppression immédiate.

  Concrètement : une notification légitime de Google contenant le mot
  « actually » était effacée sans retour. Les termes sont désormais cherchés
  en **mots entiers**, avec des bornes Unicode — `\b` placerait une frontière
  entre « é » et « e », et « félicitations » contiendrait « licitation ».

- **Deux signaux banals suffisaient à supprimer.** `estIdentiteExpediteurSuspecte()`
  rendait `true` pour **toute** adresse en messagerie gratuite, et
  « congratulations » comptait comme appât. Un message d'anniversaire envoyé
  par un ami depuis Gmail, jeté à la corbeille, réunissait donc les deux
  signaux d'appui exigés et disparaissait.

  Le détecteur rend maintenant un score pondéré, dont le seuil dépasse
  strictement le poids du signal le plus fort : aucun signal ne suffit seul.
  Le détail du calcul est écrit dans le plan, signal par signal, avec son
  poids.

- **Le détecteur ne supprime plus rien de lui-même.** Il propose, et sa
  proposition attend une case cochée. Le constat qui a emporté la décision :
  un déchet non supprimé aujourd'hui part en quarantaine et sera supprimé dans
  sept jours de toute façon. La suppression immédiate ne gagnait que ces sept
  jours, contre une perte sans retour à chaque erreur d'heuristique.

- **Une corbeille de plus de 500 fils n'était traitée qu'en partie, en
  silence.** `GmailApp.search(requête)` sans bornes plafonne à 500 fils et ne
  le dit pas ; le compteur annonçait « 500 examinés » et rien ne signalait le
  plafond. La recherche est désormais paginée, et un arrêt anticipé — plafond
  d'examen ou budget de temps — est annoncé en tête du résumé.

- **Un message authentiquement ancien ne quittait jamais la corbeille.** Le
  plancher de plausibilité des dates était fixé au 1er janvier 2020 : un
  courriel de 2015 avait donc un âge « inconnu », et comme un âge inconnu
  n'autorise jamais la suppression — ce qui est la bonne règle —, il restait
  en place indéfiniment. Le plancher est descendu à 1995, où il ne sert plus
  qu'à écarter les horodatages aberrants.

  La constante était par ailleurs écrite `new Date("2020-01-01T00:00:00")` :
  une date-heure sans décalage est interprétée comme **locale** par V8, si bien
  que la même constante ne valait pas la même chose selon le fuseau du script.

- **Aucune protection contre le plafond des six minutes.** Le traitement
  chargeait le corps de chaque message — un appel réseau par message —, sans
  budget de temps, sans état, sans reprise. Une exécution tuée en son milieu
  perdait tout son travail et recommençait le lendemain au même endroit. Le
  travail passe désormais par le motif « plan puis application » : l'état vit
  ligne par ligne dans l'onglet du plan, et une reprise automatique repart
  exactement où l'exécution s'est arrêtée.

- **La portée `contacts.readonly` était demandée pour rien.** La liste
  complète des contacts était chargée par l'API People à chaque exécution,
  `estContact` était calculé pour chaque message et écrit au journal — et
  aucune décision n'en tenait compte. Être un contact protège désormais du
  détecteur. Un chargement partiel de la liste est signalé et **désarme les
  propositions de suppression** pour cette exécution, au lieu de laisser croire
  à une protection qui ne s'applique plus.

- **`estNomLibelleSysteme()` était inutile et nuisible.** `GmailThread.getLabels()`
  ne rend que les libellés créés par l'utilisateur ; le filtre ne retirait donc
  jamais rien — sauf le jour où quelqu'un nomme un libellé « Important », que
  le filtre aurait écarté, faisant perdre au message la protection de son
  libellé. Retiré.

- **`obtenirEnTeteEnSecurite()` n'était appelée nulle part.** C'était pourtant
  le seul accès au signal fiable en matière d'usurpation : l'en-tête
  `Authentication-Results`. Il est désormais lu, et DMARC — qui seul vérifie
  l'alignement avec l'adresse affichée — neutralise les signaux d'usurpation.
  Il n'innocente pas pour autant : un escroc peut signer correctement son
  propre domaine, et les appâts continuent de compter.

- **L'adresse de l'expéditeur était lue dans le premier groupe de chevrons.**
  Un en-tête `"Service <fraude@exemple.test>" <reel@autre.test>` en porte deux,
  et la première n'est que du texte d'affichage, librement choisi. Le défaut a
  été trouvé par le banc pendant la réécriture : c'est le dernier groupe qui
  fait foi.

- **Les libellés étaient relus pour chaque message d'un fil.**
  `message.getThread().getLabels()` était appelé une fois par message, alors que
  les libellés vivent sur le fil. Une conversation de vingt messages coûtait
  vingt allers-retours au lieu d'un.

- **Le journal ne survivait pas à l'exécution.** Tout passait par `Logger.log`,
  tronqué au-delà d'un certain volume, inaccessible à qui n'ouvre pas l'éditeur
  de script, et effacé ensuite. Pour un outil qui supprime définitivement,
  c'était la trace manquante le jour où quelqu'un cherche ce qu'est devenu un
  message. Les plans appliqués sont désormais archivés dans un onglet.

### Ajouté

- Plan relu et validé avant toute application, adossé au module
  [`plan-puis-application`](../plan-puis-application).
- Référentiel éditable : marques et leurs domaines légitimes, expressions
  d'appât par famille, adresses et domaines protégés, réglages de rétention.
  Les modifier ne demande aucun déploiement, et l'installation ne réécrit
  jamais une décision humaine.
- Onglet « Guide » dans le classeur, et entrée de menu « À propos » qui affiche
  la version, les réglages en vigueur et le coût des portées demandées.
- Banc d'essai hors Google : `node banc/test.js`, 51 cas, avec pour chaque
  défaut ci-dessus le cas qui l'aurait attrapé.
- Projet lié au classeur plutôt qu'autonome, de sorte que chaque action
  s'exécute sous l'identité de qui la déclenche.

### Modifié

- ES6+ partout, et séparation visible entre points d'entrée (`function`
  déclarées, seules à figurer au menu d'exécution) et interne (`const nom_ =
  (…) => …`). Le banc refuse toute `function` déclarée qui ne soit pas un point
  d'entrée.
- **Le signal « structure d'expéditeur répétée » a été retiré.** Il comptait
  les jetons `lists`, `send`, `bcc`, `relay` et `reply` dans la partie locale
  de l'adresse, et trois d'entre eux entraînaient à eux seuls la suppression
  définitive. Or c'est la forme d'adresse qu'emploient aussi les listes de
  diffusion légitimes et les services de messagerie transactionnelle : le
  signal désignait une infrastructure d'envoi en masse, pas une intention
  frauduleuse. Le remplacer par rien vaut mieux que de le pondérer au jugé.
- Les listes de marques et d'expressions ont été élaguées : « membership »,
  « prix », « congratulations » ou « limited time » pris isolément décrivent
  aussi bien une facture d'association qu'un message d'un collègue.
