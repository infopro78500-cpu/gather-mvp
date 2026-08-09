# Audit marché & positionnement — Usegather

> **Date** : 09/08/2026 · **Auteur** : session Claude, à valider par l'équipe.
> Méthode : recherche fraîche sur les concurrents réels du partage photo
> d'événement (FR + international), croisée avec la source de vérité
> (`decisions-validees.md`) et le deck honnête (`deck-v2.md`). **Ton = celui du
> deck v2 : aucun claim gonflé.** Ce document est une analyse, pas une décision ;
> les arbitrages qu'il appelle reviennent à Nico (produit/marque) et à l'équipe.

---

## 0. La vérité en un paragraphe

Le partage photo par QR au mariage est devenu un **océan rouge** : une douzaine
d'acteurs, beaucoup **gratuits ou à ~50 € l'événement**, qui font tous « scanne
le QR, sans appli, sans compte ». Les trois cases qu'on mettait en avant —
*sans compte, multi-OS, QR* — ne sont plus des différenciateurs en 2026, ce
sont des **prérequis**. Notre vrai moat n'est pas de laisser partager des
photos : **c'est de posséder la production**. Aucun concurrent n'imprime
réellement les photos des invités ; nous, oui, via un atelier dédié
(Printerkut), et le pipeline est **construit et testé**, pas promis. La bonne
histoire n'est donc pas « une énième appli photo QR », c'est **« l'entreprise
qui transforme un mariage en objets qu'elle fabrique elle-même, à la marge »**.
Corollaire stratégique : le partage doit être **gratuit et généreux**
(acquisition), et le revenu vient de l'impression + l'option Pro + les
présentoirs. C'est exactement la thèse de `decisions-validees.md §4` — et elle
est maintenant **codée**, plus seulement écrite.

---

## 1. Le marché

- **Marché du partage photo mondial** : ~6,1 Md$ en 2026, croissance ~7-8 %/an
  (et non les « ~25 Md$ » du deck, qui mélangeait partage + impression — **à
  corriger dans le deck**). Source : The Business Research Company, 2026.
- **Moteur pertinent pour nous** : « l'expansion des événements, festivals et
  rassemblements » est explicitement citée comme driver — albums collaboratifs,
  murs en direct, dépôts en pic. C'est notre créneau.
- **Beachhead mariage France** : **251 000 unions/an** (INSEE 2025, en hausse
  depuis 2023) — chiffre déjà acté, correct, à garder.
- **Tendance 2026 à connaître** : l'esthétique **« appareil photo jetable
  numérique »** (POV, Lense, Scene, Pix Wedding) explose sur TikTok/Reels. Les
  couples ont « largement abandonné les vrais jetables ». C'est le **canal de
  découverte** du moment — et un angle marketing qui nous manque aujourd'hui.

---

## 2. Le paysage concurrentiel (données réelles, août 2026)

### 2.1 Le partage QR — le cœur encombré

| Acteur | Origine | Prix | Sans appli/compte | Impression **des photos** |
|---|---|---|---|:--:|
| **GuestPix** | US | 49→149 $ one-time | ✅ | ❌ (180+ modèles Canva pour la **signalétique**, pas les tirages) |
| **Fotify** | US/FR | Gratuit → **69 €** | ✅ | ❌ (mur live, RSVP, invitations) |
| **WedShoots** | US | Gratuit | ❌ (appli à télécharger) | ❌ |
| **Kululu** | US | Gratuit | ✅ | ❌ (téléchargement puis « imprimez vous-même ») |
| **POV / Pix Wedding / Scene** | US | Gratuit → faible | ✅ | ❌ (esthétique jetable, mur live) |
| **WeddingPhotoSwap / Guestlense** | US | Faible | ✅ | ❌ |
| **Ceremony App** | US | n.c. | ✅ | ⚠️ revendique « order prints on-demand » — **à vérifier**, très probablement un bouton vers un service tiers, pas un atelier |
| **PhotoSharing.fr** | **FR** | n.c. (freemium) | ✅ | ❌ (diaporama live QR) |
| **BumFot** | **FR** | **Gratuit** | ✅ | ❌ (album collaboratif) |
| **Usegather** | **FR/EU** | freemium + **impression** | ✅ | ✅ **atelier dédié (Printerkut)** |

**Le fait majeur** : sur toute cette liste, **personne n'imprime réellement les
photos des invités**. Ce que les concurrents appellent « prints », ce sont des
**modèles de signalétique** (cartons de table, panneau d'accueil à imprimer
soi-même). Le seul à revendiquer des tirages à la demande (Ceremony) le fait
vraisemblablement en marque blanche d'un tiers — à confirmer, mais aucun n'a
d'**atelier de production en propre**. C'est notre angle, et il tient.

### 2.2 Ce que la concurrence fait **mieux que nous** aujourd'hui

- **Prix d'entrée et gratuité** : beaucoup sont gratuits (BumFot, WedShoots,
  Kululu) ou à ~50 € une fois. On ne pourra **pas** faire payer le partage seul.
- **Découverte / SEO** : PhotoSharing.fr et BumFot **rankent** sur les
  requêtes mariage FR ; nous avons zéro présence.
- **Viralité** : la vague « jetable numérique » leur donne une visibilité
  TikTok/Reels qu'on n'a pas.
- **Applis natives + murs live** : plusieurs ont une appli polie et un mur en
  temps réel (Fotify, POV) ; nous sommes en web (assumé) et sans mur live.

---

## 3. Notre positionnement — recalibré honnêtement

Le deck v2 disait : « le seul à cocher les 5 cases : sans compte + offline +
multi-OS + impression + EU/RGPD ». **À réviser** — en 2026 :

| Case | Statut réel 2026 | Verdict |
|---|---|---|
| Sans compte | Standard (tous le font) | ❌ plus un différenciateur |
| Multi-OS / sans appli | Standard | ❌ plus un différenciateur |
| **Offline-first** (file IndexedDB) | **Rare** | ✅ vrai edge technique, mais valeur d'usage marginale (les salles ont du réseau) |
| **Impression en propre** | **Unique** | ✅✅ **LE moat** |
| **EU / RGPD / hébergement UE** | Rare chez les US | ✅ vrai angle B2B/planners EU |

**Le repositionnement à acter** : on arrête de se vendre comme « une appli de
partage sans compte » (bataille perdue d'avance, gratuite chez les autres) et
on se vend comme **la seule solution qui fabrique les souvenirs physiques du
mariage — et capte la marge parce qu'elle possède l'atelier**. Le partage est
le produit d'appel ; les objets sont le produit.

---

## 4. Forces (réelles, défendables)

1. **Production en propre (Printerkut)** — marge captée, zéro CapEx, et surtout
   des **produits physiques que personne ne peut égaler** économiquement.
2. **Le pipeline d'impression est construit et testé de bout en bout** —
   catalogue, file atelier de qualité industrielle (transposée de Renka),
   présentoirs, voie express. Face à des concurrents « landing page + Stripe »,
   c'est une réalité d'ingénierie, pas une promesse de deck.
3. **Le présentoir de table NFC + galeries par table** — concept neuf, à
   l'économie unitaire saine (consommable **dimensionné par le nombre de
   tables**, non photocopiable). Il transforme le meilleur canal d'acquisition
   (le QR sur la table) en **produit obligatoire et récurrent**.
4. **Le livre d'or imprimé, déjà rempli** — les mots privés aux mariés
   collectés par l'app sont une **matière que personne d'autre ne collecte** :
   un livre d'or arrivé plein, là où le marché (Cotton Bird 49,90 €) vend des
   pages vierges.
5. **Positionnement européen cohérent** — sans compte, RGPD, hébergement UE,
   sans traceur : crédible face aux apps US pour le B2B (planners, écoles).
6. **Équipe complète en sweat equity, capital-efficient, deck honnête, marque
   INPI enregistrée.**

## 5. Faiblesses & risques (à regarder en face)

1. **Le partage est une commodité gratuite** — impossible de le monétiser seul ;
   toute la thèse repose sur l'attache impression (attach rate à prouver).
2. **Zéro traction à l'instant T** — 0 événement actif, données beta en partie
   perdues, aucune preuve d'attach rate impression réelle.
3. **Printerkut = fournisseur unique et informel** (société du frère, contrat
   non formalisé) — c'est à la fois le moat **et** le premier drapeau rouge
   investisseur : concentration + gouvernance. **À dérisquer avant de pitcher.**
4. **Découverte nulle** — pas de SEO, pas de présence sociale, absents de la
   vague « jetable numérique » qui fait la viralité 2026.
5. **Opération de biens physiques = dur** — livraison, retours, SAV, qualité,
   délais jour J : bien plus lourd qu'un SaaS. Le deck sous-estime ce coût.
6. **Fragilité infra** (Supabase free dépassé), **sécurité MVP** (modèle
   device-id, juste durci), **paiement pas branché** (Stripe absent → revenu
   = 0 aujourd'hui), **pré-immatriculation**.

## 6. Recommandations actionnables

1. **Réécrire l'histoire** : le pitch mène avec Printerkut + objets physiques
   (présentoirs, livre d'or, tirages), pas avec les fonctionnalités de partage.
   « De la mémoire à l'objet », pas « une appli photo de plus ». → met à jour
   deck §5 (marché) et §6 (concurrence).
2. **Partage gratuit et généreux** ; monétiser sur impression + option Pro +
   présentoirs. Ne jamais tenter de faire payer le QR de partage.
3. **Surfer la vague « jetable numérique »** — ajouter un mode/esthétique
   jetable comme hameçon marketing (faible effort, forte viralité) : c'est le
   canal de découverte de 2026.
4. **Formaliser Printerkut** (contrat d'appro exclusif / capital) — dérisque le
   point qui est à la fois le moat et le principal risque investisseur.
5. **Prouver l'économie unitaire sur UN vrai mariage** : présentoirs + tirages,
   mesurer l'attach rate et le panier moyen. C'est LE chiffre que veulent les
   investisseurs, et il valide toute la thèse. Avant toute levée.
6. **SEO/contenu mariage FR + canal B2B planners** (angle RGPD/UE) — là où les
   concurrents FR sont déjà installés.
7. **Corriger les chiffres marché du deck** (6 Md$/7-8 % au lieu de 25 Md$) —
   la crédibilité vient de la justesse, pas de la taille annoncée.

---

## 7. Sources

- [The 10 Best Wedding Photo Apps 2026 — POV](https://pov.camera/blog/the-10-best-wedding-photo-apps)
- [GuestPix — Weddings Pricing](https://guestpix.com/weddings-pricing/)
- [12 Wedding Photo Sharing Apps Compared 2026 — EasyWeddingAlbum](https://easyweddingalbum.com/blog/wedding-photo-sharing-comparison)
- [Fotify — Best Wedding Photo Sharing Apps 2026](https://fotify.app/blog/best-wedding-photo-sharing-apps-2026/)
- [PhotoSharing.fr — Application photo mariage](https://www.photosharing.fr/blog/application-photo-mariage)
- [BumFot — Album collaboratif par QR](https://bumfot.fr/partage-photo-mariage)
- [Ceremony App](https://www.ceremonyapp.com/)
- [POV Disposable Camera Review 2026](https://blog.joinmymoment.com/pov-disposable-camera-app-review-2026-insider-insights/)
- [Photo Sharing Market 2026 — The Business Research Company](https://www.thebusinessresearchcompany.com/report/photo-sharing-global-market-report)
- Interne : `decisions-validees.md`, `deck-v2.md`, `strategie/idee-galeries-par-table.md`, `strategie/gamme-produits-impression.md`

> **Note de fiabilité** : prix concurrents relevés en août 2026, susceptibles de
> bouger ; le tarif exact de POP (Party of Pictures) et la nature réelle du
> « print on demand » de Ceremony restent **à confirmer** avant de s'appuyer
> dessus dans un pitch.
