# Audit complet Usegather — état consolidé

> **Date** : 09/08/2026 · **Auteur** : session Claude, à valider par l'équipe.
> **Ce document consolide tout** : le produit réellement codé (état factuel du
> dépôt), les trois audits spécialisés (`audit-impression.md`,
> `audit-projet.md`, `audit-marche-positionnement.md`), la vision du Document
> stratégique (juillet 2026), la recherche concurrentielle (août 2026) et la
> source de vérité (`decisions-validees.md`, qui **fait foi** en cas de conflit).
> **Ton = aucun claim gonflé.** C'est un état des lieux, pas une décision.
> Sa valeur propre : il est **ancré dans le code réel**, pas dans les slides —
> ce qui est construit, ce qui est construit mais pas encaissable, ce qui reste.

---

## 0. Synthèse exécutive

**Ce qu'est Usegather.** Une plateforme de collecte photo d'événement (coffre
QR/PIN, dépôt sans compte, éphémère) qui monte un **escalier de segments**
(mariage → clubs/assos → voyages en groupe → écoles → corporate) et se monétise
par **un flywheel d'acquisition + deux moteurs de revenu** :
- **Flywheel** : l'outil gratuit + extensions premium — viral, horizontal, fait
  *entrer* les gens (pas le nerf du revenu).
- **Revenu 1 — impression (Printerkut)** : marge captée, le **moat** (personne
  d'autre n'a d'atelier).
- **Revenu 2 — B2B / B2B2C récurrent** : clubs/écoles/corporate + organisateurs
  (agences voyage/UCPA).

**Où on en est, sans fard.** Le **produit central tourne** (partage, offline,
concours). Toute la **chaîne d'impression et le chapitre mariage sont codés et
testés** — mais **rien n'est encaissable** : Stripe n'est pas branché, donc
revenu = 0 aujourd'hui. **0 utilisateur actif** (données beta perdues, incident
Supabase), phase de relance. La faille de sécurité majeure (jeton hôte lisible)
a été **fermée cette semaine**.

**Les 3 choses qui comptent maintenant** : (1) **brancher Stripe** — sans lui,
aucun des trois moteurs n'existe ; (2) **prouver l'attach-rate impression sur un
vrai mariage** — le chiffre qui valide tout l'édifice ; (3) **passer Supabase en
payant** — prérequis infra. Notre production, elle, est déjà sécurisée :
l'atelier Printerkut est celui du frère de Nico, avec **accès illimité et sans
contrainte aux machines** — un avantage structurel, pas une dépendance.

---

## 1. Le produit — ce qui existe vraiment (état factuel du dépôt)

C'est l'apport unique de cet audit : l'inventaire honnête de ce qui est **codé**,
pas promis.

### ✅ En production (le cœur)
- Coffre **PIN + QR**, dépôt invité **sans compte**, multi-OS web (iPhone/Android)
- **Offline-first** : file d'upload locale (IndexedDB) + reprise auto
- Galerie photos/vidéos, **export ZIP**, suppression, **mode concours** (votes /
  likes / classement)
- **Éphémère** (24 h / 7 j) + préservation opt-in, **purge quotidienne** (cron)
- Sécurité : **bucket privé + URLs signées**, analytics **sans cookie**, hébergé
  UE ; jeton d'organisateur désormais **vérifié serveur** (faille fermée le 09/08)

### 🟡 Codé et testé, mais **pas encaissable** (bloqué sur Stripe / décisions)
- **Chaîne d'impression complète** (qualité industrielle, transposée de Renka) :
  catalogue prix, file atelier (claim atomique, rollback, récupération zombies,
  fichiers figés, lots par matière, **voie express**), **dashboard atelier**,
  emails de lot + bon de tri, **contrôle résolution à 3 étages**
- **Tunnel client d'impression** : support → format → coordonnées, **scène à
  l'échelle réelle** (pièce + canapé), mockups matière, remise volume
- **Chapitre mariage (option Pro)** : **galeries par table** (étiquetage,
  filtre album), **mots privés aux mariés** (confidentialité serveur,
  modération), liens par table
- **Présentoirs NFC par table** : compositeur visuel (photo + « Table N » + QR,
  styles fondu/voile réglables, **photo par table ou commune**), parcours de
  commande (N visuels distincts, **prix au lot**)
- Emails client (confirmation + expédition), adresse de livraison visible atelier

### 🔴 Pas construit (ou embryonnaire)
- **Paiement Stripe** — le blocant n°1 (aucun revenu possible sans lui)
- **Comptes hôtes** (auth réelle organisateur) — partiel ; aujourd'hui = jeton
  d'appareil (MVP)
- **App mobile native** (Capacitor embryonnaire), **mur live**, **IA**
- **Dashboards B2B**, facturation récurrente (le moteur de revenu 2)
- Côté atelier : **encodage NFC + verrouillage** des puces (spécifié, pas outillé)

> **Lecture** : l'écart n'est pas « produit à construire » mais « produit à
> **encaisser et lancer** ». C'est une force (le gros est fait) autant qu'un
> risque (rien n'est prouvé en argent réel).

---

## 2. État technique & sécurité (résumé des audits dédiés)

- **Sécurité — faille majeure fermée (09/08)** : le jeton `host_device_id`
  (preuve d'organisateur) était **lisible par la clé anon** → usurpation
  possible (lire les mots privés, supprimer photos, activer Pro). Corrigé :
  décision serveur + migration column-revoke **appliquée et vérifiée** (401 sur
  les colonnes-jetons). Écritures déjà protégées par RLS. Détail :
  `audit-projet.md`.
- **Chaîne d'impression auditée (08/08)** : 10 points faibles corrigés (adresse
  invisible atelier, emails client absents, bon de tri sans cm/sens, orphelins
  storage, réf. de commande trop courte…). Détail : `audit-impression.md`.
- **Résiduels connus** : jeton d'appareil **non révocable** (vraie auth = chantier
  de fond, requis pour écoles/care) ; **énumération des PINs** (rate-limiting à
  l'ouverture publique) ; **Supabase free dépassé** (upgrade payant **urgent**) ;
  **egress** = vrai poste de coût à surveiller.
- **Qualité** : `check:release` vert, 41 tests. Ingénierie solide, maturité MVP.

---

## 3. Le marché & l'escalier de segments

- **Marché partage photo** : ~6,1 Md$ (2026), ~7-8 %/an (≠ « 25 Md$ » du deck).
- **Escalier de segments** (priorité) :

| Rang | Segment | Modèle | Statut produit |
|---|---|---|---|
| 1 | **Mariage / B2C** (beachhead) | viral + impression | en construction (codé) |
| 2 | **Clubs & associations** | B2B récurrent, **canal chaud** (assos de l'atelier) | NEXT |
| 3 | **Voyages / groupes** | **B2B2C** (organisateur = canal, marque blanche) | LATER (origine Laos) |
| 4 | **Écoles** | B2B, **RGPD = critère d'achat** | LATER (besoin sécurité V1/V2) |
| 5 | Corporate · Festivals | B2B / événementiel | V2/V3 |

- **Beachhead** : **251 000 mariages/an** (INSEE 2025). L'outil est le **même**
  pour tous les segments — le mariage est la porte, pas le plafond.

---

## 4. La concurrence

**Segment mariage B2C — encombré et commoditisé.** GuestPix (49-149 $), Fotify
(69 €), BumFot/WedShoots/Kululu (gratuits), PhotoSharing.fr (FR), + la vague
**« jetable numérique »** (POV, Scene, Pix Wedding) qui fait la viralité TikTok.
« Sans compte + QR + multi-OS » = **prérequis**. **Fait décisif : aucun n'imprime
réellement les photos** (leurs « prints » = signalétique Canva ; seul Ceremony
revendique des tirages, sans doute en marque blanche tierce). **Personne n'a
d'atelier en propre.**

**Autres segments — largement ouverts.** Les concurrents sont quasi tous
mono-segment mariage. Sur **voyage / clubs / écoles**, le combo
**organisateur-comme-canal + sans-compte + RGPD** est un vrai différenciateur,
et la sécurité y est un **critère d'achat**. C'est là que la position est la
plus défendable.

---

## 5. Positionnement — un flywheel, deux moteurs de revenu

- **Flywheel (acquisition/rétention)** : outil gratuit (500 Mo / 7 j / 1 event)
  + **extensions premium** (espace/résolution originale/durée 1 an/multi-event +
  dashboard/perso/port offert). Monétisable (les concurrents le font payer), mais
  assumé comme **acquisition, pas cœur du revenu**. En avance : offline,
  éphémère-par-défaut, UE/RGPD. En retard : appli native, **mur live**, présence
  « jetable ».
- **Revenu 1 — impression** : le moat. Produits physiques inimitables
  (présentoirs NFC, **livre d'or déjà rempli**, tirages, déco murale), pipeline
  **codé**, prix benchmarkés ajustables (pas de CapEx → plus attractif à marge
  égale).
- **Revenu 2 — B2B/B2B2C** : clubs → écoles → corporate + voyages (organisateur =
  canal). Récurrent, gros tickets.

**Formulation à acter** : « La plateforme qui rassemble les photos de
l'événement — et qui, seule, en fait des objets. » Les trois moteurs au pitch.

---

## 6. Modèle économique

| Levier | Rôle | État |
|---|---|---|
| B2C gratuit + **extensions premium** | acquisition & rétention | conçu, **non branché (Stripe)** |
| **Impression Printerkut** | cœur de la marge | **codé**, non encaissable |
| **B2B** (clubs → écoles/corporate) | revenu récurrent / gros tickets | à démarrer |

- **Freemium** : gratuit = 500 Mo / haute qualité web / 7 j / 1 event ; payant =
  espace étendu / résolution originale / 1 an-à vie / multi + dashboard / perso /
  port offert. Anti-abus ~15 Mo/fichier. Modèle « budget Mo ».
- **Garde-fous coût** (déjà en partie codés) : qualité web (pas l'originale),
  purge 7 j, **vignettes + URLs cachées**, fair-use. Pro ~25 $/mois couvre des
  milliers d'events/mois ; au-delà, le volume = revenu qui couvre. **Poste à
  surveiller : egress + abus.**
- **KPI / Gates** (à valider) : V1 upload ≥ 95 %, actifs ≥ 50 %, contributeurs
  ≥ 10 %, join ≤ 10 s ; V2 conversion extension 3-7 %, part « 1 an » mariage
  10-20 %, rétention créateurs ≥ 25 % à 60 j.

---

## 7. Go-to-market (3 moteurs)

1. **B2C viral** — contenu social (démo 10 s), SEO mariage FR, partenariats
   lieux / photographes / DJ / **wedding planners** ; boucle invités → futurs
   hôtes. *(Manque aujourd'hui : SEO nul, absents de la vague « jetable ».)*
2. **B2B2C via organisateurs** — agences voyage / tour-opérateurs / UCPA : un
   partenariat = des centaines de participants, **CAC quasi nul**, marque blanche.
3. **B2B structuré (clubs d'abord)** — pilote → preuve KPI → offre Pro ; **canal
   chaud** : les clients associations de l'atelier partenaire.

---

## 8. Équipe, structure, financement

- **Équipe** : Nico (CEO, produit/marque, accès Printerkut), Arnaud (dev, temps
  partiel), Jérem (finance/juridique, LU), Corentin (commercial, LU). **Franco-
  luxembourgeoise** = atout aides UE. Sweat equity, non salariée au démarrage.
- **Structure — décisions ouvertes** : **immatriculation LU vs FR** (conditionne
  cession de marque, aides, montage Printerkut) ; **pacte d'associés + vesting**
  à caler ; **marque INPI enregistrée** (n° 5200774) au nom de Nico → **cession à
  la société obligatoire** à l'immatriculation.
- **Financement** : **< 50 k€ non-dilutif d'abord** (structuration, acquisition,
  pré-vente, outils). Cible **Fit4Start / aides Luxembourg** (~150 k€ equity-
  free). Equity plus tard, après traction. **Prérequis : Supabase payant.**

---

## 9. SWOT consolidé

**Forces** — produit central en prod + **chaîne d'impression et mariage codés et
testés** (rare à ce stade) ; **moat production en propre — l'atelier du frère,
accès illimité et sans contrainte aux machines, zéro CapEx** (produits physiques
inimitables) ; **trois moteurs cohérents** (acquisition + marge + récurrent) ;
**espace ouvert hors mariage** ; **ADN UE/RGPD = critère d'achat** ; équipe
complète franco-lux ; marque enregistrée.

**Faiblesses** — **0 revenu (Stripe absent)** ; **0 actif** (traction à relancer) ;
UX partage pas best-in-class (pas d'appli/mur live) ; **découverte/SEO nulle** ;
sécurité MVP (jeton non révocable) ; infra fragile (Supabase dépassé).

**Opportunités** — vague « jetable » à surfer (viralité) ; segments voyage/clubs/
écoles peu disputés ; **livre d'or imprimé déjà rempli** (produit unique) ; B2B2C
voyage à CAC quasi nul ; aides non-dilutives LU.

**Menaces** — concurrents gratuits nombreux (mariage) ; **opération physique
lourde** (livraison/SAV/qualité jour J) ; coût egress ; dépendance Supabase ;
RGPD écoles. *(Printerkut n'est pas un risque : atelier du frère, accès illimité
et sans contrainte aux machines — un atout, listé en forces.)*

---

## 10. Risques & atténuation

| Risque | Gravité | Atténuation |
|---|---|---|
| **Aucun revenu tant que Stripe absent** | Bloquant | Brancher Stripe devant impression + premium + B2B |
| **0 traction / attach-rate impression non prouvé** | Élevé | Un vrai mariage pilote, mesurer panier + attach-rate |
| **Supabase free dépassé** | Élevé | Upgrade payant **immédiat** + backups |
| **Sécurité MVP** (écoles/care) | Moyen | Comptes hôtes + accès par événement + DPA avant segment écoles |
| **Egress / abus** (gratuit = gouffre) | Moyen | qualité web + vignettes + purge + fair-use (en partie codé) |
| **Opération biens physiques** | Moyen | Démarrer hands-on, industrialiser au volume |

---

## 11. Recommandations priorisées

### NOW (débloque le revenu)
1. **Brancher Stripe** devant l'impression **et** le premium **et** (à terme) le
   B2B — sans lui, les trois moteurs n'existent pas.
2. **Upgrade Supabase payant** — prérequis infra, non négociable.
3. **Fixer les 2 prix ouverts** : port de livraison (< 79 €) et **prix de
   l'option Pro mariage** (à trancher avec Stripe).

### NEXT (prouve le modèle)
5. **Un vrai mariage pilote** : présentoirs + tirages → mesurer **attach-rate +
   panier moyen**. LE chiffre pour investisseurs.
6. **Un pilote B2B club** via le canal chaud de l'atelier — démarre le 2ᵉ moteur.
7. **SEO/contenu mariage FR** + surfer la vague **« jetable »** (hameçon viral
   faible-effort).
8. **Corriger le deck v2** : Usegather (pas Gather), 251 000, ~6 Md$, et présenter
   **l'escalier de segments + les trois moteurs** (pas seulement mariage+impr.).

### LATER (élargit)
9. **Comptes hôtes / vraie auth** — prérequis du segment écoles (RGPD).
10. **Tester le B2B2C voyage** (agence/UCPA) — démontre l'horizontalité.
11. **Appli native + mur live** — hisse l'UX de partage au best-in-class.

---

## 12. Le chemin critique vers le premier euro

```
Stripe branché        ─┐
Supabase payant       ─┤→ Ouverture vente impression ─→ Mariage pilote ─→ attach-rate prouvé
Prix port + Pro tranchés ┘                                                     │
                                                                              ↓
                                                        Pitch investisseurs armé
```
*(La production n'est pas sur le chemin critique : l'atelier du frère est déjà
disponible, accès illimité et sans contrainte.)*

Tout le reste (B2B, voyage, écoles, appli native, IA) vient **après** ce premier
euro prouvé. La priorité n'est pas de construire plus — c'est **d'encaisser et
de prouver** ce qui est déjà construit.

---

## Documents liés
- Source de vérité : `decisions-validees.md` · Pourquoi : `journal-decisions.md`
- Audits dédiés : `audit-impression.md`, `audit-projet.md`,
  `audit-marche-positionnement.md`
- Vision : Document stratégique (juillet 2026) · Deck : `deck-v2.md`
- Produits : `gamme-produits-impression.md`, `presentoir-nfc.md`,
  `idee-galeries-par-table.md`
