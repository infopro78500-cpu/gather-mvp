# Roadmap — Usegather

> **Rôle** : ce qui est en cours, ce qui vient, ce qui attend. L'agent **cadrage-produit** est responsable de la tenir à jour. Un item vit dans UNE seule colonne à la fois. Les *pourquoi* vont dans `journal-decisions.md`. Le suivi quotidien (qui fait quoi aujourd'hui) vit dans le **cockpit Notion**, pas ici.

Format : **NOW** (cycle en cours) / **NEXT** (prochain) / **LATER** (plus tard) / **DONE**.

---

## 🔵 NOW — cycle du 04/08/2026 : « brancher la marque, cadrer l'équipe »

- [ ] **[Infra — Nico]** 🔴 **Réattacher les domaines Vercel** — vérifié cassé le 31/08 : `usegather.app` ne répond plus (connexion reset) et `gather-mvp.vercel.app` (QR imprimés) renvoie 404 ; l'app ne tourne que sur `gather-mvp-3tfb.vercel.app`. Le restore de juillet a détaché les domaines. Runbook : `docs/infra-stabilisation-post-restore.md §1`. + vérifier la boîte `contact@usegather.app`
- [ ] **[Marque — Nico]** Nouveau logo : le PNG affiche encore « GATHER » — lockup use+**gather** recommandé
- [x] **[Tech — Nico/Arnaud]** Committer le renommage Usegather — branche `chore/nettoyage-remise-a-niveau` **mergée sur `main`** le 31/08 (fast-forward)
- [ ] **[Pilotage — Nico]** Partager le cockpit Notion aux 4 associés + installer les rituels (matin 2 min, dimanche 10 min, point équipe hebdo 15 min)
- [ ] **[Pilotage — équipe]** Choisir les 3 KPI du cockpit + objectif 90 jours
- [ ] **[Structure — Jérem]** RDV Luxembourg : éligibilité Fit4Start, structure FR-LU, substance (`strategie/briefing-luxembourg.md`)
- [ ] **[Produit — Nico]** Faire valider l'audit impression Printerkut avec l'atelier : grille formats × matières × prix + 10 questions (`strategie/audit-integration-printerkut.md`)

## 🟡 NEXT

- [ ] **[Impression — Nico]** **Présentoir NFC** — fournisseur trouvé (chevalet tag inclus, 7×10 et 7,5×12). Commande passée (50 chevalets NTAG215 à 1,20 $, 8-12 j ouvrés). Reste : **outil et temps d'encodage par pièce** (le seul vrai inconnu, et le levier de marge), verrouillage lecture seule, **gabarit PVC découpé sur la Summa** (18 pièces/passe en moyen, 16 en grand — géométrie en source unique code ↔ fichier de découpe), puis **première série testée** (`strategie/presentoir-nfc.md`)
- [x] **[Produit]** **Galeries par table** — construit le 08/08 en **Option Pro** (activation bêta offerte, datée) : QR par table (`/join?pin=…&table=…`), étiquette de table sur les dépôts, album filtrable par table, messagerie privée aux mariés (mots + 3 photos max, confidentialité serveur, modération), section de gestion sur la page d'édition. Reste : migration SQL à appliquer · test sur un vrai mariage · prix de l'option avec Stripe · présentoirs = N visuels différents par table (`strategie/idee-galeries-par-table.md`)

- [ ] **[Vente — Corentin]** **Pilote B2B club/association** — cadrage complet fait le 09/08 (`strategie/segment-clubs-associations.md`) : la boutique photo du club (commission au club = on absorbe le modèle du photographe de club), galeries par équipe (= galeries par table, déjà codées), droit à l'image des mineurs comme argument de bascule, concours photo déjà en prod. Séquence : trancher le modèle de prix (décision Notion) → LE club via le canal chaud de l'atelier → équiper son prochain événement avec l'existant → mesurer participation + attach-rate. **Ne rien construire avant le pilote.**
- [ ] **[Structure]** Trancher l'immatriculation (LU vs FR) → créer la société + pacte d'associés avec vesting + **cession de la marque INPI à la société** + caler les termes compta/production avec l'atelier (simple structuration — l'accès aux machines est illimité et sans contrainte, ce n'est pas un risque)
- [ ] **[Infra — Jérem/Nico]** 🟠 **Supabase plan Pro** — « grace period is over » constatée le 31/08 (plan gratuit) : risque de coupure de service quand un quota est atteint. Décision déjà actée (`decisions §5`), reste à exécuter. Runbook : `docs/infra-stabilisation-post-restore.md §2`
- [ ] **[Produit]** V1 « lançable » : comptes hôtes, intégration impression Printerkut, paiement, sécurité par événement
- [ ] **[Marketing — Corentin]** Handles `@usegather` + docs/deck passés en Usegather + relance early access
- [ ] **[Finance — Jérem]** Dossiers leviers FR en parallèle : prêt d'honneur, French Tech

## 🟠 LATER

- [ ] Décision EUIPO (~1 050 €) — avant traction hors France
- [ ] Décision pré-vente Ulule
- [ ] Publication stores (l'appId `com.usegather.app` est prêt ; figé à vie après la 1ʳᵉ publication)
- [ ] Campagne « prononciation » (banque de contenu à constituer dès les événements pilotes)
- [ ] V2 : app native aboutie, IA locale (« retrouve les photos où tu apparais »), B2B écoles
- [ ] V3 : multi-verticales, expansion EU, marketplace impression

## ✅ DONE

- [x] **06/08/2026** — Dashboard atelier pro (P0+P1+P2 de l'audit UX) : photo-first (vignettes serveur, mosaïques, cadrage), palette claire actée, recherche/onglets/stats, seuils par matière prêts. Migration vignettes appliquée en prod
- [x] **05/08/2026** — Socle technique impression Printerkut : file d'attente transposée de Renka (lots par matière, claim atomique, cron), catalogue **draft**, dashboard atelier `/atelier`, scripts + doc opérateur. Restent pour ouvrir : grille validée par l'atelier, Stripe devant la file, tunnel photo dans l'app
- [x] **04/08/2026** — Renommage code complet Gather → Usegather (vérifié, `check:release` vert)
- [x] **04/08/2026** — Système de pilotage installé (cockpit Notion équipe + docs pivots + agents)
- [x] **13/03/2026** — Marque « Usegather » **enregistrée** INPI n° 5200774 (déposée 20/11/2025)
- [x] **08/07/2026** — Coûts Supabase maîtrisés (purge cron + préservation, cache URLs signées, miniatures)
- [x] **08/07/2026** — Sécurisation leads + RGPD (fuite colmatée, consentement, vrai email légal)
- [x] **08/07/2026** — Deck v2 honnête (mariage, Printerkut moat, traction réelle)
- [x] **06/07/2026** — Passation technique à Arnaud (main réaligné, dossier technique livré)
