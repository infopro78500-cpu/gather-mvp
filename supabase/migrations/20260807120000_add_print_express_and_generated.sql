-- Voie express et pièces à visuel généré (docs/strategie/gamme-produits-impression.md §10.1).
--
-- Deux limites du pipeline se croisent sur le même parcours, celui de la
-- papeterie du jour J :
--  1. un présentoir ou un panneau commandé pour un mariage samedi ne peut pas
--     attendre que 7 autres clients commandent la même matière → `due_at`
--     sort la pièce de la logique de seuil ;
--  2. ces pièces ne naissent PAS d'une photo du coffre (il est encore vide au
--     moment de la commande) : le visuel est composé par l'app → `source_path`
--     devient nullable.

alter table print_queue add column if not exists due_at timestamptz;
alter table print_queue alter column source_path drop not null;

-- Sélection de la file express : les pièces datées, les plus urgentes d'abord.
create index if not exists print_queue_due_idx
  on print_queue (due_at)
  where due_at is not null;

-- Échéance la plus proche du lot, pour afficher l'urgence au tableau de bord
-- sans charger le détail des pièces.
alter table print_batches add column if not exists due_at timestamptz;
