-- Audit sécurité 31/08/2026 — storage.objects : restreindre l'upload anonyme au seul
-- bucket event-photos (finding diagnostic pg_policies).
--
-- Constat : 3 policies INSERT sur storage.objects. Une est scopée
-- (`Public upload 1rdror8_0`, check bucket_id='event-photos'), MAIS deux autres sont
-- en `check(true)` (`Public Upload 1io9m69_0`, `Public Upload 13itpk1_0`) → la clé anon
-- publique pouvait déposer des fichiers dans N'IMPORTE quel bucket, y compris les privés
-- `private-notes` et `print-files` (bloat de stockage / injection dans le pipeline d'impression).
--
-- Correctif : on retire les 2 policies `check(true)`. L'upload légitime des invités
-- (client anon → event-photos) reste couvert par la policy scopée conservée. Les uploads
-- vers private-notes / print-files se font en service role (bypass RLS), non concernés.
--
-- NB : si l'exécution échoue pour un souci de privilèges sur storage.objects, faire la
-- même suppression via le Dashboard Supabase → Storage → Policies.

drop policy if exists "Public Upload 1io9m69_0" on storage.objects;
drop policy if exists "Public Upload 13itpk1_0" on storage.objects;
