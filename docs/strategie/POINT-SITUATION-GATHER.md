# Gather — Point de situation & vision

> **Pour qui :** l'équipe qui rejoint l'aventure (Arnaud, Jérem, Corentin) et tout nouvel arrivant.
> **But :** donner en un document toute la photo — d'où on vient, où on en est, où on va, nos forces et nos faiblesses.
> **Mise à jour :** juillet 2026.

---

## 1. La genèse — comment tout a commencé

- **Novembre 2025** — L'idée naît **au retour d'un voyage au Laos** : des centaines de photos éparpillées entre tous les voyageurs, et aucun moyen simple de toutes les rassembler. Frustration vécue → point de départ de Gather.
- **Fin 2025** — Un MVP est construit et **testé en conditions réelles** : anniversaires, mariages, fêtes de fin d'année. **50+ événements créés, 700+ photos.**
- **Début 2026** — Le produit est **amélioré sur les retours des beta testeurs**.
- **Juin–juillet 2026** — Gros chantier de **sécurisation, robustesse, RGPD et maîtrise des coûts** (voir le dossier technique). Arnaud reprend le développement.
- **Leçon marquante (incident Supabase, juillet 2026)** — Le projet, sur l'offre gratuite, a été mis en pause pour inactivité et il a fallu **reconstruire les données**. → Décision : passer sur une offre payante stable avant tout lancement sérieux. (Conséquence : les données beta ne sont plus en ligne — la traction beta reste un **fait**, mais tout est à relancer.)
- **Aujourd'hui (juillet 2026)** — L'équipe se structure (4 associés), le pitch est refondu, et une **stratégie de financement non-dilutif** se met en place (piste Luxembourg / Fit4Start).

---

## 2. Où nous en sommes aujourd'hui

- **Produit** : MVP **fonctionnel en production** (web, iPhone + Android via navigateur). Le cycle complet marche : créer → partager → déposer → télécharger.
- **Équipe** : complète, les 4 fonctions couvertes (voir §9).
- **Traction** : beta validée (50+ événements, 700+ photos), mais **0 utilisateur actif à l'instant T** — phase de relance.
- **Structure** : société **pas encore créée** ; décision d'immatriculation (Luxembourg vs France) en cours.
- **Financement** : objectif **non-dilutif, < 50 k€** pour démarrer (cible Fit4Start & aides luxembourgeoises).

---

## 3. La vision & l'ambition

> **Devenir le standard du partage photo d'événement — et reconnecter le numérique au tirage physique.**

Gather veut être le réflexe simple quand un groupe vit un moment ensemble : un coffre, un QR, tout le monde dépose, tout le monde récupère — **sans compte, sans app obligatoire, sans perte de qualité** — et peut transformer ces souvenirs en **objets imprimés**.

**Ambition long terme :** le « WhatsApp de la photo d'événement », **EU-native** et respectueux des données, avec un modèle rentable là où les autres brûlent du cash (grâce à l'impression intégrée).

---

## 4. Ce que Gather fait déjà — et la suite (V1 / V2 / V3)

### ✅ Ce que Gather fait DÉJÀ (MVP en prod)
- Créer un **coffre événement** (PIN 6 chiffres + QR code)
- **Rejoindre sans compte** (identifiant d'appareil)
- **Galerie partagée** photos **et vidéos** (lightbox, compteur)
- **Upload multi-fichiers**, **capture hors-ligne** + file d'attente + **synchro automatique** au retour du réseau
- **Téléchargement de tout l'album** en ZIP
- **Suppression** (par l'hôte ou par l'auteur de la photo)
- **Expiration** des événements + **purge automatique** du stockage
- **Mode concours** (likes/votes, classement)
- **Sécurité** : bucket privé + URLs signées à expiration
- **Dashboard admin** (leads, KPI) + **fondations RGPD**

### 🔜 V1 — « Lançable publiquement » (prochaine étape)
- **Comptes hôtes** (retrouver ses événements sur tous ses appareils) — remplace l'identifiant d'appareil actuel, falsifiable
- **Intégration impression Printerkut** : commander tirages & albums **depuis l'app**
- **Monétisation branchée** : offre freemium + **paiement** (premium, impressions)
- **Infra stable** (offre Supabase payante)
- **Onboarding & polish UX**, app installable
- **Sécurité complétée** (contrôle d'accès par événement)

### 🔮 V2 — « Différenciation & B2B »
- **App mobile native aboutie** (offline-first complet, notifications)
- **IA sur l'appareil** : reconnaissance faciale (« retrouve les photos où tu apparais »), tri & **albums automatiques** — sans envoyer les visages dans le cloud
- **Offre B2B écoles** (multi-classes, partage parents sécurisé, albums de fin d'année)

### 🚀 V3 — « Expansion »
- **Multi-verticales** : festivals (QR offline, gamification, impression sur place), corporate (branding, analytics), care
- **Expansion européenne**
- **Marketplace d'impression complète** (produits personnalisés)

---

## 5. Où nous voulons être

| Horizon | Objectif |
|---|---|
| **6 mois** (~début 2027) | Société créée, **financement non-dilutif sécurisé** (Fit4Start / aides), **V1 lancée**, premiers **mariages payants** + premières impressions |
| **1 an** (~mi-2027) | Early access transformé en **vrais utilisateurs récurrents**, monétisation impression qui tourne, premiers **pilotes B2B** (écoles/clubs), démarrage V2 |
| **2 ans** (~2028) | **V2** en place (IA, app native, B2B écoles), **début d'expansion européenne**, éventuelle **levée equity** bien valorisée |
| **5 ans** (~2031) | **V3** multi-verticales à l'échelle européenne, Gather = référence du partage photo d'événement |

*Les chiffres d'utilisateurs seront ajoutés une fois la relance lancée — on avance sur des objectifs réalistes, pas des promesses.*

---

## 6. Nos forces & nos faiblesses (en toute lucidité)

### 💪 Forces
- **Un produit qui existe et tourne** (pas une idée sur slide)
- **Beta réelle** déjà passée (50+ événements) → produit validé et itéré
- **Équipe complète** 4 fonctions, **franco-luxembourgeoise** (atout EU)
- **Atout : Printerkut** — partenaire de production d'impression dédié (atelier établi), capacité déjà en place, **zéro CapEx**
- **Capital-efficient** : équipe non salariée au démarrage, **zéro CapEx**
- **Positionnement clair** : sans compte + offline + multi-OS + impression + EU/RGPD (personne ne coche les 5 cases)

### ⚠️ Faiblesses / chantiers ouverts
- **0 utilisateur actif** aujourd'hui — tout est à relancer
- **Pas encore de vrais comptes** ni de **paiement** branché
- **Intégration Printerkut** dans l'app **à construire**
- **App native embryonnaire** — l'offline « vrai » (app fermée) et l'IA en dépendent
- **IA locale** = prototype non déployable en l'état
- **Dépendance Supabase** (passer sur une offre stable = prérequis)
- **Sécurité durcie mais pas complète** (contrôle d'accès storage par événement à affiner)
- **Dette technique** (fichier cœur volumineux à découper)
- **Structure juridique à créer**, **RGPD à faire valider** par un juriste

> Ces faiblesses sont **connues et cartographiées** — c'est une feuille de route, pas des surprises.

---

## 7. Le modèle économique (en bref)

- **Freemium B2C** : coffre gratuit (durée limitée) → conversion **premium** (conservation, quotas, HD)
- **Impression Printerkut** : marketplace de tirages/albums via un **partenaire de production dédié** — Gather encaisse et capte la marge ; chaque événement = un tunnel vers du physique, et le panier **scale avec les invités**
- **B2B (plus tard)** : abonnements écoles, clubs, corporate

**Beachhead : le mariage** (~220 000/an en France) — fort potentiel d'impression, viralité invités.

---

## 8. Prochaines étapes concrètes

- [ ] **RDV Luxembourg** (Jérem & Corentin) : éligibilité Fit4Start, structure juridique FR-LU (voir le briefing dédié)
- [ ] **Créer la société** + pacte d'associés (répartition capital + **vesting**)
- [ ] **Passer l'infra** sur une offre stable (Supabase Pro)
- [ ] **Construire la V1** (comptes hôtes, intégration Printerkut, paiement)
- [ ] **Relancer la traction** (early access, campagne de pré-vente / crowdfunding)
- [ ] **Finaliser le pitch deck** (chiffres, captures, événements démo)

---

## 9. Qui fait quoi

- **Nico — CEO / Fondateur** : à l'origine de l'idée, driver du projet. Apporte l'accès à **Printerkut** (partenaire d'impression dédié). Coup de main au dev.
- **Arnaud — Développeur / Lead technique** : construction et évolution de l'outil.
- **Jérem Bissem — Finance & Juridique** : structuration société, financement, cadre légal.
- **Corentin — Commercial & Marketing** : acquisition, partenariats, go-to-market.

---

*Document vivant — à mettre à jour à chaque étape franchie.*
