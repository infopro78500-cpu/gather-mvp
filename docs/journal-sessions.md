# Journal de bord — sessions Usegather

> **Rôle** : trace de TOUT ce qu'on fait, session par session (contrairement à `journal-decisions.md` qui ne garde que les décisions structurantes). Sert à retrouver « qu'est-ce qu'on a fait la dernière fois » sans re-scroller une conversation. Entrée la plus récente en haut. Bref, factuel, pas de prose.

---

## Session 05/08/2026 — Accès à distance + commits du rebranding

**Contexte** : mise en place du pilotage de Claude Code depuis le téléphone, puis commit du travail du 04/08 resté en attente.

- **Accès à distance opérationnel** : l'app desktop Claude expose déjà ses sessions à l'app mobile (onglet Code, « Contrôle à distance », point vert = connecté) — aucun montage CLI nécessaire. Conditions : PC allumé (veille Windows !) + app desktop ouverte. En secours, le CLI standalone (`%APPDATA%\Claude\claude-code\<version>\claude.exe`, hors PATH) a été connecté au compte claude.ai (Max) — utile aussi pour `ultrareview`.
- **Commits sur `chore/nettoyage-remise-a-niveau`** (après `check:release`) : rebrand Usegather (app + shells mobiles + logo), migration `middleware.ts` → `proxy.ts` (convention Next 16), système de pilotage (CLAUDE.md, docs pivots, `docs/strategie/`, agents).

- **Doc de validation pour l'atelier** (`strategie/validation-gamme-printerkut.docx`, 4 p., généré + vérifié via Word) : grille à corriger avec colonne « prix de cession atelier », les 10 questions avec espaces de réponse, section ouverte « ta gamme à toi » — à envoyer au frère de Nico.
- **Audit intégration Printerkut** (`strategie/audit-integration-printerkut.md`) : découverte que l'atelier Renka/Lika-NFC **est** Printerkut → pipeline éprouvé réplicable (file, planches par matière, email atelier, dashboard lien secret, 13 pièges documentés). Benchmark web FR du jour (myposter, Pixum, CEWE, Photobox, Photoweb, WhiteWall) + specs machines (Latex 700W laize 1,63 m ; Mimaki UJF-6042 MkII = rigide ≤ 40×60 sauf grande table JFX à confirmer). Grille V1 proposée : poster / toile / Forex / Dibond / plexi, 6,90 → 69,90 €, dégressif −10 % dès 2 pièces — **à faire valider par le frère** (10 questions, dont machine rigide exacte, albums/tirages hors parc, coûts matière réels). Roadmap NOW + tâche Notion créées.

- **Socle technique impression codé** (« fait tout ce qu'on peut faire » — Nico) : migration `print_queue`/`print_batches` + bucket privé `print-files` (isolé de la purge des coffres), catalogue draft (`lib/print/catalog.ts`, source unique, formats > 40×60 rigides marqués en attente de validation), file transposée de Renka (`lib/print/queue.ts` : claim atomique, rollback, zombies, lots par matière, fichiers figés à la commande), `POST /api/print/order` fermée par `PRINT_ENABLED` (Stripe passera devant), email atelier Resend (bon de tri, liens signés 7 j), dashboard `/atelier?cle=` (compteurs, forcer l'envoi, imprimé/expédié/retirage, bon de tri imprimable), cron `/api/print/flush` (7 h : zombies, lots complets + partiels > 2 j, purge), scripts `preflight`/`simulate-orders`, doc opérateur `process-fabrication-photo.md` (sections ⟨À CONFIRMER⟩). Pas d'imposition (question n°9) ni de paiement (prérequis) — assumé.

- **Migration appliquée en prod** (Nico, via SQL Editor) : tables `print_queue`/`print_batches` + bucket `print-files` vérifiés par preflight ✅. `ATELIER_SECRET` généré et posé en local — **à reporter sur Vercel** (avec `RESEND_API_KEY`/`PRINT_EMAIL_TO`/`PRINT_EMAIL_FROM` le moment venu ; `PRINT_ENABLED` reste éteint).

**Reste à faire (inchangé du 04/08)** : brancher `usegather.app` sur Vercel, nouveau logo, vérifier la boîte mail, partager le cockpit aux 4.

---

## Session 04/08/2026 — Rebranding Usegather + bootstrap du pilotage

**Contexte** : extrait INPI reçu (marque « Usegather » n° 5200774 enregistrée) → topo juridique, renommage, puis audit du système de pilotage Renka et réplication ici.

- **Topo marque** : Usegather enregistrée sans opposition (cl. 9/35/42, expire 20/11/2035, nom propre Nico). « Gather » seul = non protégé + risque tiers + risque de déchéance → bascule décidée.
- **Renommage code complet** (branche `chore/nettoyage-remise-a-niveau`, non commité) : 18 fichiers — UI, métadonnées (title/description/`lang fr`/metadataBase), pages légales & investisseurs, `contact@gather.app` → `contact@usegather.app` (des mails investisseurs partaient vers un domaine qu'on ne possède pas !), appId `com.usegather.app` unifié (Capacitor + Android + iOS), MainActivity déplacée, logo renommé `usegather-logo.png`. Clés localStorage `gather_*` conservées volontairement. `check:release` vert, vérifié dans le navigateur.
- **Avis nom** : 6/10 assumé — faiblesses (prononciation FR, « use » = béquille devenue marque, registre tech) compensables (lockup, QR-first). Concept pub « prononciation » validé comme piste (gag récurrent, chute QR).
- **Audit du pilotage Renka** (Lika-NFC) : cockpit Notion (7 branches, 4 vues, Type Décision) + docs pivots GitHub + agents + double écriture. Leçons : copies hors git dérivent ; le pourquoi au journal ; rituels courts.
- **Bootstrap du système ici** : CLAUDE.md, `docs/` (LIRE-MOI + 4 pivots), `docs/strategie/` (6 docs déplacés), 3 agents, cockpit Notion « 🎯 Usegather — Cockpit projet » + base Tâches partagée équipe (propriété **Qui** ×4) + amorçage 23 tâches/décisions réelles.
- **Améliorations v2 (même session)** : vues 📥 Inbox (capture sans friction, lignes sans branche) et 🗓️ Échéances (calendrier) → 7 vues ; page « 🚀 Bienvenue dans l'équipage » (onboarding 5 min + templates Décision/Tâche à installer par Nico) ; blocs cockpit « 🎯 Objectif 90 j & KPI » (placeholders) et « 🧭 Brief du dimanche » ; **routine planifiée `brief-dominical-usegather`** (dimanche 18 h, locale) : plan de semaine proposé par personne, détection règle des 2 semaines, décision à trancher, audit de cohérence Notion↔journal le 1er dimanche du mois.

**Reste à faire immédiat** : brancher `usegather.app` sur Vercel, nouveau logo, vérifier la boîte mail, partager le cockpit aux 4, committer.
