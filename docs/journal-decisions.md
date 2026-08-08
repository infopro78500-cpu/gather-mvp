# Journal des décisions — Usegather (ex-Gather)

> **Rôle** : mémoire des choix *et de leurs raisons*, pour ne pas re-débattre. Toute décision structurante s'ajoute **en haut**. Un agent ou un associé qui veut revenir sur un choix lit d'abord l'entrée concernée. Le produit s'est appelé **Gather** jusqu'au 04/08/2026 — les entrées antérieures gardent l'ancien nom, on ne réécrit pas l'histoire.

Format d'une entrée :

```
## AAAA-MM-JJ — Titre court
**Décision** : ce qu'on fait.
**Pourquoi** : le raisonnement / ce qu'on a écarté.
**Impact** : ce que ça change (produit, code, équipe, docs).
```

---

## 2026-08-07 — Le lancement se fait sur les cinq supports déjà maîtrisés
**Décision** (Nico) : la gamme de lancement se limite à **Dibond, PVC/Forex, plexi, papier photo, canvas** — les supports que l'atelier produit déjà. Tout ce qui dépend de la **Gongzheng H2513GN PRO** (non livrée) sort du catalogue : produits signature à encre blanche (rétroéclairé Day & Night, vitrail à blanc sélectif, bloc épais, petites pièces transparentes) et décoration murale au m² (papier peint, adhésif).
**Pourquoi** : on ne vend pas ce qu'on ne sait pas encore produire. Sans la Gongzheng, l'UV direct est plafonné par la Mimaki UJF-6042 MkII à 61×42 cm ; au-delà, la production passe par contrecollage — méthode que l'atelier connaît, à confirmer. Lancer sur du maîtrisé évite les ratés de production sur les premières commandes réelles, qui coûteraient bien plus cher que le manque à gagner des produits signature.
**Impact** : `lib/print/catalog.ts` réduit à 5 matières et 6 produits, sans produit signature ; le drapeau `signature` et son exclusion de la remise volume **restent câblés** pour accueillir la V2 sans réécriture ; `gamme-produits-impression.md` marque explicitement chaque section V1 (actif) ou V2 (en attente machine) ; les questions à l'atelier sont scindées en « pour lancer la V1 » (8, dont la grille de cession et le grade d'aluminium) et « pour préparer la V2 » (4).
**Précision du 07/08 (Nico)** : le rigide tourne sur des **Mimaki UJF MkII anciens modèles** à plateau fixe (3042 = 300×420, 6042 = 610×420) ; le « double plateau » de l'atelier charge en temps masqué — il **double la cadence, pas le format**. D'où : impression directe **jusqu'au 40×60**, contrecollage au-delà, et une imposition connue — **4 pièces de 20×30, 2 de 30×40, 1 de 40×60 par passe**. C'est le « 23 cartes = une planche » de Renka transposé, et il cale les seuils de lot. Codé en dur nulle part : `UV_BED_MM`, `fitsUvBed()` et `piecesPerPass()` le calculent (`lib/print/catalog.ts`), il suffira de passer le plateau à 2500×1300 à l'arrivée de la Gongzheng. **Bonus repéré, puis acté (Nico, « tu peux le rajouter »)** : les UJF MkII ont déjà l'encre blanche et le vernis → **trois produits à blanc sélectif entrent en V1** : vitrail photo (30×40, 40×60 — 69/89 €), marque-places 6×9 en lots de 20/50/100 (79/169/299 €) et plaque souvenir (10×15, 15×20 — 12,90/17,90 €). Marges 84-89 %. Les marque-places sont **le produit le plus rentable du catalogue** : 42 pièces par passe de plateau, 0,16 € de matière l'unité, aucun concurrent — les labos photo grand public n'ont pas d'encre blanche. Vitrail et marque-places sont en régime « signature » (exclus de la remise volume, le lot encode la dégressivité) ; la plaque souvenir la garde, l'usage B2B en volume l'attend. Restent en V2 : rétroéclairé Day & Night et bloc plexi épais (plexi diffusant + grand plateau requis).

## 2026-08-07 — Gamme produits impression V1 : Forex en tête, deux régimes de prix
**Décision** : la gamme V1 s'articule autour de **6 supports** (Forex, aluminium, plexi, poster, toile, décoration murale au m²) plus **4 produits signature** exploitant l'encre blanche (rétroéclairé Day & Night, vitrail à blanc sélectif, bloc plexi, petites pièces transparentes). Deux régimes de prix : **10-25 % sous le prix net du marché** sur les commodités comparables, **prix de valeur perçue** sur les produits signature (exclus de la remise volume). Dégressif jusqu'à **−40 % dès 50 pièces** du même événement.
**Pourquoi** : trois faits établis par le benchmark du 07/08. *(a)* Le surcoût du rigide sur le marché est un **forfait de 17-21 €/pièce** (accroche + emballage), pas un coût de surface — donc le petit format est le segment le plus margé, et notre imposition en planche l'écrase. *(b)* Contre l'intuition, la **toile est notre pire marge** (33-44 %, à cause du châssis et de 46 % de chute) et le **Forex la meilleure** (61-71 %) : la gamme doit pousser le Forex, pas la toile. *(c)* Le plexi **diffusant coûte 29 €/m²** alors que le rétroéclairé se vend 649-1 098 € — et aucun labo photo grand public n'a d'encre blanche pour le copier.
**Impact** : `lib/print/catalog.ts` réécrit (prix + coûts de revient + marges suivies) ; `docs/strategie/gamme-produits-impression.md` fait référence ; chiffre du marché mariage corrigé à **251 000** (INSEE 2025) dans `decisions-validees.md` et `CLAUDE.md` ; trois chantiers ouverts avant la vente — **voie express** pour les produits à date impérative, accroche facturée en option, devis atelier sur l'aluminium et les caissons LED.

## 2026-08-06 — Le dashboard atelier passe photo-first, en palette claire
**Décision** : refonte P0 du tableau de bord atelier selon l'audit UX (`docs/audit-ux-atelier.md`) — vignettes générées côté serveur (sharp), mosaïques de photos, bandeau « Aujourd'hui », pattern sélectionner-puis-agir, erreurs en langage humain, traçabilité des retirages — et bascule en **palette claire** (fond neutre clair, cartes blanches), le sombre actuel devenant couleur d'accent.
**Pourquoi** : un outil dont le métier est de juger des photos avant impression ne doit pas fausser leur lecture — un entourage sombre biaise la perception de luminosité/saturation (c'est pourquoi les outils photo pro utilisent un gris clair neutre) ; et un écran clair reste lisible en atelier éclairé. Validé par Nico le 06/08/2026 (palette claire + périmètre P0 complet).
**Impact** : `/atelier` refondu ; migration additive (`thumb_path`, `requeued_from`) ; `sharp` en dépendance explicite ; les règles durables (palette, pastilles matière, tailles tactiles, icônes) alimenteront un futur `DESIGN.md` ; l'app grand public reste sombre — le choix ne concerne que l'outil atelier.

## 2026-08-04 — Mise en place du pilotage multi-équipe (cockpit Notion + docs pivots)
**Décision** : Usegather adopte le système de pilotage éprouvé sur le projet Renka : cockpit Notion partagé aux 4 associés (base Tâches — Branche ×7, Type Tâche/Décision, Priorité, **Qui**) + 4 docs pivots versionnés (`decisions-validees`, `journal-decisions`, `journal-sessions`, `roadmap`) + CLAUDE.md + 3 agents (`cadrage-produit`, `data-analytics`, `ux-design`).
**Pourquoi** : 10 fichiers .md en vrac à la racine, pas de journal, le *pourquoi* des choix vivait dans des conversations — intransmissible à une équipe de 4. Le système Renka a fait ses preuves (double écriture Notion↔git, rituels courts, décisions = objets de première classe).
**Impact** : racine rangée (`docs/strategie/`), règles de session dans CLAUDE.md (double écriture obligatoire), cockpit Notion à partager avec Arnaud, Jérem et Corentin.

## 2026-08-04 — Le nom public devient « Usegather »
**Décision** : bascule complète du produit sur **Usegather** (marque INPI n° 5200774, enregistrée 13/03/2026, cl. 9/35/42). « Gather » seul est banni des supports publics. Renommage code fait le jour même : UI, métadonnées (`lang fr`, metadataBase `usegather.app`), pages légales/investisseurs, emails `contact@usegather.app`, appId mobile unifié `com.usegather.app` (avant toute publication store — après, c'est figé à vie).
**Pourquoi** : la marque enregistrée est « Usegather », pas « Gather » (non protégeable seul, marques tierces type Gather.town, risque de contrefaçon ET de déchéance de notre marque pour non-usage). Le nom est moyen (6/10 : « th » imprononçable en français, registre tech pour un marché émotionnel) mais **il est à nous** — on ne rechange pas, on compense : lockup use+**gather**, prononciation assumée, QR-first (le nom se scanne plus qu'il ne se dit). Piste marketing validée : faire de la prononciation un gag récurrent, chute « Vous n'avez pas à le prononcer. Juste à le scanner. »
**Impact** : restent à faire — logo (le PNG affiche encore « GATHER »), domaine `usegather.app` à brancher sur Vercel (l'ancien `gather-mvp.vercel.app` redirige à vie → les QR imprimés survivent), docs/deck à passer en Usegather. Marque au nom propre de Nico → cession à la société à l'immatriculation. Clés localStorage `gather_*` conservées volontairement.

## 2026-07-08 — Maîtrise des coûts Supabase avant relance
**Décision** : cron quotidien de purge du stockage des événements expirés (`api/cron/cleanup-expired`, avec préservation opt-in par événement), cache des URLs signées, miniatures prêtes pour le resize.
**Pourquoi** : incident de juillet (projet Supabase gratuit mis en pause, données beta reconstruites) + egress = premier poste de coût. Prérequis à l'offre payante stable décidée avant tout lancement sérieux.
**Impact** : coûts prévisibles ; KPI stockage documentés (`KPI_STORAGE_SYSTEM.md`) ; dossier technique mis à jour.

## 2026-07-08 — Sécurisation leads & RGPD
**Décision** : colmatage de la fuite de données leads, durcissement de l'API, consentement RGPD sur le formulaire, correction des 404 post-inscription.
**Pourquoi** : chantier sécurité n°1 acté à la passation ; fondations RGPD nécessaires avant toute acquisition.
**Impact** : formulaire early access conforme ; pages légales avec vrai email de contact.

## 2026-07-06 — Passation technique à Arnaud
**Décision** : Arnaud reprend le développement (lead tech). `main` GitHub réaligné, dossier technique complet livré (`docs/DOSSIER_TECHNIQUE_GATHER.md`). La sécurité est le chantier n°1.
**Pourquoi** : Nico se concentre sur produit/business/marque ; le projet passe en équipe structurée (4 associés, cf. `strategie/POINT-SITUATION-GATHER.md §9`).
**Impact** : répartition des rôles actée ; le dossier technique devient le document d'onboarding technique.

## 2026-07-08 — Le deck repart sur des bases honnêtes (v2)
**Décision** : reconstruction du pitch deck (`strategie/deck-v2.md`) : beachhead mariage France, Printerkut présenté comme moat (partenaire de production dédié, zéro CapEx), traction réelle uniquement (beta 50+ événements / 700+ photos, 0 actif à l'instant T).
**Pourquoi** : les claims invérifiables du deck précédent étaient un risque de crédibilité face à des financeurs publics (Fit4Start, aides) qui vérifient.
**Impact** : tout support investisseur dérive de cette version ; la stratégie de financement vise le non-dilutif < 50 k€ (piste LU principale, leviers FR en parallèle).
