# USEGATHER — Deck v2 (trame Gamma)

> Version reconstruite le 8 juillet 2026, **révisée le 09/08/2026** sur l'audit consolidé (`strategie/audit-complet-usegather.md`) : rebranding **Usegather**, escalier de segments + trois moteurs, concurrence honnête, état « codé mais pas encaissable ».
> `[à compléter]` = info que seul toi peux remplir. Slides passées de 26 → ~15 + annexes.

**À figer partout :** marque publique = **Usegather** (jamais « Gather » seul) · partenaire de production = **Printerkut** (jamais « PrintKut »).

---

## 1. COUVERTURE
**USEGATHER — La photo qui rassemble**
Collaboration · Hors-ligne · Impression · *IA (à venir)*

---

## 2. PROBLÈME
*Le partage photo actuel frustre au quotidien.*

- **Compression** — Les photos perdent en qualité lors du partage
- **Comptes obligatoires** — Créer un compte sur chaque plateforme
- **Incompatibilité iPhone/Android** — Partage galère entre systèmes
- **Réseau saturé** — Impossible de partager sans connexion stable
- **Souvenirs dispersés** — Chacun a ses photos, personne ne les a toutes

---

## 3. WHY NOW (pourquoi maintenant) 🆕
- **Le smartphone a gagné, le partage a perdu** — On shoote en pro, mais partager reste aussi pénible qu'il y a 10 ans
- **Ras-le-bol des géants** — Méfiance envers le cloud US → appétit pour une alternative européenne, sans compte
- **Le QR code est entré dans les mœurs** — Plus besoin d'expliquer « scannez pour rejoindre »
- **Le tirage papier renaît** — Le tangible redevient désirable dans un monde tout-numérique
- **Le mariage se « photographise » à outrance** — ~220 000/an en France, des centaines de photos par invité, zéro solution qui rassemble **et** imprime

> 🎯 **Genèse (accroche orale du pitch)** : idée née en **novembre 2025 au retour d'un voyage au Laos** — des centaines de photos éparpillées entre tous les voyageurs, aucun moyen simple de les rassembler. Usegather est né d'une frustration vécue.

---

## 4. SOLUTION + DÉMO PRODUIT
*Un parcours simple, du premier scan au tirage.*

1. **Créer un coffre** — Initiez votre espace photo partagé
2. **Rejoindre via QR** — Scannez pour accéder instantanément
3. **Ajouter, même hors ligne** — Capturez sans connexion, rien ne se perd
4. **Sync automatique** — Envoi dès que le réseau revient
5. **Galerie partagée** — Toutes les photos au même endroit, en qualité originale
6. **Télécharger & imprimer** — Album complet en un clic, tirages Printerkut

> **[à ajouter : 2-3 captures du vrai MVP]** — création de coffre, écran QR, galerie. Le produit tourne en prod : le montrer vaut 3 slides de concept.

---

## 5. MARCHÉ — un escalier de segments 🆕
*Le partage fait entrer les gens ; l'impression et le B2B font le revenu.*

- **TAM** — Marché du partage photo mondial : **~6 Md$ (2026), +7-8 %/an** (source : The Business Research Company, 2026). Driver cité : événements & rassemblements.
- **SAM** — Partage + impression d'événement en Europe.
- **SOM — Beachhead mariage France** — cible atteignable à 3 ans.

**L'escalier de segments** (un même outil, plusieurs marchés) :
1. **Mariage / B2C** (départ) — viral, fort panier impression
2. **Clubs & associations** — récurrent, canal chaud (assos de l'atelier)
3. **Voyages / groupes organisés** — **B2B2C**, l'organisateur = canal (origine : le Laos)
4. **Écoles** — RGPD = critère d'achat · puis **Corporate · Festivals**

**Le calcul (à valider) :**
```
251 000 mariages/an en France (INSEE 2025)
  × 3 % capturés à 3 ans      → ~7 500 événements
  × revenu moyen/événement    → extensions premium + panier impression
```
**⚡ Effet démultiplicateur** : chaque mariage = 80-150 invités → chacun commande SES tirages → le print scale avec les invités, pas seulement l'hôte.

---

## 6. CONCURRENCE — honnête 🆕
*Commoditisé sur le mariage ; ouvert partout ailleurs.*

Le partage QR mariage est un **océan rouge** : GuestPix (49-149 $), Fotify (69 €), BumFot/WedShoots (gratuits), PhotoSharing.fr (FR), + la vague « appareil jetable numérique » (POV, Scene). « Sans compte + QR + multi-OS » n'est plus un différenciateur, c'est un **prérequis**.

| | Sans compte | Offline | **Impression des photos** | EU / RGPD |
|---|:--:|:--:|:--:|:--:|
| Google Photos / clouds US | ❌ | ❌ | ❌ | ❌ |
| Messageries (WhatsApp…) | ✅ | ❌ | ❌ | ⚠️ |
| Apps mariage (GuestPix, Fotify, BumFot…) | ✅ | ⚠️ | ❌ *(signalétique Canva, pas les tirages)* | ⚠️ |
| **USEGATHER** | ✅ | ✅ | ✅ **(atelier Printerkut)** | ✅ |

> **Le fait décisif** : **aucun concurrent n'imprime réellement les photos des invités** — personne n'a d'atelier en propre. Et ils sont **quasi tous mono-segment mariage B2C** : sur voyage / clubs / écoles, le combo *organisateur-comme-canal + sans-compte + RGPD* est un vrai différenciateur, pas un prérequis. **Notre moat = la production en propre ; notre espace ouvert = tout ce qui n'est pas le mariage.**

---

## 7. BUSINESS MODEL — un flywheel, deux moteurs de revenu
*Là où les autres brûlent du cash, on gagne de l'argent.*

- **🔁 Flywheel — B2C gratuit + extensions premium** — fait *entrer* les gens (viral : 1 événement = plusieurs utilisateurs). Acquisition & rétention, **pas le nerf du revenu**.
- **💰 Revenu 1 — Impression Printerkut** — cœur de la marge, via un **partenaire de production dédié** (le moat).
- **💰 Revenu 2 — B2B / B2B2C récurrent** — clubs → écoles → corporate, + organisateurs voyage (agences/UCPA : un deal = des centaines de participants).

> « Le B2C viral fait entrer les gens ; l'argent vient de **l'impression et du B2B**. » Ni l'outil seul, ni l'impression seule, ni le B2B seul — **la défense vient de l'empilement des trois**.

**L'atout Printerkut :**
- **Partenaire de production dédié** — Atelier d'impression établi, capacité déjà en place
- **Zéro CapEx** — Aucun investissement machines à financer
- **Marge captée** — Usegather encaisse et paie la production au coût
- **Livraison offerte** (premium) · **Prix dégressifs**

### Offre GRATUITE
Coffres gratuits · quotas photos/vidéos · durée définie (puis nettoyage auto) · partage illimité sans compte · accès impressions Printerkut

### Offre PREMIUM
Conservation longue durée · quotas étendus · téléchargement HD · albums PDF + tirages (livraison offerte) · *IA avancée (à venir)*

> Le levier gratuit/payant = **rétention + quotas** (pas les Go bruts).

---

## 8. VERTICALES — l'escalier de segments
- **🎯 Mariage / B2C (départ)** — panier impression élevé, viralité invités, colle à Printerkut
- **Clubs & associations** — récurrent, faible friction, **canal chaud** (clients assos de l'atelier)
- **Voyages / groupes organisés (B2B2C)** — l'organisateur (agence, tour-opérateur, UCPA) = canal : **un partenariat = des centaines de participants**, CAC quasi nul, marque blanche
- **Écoles** — la **sécurité/RGPD y est un critère d'achat**, pas un bonus · puis **Corporate · Festivals**

> Une verticale approfondie convainc plus que six survolées — mais le **même outil** les sert toutes. Le mariage est la porte d'entrée, pas le plafond.

---

## 9. OÙ EN EST-ON — beaucoup construit, à encaisser
**CE QUI EST DÉJÀ FAIT (codé, en dépôt)**
- **Produit central en production** — coffre PIN/QR, dépôt sans compte, offline + sync, galerie, export ZIP, **mode concours**, éphémère + purge
- **Chaîne d'impression complète, codée et testée** — catalogue, file atelier de qualité industrielle, dashboard atelier, tunnel client (aperçu à l'échelle réelle), contrôle résolution
- **Chapitre mariage** — **galeries par table**, **mots privés aux mariés** (confidentialité serveur), **présentoirs NFC par table** (visuel photo + QR, commande N tables)
- **Sécurité durcie** — bucket privé, URLs signées ; faille du jeton d'organisateur **fermée le 09/08**
- **Équipe complète** + **atelier Printerkut opérationnel**

**LA VÉRITÉ SANS FARD**
- **Rien n'est encore encaissable : Stripe n'est pas branché → revenu = 0.**
- **0 utilisateur actif** (données beta perdues, incident Supabase) — phase de relance.
- L'écart n'est pas « produit à construire » mais « produit à **encaisser et prouver** ».

**PROCHAINE ÉTAPE (le chemin critique)**
- Brancher Stripe · Supabase payant · formaliser Printerkut · **1 mariage pilote → prouver l'attach-rate impression**

> Traction honnête = pas de vanity metrics. Beta 2025 : 50+ événements, 700+ photos (données ensuite perdues). Aujourd'hui : 0 actif, assumé.

---

## 10. ROADMAP ⚠️ dates réalignées
- **Maintenant (2026)** — MVP web en prod · sécurité durcie · offline + sync · early access
- **Fin 2026 – 2027** — App mobile native · comptes hôtes · premiers B2B écoles/clubs · IA reconnaissance faciale
- **2027 – 2028** — Festivals & corporate · expansion européenne · impression intégrée
- *(objectifs utilisateurs = cibles, pas acquis)*

---

## 11. ÉQUIPE 🆕
*Les 4 fonctions clés couvertes dès le jour 1.*

- **Nico — CEO / Fondateur** — À l'origine de l'idée, au cœur du projet pour le driver. Apporte l'accès à **Printerkut**, partenaire de production d'impression dédié (atelier établi), déjà prêt à absorber les commandes Gather. Donne un coup de main au dev.
- **Arnaud — Développement produit** — Construction et évolution de l'outil
- **Jérem Bissem — Finance & Juridique** — Structuration société, financement, cadre légal
- **Corentin — Commercial & Marketing** — Acquisition, partenariats, go-to-market

> **💡 Atout** : une startup photo avec un **partenaire d'impression dédié déjà opérationnel** — la capacité de monétisation physique existe dès le jour 1.

---

## 12. FINANCEMENT — capital-efficient
**Une structure de coûts ultra-légère**
- **Équipe engagée, non salariée au démarrage** — conviction, pas de burn salarial initial
- **Zéro CapEx matériel** — la production passe par un partenaire d'impression déjà opérationnel
- **Infra low-cost** — stack web managé (Supabase / Vercel)

**Besoin de départ : < 50 k€ non-dilutif** `[à affiner]`
Usage des fonds :
- Structuration société (Luxembourg + établissement France) & juridique
- Acquisition / marketing — premiers mariages
- Campagne de pré-vente (crowdfunding récompense)
- Outils & hébergement (Supabase Pro, domaine…)

**Cible : Fit4Start / aides non-dilutives** (jusqu'à ~150 k€ equity-free) `[à confirmer]`

> Tours en equity plus tard, mieux valorisés (après traction early access). Ancienne trame « 80/200/300 k€ Milestone X2/X5/X12 » retirée (peu lisible, pré-dilution prématurée).

---

## 13. VISION DE SORTIE
**Usegather devient le WhatsApp de la photo d'événement.**
Objectif ambitieux `[cadrer : France → Europe d'abord]`

---

## 14. CONTACT / EARLY ACCESS
Rejoignez l'aventure Usegather
`[Nico — email réel]` · `[www.gather.app existe-t-il ?]` · `[LinkedIn]`
QR → Early Access

---

# ANNEXES (pour la due diligence, hors flux principal)

## A1. ARCHITECTURE ⚠️ corrigé (était faux)
- **Application web** — Next.js + React, tout navigateur iPhone & Android
- **Backend Supabase** — Postgres + Auth + Storage managés (pas de serveur à maintenir)
- **Stockage sécurisé UE** — Bucket privé, URLs signées à expiration, eu-west-1
- **Offline-first** — File d'attente locale (IndexedDB) + sync automatique
- **App mobile native** — *en cours* (Capacitor)

> Ancien deck disait « React Native + Node.js API » : faux. Le vrai stack (web + Supabase) = MVP livré vite et pas cher = une force.

## A2. SÉCURITÉ ⚠️ corrigé (2 claims faux retirés)
- **Accès par code PIN** — Chaque coffre protégé par un code
- **Chiffré en transit et au repos** — HTTPS + chiffrement du stockage *(et non « de bout en bout »)*
- **Stockage en Europe** — Serveurs UE
- **URLs privées à expiration** — Fini les liens photo publics permanents
- **Sans pub ni traceur tiers** — Analytics sans cookie
- **Fondations RGPD** — Politique de confidentialité + mentions légales *(finalisation juridique en cours)*

> Retirés : « chiffrement de bout en bout » (incompatible avec l'accès sans compte), « conformité RGPD totale » (pas validée juridiquement), « IA locale sans cloud » (→ roadmap), « identifiant appareil = clé sécurisée » (le deviceId sert à gérer ses photos sans compte, ce n'est pas un dispositif de sécurité).

---

## Reste à compléter
- [x] Printerkut = partenaire de production (société du frère) ; **à formaliser** (contrat/capital) avant de pitcher
- [x] Jérem Bissem (Finance & Juridique)
- [x] Traction beta : 50+ événements, 700+ photos (anniversaires/mariages/fêtes) — **chiffres à figer** (partie perdue lors de l'incident Supabase ? afficher le nombre défendable)
- [ ] **Stratégie de financement + acquisition** — chantier dédié à travailler ensemble
- [ ] Montant de la levée visé + usage des fonds
- [ ] Email de contact, domaine, LinkedIn
- [ ] 2-3 captures du MVP pour la slide Solution
- [ ] Créer 1-2 événements démo « vitrine » (données fraîches, belles photos) + `preserve_photos = true` en base → jamais purgés, prêts pour une démo live investisseur
- [ ] Sourcer les chiffres marché (INSEE mariages, marché impression photo)
- [ ] **Cadrer répartition du capital + vesting** entre les 4 associés (contribution en sweat equity, pas en cash → à documenter pour éviter tout conflit futur) — Jérem
- [ ] Décision pays d'immatriculation (Luxembourg vs FR) + montage transfrontalier — RDV Luxembourg
