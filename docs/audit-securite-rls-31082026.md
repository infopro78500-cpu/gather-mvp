# Audit sécurité RLS — 31/08/2026

> **Rôle** : cartographie complète de la posture d'accès aux données (RLS, policies, grants, chemins d'accès app) réalisée en session autonome, dans la foulée du fix d'énumération `events`. Trace ce qui est **corrigé**, ce qui reste **à vérifier en base** (objets hors repo), et la requête diagnostic unique pour trancher. Le *pourquoi* des décisions va dans `journal-decisions.md`.

## Déclencheur

Le Security Advisor Supabase (2 erreurs, 30/08) a mené au fix d'énumération de `events` (policy SELECT `using(true)` → clé anon publique listait tous les coffres + PINs). Ce fix a motivé un **balayage RLS de tout le schéma** : la même classe de bug pouvait exister ailleurs. Elle existait.

## Constat méta important

Le **DDL de base et les policies d'origine** de `events`, `photos`, `members`, `leads_landing`, ainsi que les policies de `storage.objects`, **ne sont pas dans `supabase/migrations/`** (créés à la main / hors repo au démarrage du projet). Le repo ne contient que des `ALTER` et les durcissements récents. **Conséquence : l'état réel de ces objets n'est vérifiable qu'en base** (`pg_policies`), pas dans le code. D'où la colonne « à vérifier » ci-dessous.

## Findings & statut

| # | Sévérité | Objet | Statut | Action |
|---|---|---|---|---|
| — | 🔴 | `events` SELECT `using(true)` (énumération PINs) | ✅ **corrigé** (30/08) | policy droppée + RPC `get_public_event` ; **vérifié en prod** (l'app appelle `rest/v1/rpc/get_public_event`) |
| 5 | 🔴 | **Régression** : routes concours lisaient `events` en anon → cassées par le drop | ✅ **corrigé** (31/08) | `contest/state`, `toggle-like`, `admin/stats` → **service role**. Déploiement requis pour rétablir les votes |
| 2 | 🔴 | `photo_likes` SELECT `using(true)` (fuite inter-coffres des votes + bourrage d'urnes REST) | ✅ **corrigé** (31/08) | migration `20260830160000` verrouille en service-role-only (aucun accès client anon confirmé) |
| 1 | 🟠 | `photos` / `members` : policies inconnues du repo | 🔎 **à vérifier en base** | l'app ne lit JAMAIS ces tables en direct (galerie = 100 % storage) → verrouillables sans risque SI une policy `using(true)` legacy existe |
| 3 | 🟠 | `storage.objects` policy « Public read » (non versionnée) | 🔎 **à vérifier en base** | si `using(true)` non scopée au bucket → anon peut lister/signer `private-notes` et `print-files`. **Ne pas toucher à l'aveugle** (la galerie dépend de cette policy) |
| 4 | 🟡 | Vues `event_storage_kpi_*` lues avec la clé anon (`lib/storageKpis.ts`) | 🔎 à vérifier / à corriger | probablement grantées à anon → stats de stockage lisibles par quiconque a la clé. Basculer sur client admin + revoke |
| 6 | 🟡 | `leads_landing` | ✅ colmaté (07/07) — 🔎 à confirmer | confirmer qu'aucune policy SELECT anon ne subsiste sous un autre nom |
| 7 | 🟡 | `vercel_web_metrics_daily`, `kpi_product_*` lisibles par le rôle `authenticated` inutilisé | à nettoyer (mineur) | revoke `authenticated` |
| 8 | 🟡 | Routes `/api/print/board`,`/flush` hors du matcher Basic Auth (`proxy.ts`) | 🔎 à vérifier | confirmer leur contrôle d'accès propre (atelier) |

**🟢 confirmés sains** : `analytics_events` (RLS ré-activée 30/08), `photo_tables` & `private_notes` (service-role only, lecture host-gated), `print_queue`/`print_batches` (service-role), vue `event_kpi_engagement` (security_invoker), vues `product_kpi_*` (revoke anon), admin Basic Auth (`proxy.ts` couvre `/admin/*` + `/api/admin/*`).

## Requête diagnostic unique (à lancer par Nico dans le SQL Editor)

Elle révèle l'état réel des objets hors repo (findings #1, #3, #6) :

```sql
-- Toutes les policies des schémas public + storage
select schemaname, tablename, policyname, cmd,
       roles::text as roles,
       coalesce(qual, '—')       as using_expr,
       coalesce(with_check, '—') as check_expr
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, cmd;
```

**Lecture des résultats :**
- Toute ligne `cmd=SELECT` + `using_expr=true` + `roles` contenant `anon`/`public` sur `photos`, `members`, `leads_landing` → **même faille que `events`**, à fermer.
- Sur `storage.objects`, repérer la policy « Public read » : si `using_expr` = `true` (ou ne contient pas `bucket_id = 'event-photos'`) → les buckets privés `private-notes` / `print-files` sont exposés. **La corriger en la scopant au bucket `event-photos`** (ne pas la supprimer : la galerie en dépend).

Selon les résultats, je prépare les migrations ciblées (drop/scope des policies fautives). `photos`/`members` : verrouillables en deny-all sans risque (l'app ne les lit jamais). `storage.objects` : à scoper, pas à supprimer.

## Résultat du diagnostic `pg_policies` (31/08) + correctif storage

La requête a été lancée. Verdicts définitifs :

- **`events`** — ne reste que l'INSERT `check(true)` (création de coffre sans compte = voulu). SELECT droppé. 🟢 **propre**.
- **`photos` / `members`** — **aucune policy** + RLS activée (le Security Advisor ne les a jamais signalés « RLS Disabled », seul `analytics_events` l'était) = **deny-all pour anon**. L'app ne les lit jamais en direct. 🟢 **verrouillés** (finding #1 clos).
- **`storage.objects` LECTURE** — policy « Public read » **scopée `bucket_id='event-photos'`** → buckets privés `private-notes`/`print-files` **non lisibles** publiquement. 🟢 (finding #3 = fausse alerte, correctement scopé).
- **`storage.objects` UPLOAD** — 🔴 **finding réel** : 3 policies INSERT, dont **2 en `check(true)`** (`Public Upload 1io9m69_0`, `Public Upload 13itpk1_0`) → anon pouvait déposer dans **n'importe quel bucket** (dont les privés). ➡️ **corrigé** : migration `20260830170000` les supprime ; l'upload invité (client anon → event-photos) reste couvert par la policy scopée `Public upload 1rdror8_0`. Vérifié : les buckets privés ne sont écrits qu'en service role.
- **`vercel_web_metrics_daily`** — SELECT restreint à `auth.role()='authenticated'` (rôle inutilisé par l'app, tout est anon) → 🟡 inoffensif.

**Bilan** : après application de `20260830170000`, tous les `using(true)`/`check(true)` atteignables par anon sont fermés (events, photo_likes, storage upload). Reste seulement du 🟡 cosmétique (rôle `authenticated` inutilisé). **Audit RLS clos.**

## Leçon de session

Le fix `events` a introduit une régression (#5) parce que des **routes serveur lisaient `events` en clé anon** — invisible sans cartographier tous les lecteurs d'une table avant de toucher sa RLS. Règle pour la suite : **avant de modifier la RLS d'une table, lister tous ses lecteurs (client anon ET routes serveur) via `grep from("<table>")`.**
