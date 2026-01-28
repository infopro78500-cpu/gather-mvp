# Analytics report (KPI)

## Prérequis

- Node.js (version alignée avec le repo)
- Dépendances installées :

```bash
npm install
```

## Variables d'environnement

Créer (ou compléter) le fichier `.env.local` **à la racine du repo** avec :

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
# Optionnel si besoin d'accès public
SUPABASE_ANON_KEY=...
```

> Le script charge automatiquement `.env.local` à la racine du repo, même si vous lancez la commande depuis un autre dossier.

## Exécution

```bash
npm run analytics:report
```

## Outputs

- `analytics_output/analysis_table.csv`
- `analytics_output/daily_timeseries.csv`
- `analytics_output/report.md`

## Notes

- Ne commitez jamais `.env.local`.
- L'accès analytics requiert la **service role key** pour interroger la base et le storage.
