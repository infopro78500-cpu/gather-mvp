-- Refonte photo-first du dashboard atelier (audit docs/audit-ux-atelier.md) :
-- vignettes générées côté serveur au gel du fichier, et traçabilité des
-- retirages. Migration ADDITIVE — le code tolère son absence (colonnes
-- optionnelles retirées à l'insertion si la base n'est pas migrée).

alter table print_queue add column if not exists thumb_path text;
alter table print_queue add column if not exists requeued_from uuid references print_queue(id);
