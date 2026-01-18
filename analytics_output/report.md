# Rapport KPI GATHER MVP

## Statut d'exécution
- **Supabase non configuré** : variables `SUPABASE_URL` / `SUPABASE_*KEY` absentes.
- Les fichiers CSV ont été créés, mais sans données réelles.

## Sources attendues
- Table `events`
- Bucket Supabase Storage `event-photos`

## Limites & données manquantes
- Sans accès Supabase, aucun KPI réel ne peut être calculé.
- Les métriques `upload_errors_rate` et `session_completion_rate` nécessitent des logs dédiés.

## Recommandations (schéma, RLS, instrumentation)
- **Table `uploads`** : `id`, `event_id`, `device_id`, `user_id`, `file_path`, `file_size`, `status`, `error_code`, `created_at`.
- **Table `sessions`** : `id`, `event_id`, `device_id`, `started_at`, `ended_at`, `completed`.
- **RLS** :
  - Autoriser `select` en lecture seule pour un rôle analytics.
  - Restreindre `insert` sur `uploads`/ `sessions` aux users authentifiés ou service role.
- **Appels Supabase** :
  - `supabase.from('uploads').insert(...)` lors d'un upload (succès/échec).
  - `supabase.from('sessions').insert(...)` au début d'une session et update à la fin.

## Prochaines étapes
Ajoutez les variables d’environnement Supabase puis relancez :

```bash
node analytics/run_report.js
```
