# Process de fabrication — impression photo Usegather × Printerkut

> **Public** : l'opérateur atelier (Printerkut) + toute personne qui reprend la production.
> **Statut** : SQUELETTE du 05/08/2026 — le pipeline logiciel est en place (socle), mais les
> sections ⟨À CONFIRMER⟩ attendent les réponses de l'atelier (cf.
> `docs/strategie/validation-gamme-printerkut.docx`) et une demi-journée de réglages sur place.
> Modèle : `process-fabrication.md` de Renka — même atelier, même logique.

---

## 1. Le circuit en une phrase

Le client commande dans Usegather → le logiciel **fige les fichiers de production** (copie des
photos hors du coffre, qui lui expire en 24 h/7 j) → les pièces s'accumulent dans une **file par
matière** → quand un lot est plein (ou trop vieux), l'atelier reçoit **un email** : matière à
charger, liens des fichiers (valides 7 jours), **bon de tri** n° → commande → l'atelier imprime,
trie, emballe, expédie, et marque « imprimé » puis « expédié » sur le **tableau de bord**.

## 2. Ce que l'atelier reçoit

- **Email « 🖨️ Lot photo prêt »** : la matière du lot (une seule par lot), la liste des pièces
  avec lien de téléchargement chacune, le bon de tri (n° de pièce → commande → client → produit/format).
- **Tableau de bord** `https://usegather.app/atelier?cle=…` (lien secret donné par Nico, aucun
  compte) : file en direct par matière, bouton « Forcer l'envoi », lots récents avec fichiers,
  bon de tri imprimable, boutons **Marquer imprimé** / **Marquer expédiée** / **🔁 Remettre en
  file** (retirage d'une pièce ratée). Toutes les actions demandent une confirmation (2 clics).

## 3. Les deux clics qui pilotent tout

1. **« Marquer imprimé »** (par lot) — quand toutes les pièces du lot sont sorties et contrôlées.
2. **« Marquer expédiée »** (par commande) — quand le colis part.

C'est ce qui fait avancer le statut client : en file → en lot → imprimée → expédiée.

## 4. Production par matière ⟨À CONFIRMER — réglages machine⟩

| Matière | Machine | Réglages (profil média, passes, profil couleur) |
|---|---|---|
| Papier photo (rouleau) | HP Latex 700W | ⟨À CONFIRMER⟩ |
| Toile canvas + châssis | HP Latex 700W + montage | ⟨À CONFIRMER — fournisseur châssis, découpe, tension⟩ |
| Forex PVC 5 mm | Mimaki UV | ⟨À CONFIRMER — modèle exact de la machine !⟩ |
| Alu-Dibond 3 mm | Mimaki UV | ⟨À CONFIRMER⟩ |
| Plexi 4 mm | Mimaki UV | ⟨À CONFIRMER — blanc de soutien : fournir le calque, jamais l'auto du RIP (leçon Renka)⟩ |

Règles héritées de Renka (validées sur tirages réels, ne pas rediscuter sans nouveau tirage) :
- fichiers **sans transparence** (aplatis serveur) ;
- **un lot = une matière** — jamais de lot mixte ;
- tout investissement qualité (upscale, etc.) se valide sur un **tirage réel** avant généralisation.

## 5. Découpe, finition, emballage ⟨À CONFIRMER⟩

- Découpe aux formats finis des sorties rouleau : ⟨matériel ? qui ?⟩
- Montage châssis toile : ⟨process ? temps ?⟩
- Contrecollage souple → panneau (grands formats rigides si pas de grande table) : ⟨pratiqué ?⟩
- Emballage : ⟨tubes pour posters ? cartons plats pour panneaux ? coins mousse ?⟩
- Expédition : ⟨transporteur, coûts par gabarit, qui imprime l'étiquette ?⟩

## 6. Cadence et seuils ⟨À CONFIRMER⟩

- **Seuil de lot** actuel : `PRINT_BATCH_SIZE` (défaut 8 pièces) — à caler par matière avec
  l'atelier (l'équivalent photo du « 23 cartes = 1 planche » de Renka, question n°9 de l'audit).
- **Attente max** avant lot partiel : `PRINT_MAX_WAIT_DAYS` (défaut 2 jours) — une petite
  commande d'une matière rare ne reste jamais bloquée.
- Capacité haute saison mariage (mai-sept.) : ⟨pièces/jour ?⟩ — délai de prod cible : ⟨2-7 JO ?⟩

## 7. Incidents

| Incident | Procédure |
|---|---|
| Pièce ratée en machine (glissement, défaut matière) | Dashboard → lot concerné → **🔁 Remettre en file** sur la pièce → elle repart dans le prochain lot de sa matière. |
| Fichier illisible / lien expiré | Les liens email valent 7 jours ; le dashboard re-signe à chaque affichage. Fichier purgé (lot > 30 j) : repasser par une commande neuve. |
| Email non reçu | Le lot existe quand même : tout est au dashboard (badge « Email non parti »). |
| Un correctif logiciel est déployé | **Les fichiers déjà figés ne changent pas** (leçon Renka) : re-tester via une commande neuve, jamais en re-signant l'ancien fichier. |

## 8. Côté logiciel (pour qui reprend la maintenance)

- Migration SQL : `supabase/migrations/20260805120000_add_print_queue.sql` (tables
  `print_queue` / `print_batches` + bucket privé `print-files`) — à coller dans le SQL Editor.
- Source unique produits/prix : `lib/print/catalog.ts` (**DRAFT** tant que la grille n'est pas
  validée par l'atelier). File : `lib/print/queue.ts`. Email : `lib/print/email.ts`.
- Routes : `POST /api/print/order` (fermée tant que `PRINT_ENABLED ≠ 1` ; Stripe passera DEVANT
  la mise en file), `GET /api/print/flush` (cron Vercel 7 h, `CRON_SECRET`),
  `GET|POST /api/print/board` (`ATELIER_SECRET`, distinct du cron).
- Vérification : `node scripts/print/preflight.mjs` · test de bout en bout :
  `node scripts/print/simulate-orders.mjs <eventId> <cheminPhoto>`.
- Env : `PRINT_ENABLED`, `PRINT_BATCH_SIZE`, `PRINT_MAX_WAIT_DAYS`, `PRINT_RETENTION_DAYS`,
  `ATELIER_SECRET`, `RESEND_API_KEY`, `PRINT_EMAIL_TO`, `PRINT_EMAIL_FROM`.

## 9. Ce qui manque avant d'ouvrir aux clients (rappel)

1. Grille formats × matières × **prix validée par l'atelier** (+ prix de cession).
2. **Stripe** devant la mise en file (on ne produit jamais sans encaisser).
3. Tunnel de commande dans l'app (sélection photo → produit → aperçu → panier).
4. Réglages machines capturés (la demi-journée atelier — question n°10).
5. Contrat d'approvisionnement exclusif signé (Jérem).
