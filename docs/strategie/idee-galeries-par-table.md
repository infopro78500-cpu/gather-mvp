# Idée — Les galeries par table

> **Date** : 07/08/2026 · **Origine** : Nico · **Statut** : idée cadrée, **décision non prise**.
> Un présentoir par table, chacun avec son QR : il ouvre le coffre commun **et** une galerie propre à la table, où les convives laissent photos et petits mots destinés aux mariés.

---

## 1. Pourquoi l'idée est forte

**Elle capte ce que les mariés ne peuvent pas vivre.** Un couple ne peut pas être aux douze tables à la fois. Pendant qu'ils dansent avec les uns, il se passe quelque chose chez les autres — un fou rire, un toast improvisé, une anecdote racontée par un oncle. Aujourd'hui, tout ça disparaît. La galerie par table en fait un objet qu'on ouvre le lendemain, table par table, comme on ouvrirait douze petites lettres.

**Elle libère la parole.** Un mot écrit dans un album partagé par 120 personnes n'est pas le même qu'un mot adressé aux mariés seuls. La confidentialité change la nature de ce qui est déposé — c'est le principe du livre d'or, mais sans le livre qui traîne sur une table et que la moitié des invités oublie de signer.

**Elle crée une dynamique de table.** Un QR posé au milieu des convives, c'est un prétexte collectif. Les tables se prennent au jeu, s'observent, se comparent. C'est exactement le mécanisme qui fait qu'un coffre se remplit au lieu de rester vide.

---

## 2. Ce qu'elle change commercialement — le vrai enjeu

C'est là que l'idée dépasse la fonctionnalité.

**Aujourd'hui, le présentoir est un accessoire.** Un organisateur peut très bien imprimer le QR du coffre chez lui : un seul QR, autant de copies qu'il veut. Le présentoir se vend sur le confort et l'esthétique — c'est un joli plus, pas un besoin.

**Avec les galeries par table, chaque présentoir devient unique et nécessaire.** Table 1, table 2, table 3 : douze QR différents, douze visuels différents. On ne peut plus « en imprimer un et le photocopier ». Le produit passe d'accessoire optionnel à **consommable dimensionné par le nombre de tables**.

| | Sans galeries par table | Avec galeries par table |
|---|---|---|
| Nature du présentoir | joli, optionnel | **unique par table, nécessaire** |
| Quantité vendue | 1 lot, si le client y pense | **1 par table** — 10 à 15 sur un mariage moyen |
| Contournable maison ? | oui (un QR, photocopié) | **non** (12 QR différents) |
| Panier | 29–49 € | **49–79 €**, et systématique |

Et le présentoir est déjà **le seul produit du catalogue qui augmente les ventes de tous les autres** (il porte le QR → plus de scans → plus de photos → plus d'impressions après). Cette idée le rend à la fois indispensable et plus cher. C'est le meilleur endroit du catalogue où ajouter de la valeur.

---

## 3. Le produit imprimé qui en découle naturellement

Une fois les mots collectés par table, il y a un objet évident à vendre après l'événement :

**Le livre d'or imprimé** — les messages et les photos, table par table, mis en page. Le marché du livre d'or de mariage se situe entre **36 et 50 €** (Cotton Bird 49,90 €, La Carteraie 36–47 €) — pour des pages **vierges**. Le nôtre arriverait **déjà rempli**, avec les mots des invités et leurs photos. Personne ne propose ça, parce que personne ne collecte la matière.

Variante grand format, dans notre gamme actuelle : une **fresque des tables** (Forex ou Dibond 60×90) — une mosaïque des douze tables avec un mot choisi par table. Prix de gamme : 49,90 à 59,90 €.

---

## 4. Les arbitrages à trancher

### 4.1 Privé ou partagé ? — la décision structurante

L'idée telle qu'énoncée rend la galerie de table **privée aux mariés**. Attention à l'effet de bord : si les photos des invités partent dans des galeries privées, **l'album commun s'appauvrit** — or c'est lui le cœur du produit (« tout le monde repart avec tout »).

**Recommandation : deux gestes distincts sur le même QR.**
- *« Partager avec tout le monde »* → le coffre commun, comme aujourd'hui, avec en plus l'étiquette de la table.
- *« Laisser un mot aux mariés »* → la galerie de table, privée.

L'album commun garde sa richesse, les mariés gagnent une couche intime, et l'invité comprend en une seconde ce qu'il fait. C'est aussi plus honnête : personne ne dépose « en privé » sans le savoir.

### 4.2 Le texte est un type de contenu nouveau

L'app gère aujourd'hui des photos et des vidéos. Les « petits mots » sont **du texte** : nouveau stockage, nouvelle modération, nouvelle mise en page à l'impression. Ce n'est pas un détail d'implémentation, c'est un élargissement du produit. À décider explicitement, pas à glisser.

### 4.3 La promesse de confidentialité doit être vraie techniquement

Dire « seuls les mariés y ont accès » crée une attente forte. Il faut que ce soit garanti côté serveur (pas seulement masqué dans l'interface), et que ce soit clair pour l'invité au moment où il écrit. Un mot privé qui fuite dans l'album commun, c'est le genre d'incident dont un produit de mariage ne se remet pas.

### 4.4 Modération

Un espace privé où l'on écrit librement lors d'une soirée arrosée appelle une question simple : les mariés peuvent-ils supprimer un mot ? La réponse est oui, évidemment — mais il faut le prévoir dès le départ.

---

## 5. Implications techniques (esquisse)

- **Notion de « table » sous l'événement** : chaque table a son identifiant et son QR. Le nombre de tables devient une donnée de l'événement, saisie à la création — et c'est elle qui dimensionne la commande de présentoirs.
- **Étiquette de table sur les dépôts** : une photo déposée via le QR de la table 3 porte cette origine. Utile pour l'album (filtrer par table) et pour l'impression.
- **Contenu texte** : nouveau type à stocker, à modérer, à mettre en page.
- **Visibilité** : un niveau d'accès « hôte seulement », vérifié côté serveur.
- **Impression** : les présentoirs deviennent un lot de N visuels **différents** — la file d'impression doit accepter un lot dont chaque pièce a son propre fichier généré. C'est le même chantier que la papeterie du jour J (`source: "generated"`), en un peu plus riche.
- Les clés locales `gather_device_id` / `gather_voter_id` / `gather-upload-queue` restent **intouchées**.

---

## 6. Recommandation

L'idée mérite d'être retenue, pour une raison qui n'est pas la fonctionnalité elle-même : **elle transforme le meilleur canal d'acquisition du produit en consommable obligatoire, dimensionné par le nombre de tables**. C'est rare qu'une idée produit et une idée commerciale coïncident aussi bien.

Séquence proposée :
1. **Trancher l'arbitrage §4.1** (deux gestes distincts plutôt que tout privé) — c'est la décision qui conditionne le reste.
2. **Ne pas l'intégrer à la V1 en cours.** Le chantier bloquant du moment (voie express + fichiers générés) est le prérequis technique de cette idée : les présentoirs par table sont exactement le cas « N pièces, N visuels différents, avant le jour J ». Faire le chantier d'abord, l'idée devient facile ensuite.
3. **La tester sur un vrai mariage** avant de l'industrialiser : douze présentoirs, des mots, et on regarde si les invités écrivent vraiment. C'est la seule façon de savoir si la promesse tient.

---

*À trancher avec l'équipe. Une fois décidée, cette note devient une entrée de `journal-decisions.md` et une ligne Notion (Type = Décision).*
