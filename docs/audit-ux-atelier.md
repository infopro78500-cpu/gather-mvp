# Audit UX/UI — Tableau de bord atelier Printerkut (`/atelier`)

> **Date** : 06/08/2026 · **Auteur** : responsable UX/UI · **Commanditaire** : Nico (CEO)
> **Périmètre** : le dashboard `/atelier?cle=…` (`app/atelier/AtelierBoard.tsx` + `app/api/print/board/route.ts`). L'email atelier (`lib/print/email.ts`) et le bon de tri imprimable ne sont pas remis en cause sur le fond — seulement là où ils doivent évoluer en cohérence.
> **Statut** : audit + spec, prêt à découper en tickets. Rien n'est codé ici.
> **Méthode** : lecture du code du board, de l'API, du modèle de données (`lib/print/queue.ts`, `lib/print/catalog.ts`, `lib/print/groups.ts`, `lib/print/email.ts`), du process opérateur (`docs/process-fabrication-photo.md`), de l'audit d'intégration (`docs/strategie/audit-integration-printerkut.md`), et comparaison ligne à ligne avec le board de référence Renka/Lika-NFC (`Lika-NFC/lika-app/src/components/atelier/AtelierBoard.tsx`, 938 lignes, en production) + les 8 constats factuels de Nico sur les captures d'écran actuelles.

---

## 0. Résumé exécutif

La maquette actuelle fonctionne (la mécanique métier — file, lots par matière, claim atomique, retirage — est saine et bien construite dans `lib/print/queue.ts`). Le problème n'est pas la logique, c'est l'**interface** : un outil 100 % texte pour un métier 100 % visuel, une hiérarchie plate qui traite l'action du jour et l'archive de la même façon, des boutons répétés au lieu d'un geste clair, et des erreurs qui font peur pour rien.

Le levier le plus fort est simple à énoncer : **on a les fichiers, on a la capacité technique de les vignetter, et on ne montre aucune photo nulle part**. C'est le premier chantier (section 6). Mais il ne peut pas être posé tel quel sur l'architecture actuelle sans l'aggraver : le board re-signe aujourd'hui l'intégralité des fichiers des 10 derniers lots à *chaque poll de 10 secondes* (section 8.3) — ajouter des vignettes sans corriger ça alourdit exactement le mauvais endroit au pire moment (un samedi de haute saison). Les deux chantiers vont donc ensemble en P0.

Un deuxième constat, indépendant du visuel : `listRecentOrders()` tronque à 1000 lignes **triées par ancienneté croissante** sur une fenêtre de 14 jours (`lib/print/queue.ts`). À 200 pièces/jour, une semaine de pic dépasse cette limite — et ce sont les commandes **les plus récentes** qui disparaîtraient silencieusement de l'écran, pas les vieilles. C'est un bug de fiabilité pure, sans rapport avec le design, à corriger en priorité absolue (section 8.2).

Les 8 constats de Nico sont tous réels, tous traçables dans le code, et tous traités ci-dessous.

---

## 1. Les 5 scénarios opérateur

Le principe de conception : **chaque écran doit répondre à une question précise en moins de 5 secondes**, pas afficher toute la donnée disponible. Voici les 5 moments réels d'une journée d'atelier, la question posée, et ce que l'écran actuel vs. l'écran cible y répondent.

| # | Scénario | Question de l'opérateur | Aujourd'hui | Cible |
|---|---|---|---|---|
| A | **Le matin** | « Qu'est-ce que j'imprime aujourd'hui, et dans quel ordre ? » | Il faut lire 3 sections (tuiles, file, lots) et faire le tri soi-même ; aucune section ne dit « voici le travail du jour » | Un bandeau **Aujourd'hui** en tête de page, 4 chiffres actionnables, lots non imprimés triés du plus ancien au plus récent (§5, §11-W1) |
| B | **Réception d'un lot** | « C'est quoi, dans ce lot ? Quelle matière je charge ? » | Une liste de lignes texte `order_ref · client · produit format` | Une mosaïque de vignettes réelles, badge matière en tête de carte, un seul CTA « Marquer imprimé » (§6, §11-W3) |
| C | **Fin de tirage : marquer + trier** | « J'ai fini, je marque quoi, et comment je trie les tirages ? » | Bouton « Marquer imprimé » noyé parmi d'autres ; bon de tri OK | Action unique par lot (imprimer) distincte de l'action par commande (expédier) — deux verbes, deux couleurs, jamais confondus (§7) |
| D | **Incident : retirage** | « Je retrouve quelle pièce ? Je la remets où ? Est-ce que je duplique une commande ? » | 6-8 boutons identiques « Remettre en file » empilés ; deux pièces requeued sans lien visible entre elles (constat #4) | Reconnaissance **visuelle** (vignette) + panneau contextuel par pièce sélectionnée + badge « ↻ retirage » traçant l'origine (§6.5, §7) |
| E | **Pic de charge (mai-sept., 100-200 pièces/j)** | « Où j'en suis globalement ? Je ne loupe rien ? Je retrouve une commande précise ? » | Scroll infini, aucun filtre, aucune recherche, compteurs statiques (§ constat 8) | Recherche, onglets par statut, regroupement par jour, compteurs qui distinguent « aujourd'hui » du cumul (§8) |

---

## 2. Constat détaillé — pourquoi la maquette ne tient pas la route

Les 8 points remontés par Nico, avec la cause dans le code et l'impact usage.

| # | Constat | Cause dans le code | Impact |
|---|---|---|---|
| 1 | Aucune photo affichée | `BoardPiece`/`BatchPiece` (API `app/api/print/board/route.ts`) ne renvoient que du texte ; aucune vignette générée nulle part dans le pipeline | Impossible de reconnaître une pièce, vérifier un cadrage, repérer une erreur avant impression — le cœur du métier (la photo) est absent de l'outil |
| 2 | « Failed to fetch » en rouge | `AtelierBoard.tsx` : `catch (e) { setError((e as Error).message) }` — affiche le message d'erreur JS brut, sans distinguer réseau / 401 / vide | Panique pour un simple serveur en veille ; aucune indication que le polling va réessayer tout seul dans 10 s |
| 3 | Boutons répétés (8× « Remettre en file », 6× « Marquer expédiée ») | Chaque `<li>` de pièce/commande porte son propre bouton inline (pattern « une ligne = un bouton ») | Bruit visuel, risque de clic sur la mauvaise ligne, aucune hiérarchie entre lecture (fréquente) et action destructive (rare) |
| 4 | Deux « Alice Test » requeued sans lien visible | `requeuePiece()` (`lib/print/queue.ts`) insère une **nouvelle ligne** `pending` sans référence à la pièce d'origine — aucun champ de provenance en base | L'opérateur ne peut pas distinguer une vraie nouvelle commande d'un retirage ; pas de mémoire de « pourquoi cette pièce est revenue » |
| 5 | Cartes plates, non triées par urgence, statuts mélangés | Section « Commandes » : une seule liste à plat des 14 derniers jours, aucun regroupement par statut (`en_file`/`en_lot`/`imprimee`/`expediee`) ni par jour | À faible volume ça passe ; à 50-100 commandes/jour c'est un mur illisible |
| 6 | Aucune notion de « quoi faire maintenant » | Les tuiles compteurs (pending, seuil de lot, plus ancienne attente, commandes 14j) sont des stats de file, pas des actions ; les lots non imprimés ont le même poids visuel que l'historique | L'opérateur doit reconstruire mentalement sa liste de tâches du jour à partir de données brutes |
| 7 | Produit/format en texte brut, pas de pastille matière | `<span>{piece.product} {piece.format}</span>` — la matière n'apparaît qu'en label texte dans l'en-tête de groupe | L'info n°1 de l'atelier (quelle matière charger) n'a aucun signal visuel rapide, il faut lire |
| 8 | Pas de tenue en charge à 200 pièces | Pas de pagination, pas de filtre, pas de recherche ; `listRecentOrders()` charge jusqu'à 1000 lignes à plat ; `recentBatches(10)` signe tous les fichiers de tous les lots à chaque poll | Scroll infini + un vrai risque de troncature silencieuse de données récentes en pic (détaillé §8.2) |

---

## 3. Principe directeur : transposer l'IDÉE de la planche Renka, pas le code

Le board Lika-NFC reproduit une **planche physique** à l'écran : une grille fixe de cases (imposition), chaque case affiche le vrai recto de la carte tournée comme en production, parce que Renka imprime plusieurs petites cartes **sur un même support rigide partagé**, à une position physique précise.

**Ça ne se transpose pas littéralement à la photo**, et c'est assumé dans le code existant :
> `lib/print/queue.ts` — *« Différence assumée avec Renka : PAS d'imposition en V1 — le gabarit et les seuils machine sont la question n°9. Un lot = N fichiers pièce + un bon de tri. »*

Un lot Usegather n'est pas une planche : c'est un ensemble de pièces **indépendantes** (un poster 30×40 n'occupe pas une position fixe sur un support partagé avec un canvas 60×90) produites à la suite sur la même machine avec la même matière chargée. Reproduire une grille d'imposition tournée serait un décor sans fondement physique — et une fausse promesse de précision.

**Ce qu'on transpose, c'est l'idée, pas la géométrie** : *l'opérateur voit le vrai visuel avant que ça arrive*. Concrètement, ça devient une **mosaïque** (grille de vignettes réelles, responsive, sans position figée) plutôt qu'une planche à cases fixes — un contact-sheet, pas une imposition. C'est honnête vis-à-vis de la réalité machine, et ça répond au même besoin opérateur : reconnaître, vérifier, faire confiance avant impression.

Deux idées de Lika qui, elles, se transposent **telles quelles** et sont reprises dans cette spec :
- le **fetch de détail à la demande** par lot (`&batch=<id>`) plutôt que tout charger en permanence (§8.3) ;
- le pattern **sélectionner puis agir** (clic sur une tuile → panneau d'action contextuel) plutôt qu'un bouton par ligne (§7).

---

## 4. Architecture de l'information cible

### 4.1 Hiérarchie de la page (haut → bas)

```
1. En-tête (wordmark + statut connexion)
2. Bandeau AUJOURD'HUI (4 compteurs actionnables)         ← nouveau, priorité visuelle max
3. File en cours (mosaïque par matière)                   ← existant, refondu photo-first
4. Lots à traiter (non imprimés en premier, mosaïque)      ← renommé + retrié + refondu
5. Historique (lots imprimés) — REPLIÉ par défaut          ← nouveau : disparaît du flux principal
6. Commandes — onglets par statut + recherche               ← refondu (était : liste plate 14j)
7. Pied de page (doc opérateur, fréquence de rafraîchissement)
```

Le principe : **le poids visuel décroît avec la fréquence d'usage**, pas avec l'ordre chronologique inverse comme aujourd'hui. Le bandeau « Aujourd'hui » et les lots non imprimés sont ce qu'on regarde 20 fois par jour ; l'historique imprimé, on ne le rouvre presque jamais.

### 4.2 Ce qui passe derrière un clic (disparaît du flux par défaut)

- L'historique des lots **déjà imprimés** (section repliée, ou onglet « Historique »).
- Les commandes **déjà expédiées** (onglet séparé, jamais dans la vue par défaut).
- Le détail pièce-par-pièce d'un lot ancien (chargé à la demande, `&batch=<id>`, pattern Lika).
- Le panneau d'action d'une pièce (retirage) : n'existe qu'après sélection, pas pré-affiché sur chaque ligne.
- L'image en pleine résolution (lien explicite « Voir en pleine résolution », jamais chargée par défaut).

### 4.3 Regroupements

Trois axes de regroupement, cumulables :
1. **Par matière** (déjà présent pour la file en cours — l'info n°1 de l'atelier, à renforcer visuellement, §9.2).
2. **Par lot** (déjà présent pour les lots — à transformer en mosaïque, §6.3).
3. **Par jour** (absent aujourd'hui, à ajouter) — sections « Aujourd'hui / Hier / Cette semaine / Plus ancien » pour les lots et les commandes. C'est l'unité de temps dans laquelle un opérateur pense réellement (« j'ai fait ça hier », pas « il y a 34 heures »).

---

## 5. Le bandeau « Aujourd'hui »

Remplace les 4 tuiles actuelles (pending / seuil de lot / plus ancienne attente / commandes 14j — des stats de file, pas des tâches) par **4 compteurs qui sont chacun une réponse à « qu'est-ce que je fais là maintenant »** :

| Tuile | Définition | Pourquoi celle-là et pas l'ancienne |
|---|---|---|
| **À imprimer** | Somme des pièces des lots non `printed_at`, + nombre de lots concernés | Remplace « pièces en attente » : c'est la vraie charge de travail du jour, pas la file en amont |
| **En retard** | Pièces `pending` dont l'ancienneté dépasse `MAX_WAIT_DAYS` (2 j par défaut) — masqué/neutre si 0 | N'existe pas aujourd'hui ; c'est le signal d'alerte le plus utile, et son absence à 0 doit rassurer (« ✓ à jour »), pas juste ne rien afficher |
| **En file** | Pièces `pending` pas encore en lot, avec micro-répartition par matière en dessous du chiffre | Remplace « seuil de lot » (une constante de config, pas une info utile au quotidien — elle reste visible dans la barre de progression par matière, §6.2) |
| **À expédier** | Commandes `imprimee` non `expediee` | N'existe pas aujourd'hui comme tuile, alors que c'est l'autre moitié du travail quotidien (à égalité avec « imprimer ») |

`maxWaitDays` doit être ajouté à la réponse de `GET /api/print/board` (aujourd'hui absent, seul `batchSize` est exposé) pour que le front calcule le retard sans dupliquer une constante.

---

## 6. Photo-first — spécification détaillée

### 6.1 Génération des vignettes : ne pas dépendre de l'offre Supabase payante

Point d'attention technique important, à corriger avant tout le reste : le brief suppose que `createSignedUrl(path, ttl, { transform })` est directement exploitable — c'est vrai pour l'API Supabase, **mais la transformation d'image est une fonctionnalité de l'offre payante**, et elle n'est pas encore active sur ce projet. La preuve est dans le code même de la galerie invité :

> `app/events/[pin]/page.tsx` — *« 0 = désactivé (offre gratuite : la transformation est une fonctionnalité payante). À passer à ~600 via `NEXT_PUBLIC_IMAGE_THUMB_WIDTH` une fois sur l'offre Pro »* — et `docs/roadmap.md` liste toujours *« Supabase offre payante »* en NEXT, non cochée.

**Recommandation : ne pas attendre le passage à l'offre Pro.** Générer un vrai fichier vignette côté serveur, une fois, au moment où la pièce entre dans la file — dans `freezeSourceFile()` (`lib/print/queue.ts`), qui télécharge déjà le fichier source en entier pour le copier vers `print-files`. C'est le point d'entrée naturel : le fichier est déjà en mémoire, autant en tirer une vignette au passage.

- **Outil** : `sharp` — déjà présent dans `node_modules` (dépendance de Next.js pour l'optimisation d'image serveur), à ajouter explicitement aux `dependencies` de `package.json` pour garantir sa présence en build Vercel.
- **Sortie** : un JPEG ~480 px de côté long, qualité ~70, stocké dans le bucket `print-files` à côté du fichier de production (`queue/{orderRef}/{index}-thumb.jpg`), chemin gardé dans un nouveau champ `print_queue.thumb_path`.
- **Bonus gratuit** : `sharp(...).metadata()` donne les vraies dimensions pixel du fichier. À renseigner **côté serveur**, systématiquement, dans `px_width`/`px_height` — aujourd'hui ces champs ne sont remplis que si le futur tunnel de commande les transmet en option (`app/api/print/order/route.ts`, `piece.pxWidth`/`piece.pxHeight` optionnels). Ça fiabilise le badge résolution (§6.4) pour 100 % des pièces, pas seulement celles où le client a bien voulu transmettre l'info.
- **Indépendant du plan Supabase** : ça marche que l'offre soit gratuite ou payante, et évite de re-transformer à la volée une photo de smartphone potentiellement lourde (10-20 Mo) à chaque affichage.
- **Coût de génération** : négligeable — un resize sharp sur une image déjà en mémoire prend quelques dizaines de ms ; à 200 pièces/jour ça ne pèse pas sur la commande.

### 6.2 File en cours — mosaïque par matière

Chaque groupe matière (déjà existant) devient une grille de vignettes au lieu d'une liste `<li>` de texte. Chaque tuile : vignette (aspect carré ou proche, `object-cover`), petit badge format en coin (« 30×40 »), nom client en légende courte. La barre de progression texte (« 6/8 avant envoi auto ») devient une vraie barre de progression visuelle sous le groupe — le chiffre reste, mais gagne un signal graphique immédiat (§11-W2).

### 6.3 Lots — mosaïque façon contact-sheet

Chaque carte de lot (`Lots à traiter`) affiche la grille de ses pièces en vignettes numérotées (le numéro = position du bon de tri, conservé). Un clic sur une vignette sélectionne la pièce (§7). L'action « Marquer imprimé » reste unique, au niveau de la carte lot — jamais dupliquée par pièce.

### 6.4 Badge résolution — brancher l'existant, pas en inventer un nouveau

`resolutionBadge()` existe déjà dans `lib/print/catalog.ts` (seuils : ≥150 dpi = ok, ≥100 = acceptable, sinon insuffisant) et est utilisée pour **bloquer une commande** côté `app/api/print/order/route.ts` — mais elle n'est jamais exposée ni affichée sur le dashboard. Une fois `px_width`/`px_height` fiabilisés (§6.1), il suffit de calculer le badge côté API et de l'ajouter à `BoardPiece`/`BatchPiece`, puis de l'afficher en coin de vignette (pastille verte/orange/rouge + info-bulle « 312 dpi » au survol/clic).

### 6.5 Indicateur de cadrage

Une photo de smartphone (souvent proche du 4:3 ou 3:2, parfois carrée) n'a presque jamais le même ratio que le format d'impression choisi (30×40 = ratio 3:4, 60×90 = 2:3, etc.) : il y a toujours une zone coupée. Proposition : au clic sur une vignette (aperçu, §6.6), superposer un cadre semi-transparent représentant le ratio réel du format commandé sur l'image source, zones hors-cadre assombries — l'opérateur voit exactement ce qui sera coupé avant impression, pas seulement une image plate. Calcul pur côté client (ratio format catalogue vs dimensions image), aucune donnée supplémentaire nécessaire une fois §6.1 fait.

### 6.6 Aperçu au clic (modale)

Clic/tap sur une vignette (file, mosaïque de lot, historique) → modale : image agrandie (la vignette 480 px suffit pour juger netteté/cadrage sur un écran de contrôle ; pas besoin d'une 3ᵉ taille de fichier), fond gris neutre clair (jamais noir, cf. argumentaire §9.1), méta-données (commande, client, produit × format, pastille matière, badge résolution, ancienneté), lien texte « Voir en pleine résolution » (ouvre le fichier de production signé existant dans un nouvel onglet — le champ `link` déjà présent), et l'action contextuelle si applicable (§7).

### 6.7 Traçabilité du retirage (constat #4)

`requeuePiece()` (`lib/print/queue.ts`) crée aujourd'hui une pièce `pending` totalement neuve, sans lien avec la pièce ratée d'origine — d'où les deux « Alice Test » sans explication. Ajouter un champ `print_queue.requeued_from` (uuid nullable, référence à la pièce d'origine) rempli à l'insertion. Affichage : badge compact « ↻ retirage » sur la vignette + dans le panneau détail, un fil « pièce de remplacement de #4, lot 8f21c6, le 06/08 ». La vignette doit être **copiée avec le fichier** lors du retirage (aujourd'hui `requeuePiece` copie le fichier de production mais pas de vignette dédiée — à corriger dans la même fonction pour que la pièce la plus susceptible d'être ré-inspectée visuellement ne soit pas justement celle qui perd sa photo).

### 6.8 Purge cohérente

`purgeOldPrintFiles()` (rétention 30 j) vide `file_path` mais laisserait une vignette orpheline si `thumb_path` n'est pas purgé en même temps. À traiter dans la même fonction : purge des deux fichiers, les deux champs vidés ensemble. Affichage si vignette absente : pas une image cassée, un pictogramme neutre + « aperçu expiré » (cohérent avec l'état actuel texte « fichier purgé »).

---

## 7. Interactions — en finir avec les boutons répétés

### 7.1 Le pattern : sélectionner, puis agir

Au lieu d'un bouton par ligne (8× « Remettre en file », répété), on reprend le pattern Lika : chaque vignette/ligne est **cliquable pour se sélectionner** (surlignage), et un **panneau d'action unique** apparaît (inline sous la grille en desktop, feuille en bas d'écran sur mobile/tablette) avec le contexte complet de *cette* pièce et la ou les actions pertinentes. Un seul panneau existe à l'écran à la fois.

Bénéfices directs :
- Plus de mur de boutons identiques → plus de risque de clic sur la mauvaise ligne.
- Le panneau peut afficher le contexte complet (vignette, résolution, provenance retirage) qu'une ligne de texte ne peut pas porter — répond aussi à §6.7.
- La confirmation à 2 clics (conservée telle quelle, cf. §7.3) se lit dans un seul endroit stable, pas dans N boutons qui changent de texte un par un.

Détail d'implémentation à reprendre de Lika : **réinitialiser l'état de confirmation à chaque changement de sélection** (`setConfirmKey(null)` au clic sur une nouvelle tuile) — sinon un « Confirmer ? » armé sur la pièce A peut se retrouver validé par erreur en cliquant sur la pièce B.

### 7.2 Quand la répétition d'un bouton reste légitime

Répéter un bouton identique n'est pas un problème en soi — ça l'est quand la liste est **mélangée** (certaines lignes ont besoin de l'action, d'autres non) et que l'œil doit trier le signal du bruit parmi des boutons visuellement identiques. Une fois les commandes filtrées par statut (§8.4, onglet « À expédier »), chaque ligne de cet onglet a *par construction* besoin de « Marquer expédiée » : c'est une checklist, pas un mur. Le bouton inline par ligne y reste donc pertinent — la correction n'est pas « supprimer tous les boutons répétés », c'est « ne les répéter que dans une liste déjà triée pour ça ».

### 7.3 Confirmation à 2 clics — conservée, réaffichée

Le mécanisme actuel (1er clic arme « Confirmer ? », 2e exécute, timeout 3,5 s) est le bon choix pour les actions destructrices (retirer, retirage) et reste tel quel. Ce qui change, c'est où il s'affiche : dans le panneau contextuel de la pièce sélectionnée (§7.1) plutôt qu'inline dans chaque ligne — même mécanique, présentation plus lisible.

---

## 8. Tenue en charge — 20, 80, 200 pièces/jour

### 8.1 Comportement par palier

| Palier | Lots/jour (à `BATCH_SIZE=8`) | Ce qui change à l'écran |
|---|---|---|
| **20 pièces/j** (basse saison) | 2-3 lots | Tout tient sur un écran, mosaïques complètes visibles sans repli, filtres présents mais peu utiles |
| **80 pièces/j** (mi-saison) | ~10 lots | L'historique replié devient nécessaire (sinon la page s'allonge visiblement), le regroupement par jour aide, la recherche commandes commence à servir |
| **200 pièces/j** (pic samedi mariage) | ~25 lots | Recherche et onglets indispensables ; c'est le palier où les deux problèmes de fond (§8.2, §8.3) doivent déjà être résolus, sinon l'outil devient inutilisable **exactement** le jour où il doit le plus tenir |

À ce palier, une matière à fort volume (papier photo) formera des lots bien plus vite qu'une matière rare (plexi) — la barre de progression par matière (§6.2) rend ce déséquilibre visible, ce qui donne à Nico/l'atelier un signal concret pour décider un jour d'un `BATCH_SIZE` différencié par matière (question n°9 de l'audit Printerkut, hors périmètre de cette spec — mais l'UI doit rendre le signal visible pour alimenter cette décision business).

### 8.2 Bug de troncature — à corriger indépendamment du reste (priorité absolue)

`listRecentOrders()` (`lib/print/queue.ts`) :
```
.gt("created_at", cutoff)
.order("created_at", { ascending: true })
.limit(1000)
```
Sur une fenêtre de 14 jours, à 200 pièces/j soutenues sur ne serait-ce que 5 jours de pic, on dépasse 1000 lignes. Le tri croissant + `limit` garde les **1000 lignes les plus anciennes** de la fenêtre et coupe les plus récentes — c'est-à-dire que **les commandes du jour même** sont celles qui risquent de disparaître silencieusement de l'écran « Commandes », sans erreur, sans avertissement, un jour de pic. C'est un bug de fiabilité, sans lien avec le reste de cet audit visuel, à corriger en priorité et indépendamment (inverser le tri avant la limite, et/ou remonter le plafond, et/ou réduire la fenêtre par défaut à 7 jours avec extension à la demande, §8.4).

### 8.3 Coût du polling — découpler résumé léger et détail à la demande

`GET /api/print/board` signe aujourd'hui **tous les fichiers de tous les lots retournés** (`recentBatches(10)`, jusqu'à 80 fichiers si `BATCH_SIZE=8`) à **chaque poll de 10 secondes**, que l'opérateur regarde ces lots ou non. Ajouter des vignettes sur ce modèle double la charge (fichier + vignette signés pour chaque pièce de chaque lot, en permanence).

Le board Lika résout exactement ce problème avec un pattern à reprendre tel quel : le poll principal (toutes les 8 s côté Lika) ne renvoie que des **résumés légers** (compteurs, listes de lots sans détail pièce), et le détail d'un lot précis (pièces, vignettes, liens fichiers) n'est chargé **qu'à la demande**, via un paramètre dédié (`&batch=<id>`), déclenché par un clic explicite (« ▾ détail » côté Lika).

Recommandation : même découpage ici.
- **Poll 10 s (léger)** : compteurs du bandeau Aujourd'hui, liste des lots (id, matière, nombre de pièces, dates, statut imprimé/email) **sans** le détail pièce ni les liens signés.
- **Détail de lot (à la demande)** : nouvel appel `GET /api/print/board?cle=…&batch=<id>` qui renvoie les pièces du lot avec vignette + lien fichier + résolution — chargé uniquement quand l'opérateur ouvre ce lot précis.
- Les lots **non imprimés du jour** (§4.1, priorité #4 de la hiérarchie) peuvent rester développés par défaut puisque ce sont eux qu'on regarde tout de suite ; l'historique replié (§4.2) ne charge son détail qu'à l'ouverture.

Optimisation complémentaire (P1) : mettre en cache côté route les URLs déjà signées (chemin → URL + horodatage), sur le modèle du `thumbCache` déjà utilisé côté galerie invité (`app/events/[pin]/page.tsx`) — évite de re-signer un fichier déjà signé récemment à chaque poll.

### 8.4 Filtres, onglets, recherche — Commandes

La liste plate des 14 derniers jours devient : 3 onglets par statut (**À expédier** — `imprimee` non `expediee`, par défaut ouvert ; **En cours** — `en_file`/`en_lot` ; **Expédiées** — archivé, replié) + une **recherche** (nom, référence de commande, email) + un **regroupement par jour** (Aujourd'hui / Hier / Cette semaine / Plus ancien). La fenêtre par défaut passe à 7 jours avec un bouton « Élargir à 14 / 30 jours » plutôt qu'un chargement systématique de 14 jours complets.

---

## 9. Design système

### 9.1 Palette — pourquoi claire, pas sombre (l'argument qui vient du métier, pas du goût)

Le thème sombre actuel (`bg-neutral-950`, cohérent avec le fond global `#0b0f19` de l'app grand public) est un héritage esthétique, pas un choix pensé pour ce cas d'usage précis. Deux arguments concrets pour basculer en clair sur les surfaces où des photos sont jugées :

1. **Perception colorimétrique** : un entourage sombre autour d'une image fausse la perception de sa luminosité et de sa saturation (effet de contraste simultané — la raison pour laquelle les logiciels de retouche/soft-proofing professionnels utilisent un gris neutre clair, jamais un noir, comme surround d'affichage). Ici, l'opérateur doit juger si une photo est nette, bien exposée, bien cadrée, avant impression — un fond sombre biaise exactement ce jugement. C'est un argument métier, pas esthétique : *« notre domaine, c'est la photo »* implique de ne pas fausser la lecture des photos.
2. **Lisibilité en atelier éclairé** : un écran sombre sous éclairage industriel/zénithal produit plus de reflets et moins de contraste utile qu'une interface claire à texte sombre — d'autant plus avec des doigts gantés qui laissent des traces sur l'écran.

**Proposition** : fond neutre clair et chaud (proche `#F6F6F4`), cartes blanches (`#FFFFFF`) avec bordure discrète (`#E2E1DC`), texte quasi-noir (`#1A1A18`) en primaire, gris moyen (`#6B6A63`) en secondaire. La couleur sombre actuelle (`#0b0f19`) est réemployée comme couleur d'accent des boutons d'action primaires (pas comme fond) — clin d'œil de continuité de marque sans en payer le coût de lisibilité.

Ce choix touche l'identité visuelle d'un outil que Printerkut utilisera tous les jours : à valider avec Nico avant implémentation (voir §14 — c'est le genre de règle durable qui mérite d'entrer dans un futur `DESIGN.md`), pas à trancher unilatéralement ici.

### 9.2 Pastilles matière — l'info n°1 de l'atelier

Cinq couleurs dédiées aux matières, choisies pour ne pas entrer en collision avec les couleurs de statut (§9.3) — la matière est une *catégorie*, le statut est un *état d'avancement*, il ne faut jamais confondre les deux familles au premier coup d'œil.

| Matière | Pastille (indicative — à valider en maquette + contrôle de contraste) | Fond |
|---|---|---|
| Papier photo | `#C9A874` (sable) | `#FBF3E4` |
| Canvas | `#B9673F` (terre cuite) | `#FBEAE1` |
| Forex (PVC) | `#7C6FB0` (violet doux) | `#EFEBFA` |
| Alu-Dibond | `#6B7A8F` (gris acier) | `#EAEDF1` |
| Plexi | `#3FA6B0` (cyan verre) | `#E3F5F6` |

Toujours affichées **couleur + texte** (jamais couleur seule) pour rester lisibles en cas de daltonisme — la pastille est un accélérateur de reconnaissance, pas le seul vecteur d'information.

### 9.3 Couleurs de statut

| Statut | Usage | Couleur |
|---|---|---|
| En file / à surveiller | pièces pending, compteur « en retard » si > 0 | Ambre `#B7791F` sur `#FEF3C7` |
| En lot / à imprimer | lots non imprimés (l'action du jour) | Bleu `#2563EB` sur `#DBEAFE` |
| Imprimée / à expédier | lots imprimés, commandes prêtes à partir | Vert-sarcelle `#0F9D8A` sur `#D1FAE5` |
| Expédiée | archive | Gris neutre, visuellement « fermé » |
| Erreur réelle / retard confirmé | uniquement les vrais incidents | Rouge `#DC2626` sur `#FEE2E2` — **réservé aux vrais problèmes**, jamais à un état transitoire normal (c'est précisément l'inverse de l'actuel bandeau rouge pour un simple souci réseau) |

### 9.4 Typographie, tailles, cibles tactiles

- Chiffres des compteurs en graisse marquée + `tabular-nums` (évite que les chiffres « sautent » visuellement au refresh).
- Corps de texte 16 px minimum, 14 px pour le secondaire seulement — l'opérateur peut être à distance de bras sur une tablette posée.
- Cibles tactiles **48-56 px minimum** sur les actions (au-delà du minimum standard 44 px iOS/48 dp Material) — contexte explicite de doigts gantés cité dans le brief.
- Remplacer les émojis fonctionnels utilisés comme icônes (🖨️🕐📦✅🔁⚡) par un petit jeu d'icônes cohérent (traits fins, monochromes, couleur portée par le fond/texte plutôt que par l'émoji lui-même) — c'est un des signaux les plus rapides qui font qu'un outil se lit comme « pro » plutôt que « prototype ». Les émojis peuvent rester dans l'email atelier (registre différent, lu comme une notification) sans problème.
- En-tête avec un vrai lockup **use**gather (léger + **gather** gras, jamais « Gather » seul) suivi de « × Printerkut » — un signe de qualité peu coûteux (effort S) sur un outil que Nico veut voir comme « pro ».

### 9.5 États vides et messages d'erreur — en langage humain

| Situation | Aujourd'hui | Proposé |
|---|---|---|
| Échec réseau / serveur indisponible | « ⚠️ Chargement impossible : Failed to fetch » (bandeau rouge, message JS brut) | « Connexion au serveur impossible. Nouvel essai automatique dans 10 s. » (bandeau ambre, pas rouge — ce n'est pas encore un vrai problème) + bouton « Réessayer maintenant » |
| Lien secret invalide/expiré (401) en cours de session | Même bandeau générique que l'échec réseau | Message distinct : « Lien d'accès invalide ou expiré. Demandez un nouveau lien à Nico. » — pas de retry automatique puisqu'il ne résoudra rien (aujourd'hui ce cas n'est traité que sur la porte d'entrée `app/atelier/page.tsx`, pas dans les erreurs de polling du board lui-même) |
| File vide | « Aucune pièce en attente. 🎉 » | Conservé (déjà bon), juste harmonisé avec le kit d'icônes |
| Aucun lot envoyé | « Aucun lot envoyé pour l'instant. » | Conservé |
| Fichier de production purgé (> 30 j) | « fichier purgé » (texte à côté du lien) | Pictogramme « aperçu expiré » à la place de la vignette + info-bulle « Fichier supprimé après 30 j — repasser par une commande neuve pour un retirage. » |

---

## 10. Modèle de données — évolutions nécessaires

Récapitulatif des changements de schéma/API évoqués plus haut, regroupés pour la mise en œuvre :

**`print_queue` (migration additive)**
- `thumb_path text null` — chemin de la vignette dans `print-files` (§6.1)
- `requeued_from uuid null references print_queue(id)` — traçabilité du retirage (§6.7)
- `px_width`/`px_height` : renseignés systématiquement côté serveur dans `freezeSourceFile()`, plus seulement en option côté client (§6.1)

**`lib/print/queue.ts`**
- `freezeSourceFile()` : génère et upload la vignette en plus du fichier de production, extrait les dimensions réelles via `sharp`
- `requeuePiece()` : copie aussi la vignette vers le nouveau chemin, renseigne `requeued_from`
- `purgeOldPrintFiles()` : purge `thumb_path` en même temps que `file_path`
- `listRecentOrders()` : corriger l'ordre de troncature (tri décroissant avant `limit`, ou fenêtre par défaut réduite) — §8.2

**`app/api/print/board/route.ts`**
- `BoardData` : ajouter `maxWaitDays`
- `BoardPiece`/`BatchPiece` : ajouter `thumbUrl`, `resolution` (`ok`/`acceptable`/`insufficient`/`null`), `requeuedFrom`
- Séparer le payload : résumé léger par défaut (compteurs + lots sans détail pièce) + nouveau mode détail à la demande (`&batch=<id>`) — §8.3
- Nouveau paramètre de recherche/filtre sur `listRecentOrders` (`?q=`, `?status=`) — §8.4

**`package.json`**
- Ajouter `sharp` explicitement aux `dependencies` (aujourd'hui présent seulement en transitif via Next.js)

---

## 11. Wireframes (ASCII)

### W1 — Bandeau Aujourd'hui

```
┌─────────────────────────────────────────────────────────────────┐
│  usegather × Printerkut — Atelier            ● connecté · 09:14  │
├─────────────────────────────────────────────────────────────────┤
│  AUJOURD'HUI                                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │     14     │ │      0     │ │      6     │ │      3     │    │
│  │ à imprimer │ │  en retard │ │  en file   │ │ à expédier │    │
│  │  (2 lots)  │ │  ✓ à jour  │ │ (2 matières)│ │            │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### W2 — File en cours (mosaïque par matière)

```
FILE EN COURS
┌─ ● Papier photo ──────────────────────────── 6/8 avant lot auto ─┐
│  [img][img][img][img][img][img]              [⚡ Forcer l'envoi]│
│  30×40 40×60 30×40 50×70 30×40 60×90                             │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  6/8                          │
└───────────────────────────────────────────────────────────────┘
┌─ ● Forex ──────────────────────────────────── 2/8 avant lot auto ─┐
│  [img][img]                                                       │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░  2/8                             │
└───────────────────────────────────────────────────────────────┘
```

### W3 — Carte de lot (mosaïque, non imprimé)

```
┌─ Lot 8f21c6 · ● Papier photo · 8 pièces · reçu il y a 40 min ───┐
│  📧 email atelier parti      [🖨 Bon de tri]  [✔ Marquer imprimé]│
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐                                │
│  │1 ││2 ││3 ││4 ││5 ││6 ││7 ││8 │   ← clic sur une vignette      │
│  └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘     = sélection (voir W4)       │
└───────────────────────────────────────────────────────────────┘
```

### W4 — Panneau détail pièce sélectionnée (retirage)

```
(clic sur la vignette n°6 du lot ci-dessus)
┌───────────────────────────────────────────────────────────────┐
│  ┌──────────┐  Commande UG-260806-a1b2 · Camille D.             │
│  │  photo   │  Poster 40×60 · ● Papier photo                    │
│  │  agrandie │  Résolution : ✓ optimale (312 dpi)                │
│  │          │  Reçue il y a 2 j · lot reçu il y a 40 min         │
│  └──────────┘  [Voir en pleine résolution]                      │
│                 [ 🔁 Remettre en file (retirage) ]                │
└───────────────────────────────────────────────────────────────┘
```

### W5 — Commandes (onglets + recherche)

```
COMMANDES
[ À expédier (3) ] [ En cours (11) ] [ Expédiées ]    🔎 nom, réf, email…

Aujourd'hui
 UG-260806-a1b2 · Camille D. · 3 pièces          [📦 Marquer expédiée]
 UG-260806-c3d4 · Karim B.   · 1 pièce           [📦 Marquer expédiée]

Hier
 UG-260805-e5f6 · Sophie L.  · 4 pièces          [📦 Marquer expédiée]
```

---

## 12. Priorisation P0 / P1 / P2

Échelle d'effort : **S** = quelques heures à 1 jour · **M** = 2-4 jours · **L** = 1-2 semaines+. P0 = le minimum qui transforme la maquette en outil pro (tenable en un sprint ciblé, volontairement aucun P0 en L).

### P0 — le socle indispensable

| ID | Item | Effort | Dépend de |
|---|---|---|---|
| P0-1 | Génération serveur des vignettes + dimensions réelles (`sharp`, au moment du freeze) — §6.1, §10 | M | — |
| P0-2 | Affichage photo-first : mosaïques file en cours + lots (remplace les lignes texte) — §6.2, §6.3 | M | P0-1 |
| P0-3 | Correction du bug de troncature `listRecentOrders` (tri + limite) — §8.2 | S | — |
| P0-4 | Poll léger / détail de lot à la demande (`&batch=`) — prérequis pour ne pas aggraver le coût du polling en ajoutant des vignettes — §8.3 | M | — |
| P0-5 | Bandeau « Aujourd'hui » avec les 4 compteurs actionnables — §5 | S | — |
| P0-6 | Pattern « sélectionner puis agir » (panneau contextuel remplace les boutons répétés) — §7.1 | M | — |
| P0-7 | Erreurs en langage humain, différenciées réseau / lien invalide / vide, retry visible — §9.5 | S | — |
| P0-8 | Traçabilité du retirage (`requeued_from` + badge « ↻ retirage ») — §6.7 | S/M | — |

### P1 — important, juste après

| ID | Item | Effort |
|---|---|---|
| P1-1 | Onglets + recherche Commandes (à expédier / en cours / expédiées) — §8.4 | M |
| P1-2 | Regroupement par jour (lots + commandes) — §4.3 | S |
| P1-3 | Historique des lots imprimés replié par défaut + pagination — §4.2 | S |
| P1-4 | Modale d'aperçu plein écran au clic sur une vignette — §6.6 | M |
| P1-5 | Indicateur de cadrage (overlay ratio format cible) — §6.5 | M |
| P1-6 | Cache des URLs signées (vignettes + fichiers) côté route — §8.3 | S |
| P1-7 | Design système complet : palette claire, pastilles matière, kit d'icônes (remplace les émojis fonctionnels) — §9.1-9.4 | M |
| P1-8 | Purge alignée vignette + fichier de production — §6.8 | S |
| P1-9 | En-tête avec wordmark Usegather soigné × Printerkut — §9.4 | S |
| P1-10 | Badge résolution branché dans l'UI (fonction déjà codée) — §6.4 | S |

### P2 — plus tard / optionnel

| ID | Item | Effort |
|---|---|---|
| P2-1 | Vignette monochrome sur le bon de tri imprimé | S |
| P2-2 | Sélection multiple + « marquer expédiées » en masse | M |
| P2-3 | Seuils de lot différenciés par matière dans l'UI (si décision business prise) | L |
| P2-4 | Statistique « taille moyenne de lot » par semaine (aide à la décision `BATCH_SIZE`) | S |
| P2-5 | Recherche globale unifiée (pièce/commande/client) | M |
| P2-6 | Vue calendrier de charge (pièces/jour sur 30 j) | M/L |
| P2-7 | Bascule thème sombre optionnelle (une fois le design system tokenisé) | S |

---

## 13. Ce qui NE change PAS

À préserver explicitement — cette refonte est une réorganisation de l'information et de l'interaction, pas une réécriture de la logique métier :

- Le modèle de file, le claim atomique, le rollback, la récupération des claims zombies (`lib/print/queue.ts`) — intouché.
- Le regroupement « un lot = une matière » (`lib/print/groups.ts`) — intouché.
- L'email atelier comme interface principale (`lib/print/email.ts`) — intouché sur le fond.
- Le bon de tri imprimable HTML + `window.print()` — conservé, éventuellement enrichi (P2-1), jamais supprimé.
- La confirmation à 2 clics sur les actions destructrices — conservée, juste réaffichée (§7.3).
- L'accès par lien secret sans compte (`ATELIER_SECRET`) — intouché.
- Le polling (pas de WebSocket) — conservé, juste rééquilibré entre résumé léger et détail à la demande (§8.3).

---

## 14. Suite recommandée

Les règles de design amenées à durer (palette, pastilles matière, tailles tactiles, kit d'icônes — §9) sont candidates naturelles à un futur `DESIGN.md`, à créer **avec Nico** une fois les choix de cette section validés — pas unilatéralement. Une fois arbitré, ce sera aussi une décision structurante à tracer (`journal-decisions.md` + ligne Notion Type = Décision), notamment le choix palette claire/sombre qui touche l'identité visuelle d'un outil quotidien pour Printerkut.

Suggestion de séquencement : découper la section 12 (P0) en tickets indépendants dans le cockpit (branche Produit), avec P0-3 (bug de troncature) et P0-1 (génération vignettes) en premier car ce sont les deux prérequis dont tout le reste dépend.
