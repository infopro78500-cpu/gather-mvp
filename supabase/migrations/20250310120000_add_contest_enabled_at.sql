-- Ajout des métadonnées d'activation du concours
alter table if exists public.events
  add column if not exists contest_enabled_at timestamptz,
  add column if not exists contest_enabled_by uuid;

-- Backfill pour les évènements créés après le 30/01/2026 avec concours activé
update public.events
set contest_enabled_at = coalesce(contest_enabled_at, created_at, now())
where contest_enabled_at is null
  and created_at >= '2026-01-30'::timestamptz
  and contest_enabled = true;

-- Backfill optionnel si un ancien champ is_contest_enabled existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'is_contest_enabled'
  ) THEN
    UPDATE public.events
    SET contest_enabled_at = coalesce(contest_enabled_at, created_at, now())
    WHERE contest_enabled_at is null
      AND created_at >= '2026-01-30'::timestamptz
      AND is_contest_enabled = true;
  END IF;
END $$;
