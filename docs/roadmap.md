# Roadmap — Usegather

> **Rôle** : ce qui est en cours, ce qui vient, ce qui attend. L'agent **cadrage-produit** est responsable de la tenir à jour. Un item vit dans UNE seule colonne à la fois. Les *pourquoi* vont dans `journal-decisions.md`. Le suivi quotidien (qui fait quoi aujourd'hui) vit dans le **cockpit Notion**, pas ici.

Format : **NOW** (cycle en cours) / **NEXT** (prochain) / **LATER** (plus tard) / **DONE**.

---

## 🔵 NOW — cycle du 04/08/2026 : « brancher la marque, cadrer l'équipe »

- [ ] **[Marque — Nico]** Brancher `usegather.app` en domaine principal sur Vercel (l'ancien redirige, les QR imprimés survivent) + vérifier la boîte `contact@usegather.app`
- [ ] **[Marque — Nico]** Nouveau logo : le PNG affiche encore « GATHER » — lockup use+**gather** recommandé
- [ ] **[Tech — Nico/Arnaud]** Committer le renommage Usegather (branche `chore/nettoyage-remise-a-niveau`)
- [ ] **[Pilotage — Nico]** Partager le cockpit Notion aux 4 associés + installer les rituels (matin 2 min, dimanche 10 min, point équipe hebdo 15 min)
- [ ] **[Pilotage — équipe]** Choisir les 3 KPI du cockpit + objectif 90 jours
- [ ] **[Structure — Jérem]** RDV Luxembourg : éligibilité Fit4Start, structure FR-LU, substance (`strategie/briefing-luxembourg.md`)
- [ ] **[Produit — Nico]** Faire valider l'audit impression Printerkut avec l'atelier : grille formats × matières × prix + 10 questions (`strategie/audit-integration-printerkut.md`)

## 🟡 NEXT

- [ ] **[Structure]** Trancher l'immatriculation (LU vs FR) → créer la société + pacte d'associés avec vesting + **cession de la marque INPI à la société**
- [ ] **[Tech]** Supabase offre payante (prérequis relance — leçon incident juillet)
- [ ] **[Produit]** V1 « lançable » : comptes hôtes, intégration impression Printerkut, paiement, sécurité par événement
- [ ] **[Juridique]** Formaliser le contrat d'approvisionnement exclusif Printerkut (avant de pitcher)
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

- [x] **05/08/2026** — Socle technique impression Printerkut : file d'attente transposée de Renka (lots par matière, claim atomique, cron), catalogue **draft**, dashboard atelier `/atelier`, scripts + doc opérateur. Restent pour ouvrir : grille validée par l'atelier, Stripe devant la file, tunnel photo dans l'app
- [x] **04/08/2026** — Renommage code complet Gather → Usegather (vérifié, `check:release` vert)
- [x] **04/08/2026** — Système de pilotage installé (cockpit Notion équipe + docs pivots + agents)
- [x] **13/03/2026** — Marque « Usegather » **enregistrée** INPI n° 5200774 (déposée 20/11/2025)
- [x] **08/07/2026** — Coûts Supabase maîtrisés (purge cron + préservation, cache URLs signées, miniatures)
- [x] **08/07/2026** — Sécurisation leads + RGPD (fuite colmatée, consentement, vrai email légal)
- [x] **08/07/2026** — Deck v2 honnête (mariage, Printerkut moat, traction réelle)
- [x] **06/07/2026** — Passation technique à Arnaud (main réaligné, dossier technique livré)
