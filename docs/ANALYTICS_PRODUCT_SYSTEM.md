# Analytics produit (Gather)

## 1) Ce que mesure Supabase vs Vercel

**Supabase (source de vérité produit)**
- Tables instrumentées en base via `public.analytics_events` (append-only).
- Triggers automatiques sur `events`, `members`, `photos`, `photo_likes`.
- Vues KPI :
  - `kpi_product_global` : totals + 30 derniers jours (avec séparation concours / hors concours).
  - `kpi_product_timeseries_daily` : tendance quotidienne par type d’évènement.
  - `kpi_product_events` : métriques par event (membres, photos, votes, engagement).

**Vercel (trafic web)**
- Table optionnelle `public.vercel_web_metrics_daily`.
- Sert uniquement à afficher un bloc “Trafic (Vercel)” si des données existent.
- Aucun fetch API Vercel n’est implémenté côté app : l’ingestion se fait via un job externe.

## 2) Alimenter `vercel_web_metrics_daily`

### Via un cron (Vercel Cron / GitHub Actions)
1. Récupérer les stats Vercel via leur API (voir documentation Vercel Analytics).
2. Appeler l’RPC Supabase `public.upsert_vercel_metrics` avec la **service role key**.
3. Exemple de placeholder dans `scripts/vercel-metrics-placeholder.mjs` (à remplacer par l’appel API réel).

Exemple d’appel RPC (pseudo-code) :
```ts
await supabase.rpc("upsert_vercel_metrics", {
  day: "2025-03-20",
  visitors: 1234,
  pageviews: 4321,
  bounce_rate: 0.42,
});
```

**Important** : l’RPC est sécurisée côté DB et n’accepte que `auth.role() = 'service_role'`.

### Mode manuel (debug)
- Utiliser un client Supabase server-side (service role).
- Insérer ou upserter un jour de test, puis vérifier le dashboard admin.

## 3) Interpréter les KPI (usage produit)

- **Events (30j)** : quantité d’évènements créés récemment → mesure la vélocité d’acquisition d’évènements.
- **Photos (30j)** : activité de collecte → détecte l’adoption du partage photo.
- **Membres (30j)** : dynamique de participation → signe de croissance organique.
- **Votes (30j)** : engagement concours → indique l’attractivité des photos.
- **Concours (30j)** : différencie l’impact du mode concours vs usage classique.
- **Tendance quotidienne** : repère les pics/creux d’usage et les effets de lancement.

## 4) Vérifications rapides (SQL)

```sql
select * from public.kpi_product_global;
select * from public.kpi_product_timeseries_daily order by day desc limit 10;
select * from public.kpi_product_events order by created_at desc limit 10;
```
