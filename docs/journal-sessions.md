# Journal de bord — sessions Usegather

> **Rôle** : trace de TOUT ce qu'on fait, session par session (contrairement à `journal-decisions.md` qui ne garde que les décisions structurantes). Sert à retrouver « qu'est-ce qu'on a fait la dernière fois » sans re-scroller une conversation. Entrée la plus récente en haut. Bref, factuel, pas de prose.

---

## Session 05/08/2026 — Accès à distance + commits du rebranding

**Contexte** : mise en place du pilotage de Claude Code depuis le téléphone, puis commit du travail du 04/08 resté en attente.

- **Accès à distance opérationnel** : l'app desktop Claude expose déjà ses sessions à l'app mobile (onglet Code, « Contrôle à distance », point vert = connecté) — aucun montage CLI nécessaire. Conditions : PC allumé (veille Windows !) + app desktop ouverte. En secours, le CLI standalone (`%APPDATA%\Claude\claude-code\<version>\claude.exe`, hors PATH) a été connecté au compte claude.ai (Max) — utile aussi pour `ultrareview`.
- **Commits sur `chore/nettoyage-remise-a-niveau`** (après `check:release`) : rebrand Usegather (app + shells mobiles + logo), migration `middleware.ts` → `proxy.ts` (convention Next 16), système de pilotage (CLAUDE.md, docs pivots, `docs/strategie/`, agents).

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
