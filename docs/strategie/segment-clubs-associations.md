# Segment clubs & associations — comment devenir incontournable

> **Date** : 09/08/2026 · **Statut** : cadrage pré-mâché, **décisions non prises**.
> Barreau n°2 de l'escalier de segments (`audit-complet-usegather.md` §3).
> Demandé par Nico : « cibler comment notre outil peut être incontournable pour
> cette catégorie ». Les arbitrages du §6 reviennent à Nico et à l'équipe.

---

## 1. Le terrain

- **180 000 associations sportives** en France, **18 M de licenciés**, 111
  fédérations ([CNOSF](https://cnosf.franceolympique.com/federations-sportives-et-membres)) —
  sans compter les associations non sportives (théâtre, musique, scouts, APE,
  comités des fêtes).
- Un club vit une **saison**, pas un événement : 30 à 80 moments photo par an
  (matchs, tournois, stages, gala, kermesse, remise des licences…). Là où le
  mariage est un one-shot, le club est **récurrent par nature**.
- La photo y a déjà **un modèle économique établi** que personne ne remet en
  cause : le **photographe de club** vient une journée, vend les tirages aux
  parents en ligne (5 € le 13×19, 8,50 € le 20×30 constatés) et **reverse une
  commission au club** ([modèle courant](https://www.tagadastudio.fr/),
  [arnography.fr](https://arnography.fr/clubs-sportifs/)). Les **calendriers
  photo** sont un classique du financement associatif
  ([Initiatives](https://www.initiatives.fr/calendrier/)).

**La douleur, vécue par tous les clubs :** les photos existent (tous les parents
shootent) mais sont **éparpillées dans dix groupes WhatsApp**, compressées,
perdues à chaque saison. Le bénévole com' mendie des photos toute l'année. Et le
sujet qui fâche : **des photos de mineurs circulent sans aucun contrôle** sur
WhatsApp et Facebook — le droit à l'image des enfants est LA hantise des
présidents et des parents.

---

## 2. La thèse : l'outil qui RAPPORTE au club au lieu de lui coûter

Tout le segment se gagne sur un renversement simple :

> **Aujourd'hui, la photo de club est un problème logistique et un petit revenu
> une fois l'an (le photographe + le calendrier). Avec Usegather, elle devient
> un revenu toute la saison — sans photographe, sans travail du bénévole.**

Le mécanisme : **la boutique photo du club**. Les parents et supporters
déposent leurs photos dans le coffre du club toute la saison ; chaque famille
peut commander ses tirages, plaques, posters d'équipe (notre chaîne d'impression,
déjà codée) ; **le club touche une commission sur chaque commande**. C'est le
modèle du photographe scolaire — absorbé — avec trois différences écrasantes :
la matière vient de **tous les téléphones toute la saison** (pas d'une journée
de shooting), il n'y a **aucune prestation à organiser**, et le catalogue va du
tirage 5 € au produit déco premium.

**Pourquoi ça rend incontournable** : le club a alors un intérêt *financier* à
poser le QR partout (vestiaire, club house, tournois, gala) et à relancer les
familles. **Le club devient notre force de vente** — exactement comme le
présentoir l'est au mariage. On ne vend pas un outil au club ; on partage un
revenu avec lui.

---

## 3. Les cinq mécaniques de l'« incontournable »

### 3.1 La boutique du club (le moteur économique) — cf. §2
Commission au club sur chaque commande famille. Le calendrier photo du club
(V2 catalogue) devient l'apothéose de fin d'année : il se remplit tout seul des
photos de la saison.

### 3.2 La saison + les galeries par équipe (le moteur d'usage)
Un **coffre de saison** par club, avec des **sous-galeries par équipe /
catégorie** (U11, U13, seniors, féminines…) : c'est la **transposition directe
des galeries par table** du mariage — un QR par équipe, chaque photo étiquetée,
l'album filtrable. **Cette mécanique est déjà codée** (`photo_tables`,
`/join?table=`) ; seule l'étiquette change (« Table 3 » → « U13 »). Le coach
scanne le QR de SON équipe, les parents aussi ; le bénévole com' filtre et
pioche.

### 3.3 Le droit à l'image des mineurs (l'argument qui fait basculer)
L'espace est **privé (PIN/QR), sans compte, éphémère par défaut, hébergé UE,
sans traceur** — tout ce que WhatsApp/Facebook ne sont pas. Le discours au
président : « les photos des enfants restent dans un espace fermé du club, pas
sur les réseaux ; elles s'effacent en fin de saison sauf décision contraire ;
aucun parent n'a besoin de créer un compte ». Sur ce segment, la conformité
n'est pas un bonus, **c'est le critère d'achat** (décision actée : positionnement
EU/RGPD). C'est aussi notre différence structurelle face aux apps d'équipe US.

### 3.4 Le concours photo (le moteur d'animation) — déjà en prod
Le mode concours (votes, classement) existe depuis le MVP : « photo du mois »,
« photo de la saison » élue au gala. Zéro dev, pur usage — et c'est le prétexte
qui fait ouvrir la galerie chaque semaine.

### 3.5 Les objets du club (le catalogue qui existe déjà)
| Produit | État | Usage club |
|---|---|---|
| **Plaque souvenir** | ✅ au catalogue (« trophée de club » y est écrit) | récompenses de fin de saison, départs |
| **Poster / photo d'équipe** | ✅ (poster, forex, dibond) | la photo d'équipe annuelle, sans photographe |
| **Présentoir NFC** | ✅ codé | présentoir de club house / table de tournoi / buvette |
| **Panneau de bienvenue** | ✅ codé | entrée de gala, tournoi |
| **Calendrier photo** | 🔜 V2 | LE produit de financement associatif |
| **Banderole** | 🔜 V2 (Latex 1,63 m) | banderole de club — besoin récurrent, machine déjà là |

---

## 4. La concurrence réelle — et pourquoi le créneau est ouvert

| Acteur | Ce que c'est | Faiblesse sur la photo |
|---|---|---|
| **WhatsApp** (le vrai rival) | gratuit, déjà là | compression, dispersion par équipe, zéro contrôle mineurs, rien n'en sort (aucun produit) |
| **Spond / Heja / SportEasy** | apps de **gestion d'équipe** (plannings, présences, cotisations) — photo = une fonction parmi vingt ([Spond](https://www.spond.com/news-and-blog/uk-5-best-sports-team-management-apps/), [Heja premium ~6,5 £/mois](https://mingle.sport/blog/best-apps-for-your-grassroots-football-team/)) | **appli + compte obligatoires pour tous les parents** (la friction qu'on a éliminée), pas d'impression, pas de boutique, pas RGPD-first |
| **Photographe de club** | 1 journée/an, vend aux parents, commission au club | cher, une seule journée, une seule source ; c'est le modèle qu'on **absorbe** |
| **Solutions de financement** (Initiatives…) | calendriers & co à revendre | pas de photos — il faut leur en fournir |

**Position** : on ne concurrence pas Spond sur la gestion d'équipe (plannings,
cotisations — pas notre métier). On prend **la photo + les objets + le revenu**,
le triangle qu'aucun d'eux n'occupe. Un club peut très bien garder Spond ET
adopter Usegather : pas de guerre frontale, un terrain vide.

---

## 5. L'offre à construire (proposition à trancher)

**Biais assumé, cohérent avec le repositionnement : l'outil est gratuit pour le
club, le revenu vient des commandes.**

| | Club gratuit | Club Pro (payant, plus tard) |
|---|---|---|
| Coffres | 1 coffre de saison, galeries par équipe | multi-sections, plusieurs saisons |
| Familles | dépôt sans compte, illimité | idem |
| Boutique | ouverte — **commission au club sur chaque commande** | commission majorée |
| Rétention | la saison, puis purge (préservation opt-in) | archives multi-saisons |
| Extras | concours photo | dashboard com', export presse, marque du club |

- **Commission au club** : à trancher — repère : 10-15 % du panier photo (le
  photographe de club reverse typiquement de cet ordre, et notre marge
  impression le supporte largement, cf. `gamme-produits-impression.md`).
- **Pourquoi gratuit d'entrée** : la friction d'adoption d'un club est énorme
  (décision en bureau, trésorier frileux). « Gratuit + ça vous rapporte » se
  décide en une conversation. On monétise l'usage (impression), pas l'accès —
  exactement notre thèse des trois moteurs.

---

## 6. Ce qui existe déjà vs ce qui manque (vérité code)

**✅ Réutilisable tel quel** : coffres QR/PIN sans compte · offline · galeries
par groupe (= galeries par table, changer l'étiquette) · mode concours · toute
la chaîne d'impression + tunnel client · plaques/posters/présentoirs · purge
saisonnière (lifetime_days) · hébergement UE.

**🟡 À adapter (léger)** : vocabulaire des étiquettes (« équipe » au lieu de
« table ») · durée de coffre « saison » (10-12 mois — aujourd'hui 24 h/7 j, la
colonne `lifetime_days` existe) · un coffre visible par plusieurs animateurs.

**🔴 À construire (le vrai gap)** :
1. **La commission** : compte de reversement au club (V1 pragmatique : cumul
   affiché + virement manuel trimestriel ; V2 : Stripe Connect). Dépend de
   Stripe — encore lui.
2. **Multi-hôtes / rôles** (président, coachs, bénévole com') : le modèle
   « un appareil = l'hôte » ne suffit plus → c'est le chantier **comptes hôtes**
   déjà au backlog, dont ce segment devient le 2ᵉ client (avec les écoles).
3. **Mode mineurs** (V2, à cadrer) : approbation avant publication ?
   téléchargement restreint aux familles de l'équipe ? À ne PAS promettre avant
   d'être construit — leçon du deck honnête.

---

## 7. Le canal — par qui commencer

1. **Le canal chaud : les clients associations de l'atelier** (décision actée —
   c'est même l'atout n°1 du segment). L'atelier imprime déjà pour des assos
   locales : la première conversation est à un coup de fil.
2. **Le pilote idéal** : un club avec un **événement à venir** (tournoi, gala) —
   on équipe l'événement (présentoirs + QR), on mesure, puis on propose la
   saison complète.
3. Ensuite : bouche-à-oreille inter-clubs (les dirigeants se parlent en
   district), comités départementaux, puis fédérations (V2 — gros comptes).

---

## 8. Le pilote — ce qu'on mesure (avant d'industrialiser)

Sur UN club, un trimestre :
- **Participation** : % de familles qui scannent, photos/match déposées.
- **Boutique** : panier moyen famille, attach-rate (le même chiffre que le
  mariage pilote — les deux se renforcent).
- **Le discours mineurs** : est-ce que l'argument RGPD fait basculer le bureau,
  ou est-ce la commission ? (ça oriente tout le marketing du segment)
- **Charge bénévole** : l'outil doit se prouver « zéro travail en plus ».

Gate : si l'attach-rate boutique est nul sur un trimestre, le segment se
repriorise derrière le voyage — on le saura pour trois présentoirs et une
après-midi de mise en place.

---

## 9. Arbitrages à trancher (Nico / équipe)

1. **Le modèle de prix** : gratuit + commission (biais de ce doc) vs abonnement
   saison + commission. → décision pricing, même wagon que Stripe.
2. **Le taux de commission** au club (10 % ? 15 % ? majoré en Club Pro ?).
3. **Le vocabulaire produit** : « galeries par équipe » est-il générique ou
   configurable (« ateliers » pour une école de musique, « troupes » pour les
   scouts) ? — petit choix, grande portée sur l'horizontalité.
4. **Le mode mineurs V1** : est-ce que « espace privé + éphémère + UE » suffit
   au pilote, ou faut-il l'approbation avant publication dès le départ ?
5. **Qui porte le pilote** : Corentin (tâche Notion existante) avec Nico pour
   le canal atelier.

---

## 10. Recommandation

Le segment coche tout ce que le mariage n'a pas : **récurrence** (la saison),
**canal chaud** (l'atelier), **concurrence photo faible** (des apps de gestion
où la photo est une annexe, et WhatsApp), et un **modèle économique déjà accepté
culturellement** (le photographe qui reverse au club — on l'absorbe). Le coût
d'entrée produit est faible parce que les briques du mariage se transposent
(galeries par groupe, concours, catalogue, présentoirs).

**Séquence proposée** : ne rien construire de neuf avant le pilote. 1/ trancher
le modèle de prix (§9.1-9.2) ; 2/ identifier LE club via l'atelier ; 3/ équiper
son prochain événement avec l'existant (coffre + galeries par équipe renommées +
présentoirs + concours) ; 4/ mesurer (§8) ; 5/ construire commission et
multi-hôtes seulement si le pilote valide. Le calendrier photo (V2 catalogue)
attend la Gongzheng — parfait timing.

---

*Sources : [CNOSF — fédérations et membres](https://cnosf.franceolympique.com/federations-sportives-et-membres) ·
[INSEE — licences sportives](https://www.insee.fr/fr/statistiques/2408252) ·
[Spond — team management apps](https://www.spond.com/news-and-blog/uk-5-best-sports-team-management-apps/) ·
[Mingle — grassroots football apps](https://mingle.sport/blog/best-apps-for-your-grassroots-football-team/) ·
[Tagada Studio — photographe clubs](https://www.tagadastudio.fr/) ·
[Arnography — photographe clubs sportifs](https://arnography.fr/clubs-sportifs/) ·
[Initiatives — calendriers associatifs](https://www.initiatives.fr/calendrier/).
Interne : `audit-complet-usegather.md`, `idee-galeries-par-table.md`,
`gamme-produits-impression.md`, `decisions-validees.md`.*
