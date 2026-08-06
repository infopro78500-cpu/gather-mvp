# Audit — Brancher l'atelier Printerkut à Usegather

> **Date** : 05/08/2026 · **Statut** : proposition **à faire valider par l'atelier** (le frère de Nico) avant toute décision.
> **Objet** : quoi vendre (formats × matières), à quel prix (unité + volume), et comment brancher techniquement l'atelier à l'app — en repartant du système déjà en production entre **Renka (Lika-NFC) et ce même atelier Printerkut**.
> **Philosophie actée par Nico** : démarrer avec **ce qu'on sait faire et le prix qu'on connaît**, étoffer ensuite.

---

## 1. La découverte qui change tout : le branchement existe déjà

L'atelier connecté au projet Renka/Lika-NFC **est Printerkut** (`PRINT_EMAIL_TO=printerkut@outlook.fr` dans la config Renka). Le pipeline atelier y tourne en production réelle, avec ses erreurs déjà payées et corrigées. On ne part pas de zéro : on **transpose un système éprouvé** avec le même partenaire.

**Le pattern Renka en une phrase** : une commande ne génère pas un bon de commande mais **le fichier de production final, figé**, qui entre dans une **file** ; la file **regroupe par contrainte machine** (une planche = une matière), attend d'atteindre la **capacité physique** de la planche, puis **envoie un email à l'atelier** (matière à charger + fichiers + bon de tri case→client) ; un **cron quotidien** rattrape les séries incomplètes ; l'atelier suit tout sur un **tableau de bord accessible par lien secret**, sans compte, avec deux clics humains (« imprimée », « expédiée ») qui pilotent le statut.

Documentation opérateur de référence côté Renka : `Lika-NFC\lika-app\docs\process-fabrication.md` (à dupliquer/adapter pour la photo). Fichiers cœur à répliquer : `src/lib/print-queue.ts` (file, claim atomique, rollback), `src/lib/impose.ts` (géométrie planche), `src/app/api/order/route.ts` (commande → fichiers), `supabase/schema.sql` §file d'impression, `src/components/atelier/AtelierBoard.tsx` (dashboard), cron `api/print-queue/flush`.

## 2. Le parc machines et ce qu'il permet

| Machine | Rôle | Capacité (specs constructeur) | Produits possibles |
|---|---|---|---|
| **HP Latex 700W** | Souple, rouleau | Laize **1,63 m**, encre **blanche**, médias ≤ 0,5 mm | Poster papier photo (mat/satin), **toile canvas** (à monter sur châssis), vinyle adhésif, papier peint photo — jusqu'à ~150×220 cm |
| **Mimaki UV « MkII »** (à plat) | Rigide | **Selon modèle** — voir question n°1 | Impression directe Dibond, plexi, PVC/Forex, bois (+ blanc de soutien + vernis, maîtrisés par l'atelier depuis Renka) |

**⚠️ Question n°1 (conditionne toute l'offre rigide)** : quel(s) modèle(s) Mimaki exactement ?
- **UJF-6042 MkII** (documentée côté Renka) : plateau **61 × 42 cm** → rigide direct **jusqu'à 40×60 maximum**.
- **JFX200-2513** (grande table **2,5 × 1,3 m**) : rigide direct jusqu'à 120×180 → panneaux de bienvenue 70×100, grands formats déco.
- Sans grande table, les rigides > 40×60 restent possibles par **contrecollage** (tirage Latex collé sur panneau — pratique standard du marché, cf. WhiteWall « contrecollé ») **si** l'atelier pratique le contrecollage.

## 3. Ce que dit le marché (relevé web du 05/08/2026)

Repères **prix nets** France (myposter, Pixum, CEWE, Photobox, Photoweb ; WhiteWall = premium ×3-4) — détail complet et sources dans le relevé du benchmark :

| Support | 40×60 (marché) | 80×120 (marché) | Formats incontournables |
|---|---|---|---|
| Poster papier | 13–16 € | ~35 € | 20×30 · 30×40 · 40×60 · 50×70 · 60×90 · carrés |
| Toile châssis | 50–55 € (30–50 en promo) | 107–129 € | 30×40 → 120×80 |
| Alu-Dibond | 50–63 € | ~165 € | 30×40 → 120×80 |
| Plexi | 65–88 € | ~250 € | 30×40 → 120×80 |
| PVC/Forex | 45–53 € | 114–139 € | 30×40 → 120×80 |

**Pratiques du marché** : prix barrés quasi permanents (−30 à −45 % affichés — le prix « catalogue » est un leurre, se caler sur les nets) · remise dès 2 produits (myposter −10 %) · **port facturé une fois par commande** (Pixum — mécanique pro-panier à copier) · production 2–7 JO, express en option.

**Marché mariage** — structuré en deux temps :
- **Jour J** : panneau de bienvenue (Forex 5 mm, 50×70 / 70×100, ~60 € chez les spécialistes, 17–22 € en papier chez Popcarte) — segment très actif, parfaitement « imprimeur-compatible ».
- **Après** : album photo (produit-roi, 29–67 €), tirages en nombre (0,17–0,30 €), déco murale 30×40 → 90×60.
- **Le trou du marché : personne ne fait le pont « photos des invités → impression »** — tous partent des photos du couple/photographe. C'est exactement la position d'Usegather (le coffre contient déjà les photos, le panier scale avec les invités).

## 4. La grille V1 proposée (à faire valider par l'atelier)

Prix TTC cibles « prix cassé » (30-40 % sous le marché **net**), calés sur les coûts matière estimés du benchmark de juillet — **chaque ligne doit être confirmée par les coûts réels de l'atelier avant publication**. Plancher absolu : coût matière + port + frais de paiement (~2 %) + marge minimale.

### A. Souple — Latex 700W (cœur de l'offre, aucune contrainte de format)

**Poster papier photo (satin ou mat ~250 g)** — coût matière+encre ~5-7 €/m² :

| Format | Coût est. | Marché net | **Prix Usegather** | Marge brute est. |
|---|---|---|---|---|
| 30×40 | ~1 € | 8–11 € | **6,90 €** | ~5 € |
| 40×60 | ~1,60 € | 13–16 € | **9,90 €** | ~7,50 € |
| 50×70 | ~2,30 € | 17–20 € | **12,90 €** | ~9,50 € |
| 60×90 | ~3,50 € | 20–23 € | **14,90 €** | ~10,50 € |
| 80×120 | ~6 € | ~35 € | **24,90 €** | ~17 € |

**Toile canvas sur châssis** — canvas ~12 €/m² + châssis 3-6 € (⚠️ montage châssis : voir question n°3) :

| Format | Coût est. | Marché net | **Prix Usegather** | Marge brute est. |
|---|---|---|---|---|
| 30×40 | ~7 € | 25–35 € | **19,90 €** | ~12 € |
| 40×60 | ~9,50 € | 30–55 € | **29,90 €** | ~19 € |
| 50×70 | ~11 € | 50–70 € | **44,90 €** | ~32 € |
| 60×90 | ~13 € | 72–90 € | **49,90 €** | ~35 € |
| 80×120 | ~18 € | 107–129 € | **69,90 €** | ~49 € |

### B. Rigide — Mimaki UV (formats > 40×60 conditionnés à la question n°1)

**PVC/Forex** (~8-15 €/m² — la meilleure marge du rigide) :

| Format | Coût est. | Marché net | **Prix Usegather** | Marge brute est. |
|---|---|---|---|---|
| 30×40 | ~2 € | 30–36 € | **19,90 €** | ~17 € |
| 40×60 | ~3,50 € | 45–53 € | **29,90 €** | ~25 € |
| 60×90 * | ~7 € | ~80 € | **44,90 €** | ~36 € |
| **Panneau bienvenue 70×100** * | ~9 € | ~60 € | **49,90 €** | ~39 € |

**Alu-Dibond 3 mm** (~35-45 €/m² — matière chère, garder le plancher) :

| Format | Coût est. | Marché net | **Prix Usegather** | Marge brute est. |
|---|---|---|---|---|
| 30×40 | ~6 € | 30–40 € | **24,90 €** | ~17 € |
| 40×60 | ~10,50 € | 50–63 € | **34,90 €** | ~22 € |
| 60×90 * | ~22 € | 70–119 € | **54,90 €** | ~29 € |

**Plexi 4 mm** (~34-50 €/m² — impression directe avec blanc de soutien) :

| Format | Coût est. | Marché net | **Prix Usegather** | Marge brute est. |
|---|---|---|---|---|
| 30×40 | ~6 € | 30–53 € | **29,90 €** | ~22 € |
| 40×60 | ~11 € | 65–88 € | **39,90 €** | ~26 € |
| 60×90 * | ~24 € | 80–149 € | **69,00 €** | ~40 € |

\* = seulement si grande table JFX **ou** contrecollage pratiqué.

### C. Volume et packs (proposition)

- **Dégressif simple V1** : −10 % dès 2 pièces, −15 % dès 3 pièces (aligné myposter, simple à coder).
- **Port payé une fois par commande** (mécanique Pixum) — tarif réel à fixer avec l'atelier (question n°7).
- **Pack mariage** (V1.5, une fois les unités validées) : « 1 grand format + 2 moyens » ≈ −20 % vs somme des unités — à composer avec le frère selon ce qui se produit bien en lot.

### D. Ce qui reste HORS grille V1 (à trancher explicitement)

- **Tirages 10×15 / 13×18 et albums** : le benchmark de juillet les prévoyait, mais **ce ne sont pas les machines décrites** (minilab / presse toner + reliure ≠ Latex/UV flatbed). Trois options : (a) l'atelier a d'autres moyens → les intégrer, (b) sous-traitance, (c) V1 sans eux — l'album (produit-roi mariage) arrivant en V1.5. **Question n°5.**
- **Photo encadrée** : stock de cadres + montage = complexité logistique, marge fine (constat de juillet) → pas en V1.
- **Adhésif mural / papier peint** : la Latex 700W sait le faire — piste V2 différenciante, pas V1.

## 5. Architecture d'intégration (le pattern Renka, adapté photo)

**Flux cible** : galerie du coffre → sélection photo(s) → choix produit/format avec aperçu → panier → **paiement Stripe** → (webhook `checkout.session.completed`) → rendu du **fichier de production final figé** (JPEG/TIFF 300 dpi, profil couleur, re-téléchargé depuis le bucket — jamais une URL signée périssable) → `print_queue` → **regroupement par contrainte machine** (rigide : planche par matière ; souple : session de rouleau par média) → **email atelier** (matière à charger + fichiers + bon de tri position→client) → dashboard `/atelier?cle=…` → clics « imprimée » / « expédiée » → **emails client** (confirmation, expédition).

**Ce qu'on réplique tel quel de Renka** (éprouvé) :
- Claim atomique conditionnel + rollback + récupération des zombies + `after()` non bloquant (les 4 garanties qui séparent une file de prod d'une file jouet).
- Cron quotidien : lots complets + **lots partiels au-delà de N jours d'attente** (sinon une commande isolée attend indéfiniment) + purge des fichiers unitaires (rétention 7 j, jamais les planches).
- Dashboard atelier par **lien secret sans compte**, bon de tri HTML `window.print()`, remise en file par pièce, confirmations à 2 clics.
- Produits/prix en **constantes TypeScript source unique** (pattern `offer.ts` — un prix se change à UN endroit).
- Script `preflight-atelier` (vérification env/tables/bucket avant mise en route) et script de simulation de commandes.

**Ce qu'on corrige d'office par rapport à Renka** (trous assumés là-bas, inacceptables ici) :
1. **Paiement AVANT mise en file** — Renka produit sans encaisser (phase preuve, volumes faibles). À nos volumes/paniers : webhook Stripe → enqueue, jamais l'inverse.
2. **Adresse de livraison collectée** au checkout (Renka : nom + email seulement).
3. **Emails client** : confirmation de commande, expédiée (+ n° de suivi) — inexistants côté Renka.
4. **Contrôle qualité résolution à la source** : une photo smartphone 12 Mpx (4000×3000) tient 300 dpi jusqu'à ~34×25 cm, ~150 dpi en 60×90 (acceptable en déco vue à distance), limite en 80×120. → **badge qualité par format** au moment du choix (vert/orange/bloqué) + politique d'upscale à définir. Leçon Renka : corriger le pipeline, mais **valider tout investissement qualité sur un tirage réel** (l'upscale ESRGAN n'avait rien changé de perceptible).

**Modèle de données** (adapté de Renka) : `print_queue` (1 ligne = 1 pièce : photo_id, product, material, format, prix payé, `pdf/tiff_url` figé, status pending/batching/batched, batch_id, slot_index, order_ref, shipped_at) + `print_batches` (1 planche/session : matière, fichiers, emailed_at, printed_at) + les commandes **dérivées par agrégation** sur order_ref (pas de table orders — statut calculé, jamais stocké).

**Les pièges Renka déjà payés à ne pas rejouer** : PDF sans transparences (aplatir serveur, vérifier au raster — jamais au grep) · une planche = un substrat · fichiers mono-page pour le RIP · blanc de soutien fourni, jamais l'auto du RIP · plafonds email (×1,37 en base64) · fichier figé = correctif non rétroactif (prévoir « remettre en file ») · vérifier la prod réellement déployée avant tout tirage.

## 6. Les questions à faire valider par l'atelier (la liste pour le frère)

1. **Machine rigide** : UJF-6042 MkII (A2) seulement, ou grande table JFX 2,5×1,3 m ? → débloque (ou non) les rigides > 40×60 et le panneau de bienvenue 70×100.
2. **Contrecollage** : tirage Latex contrecollé sur Dibond/PVC — pratiqué ? matériel ?
3. **Toile** : montage sur châssis maîtrisé ? fournisseur/coût châssis par format ? caisse américaine ?
4. **Découpe** : découpe aux formats finis des sorties rouleau (massicot / table de découpe) ?
5. **Tirages 10×15 & albums** : d'autres machines à l'atelier (minilab, presse, reliure) ? sous-traitance envisageable ? ou on lance la V1 sans ?
6. **Coûts matière réels** par fournisseur (papier, canvas, Dibond, plexi, Forex, encres) → figer les planchers de la grille §4.
7. **Logistique** : qui emballe (tubes, cartons plats), qui expédie, quels transporteurs, quel tarif port par gabarit, quel délai de production cible (marché : 2–7 JO) ?
8. **Le prix de cession atelier → Usegather** : la grille interne de Printerkut (le « prix qu'on connaît ») pour figer la marge Usegather — et alimenter le **contrat d'approvisionnement exclusif** (déjà en NEXT roadmap, Jérem).
9. **Capacité** : volume max/jour en haute saison mariage (mai-septembre), et le seuil de regroupement pertinent par machine (l'équivalent du « 23 » de Renka).
10. **Réglages machine à documenter** : la section « réglages RIP » de Renka est restée ⟨À CONFIRMER⟩ pendant des semaines — prévoir une **session à l'atelier dédiée à capturer les réglages** pour la photo (profils média Latex, passes, profils couleur).

## 7. Prochaines étapes

1. **Nico** : faire valider ce document (grille §4 + questions §6) avec le frère → chaque prix confirmé ou corrigé avec le coût réel.
2. Grille validée → **décision actée** (journal-decisions + decisions-validees + ligne Notion Type=Décision) et mise à jour du benchmark de juillet.
3. **Jérem** : verser les chiffres au **contrat d'approvisionnement exclusif** (préalable au pitch — déjà décidé).
4. **Arnaud + Nico** : spec technique de la réplique du pipeline Renka (chantier « intégration Printerkut » de la V1, NEXT roadmap) — commencer par dupliquer `process-fabrication.md` en version photo.
5. V1.5 : albums (selon réponse question n°5), packs mariage, panneau de bienvenue personnalisé (nom + date + QR du coffre — pont naturel avec le produit).

---

*Sources : exploration du pipeline Renka/Lika-NFC (05/08/2026) · relevé web marché FR du 05/08/2026 (myposter, Pixum, CEWE, Photobox, Photoweb, WhiteWall, Cheerz, L'Art de l'Affiche, Popcarte, Rosemood) · specs HP Latex 700W et Mimaki UJF/JFX (sites constructeurs) · benchmark prix juillet 2026 (`benchmark-prix-impression.md`).*
