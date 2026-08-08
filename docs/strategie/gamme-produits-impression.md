# Gamme produits impression Usegather × Printerkut — V1

> **Date** : 07/08/2026 · **Statut** : première version, **à valider avec l'atelier** (§11).
>
> ## ⚠️ Périmètre de lancement — décision Nico du 07/08/2026
>
> **La Gongzheng n'arrive pas tout de suite. On lance avec ce que l'atelier maîtrise déjà : Dibond, PVC, plexi, papier photo, canvas.**
>
> | | Contenu | Statut |
> |---|---|---|
> | **V1 — maintenant** | §4 (Forex, aluminium, plexi) et §5.1–5.2 (poster, toile) — **c'est ce qui est au catalogue du code** | actif |
> | **V2 — à la livraison de la Gongzheng** | §5.3 (papier peint, adhésif mural) et §8 (rétroéclairé, vitrail à blanc sélectif, bloc épais, petites pièces) | spécifié, en attente machine |
>
> Les sections V2 restent dans ce document parce qu'elles sont chiffrées et prêtes — elles ne sont simplement pas vendables aujourd'hui. Le drapeau `signature` et son exclusion de la remise volume sont déjà câblés dans `lib/print/catalog.ts` pour les accueillir sans réécriture.
>
> **Fait acquis** : l'atelier s'équipe d'une **Gongzheng H2513GN PRO** (flatbed UV 2500×1300 mm, épaisseur 100 mm, encre **blanche** + **vernis**). À sa livraison, toutes les limites de format tombent et la gamme signature s'ouvre.
> **Méthode** : relevés du 07/08/2026. Coûts matière : **Antalis e-shop (prix HT, références réelles)**, Plexi-Cindar, chassis-en-bois, Facilembal, Toutembal. Prix marché : LaboPhotos, Artdeqo, myposter, Negatif Plus, impression-panoramique, Popcarte, Veoprint, SubliPix. Les prix marché cités sont des **prix nets réellement payés**, jamais les prix barrés. Volumes : INSEE.

---

## 1. Les six découvertes qui commandent la gamme

**1. Le surcoût du rigide est un forfait, pas un coût de surface.** Chez le même prestataire, du 20×30 au 80×120 — seize fois plus de surface — le supplément Dibond reste entre 19 et 37 € (moyenne +28 €), le PVC entre 10 et 24 € (+17 €). Régression sur deux ateliers indépendants : **≈ 17–21 € de forfait fixe + 103–134 €/m² de variable**.

**2. Et on sait maintenant d'où vient ce forfait : la fixation et l'emballage.** Quatre entretoises inox coûtent **14,96 € HT** — soit **près de trois fois le prix de la plaque** sur un 40×60 en Forex. Un étui carton renforcé coûte 4,57 à 11,83 €. Le forfait de 20 € du marché, c'est ça. **Celui qui maîtrise l'accroche et l'emballage casse le marché** — pas celui qui achète la matière moins cher.

**3. La marge est dans le petit format.** Un 20×30 Dibond se vend 517–532 €/m², un 100×150 se vend 135–149 €/m² : **facteur 3,9**. En plexi, facteur 4. Or le format naturel d'une photo d'invité, c'est le 20×30 / 30×40. **Nous attaquons le segment le plus margé du marché.**

**4. La valeur de la Gongzheng n'est pas le format géant, c'est l'imposition.** Une planche pleine de 3,25 m² = ~40 pièces de 20×30 = **760 à 1 290 € de valeur marché par passage machine**. C'est le « 23 cartes = une planche » de Renka transposé. À 52 m²/h en mode photo, la contrainte devient la découpe et l'emballage.

**5. Le dégressif quantité est un angle mort du marché.** Une seule remise volume existe dans tout le segment photo-déco : −10 % dès 2 produits chez myposter. Les imprimeurs descendent à −30 % à 100 exemplaires. **Notre modèle produit N pièces du même événement en une passe** : le forfait s'écrase mécaniquement. C'est notre avantage structurel — pas le prix unitaire.

**6. L'encre blanche ouvre une gamme que personne ne peut copier.** Le **blanc de soutien sélectif** est une case à cocher standard en signalétique B2B et **totalement absent des labos photo grand public**. Le plexi **diffusant** n'est jamais catalogué, toujours sur devis — alors qu'il coûte **29,01 €/m²**, à peine plus que le plexi transparent. Le rétroéclairé se vend **649 à 1 098 €**. Ni CEWE, ni Photoweb, ni Photobox n'ont d'encre blanche.

---

## 2. Ce que la machine permet

| Machine | Statut | Capacité | Ce qu'elle permet |
|---|---|---|---|
| **HP Latex 700W** | **en service** | Laize 1,63 m, encre blanche | Poster jusqu'à 150×500 · toile · papier peint · adhésif mural · backlit · **les tirages à contrecoller** |
| **Mimaki UJF MkII** (3042 et/ou 6042, double plateau) | **en service** | 300×420 / 610×420 mm, ép. ≤ 153 mm, **CMJN + Blanc + Vernis** | Rigide direct **jusqu'à 40×60** · cadence doublée par le chargement en temps masqué · **blanc sélectif en petit format déjà possible** |
| **Gongzheng H2513GN PRO** | **à venir** | 2500×1300 mm, ép. ≤ 100 mm, Ricoh Gen6, 2×Blanc + CMJN + Vernis, 52 m²/h | Rigide sans plafond · transparent et **diffusant** · vernis sélectif · verre, bois, carrelage · **imposition massive** |

**Contrainte d'achat à connaître** : le catalogue signalétique est majoritairement en **3050 mm de long**, qui ne passe pas sur la table. Formats entrant entiers : 1220×2440, 1250×2500, 1220×2300, 1000×1400. Bonne nouvelle : **chez Antalis le €/m² est quasi identique quel que soit le format de plaque** (Forex Lite 3 mm = 9,94 à 10,05 €/m² sur quatre formats). Acheter petit ne coûte pas plus cher — l'arbitrage est logistique, pas économique.

---

## 3. Coûts matière réels (HT)

### 3.1 Rigides — flatbed UV

| Support | €/m² HT | Référence | Fiabilité |
|---|---|---|---|
| **Forex Lite 3 mm** | **10,00** | Antalis, film 1 face | 🟢 catalogue |
| **Forex Print 3 mm** (qualité impression directe) | **13,36–13,65** | Antalis | 🟢 |
| Forex Print 5 mm | 20,20–20,71 | Antalis | 🟢 |
| Forex Color **noir** 3 mm | 11,76 | Antalis | 🟢 |
| Kapa Line 5 mm (carton plume) | 15,00–15,29 | Antalis | 🟢 |
| **Plexi XT transparent 3 mm** | **27,57** | Plexi-Cindar | 🟢 |
| **Plexi XT Opal diffusant TL 19 % 3 mm** | **29,01** | Plexi-Cindar | 🟢 |
| Plexi coulé GS transparent 3 mm | 29,81 | Plexi-Cindar | 🟢 |
| Altuglas 100-27100 **LED Blanc** 3 mm | 53,50 | Plexi-Cindar | 🟢 |
| **DiLite 3 mm** (alu composite) | **40,34** | Antalis | 🟢 |
| DiLite 2 mm | 35,69 | Antalis | 🟢 |
| **Dibond® White 3 mm** (marque 3A) | **64,45** | Antalis, plaque 1250×2500 | 🟢 |
| ACM générique « type Dibond » 3 mm | 22,38–27,32 | Marchandise-Pro, Découpe-Plexi | 🟠 TTC converti |
| Verre 4 mm coupe brute | 52,67 | Verres et Miroirs | 🟠 |
| Contreplaqué peuplier | ~12,42 | Sud-Bois | 🟠 épaisseur non identifiée |

> ⚠️ **L'arbitrage Dibond est à trancher avant tout tarif.** 22 €/m² (ACM générique) contre 64 €/m² (Dibond® de marque) : c'est **10 € d'écart sur un 40×60** et **25 € sur un 60×90**. Le **DiLite à 40 €/m²** est le compromis raisonnable et sert de base à la grille ci-dessous. *Devis prioritaire n°1.*

### 3.2 Souples — Latex

| Support | €/m² HT | Référence | Fiabilité |
|---|---|---|---|
| **Backlit papier 140 g** (caisson intérieur) | **0,91** | Traceur Direct | 🟢 |
| **Papier peint intissé 150 g B-s1,d0** (sans PVC, FSC) | **2,31** | Antalis Coala WallDesign Ultimatt | 🟢 |
| **Vinyle adhésif monomère 100 µ** | **2,29** | Grafityp M116P / Graphic Réseau | 🟢 |
| Lamination monomère mate 80 µ | 2,09 | Graphic Réseau | 🟢 |
| **Poster papier 200 g semi-brillant** (laize 1,60 m) | **3,60** | Antalis Coala Poster | 🟢 |
| Bâche frontlit 510 g M2 | 5,49 | Antalis Coala | 🟢 |
| **Backlit polyester 205 µ** | **6,33** | Antalis Coala Backlit S | 🟢 |
| Vinyle polymère 75 µ | 6,50 | Antalis Coala 2D | 🟢 |
| Papier photo satin 225 g | 7,09–7,62 | Antalis Coala Photo Satin S | 🟢 |
| Intissé 225–230 g pré-encollé | 9,45–9,92 | Antalis | 🟢 |
| **Toile canvas polycoton 310 g** | **12,70–12,95** | Antalis Coala Canvas S | 🟢 |

### 3.3 Encre, finition, emballage

| Poste | Coût | Source |
|---|---|---|
| **Encre UV — CMJN + maintenance** | **0,65–1,10 €/m²** | 51 €/L × 10–14 ml/m², 3 sources concordantes |
| **Encre UV — avec couche de blanc** | **1,50–3,00 €/m²** | le blanc est déposé en aplat (×2 à ×3) |
| Encre latex HP | ~1,50–2,70 €/m² | 147,56 €/L (HP 832, 1 L) × 10–18 ml/m² — ⚠️ **consommation non sourcée** |
| **Baguette à châssis 20 mm** | **3,76 €/ml** dès 100 m cumulés (4,88 € à l'unité, 2,55 € à 1000 m) | chassis-en-bois |
| Châssis prêt à monter 40×60 | 11,04 € | TousLesCadres |
| **Caisse américaine** (profil U standard) | dès **15,02 €** | chassis-en-bois |
| **Entretoise inox** (vis + cheville) | **3,74 €/pce** → **14,96 € les 4** | Plaqueplastique |
| Rail alu adhésif | 8,93 €/ml de profil | PH Distrib |
| Étui carton renforcé cadres | 4,57 € (42×34) · 6,65 € (66×55) · 8,25 € (82×66) · 11,83 € (101×82) | Toutembal, −15 % dès 400 u |
| Tube carton Ø80×620 | 2,06–2,87 € | Facilembal, −28 % en volume |
| Tube carton Ø100×1500 | 4,99–7,49 € | Facilembal, −33 % en volume |
| Coin mousse de protection | dès 0,25 € | Facilembal |

> **Le poste qui décide de tout : l'accroche.** À 3,74 € l'entretoise, un jeu de 4 coûte 15 € — plus cher que la matière de la plupart des formats. **Décision recommandée : accroche légère incluse (adhésif ou rail, ~1,50 €), entretoises inox en option payante (+19,90 €)**, comme le fait myposter qui facture son kit de fixation 8,99 € en supplément. Piste de sourcing : Pixink descend à −12 % dès 100 unités ; un achat direct fournisseur n'a pas été exploré.

> **Le piège de la toile : 46 % de chute.** Pour un 40×60 tendu sur châssis de 2 cm il faut ~50×70 de toile, soit **0,35 m² de matière pour 0,24 m² d'image**. Tout calcul de tirage tendu doit intégrer ce ratio.

---

## 4. Grille de prix — supports rigides *(V1, actif)*

### Contrainte de production actuelle — le plateau Mimaki

Avant la Gongzheng, le rigide passe sur les **Mimaki UJF MkII (anciens modèles)**, à plateau **fixe** : le « double plateau » de l'atelier est un dispositif de chargement en temps masqué — on charge l'un pendant que l'autre imprime. Il **double la cadence, pas le format**.

| Machine | Plateau | Formats en impression DIRECTE | Pièces par passe |
|---|---|---|---|
| **UJF-6042 MkII** | 610 × 420 mm | 20×30 · 30×40 · **40×60** (au ras) | **4** × 20×30 · **2** × 30×40 · **1** × 40×60 |
| **UJF-3042 MkII** | 300 × 420 mm | 20×30 · 30×40 | **2** × 20×30 · **1** × 30×40 |

**C'est la réponse au « 23 cartes = une planche » pour la photo**, et elle commande les seuils de lot : un lot de **8 pièces de 20×30** = 2 passes sur le 6042, 4 sur le 3042.

**Au-delà de 40×60 : contrecollage** — tirage Latex sur vinyle adhésif laminé, marouflé sur le panneau. Pratique standard du métier. Surcoût matière faible (**+4,40 €/m²** : vinyle 2,29 + lamination 2,09), la main-d'œuvre est le vrai poste. **Les prix ci-dessous restent valables dans les deux méthodes** — à confirmer avec l'atelier (question §11.3).

> **À noter pour plus tard** : les UJF MkII ont **déjà l'encre blanche et le vernis** (LH-100 / LUS-120 : CMJN + Blanc + Vernis). Les produits signature en **petit format** — marque-places, plaques transparentes à blanc sélectif, petites pièces imposées — sont donc techniquement possibles **dès maintenant**, sans attendre la Gongzheng. C'est justement le produit au meilleur €/heure-machine (§8.5). À garder sous le coude une fois la V1 lancée.

Prix TTC. Coût = matière + encre + accroche légère + emballage, **base DiLite pour l'aluminium**. « Marché net » = le moins cher réellement payé.

### 4.1 Forex 3 mm — l'arme de prix (meilleures marges de la gamme)

| Format | Coût | Marché net | **Prix Usegather** | Marge | Taux |
|---|---|---|---|---|---|
| 20×30 | 5,4 € | 19,99–21,95 € | **14,90 €** | 9,5 € | 64 % |
| 30×40 | 7,8 € | 27,95 € | **19,90 €** | 12,1 € | 61 % |
| 40×60 | 10,5 € | 42,95 € | **29,90 €** | 19,4 € | 65 % |
| 50×70 | 13,7 € | 57,95 € | **39,90 €** | 26,2 € | 66 % |
| 60×90 | 18,0 € | 69,95 € | **49,90 €** | 31,9 € | 64 % |
| **70×100 — panneau de bienvenue** | 20,3 € | ~60–93 € | **69,90 €** | 49,6 € | 71 % |
| 80×120 | 28,7 € | 115,95 € | **79,90 €** | 51,2 € | 64 % |
| 100×150 | 40,6 € | 194 € | **129,00 €** | 88,4 € | 69 % |

### 4.2 Aluminium (DiLite 3 mm) — le haut de gamme accessible

| Format | Coût | Marché net | **Prix Usegather** | Marge | Taux |
|---|---|---|---|---|---|
| 20×30 | 7,0 € | 19,99 € · 31,95 € (labo) | **16,90 €** | 9,9 € | 59 % |
| 30×40 | 11,0 € | 29,99 € · 37,95 € | **24,90 €** | 13,9 € | 56 % |
| 40×60 | 17,0 € | 39,99 € · 51,95 € | **34,90 €** | 17,9 € | 51 % |
| 50×70 | 23,1 € | 62,95 € | **44,90 €** | 21,8 € | 49 % |
| 60×90 | 32,5 € | 69,99 € · 83,95 € | **59,90 €** | 27,4 € | 46 % |
| 80×120 | 54,4 € | 129,95 € | **99,90 €** | 45,5 € | 46 % |
| 100×150 | 80,9 € | 202,95 € | **149,00 €** | 68,1 € | 46 % |

> Avec du **Dibond® de marque à 64,45 €/m²** au lieu du DiLite, la marge du 40×60 tombe de 17,9 € à ~12 € (35 %). Toujours viable, mais c'est l'écart que le devis doit lever.

### 4.3 Plexi 3 mm impression directe (avec blanc de soutien)

| Format | Coût | Marché net | **Prix Usegather** | Marge | Taux |
|---|---|---|---|---|---|
| 20×30 | 6,3 € | 19,99 € · 42,95 € (labo) | **17,90 €** | 11,6 € | 65 % |
| 30×40 | 9,6 € | 29,99 € · 61,95 € | **27,90 €** | 18,3 € | 66 % |
| 40×60 | 14,2 € | 39,99 € · 94,95 € | **44,90 €** | 30,7 € | 68 % |
| 50×70 | 19,1 € | 121,95 € | **64,90 €** | 45,8 € | 71 % |
| 60×90 | 26,3 € | 167,95 € | **84,90 €** | 58,6 € | 69 % |
| 80×120 | 43,4 € | 269,95 € | **139,00 €** | 95,6 € | 69 % |

> Le plexi est le support où l'écart labo-photo / signalétique est le plus violent : **10,40 € HT chez Veoprint** contre **42,95 € chez LaboPhotos** pour un 20×30. Nous vendons dans un contexte émotionnel, donc côté labo photo — en sachant que le plancher technique est très bas.

---

## 5. Grille de prix — supports souples

### 5.1 Poster papier photo — marges élevées, produit d'appel

| Format | Coût | Marché net | **Prix Usegather** | Marge | Taux |
|---|---|---|---|---|---|
| 30×40 | 2,7 € | 8,99 € | **6,90 €** | 4,2 € | 60 % |
| 40×60 | 3,4 € | 12,99 € | **9,90 €** | 6,5 € | 66 % |
| 50×70 | 4,5 € | 15,99 € | **12,90 €** | 8,4 € | 65 % |
| 60×90 | 5,5 € | 19,99 € | **14,90 €** | 9,4 € | 63 % |
| 80×120 | 10,4 € | ~30 € | **24,90 €** | 14,5 € | 58 % |
| 100×150 | 13,4 € | ~45 € | **39,90 €** | 26,5 € | 66 % |

### 5.2 Toile canvas — **le produit à la marge la plus faible, contre toute intuition**

Toile 12,80 €/m² **+ 46 % de chute** + châssis + étui : la finition domine. Prix relevés à la hausse par rapport au projet du 05/08, qui était **à parité stricte avec myposter** (29,90 € contre 29,99 €) — l'argument prix cassé n'y tenait pas.

| Format | Coût (toile+chute+châssis+étui) | Marché net | **Prix Usegather** | Marge | Taux |
|---|---|---|---|---|---|
| 30×40 | 12,3 € | 24,99 € | **21,90 €** | 9,6 € | 44 % |
| 40×60 | 18,1 € | 29,99 € | **29,90 €** | 11,8 € | 40 % |
| 50×70 | 22,9 € | ~40 € | **39,90 €** | 17,0 € | 43 % |
| 60×90 | 30,7 € | 49,99 € | **49,90 €** | 19,2 € | 38 % |
| 80×120 | 46,7 € | 69,99 € | **69,90 €** | 23,2 € | 33 % |
| 100×150 | 64,9 € | ~128 € | **99,00 €** | 34,1 € | 34 % |
| Panoramique 100×200 | 82 € | 256 € | **149,00 €** | 67 € | 45 % |

> **Conclusion contre-intuitive** : la toile, produit emblématique de la photo déco, est **notre pire marge (33–44 %)** quand le Forex atteint 64–71 %. Deux leviers : acheter la **baguette au mètre** (3,76 €/ml dès 100 m cumulés, contre 11,04 € le châssis 40×60 prêt à monter — **−32 %**), et ne pas descendre sous le 30×40. La toile reste au catalogue parce que le client la demande, pas parce qu'elle rapporte.
> Option **caisse américaine** : coût 15,02 €, marché 28,99–49 € → **+34,90 €**.

### 5.3 Décoration murale grand format — **V2, pas au catalogue de lancement**

*(La Latex 700W sait déjà le produire — c'est un choix de périmètre, pas une contrainte machine. À rouvrir dès que la gamme V1 tourne.)*

**La meilleure marge de tout le catalogue.**

Le papier peint intissé coûte **2,31 €/m²** et se vend **45 à 100 €/m² en déco panoramique**. Aucun labo photo français ne le vend correctement. La Latex 700W le produit nativement, en laize 1,63 m.

| Produit | Coût /m² | Marché | **Prix Usegather** | Marge | Taux |
|---|---|---|---|---|---|
| **Papier peint photo** (intissé 150 g, classé B-s1,d0) | **4,3 €** | 45–100 €/m² | **34,90 €/m²** | 30,6 € | **88 %** |
| **Adhésif mural repositionnable** (+ lamination) | 6,4 € | 20 €/m² HT (imprimeur) → 200–360 $/m² (Mixtiles) | **29,90 €/m²** | 23,5 € | 79 % |
| Photocall / backdrop 200×250 (bâche M2) | ~30 € | 81–270 € | **99,00 €** | 69 € | 70 % |
| Poster + hanger bois magnétique | +6 € | absent des labos photo | **+9,90 €** | 3,9 € | 39 % |

---

## 6. Le dégressif — notre avantage structurel

Le marché photo-déco n'a **aucune** grille volume digne de ce nom. Nous produisons N pièces du même événement dans la même passe, dans le même colis : le forfait d'accroche et d'emballage s'amortit.

| Quantité (même événement) | Remise | Justification |
|---|---|---|
| 2–4 pièces | **−10 %** | parité myposter |
| 5–9 pièces | **−20 %** | seuil imprimeur |
| 10–24 pièces | **−30 %** | une demi-planche imposée, un seul colis |
| 25–49 pièces | **−35 %** | une planche pleine |
| 50 pièces et + | **−40 %** | plusieurs planches, une seule expédition |

**Exemple** — 10 tirages 20×30 en Forex : marché 200–320 € ; chez nous 14,90 € −30 % = **10,43 €/pièce, 104 €**. Coût total ~40 € (la matière ne représente que 8,60 €, le reste est emballage et main-d'œuvre). **Marge ~64 € sur un panier que personne d'autre ne propose.**

**Franchise de port** : les franchises du marché vont de 69 € (Juniqe) à 200 € (impression-panoramique) ; sur 100 tirages, le port pèse 23 % du panier chez Photoweb. Proposition : **port offert dès 79 €** — levier de panier moyen plus puissant qu'une remise produit.

---

## 7. Les gammes par secteur

### 7.1 Mariage — le beachhead (**251 000 unions/an**, INSEE 2025)

> ⚠️ Nos documents citent « ~220 000/an » : c'est le chiffre **2019**. Le marché est en hausse depuis 2023 et vaut **251 000** en 2025 — **+14 % à récupérer dans le deck**.

**Avant le jour J — les mariés, date impérative**

| Produit | Marché | **Notre prix** | Statut |
|---|---|---|---|
| Panneau de bienvenue Forex 70×100 **+ QR du coffre** | 21,90 € (papier Popcarte) → ~60 € (spécialistes) | **69,90 €** | **V1** |
| Plan de table rigide 50×70 | 21,90 € (papier) | **34,90 €** | **V1** |
| Photocall / backdrop 200×250 | 81–270 € | **99,00 €** | V2 |
| Panneau de bienvenue rétroéclairé | sans comparable | **299,00 €** | V2 |
| Marque-places photo plexi (par 20) | absent du marché | **79,00 €** | V2 |

**Après — les mariés ET les invités (le panier scale avec le nombre d'invités)**

| Produit | Marché | **Notre prix** | Statut |
|---|---|---|---|
| Déco murale plexi 40×60 | 39,99–94,95 € | **44,90 €** | **V1** |
| Déco murale alu 40×60 | 39,99–51,95 € | **34,90 €** | **V1** |
| Toile 60×90 | 49,99 € | **49,90 €** | **V1** |
| Pack invité : 3 tirages 20×30 Forex | 60–96 € | **40,20 €** (−10 %) | **V1** |
| Tableau rétroéclairé « Day & Night » | 649–1 098 € | **399,00 €** | V2 |

**L'insight à ne jamais perdre de vue** : personne ne fait le pont « photos des invités → impression ». Tous les acteurs partent des photos du couple ou du photographe. Nous sommes le seul pour qui **120 invités = 120 acheteurs potentiels**.

**Le concurrent réel n'est pas le labo, c'est le photographe** : il revend un tirage grand format 50 €, un coffret 80 €, un album 300–1 200 € — soit **2 à 3× le prix labo**. Il n'a aucune raison de défendre cette marge s'il ne produit pas lui-même. Piste de partenariat plutôt que de concurrence.

### 7.2 Clubs de sport — la meilleure verticale secondaire

**17 millions de licences, 165 919 clubs.** Récurrence annuelle garantie, un décideur unique (le président) pour 30 à 300 familles, et surtout : **le sponsor peut payer à la place des parents** — seul secteur où mettre un logo sur le produit ne le dévalorise pas.

| Produit | **Prix Usegather** |
|---|---|
| Photo d'équipe Forex 30×40 (par famille, ×25) | 19,90 € −35 % = **12,90 €** |
| Poster de saison 60×90 avec bandeau sponsors | **49,90 €** |
| Pack club : 1 grand format + 25 tirages famille | **~370 €** |

### 7.3 Corporate / séminaire

Signalétique B2B relevée : Dibond dès 9,50 € HT, plexi dès 10,40 € HT chez Veoprint — le prix nu est bas, la valeur est dans le service et le délai.

| Produit | **Prix Usegather** |
|---|---|
| Photo de groupe encadrée 50×70 | **69,90 €** |
| Plaque souvenir plexi personnalisée (par participant, ×50) | **12,90 €** → **8,40 €** (−35 %) |
| **Panneau acoustique photo 120×60** (marché 160–179 €/m², délai concurrent 3 semaines) | **99,00 €** |

⚠️ **Le B2B change la mécanique** : bon de commande, facture, paiement à 30–45 jours, agence intermédiaire, délais J-2/J-7. Rien n'est outillé aujourd'hui — à traiter avant d'ouvrir le secteur.

### 7.4 Scolaire — potentiel énorme, risque juridique majeur

L'économie est spectaculaire : un 10×15 qui coûte **0,08 €** en volume se revend **4,50–5 €** aux familles (**×55**), pochettes 12–15 €, rétrocession ~30 % à l'école. **La valeur n'est pas dans l'impression, elle est dans l'accès.**

Mais : droit à l'image des mineurs, autorisation des **deux** parents, non-obligation d'achat, RGPD — et un coffre où **n'importe qui dépose sans compte** est en tension frontale avec tout ça. **Ne pas ouvrir sans avis juridique (Jérem).** La roadmap place « B2B écoles » en V2 : ne pas avancer cette échéance.

Créneau défendable en attendant : la **fresque de fin d'année / tableau de promotion dans le supérieur** (majeurs, hors circuit pochette réglementé), **200–500 €**.

### 7.5 Autres verticales

| Verticale | Volume France | Produit | Prix |
|---|---|---|---|
| Festivals | > 7 000 | Tirage souvenir sur place | 5–15 € |
| Naissance | 645 000/an | Tableau de naissance | 20–60 € |
| EHPAD | 7 752 étab. · 577 208 résidents | Mur de souvenirs | 200–600 € |
| Funéraire | 630 000 décès/an · obsèques moy. 3 800 € | Portrait d'hommage grand format | 60–150 € |

Le funéraire a le meilleur ratio urgence/insensibilité au prix, mais demande un ton et un canal qu'Usegather n'a pas.

---

## 8. Les produits signature — **V2, à la livraison de la Gongzheng**

*Spécifiés et chiffrés, pas au catalogue de lancement : ils dépendent tous de l'encre blanche et du plexi diffusant. À rouvrir dès que la machine est installée et les réglages capturés.*

### Ce que personne ne peut copier

L'encre blanche et le plexi diffusant créent un avantage que **ni CEWE, ni Photoweb, ni Photobox ne peuvent égaler**.

**1 — Le « Coffre lumineux » : tableau rétroéclairé Day & Night** ⭐
Plexi diffusant ou transparent en **quadri – blanc – quadri**, monté en caisson LED. Éteint : un tableau déco. Allumé : la photo s'embrase et une **seconde image apparaît** (les prénoms, la date, une photo cachée). Technique documentée (Picto Online, Mimaki).
Marché **649–1 098 €** · matière plexi Opal 40×60 = **7,50 €** · **le caisson est tout le coût** : 313–350 € tout fait chez Enseigne Low Cost, bien moins en fabrication maison (profilé alu + bandeau LED + alim).
**Prix 399 €** — marge de 70 à 240 € selon la réponse à la question §11.5.

**2 — Le panneau de bienvenue rétroéclairé (jour J)**
Le panneau Forex décliné en plexi diffusant sur pied avec bandeau LED. De jour un panneau, à la nuit tombée une enseigne lumineuse à l'entrée de la salle — au moment exact où se prennent les photos de soirée. Il porte le **QR du coffre** : *le produit devient le canal d'acquisition*. **299 €**, sans comparable sur le marché.

**3 — Le « vitrail photo » : blanc de soutien SÉLECTIF sur transparent**
Mosaïque des photos d'invités sur plexi transparent, blanc **uniquement derrière les sujets** : les visages opaques, le fond transparent. Posé devant une fenêtre ou rétroéclairé. C'est l'option que la signalétique B2B propose en case à cocher et que **zéro labo photo grand public ne sait faire**. Matière 40×60 : 7,14 €. **89–249 €** selon format.

**4 — Le bloc plexi épais, effet profondeur**
Les 100 mm admissibles permettent d'imprimer au dos de blocs PMMA épais : blanc de soutien + quadri = flottement et profondeur. Marché LaboPhotos « Bloc Plexi » : **2 365–3 663 €/m²**. Notre prix **39–99 €**. Produit de bureau et de cadeau, peu encombrant à expédier.

**5 — Les petites pièces transparentes imposées en planche**
Marque-places, médailles de club, trophées, plaques souvenir, porte-photos. Le blanc sélectif fait tenir l'image sur du transparent ; la planche 2500×1300 en absorbe des centaines par passage. **Le meilleur €/heure-machine de toute la gamme.** 3–15 € l'unité, panier de 80–150 € pour une table de mariage complète.

**Bonus — le vernis sélectif** : prénoms ou date en vernis brillant sur un tirage mat. Coût quasi nul, effet papeterie de luxe, invisible sur une photo de catalogue concurrent.

---

## 9. Deux régimes de prix, pas un

La décision actée est de vendre **30–40 % sous le marché**. Elle est juste sur les **commodités comparables** — poster, toile, alu, Forex, plexi plat — où le client vérifie chez CEWE en trois clics.

Elle est **destructrice de valeur sur les produits signature** : il n'existe aucun point de comparaison pour un rétroéclairé Day & Night ou un vitrail à blanc sélectif, et un prix bas y signale une qualité douteuse plutôt qu'une bonne affaire.

| Régime | Produits | Règle |
|---|---|---|
| **Commodité** | poster, toile, Forex, alu, plexi plat | 10–25 % sous le **prix net** du moins cher (jamais sous le prix barré) |
| **Signature** | rétroéclairé, blanc sélectif, bloc, vernis, petites pièces | prix de valeur perçue — 50–70 % sous le seul comparable quand il existe, sinon prix libre |

---

## 10. Ce qui doit changer dans le produit avant d'ouvrir la vente

**1. La voie express — bloquant.** La file regroupe par matière avec `PRINT_BATCH_SIZE = 8` et `PRINT_MAX_WAIT_DAYS = 2`. Un panneau de bienvenue commandé pour un mariage **samedi** ne peut pas attendre que sept autres clients commandent du plexi. **Il faut une voie express hors file pour tout produit à date impérative** — sinon le meilleur point d'entrée du secteur mariage est structurellement intenable.

**2. Le dégressif codé est trop faible.** `volumeDiscountPercent` s'arrête à −15 % dès 3 pièces ; la grille §6 va jusqu'à −40 %. C'est notre avantage principal : il doit être dans le code.

**3. L'accroche doit devenir une option facturée.** À 15 € les quatre entretoises, elle ne peut pas être incluse par défaut. Le catalogue doit porter une option « fixation inox +19,90 € » — comme myposter facture son kit 8,99 €.

**4. La résolution en grand format.** Une photo smartphone 12 Mpx tient 300 dpi jusqu'à ~34×25 cm, ~150 dpi en 60×90. Le badge et l'indicateur de cadrage sont codés, mais la politique doit être tranchée **avant** d'ouvrir le 80×120 et le 100×150.

**5. Les seuils par matière.** La plomberie existe (`PRINT_BATCH_SIZE_<MATIERE>`). Reste à connaître **combien de pièces tiennent sur une planche 2500×1300 après découpe** — c'est le « 23 cartes » de la photo.

---

## 11. Les questions à l'atelier — mise à jour

Les 10 questions du document de validation restent valables, sauf la n°1 (répondue par la machine). À ajouter, par ordre d'importance :

### Pour lancer la V1 (les seules qui bloquent aujourd'hui)

1. **Ta grille de cession** (prix atelier → Usegather) sur chaque ligne des §4 et §5.1–5.2 — c'est la base du contrat d'approvisionnement.
2. **Aluminium : quel grade ?** ACM générique (~22–27 €/m²), DiLite (40 €/m²) ou Dibond® de marque (64 €/m²) ? *Devis prioritaire — l'écart change toute la marge.*
3. **Les formats > 40×60 en rigide** : contrecollage (tirage Latex marouflé) confirmé ? Quel temps de main-d'œuvre par pièce ? *Détermine si la grille tient jusqu'au 100×150 avant la Gongzheng.*
4. **Accroche** : quel système par défaut, et à quel prix d'achat en volume ? (l'entretoise à 3,74 € pièce est le poste qui écrase les petits formats)
5. **Châssis toile** : achat prêt à monter (11,04 € le 40×60) ou baguette au mètre (3,76 €/ml dès 100 m) ? *C'est le levier de la marge la plus faible de la gamme.*
6. **Confirmer les pièces par passe** : 4 × 20×30, 2 × 30×40, 1 × 40×60 sur le plateau 610×420 — et lequel des deux Mimaki tourne en priorité ? *(détermine les seuils de lot par matière)*
7. **Encre latex** : relever les compteurs machine sur un mois de production réelle — la consommation en ml/m² n'est sourcée nulle part.
8. **Emballage grand format** : comment expédier un 100×150 rigide, à quel coût ?

### Pour préparer la V2 (à l'arrivée de la Gongzheng)

9. **Quand arrive-t-elle, et avec quelle table de découpe** pour sortir les formats finis des plaques 2500×1300 ?
10. **Plexi diffusant** : sais-tu l'approvisionner ? As-tu déjà fait du **quadri – blanc – quadri** (Day & Night) ?
11. **Caissons LED** : achat tout fait (313–350 € relevés) ou fabrication maison ? *Détermine la marge du produit signature n°1.*
12. **Encre UV Gongzheng / RKA-3** : prix au litre par couleur, blanc et vernis compris, et consommation de purge. *Aucune donnée publique n'existe.*

---

## 12. Ce qui reste à vérifier

- **Pixum, CEWE, Photobox, Cheerz, Saal Digital, Posterlounge, WhiteWall** n'ont pas pu être relevés (budget de recherche épuisé). Les prix marché reposent sur myposter, LaboPhotos, Artdeqo, Negatif Plus et impression-panoramique. **Seconde passe nécessaire avant de figer la grille publiquement.**
- **Le segment signalétique** (PrintOclock, Realisaprint, Pixartprinting, Helloprint) n'est que partiellement couvert. Si le plancher y est plus bas que les 9,50–10,40 € HT de Veoprint, les marges du rigide sont à revoir.
- **Les tarifs Antalis sont des prix catalogue e-shop**, pas des prix négociés. L'écart mesuré entre distributeurs sur produit comparable (**32–46 % sur le vinyle**) montre le gain possible d'un sourcing sérieux. **Ces coûts sont un plafond, pas une cible.**
- **Igepa et Papyrus**, concurrents directs d'Antalis, n'ont pas été explorés — ce sont eux qui donneraient le meilleur comparatif.
- Bois, moulures d'encadrement et Richardson : **tarifs non publics, devis obligatoire**.

---

*Sources : Antalis e-shop (références SKU citées), Plexi-Cindar, chassis-en-bois.fr, TousLesCadres, Plaqueplastique, Facilembal, Toutembal, Graphic Réseau, Traceur Direct, Euromedia · LaboPhotos, Artdeqo, myposter.fr, Negatif Plus, impression-panoramique.com, COREP, Obiprint, HelloPrint, Popcarte, Mixtiles, Veoprint, Ateliers Cassandre, J'imprime en France, SubliPix, Enseigne Low Cost, Picto Online, Desenio, Cotton Bird, Flexilivre, laphotographiescolaire.fr, clic-et-classe.fr · INSEE · spécifications constructeur Gongzheng et HP. Relevés du 07/08/2026.*
