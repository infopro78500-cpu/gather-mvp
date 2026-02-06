# Système de KPI Storage & Usage (source unique : `event_storage_stats`)

## Objectif
Mettre en place un système de KPI **produit** unifié et lisible pour l’admin Gather, en garantissant que **toutes les photos stockées** (web, mobile, legacy) sont comptées et intégrées aux décisions. Ce document est la source de vérité fonctionnelle et technique (définitions + requêtes SQL).  

> Principe fondamental : **toute photo stockée compte**, sans distinction d’origine.  

---

## 1) KPI STORAGE (priorité absolue)

### KPI globaux (cartes)
1. **Fichiers stockés (total)**  
   - Définition : `sum(grand_total_files)`
2. **Volume total stocké (MB)**  
   - Définition : `sum(grand_total_mb)`
3. **Volume moyen par event (MB)**  
   - Définition : `sum(grand_total_mb) / count(distinct event_id where event_id is not null)`
4. **Part du stockage hors events (%)**  
   - Définition : `sum(total_mb where event_id is null) / sum(grand_total_mb)`
5. **Event le plus coûteux**  
   - Définition : event (event_id non null) avec `max(total_mb)`

### Règles d’affichage
- La ligne `event_id IS NULL` est affichée comme : **“Photos hors events (mobile / legacy)”**.
- Cette ligne est **incluse dans les totaux globaux**.

---

## 2) KPI EVENTS (par event)

Pour chaque event (y compris “Photos hors events”) :
1. **Nombre de photos**  
   - Définition : `total_files`
2. **Poids total (MB)**  
   - Définition : `total_mb`
3. **Dernier upload**  
   - Définition : `last_upload_at`
4. **Nombre de contributeurs**  
   - Définition : `contributor_count`
5. **Ratio photos / contributeur**  
   - Définition : `total_files / contributor_count` (si contributor_count > 0)
6. **Statut (actif / fermé)**  
   - Définition : basé sur `events.status` (ou `events.ends_at` si présent)

Cas spécial :
- `event_id IS NULL` → event = **“Photos hors events (mobile / legacy)”**

---

## 3) KPI PRODUIT (usage)

1. **Nombre total d’events**  
   - Définition : `count(*) from events`
2. **Events avec ≥ 1 photo**  
   - Définition : `count(distinct event_id where total_files > 0)`
3. **Events sans photos**  
   - Définition : `events_total - events_with_photos`
4. **Events avec activité récente (30 jours)**  
   - Définition : `count(distinct event_id where last_upload_at >= now() - interval '30 days')`
5. **Moyenne de photos par event**  
   - Définition : `sum(total_files where event_id is not null) / count(distinct event_id)`
6. **Moyenne de photos par utilisateur**  
   - Définition : `sum(total_files) / count(distinct contributor_id)` (si `contributor_id` est exposé)

---

## 4) KPI CONCOURS (si activé)

1. **Events concours actifs**  
   - Définition : `count(*) from events where contest_enabled_at is not null and status = 'active'`
2. **Photos en concours**  
   - Définition : `sum(total_files) for events where contest_enabled_at is not null`
3. **Nombre de votes**  
   - Définition : `count(*) from photo_likes join events on events.id = photo_likes.event_id where contest_enabled_at is not null`
4. **Ratio votes / photos**  
   - Définition : `votes_total / photos_en_concours`
5. **Event concours le plus engageant**  
   - Définition : event (contest_enabled_at not null) avec `max(votes_total)`

---

## 5) Structure du dashboard (ordre strict)

1. **Vue globale**  
   - Storage total (MB)  
   - Fichiers totaux  
   - % mobile / hors events  

2. **Usage events**  
   - Tableau des events (triable par taille, activité, photos)  
   - Ligne spéciale “Photos hors events (mobile / legacy)”  

3. **Engagement**  
   - Photos / contributeur  
   - Votes / photos  
   - Events actifs vs dormants  

4. **Alertes produit**  
   - Events sans photos  
   - Events très lourds  
   - Storage mobile dominant (> X %)  

---

## 6) Règles UX non négociables

- Aucun terme technique (bucket, orphan, uuid) visible.  
- Libellés orientés usage :  
  - ❌ “orphan_files”  
  - ✅ “Photos hors events (mobile / legacy)”  
- Chaque KPI doit répondre à : **“Qu’est-ce que je dois faire avec cette info ?”**

---

## 7) Requêtes SQL (source unique : `event_storage_stats`)

### 7.1 Vue recommandée : `event_storage_kpi_global`
```sql
create or replace view event_storage_kpi_global as
select
  sum(grand_total_files) as total_files,
  sum(grand_total_mb) as total_mb,
  sum(case when event_id is null then total_mb else 0 end) as total_mb_outside_events,
  sum(case when event_id is null then total_files else 0 end) as total_files_outside_events,
  case
    when sum(grand_total_mb) > 0
    then sum(case when event_id is null then total_mb else 0 end) / sum(grand_total_mb)
    else 0
  end as share_outside_events
from event_storage_stats;
```

### 7.2 Vue recommandée : `event_storage_kpi_events`
```sql
create or replace view event_storage_kpi_events as
select
  coalesce(event_id::text, 'OUTSIDE_EVENTS') as event_key,
  coalesce(event_name, 'Photos hors events (mobile / legacy)') as event_label,
  total_files,
  total_mb,
  last_upload_at,
  contributor_count,
  case
    when contributor_count > 0 then total_files::numeric / contributor_count
    else null
  end as photos_per_contributor,
  event_status
from event_storage_stats;
```

### 7.3 KPI Produit (usage)
```sql
select
  (select count(*) from events) as events_total,
  count(distinct event_id) filter (where total_files > 0) as events_with_photos,
  count(distinct event_id) filter (where last_upload_at >= now() - interval '30 days')
    as events_recent,
  case when count(distinct event_id) > 0
    then sum(total_files) filter (where event_id is not null) / count(distinct event_id)
    else 0
  end as avg_photos_per_event
from event_storage_stats
where event_id is not null;
```

### 7.4 KPI Concours (si activé)
```sql
select
  count(*) filter (where contest_enabled_at is not null and status = 'active')
    as contests_active,
  sum(ess.total_files) filter (where events.contest_enabled_at is not null)
    as contest_photos,
  count(photo_likes.id) filter (where events.contest_enabled_at is not null)
    as contest_votes
from events
left join event_storage_stats ess on ess.event_id = events.id
left join photo_likes on photo_likes.event_id = events.id;
```

---

## 8) Règles de calcul (sans ambiguïté)

- **Source unique** : toutes les métriques storage proviennent de `event_storage_stats`.
- **Totaux globaux** : incluent systématiquement la ligne `event_id is null`.
- **Photos hors events** : doit **toujours** être visible en UI (ligne dédiée).
- **Agrégats** : préférer des vues (`event_storage_kpi_global`, `event_storage_kpi_events`) pour éviter toute divergence dans l’app.
- **Arrondis** : afficher les volumes en MB, arrondis à 1 décimale maximum en UI.

---

## 9) Hypothèses produit associées (par KPI)

- **Fichiers stockés (total)** → mesurer la valeur et le coût global du produit.
- **Volume total stocké (MB)** → pilotage des coûts infra + limites futures.
- **Volume moyen par event** → repérer les events lourds, utiles pour segmentation/pricing.
- **Part hors events (%)** → indiquer l’usage mobile/legacy à intégrer dans le roadmap produit.
- **Event le plus coûteux** → identifier les clients/usage à forte valeur ou à risque de coût.
- **Events sans photos** → alerte produit (activation / onboarding).
- **Events activité récente** → santé de l’usage (actifs vs dormants).
- **Photos / contributeur** → engagement collectif réel.
- **Votes / photos** → engagement concours.

---

## 10) Migrations, RLS et appels Supabase (à prévoir)

### Migrations
- Ajouter une migration SQL créant les vues `event_storage_kpi_global` et `event_storage_kpi_events`.

### RLS (si exposition publique)
- Vues réservées à l’admin : politique **read-only** pour le rôle admin.
- Interdire l’accès aux utilisateurs non authentifiés.

### Appels Supabase recommandés (admin dashboard)
- `from('event_storage_kpi_global').select('*').single()`
- `from('event_storage_kpi_events').select('*')`
- `from('events').select('id, status, contest_enabled_at')` (pour enrichir concours si besoin)

---

## 11) Checklist produit (validation)

- [ ] La ligne “Photos hors events (mobile / legacy)” est visible dans le tableau.  
- [ ] Le total global inclut bien les photos hors events.  
- [ ] Les KPI répondent à une question décisionnelle claire.  
- [ ] Le dashboard suit l’ordre strict demandé.  

