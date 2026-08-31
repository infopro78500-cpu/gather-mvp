# Stabilisation de l'infra prod post-restore (31/08/2026)

> **Rôle** : constat + runbook des deux problèmes d'infrastructure laissés par le restore de juillet 2026. Rien ici n'est une décision produit — ce sont des actions dashboard/facturation à exécuter par Nico (Vercel) et Jérem/Nico (Supabase). Trouvé en session autonome du 31/08 en marge du chantier sécurité.

Le restore de l'incident de juillet (projet gratuit mis en pause) a recréé les projets sous de nouveaux noms — **Vercel : `gather-mvp-3tfb`**, **Supabase : `gather-mvp-restored`** — sans reconnecter ce qui était rattaché à l'ancien. Deux conséquences, toutes deux vérifiées le 31/08.

---

## 1. 🔴 Domaines détachés — l'app n'est joignable que sur l'alias interne

**Constat (requêtes HTTP réelles, 31/08) :**

| URL | Statut | Interprétation |
|---|---|---|
| `https://usegather.app/join` (domaine canonique, décisions §1) | **connexion reset** (000) | domaine **non servi** — pas rattaché au projet, ou SSL non provisionné |
| `https://gather-mvp.vercel.app/join` (cible des **QR imprimés**) | **404** | alias **orphelin** — plus rattaché au projet live |
| `https://gather-mvp-3tfb.vercel.app/join` | **200** ✅ | **le seul endroit où l'app tourne réellement** |

**Impact :** ni la marque (`usegather.app`) ni les QR déjà imprimés (`gather-mvp.vercel.app`) ne mènent à l'app. Le déploiement du 31/08 (fix sécurité `events`) est bien en ligne, mais **uniquement** sur `gather-mvp-3tfb.vercel.app`, que personne n'a imprimé ni partagé. Contredit frontalement une décision actée : *« `gather-mvp.vercel.app` conservé en redirection à vie : les QR déjà imprimés pointent dessus »* (`decisions-validees.md §1`).

**Runbook (Nico — Vercel, ~5 min) :**
1. Vercel → projet **`gather-mvp-3tfb`** → **Settings → Domains**.
2. Ajouter **`usegather.app`** (et `www.usegather.app` si utilisé) → suivre les instructions DNS (chez le registrar du domaine) → attendre la coche verte + le certificat SSL.
3. Ajouter **`gather-mvp.vercel.app`** comme domaine du projet. S'il est réclamé par un ancien projet fantôme non supprimé, le **retirer de l'ancien** d'abord. Le remettre en **redirection 308 → `usegather.app`** (les QR continuent de marcher, l'URL finale devient la marque).
4. Définir **`usegather.app` comme Production Domain**.
5. **Vérifier** : `usegather.app/join` → 200 ; `gather-mvp.vercel.app/<pin>` → redirige vers `usegather.app/<pin>` ; scanner un vrai QR imprimé aboutit au coffre.

> ⚠️ Ne **jamais supprimer** le projet Vercel qui détient l'alias `gather-mvp.vercel.app` (règle CLAUDE.md). Ici il faut au contraire **récupérer** cet alias sur le projet `-3tfb`.

**Filet côté code (optionnel, je peux le faire) :** une redirection canonique dans `proxy.ts` (tout host `*.vercel.app` → même chemin sur `usegather.app`, 308) — utile *une fois les domaines rattachés*, pour que l'alias `-3tfb` et les vieux liens convergent vers la marque. Sans effet tant que les domaines ne sont pas reconnectés, donc **la reconnexion Vercel est le chemin critique**, pas le code.

---

## 2. 🟠 Supabase — période de grâce du plan gratuit terminée

**Constat (31/08) :** bandeau Supabase *« Grace period is over · Your projects will not be able to serve requests when you use up your quota »* + *« Grace period started Jul 30, 2026 »*. Org sur plan **FREE**.

**Impact :** sur le plan gratuit post-grâce, **atteindre un quota (egress, requêtes, stockage) coupe le service** — l'app tombe. C'est exactement le scénario de l'incident de juillet (projet mis en pause, données beta reconstruites), qui se re-profile.

**Ce n'est pas une décision neuve** : elle est déjà actée — *« Offre Supabase payante avant tout lancement sérieux »* (`decisions-validees.md §5`, roadmap NEXT). Le restore a juste remis le compteur du gratuit en route. **Action = exécuter la décision existante.**

**Runbook (Jérem/Nico — facturation) :**
1. Supabase → org `infopro78500-cpu` → **Billing** → passer le projet `gather-mvp-restored` en **Plan Pro** (~25 $/mois de base au moment d'écrire — à revérifier sur la page pricing).
   - Lève la coupure de service liée à la grâce, supprime la mise en pause sur inactivité (la cause de l'incident de juillet), et donne des quotas confortables (stockage/egress/DB) pour les premiers vrais mariages.
2. Vérifier ensuite que le bandeau a disparu et que le projet n'est plus « at risk ».

**Chiffrage rapide pour la décision :** 25 $/mois ≈ le coût rendu de ~20 chevalets NFC, ou la marge d'**un seul** présentoir moyen vendu. Au regard du risque (app qui tombe pendant un mariage payant = réputation détruite sur un produit one-shot non rejouable), le rapport coût/risque ne se discute pas une fois qu'un vrai événement est en jeu.

---

## Résumé décisionnel

| # | Problème | Qui | Effort | Urgence |
|---|---|---|---|---|
| 1 | Domaines `usegather.app` + `gather-mvp.vercel.app` détachés | Nico (Vercel) | ~5 min | 🔴 haute — app injoignable sur les URL publiques |
| 2 | Plan Supabase gratuit, grâce terminée | Jérem/Nico (billing) | ~5 min | 🟠 avant tout vrai événement |

Les deux sont des **actions de console**, pas du développement — d'où ce runbook plutôt qu'un correctif de code.
