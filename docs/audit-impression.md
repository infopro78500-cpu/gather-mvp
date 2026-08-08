# Audit de la chaîne d'impression — 08/08/2026

> Périmètre : tout ce qui touche l'impression — catalogue (`lib/print/catalog.ts`),
> file de production (`lib/print/queue.ts`), visuels générés (`artwork.ts`),
> emails (`email.ts`), API commande / atelier / cron (`app/api/print/*`),
> tunnel client (`app/components/print/*`), dashboard atelier, galerie,
> migrations et crons Vercel. Lecture intégrale de chaque fichier.
> Demandé par Nico (« relève les points faibles et améliore »).

## 1. Corrigé dans la foulée (commit du 08/08)

| # | Point faible | Gravité | Correctif |
|---|---|---|---|
| 1 | **Adresse de livraison invisible partout** — stockée en base mais jamais affichée (ni email atelier, ni dashboard) : l'atelier ne pouvait littéralement pas expédier un colis | Bloquant | `listRecentOrders` renvoie `address` + `items` (contenu du colis) ; l'écran « À expédier » affiche 📦 contenu + 📍 adresse + bouton **Copier** (étiquette prête à coller) ; alerte rouge si adresse absente |
| 2 | **Aucun email client** — le tunnel promettait « vous recevrez un email dès l'expédition »… et rien n'existait ; pas de confirmation de commande non plus | Bloquant | `sendCustomerOrderEmail` (confirmation, envoyée en `after()` best-effort) + `sendCustomerShippedEmail` (déclenché par « Marquer expédiée » au dashboard) — la promesse du tunnel se tient |
| 3 | **Bon de tri illisible pour l'atelier** — « forex 30x40 » sans centimètres ni sens d'impression ; le sens (paysage/portrait) n'était transmis nulle part | Important | `pieceLabel()` (« Panneau Forex — 30 × 40 cm ») + colonne **Sens** déduite des pixels de la photo dans l'email de lot |
| 4 | **Fichiers gelés orphelins** — une commande rejetée après copie (résolution insuffisante, échec de mise en file) laissait ses fichiers dans `print-files` pour toujours (la purge ne voit que les lignes en base) | Important | `dropFrozen()` : nettoyage best-effort des chemins copiés sur tout chemin d'échec de la route commande |
| 5 | **Référence de commande à 4 caractères aléatoires** (~1,7 M de combinaisons) — une collision fusionne deux clients dans la même « commande » à l'atelier | Important | 8 caractères issus d'UUID (4,3 G) — le regroupement par `order_ref` redevient sûr |
| 6 | **`dueDate` non bornée** — une date passée déclenchait un lot « URGENT à livrer pour hier », une faute de frappe à +10 ans polluait la voie express | Important | Bornes : refusée si < aujourd'hui−1 j ou > +2 ans |
| 7 | **Tunnel visible alors que la vente est fermée** — en prod (`PRINT_ENABLED` absent), le bouton « Imprimer des photos » menait à une erreur au moment de payer | Important | Flag public `NEXT_PUBLIC_PRINT_ENABLED` : toute l'entrée impression (2 boutons + modale) disparaît tant que la vente n'est pas ouverte |
| 8 | **Aucune protection anti-abus** sur `/api/print/order` (route publique, chaque pièce copie un fichier → coûts storage) | Modéré | Garde par coffre : > 200 pièces / 24 h → 429 (`MAX_PIECES=20` par requête existait déjà) |
| 9 | **`queueStatus()` rapatriait toute la file** pour la compter | Mineur | `count: exact, head: true` + 1 ligne pour la plus ancienne |
| 10 | « Liens valides 7 jours » en dur dans l'email vs `SIGNED_LINK_DAYS` | Mineur | La durée réelle est passée à l'email |

Corrigés lors de la revue adversariale du tunnel (même jour, commit `7b830e6`) :
photo non mesurée affichée « Qualité optimale » et acceptée jusqu'à l'atelier
(filet serveur sharp ajouté), « tout rétablir » qui court-circuitait le contrôle
qualité, remise fantôme sur produits signature, accessibilité de la modale,
contrastes AA, mention livraison France.

## 2. Points solides (à ne pas casser)

- **File de production** : claim conditionnel atomique, rollback complet,
  récupération des zombies (15 min), fichiers figés à la commande, un lot =
  une matière, voie express pour la papeterie datée, purge à 30 j avec lignes
  conservées. C'est le système Renka éprouvé, correctement transposé.
- **RLS service-role-only** sur les deux tables ; buckets privés ; secrets
  dédiés par surface (`ATELIER_SECRET` ≠ `CRON_SECRET`).
- **Contrôle de résolution à trois étages** : client (mesure navigateur),
  API (dimensions transmises), serveur (mesure sharp au gel — fait foi).
- Index en place (`status+created_at`, `order_ref`, `batch_id`, partiel `due_at`).

## 3. Reste à faire — décisions et chantiers

| Sujet | Nature | Note |
|---|---|---|
| **Stripe devant la file** | Chantier n°1 avant ouverture | Règle actée : on ne produit jamais sans encaisser. La route devient création de session ; le webhook `checkout.session.completed` met en file. `paid_at` existe déjà en base. |
| **Tarif de livraison < 79 €** | Décision pricing (Nico + atelier) | Le pied du tunnel dit « hors livraison » ; le montant doit entrer dans `catalog.ts` et le total AVANT Stripe. |
| **Prix de cession atelier** | Attente frère | `costCents` du catalogue = coûts matière estimés, pas la cession. |
| **Rendu des visuels générés sur Vercel** | Vérification | Polices serverless — échantillons à contrôler à l'œil une fois déployé (`PRINT_ARTWORK_OUT=<dir> npx vitest run lib/print/artwork.vitest.ts`). |
| **Orientation par pièce transmise à l'atelier** | Fait partiellement | Le sens est désormais dans l'email (déduit des pixels) ; si un jour le client peut choisir son cadrage, il faudra le stocker en base. |
| **Rate limiting par IP** | Plus tard | La garde par coffre suffit en V1 ; un vrai limiteur (Upstash/Vercel KV) viendra avec l'ouverture publique. |
| **Imposition machine** (N pièces par passe UV) | Question atelier n°9 | Seuils par matière prêts (`PRINT_BATCH_SIZE_<MATIERE>`), valeurs à caler. |

## 4. Règle de lecture

Ce document photographie l'état au 08/08/2026. Toute correction nouvelle passe
par le journal de sessions ; toute décision (port, Stripe, cession) suit la
double écriture `journal-decisions.md` + Notion.
