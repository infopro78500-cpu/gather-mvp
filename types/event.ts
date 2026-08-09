export type EventData = {
  id: string;
  name: string;
  pin: string;
  // ⚠️ host_device_id / host_user_id sont des JETONS d'organisateur : ils ne
  // sont plus jamais lus côté client (audit 09/08). La comparaison d'identité
  // passe par POST /api/events/[id]/host. Ne pas les remettre dans un select
  // client — la migration column-revoke les rend d'ailleurs illisibles.
  expires_at?: string | null;
  lifetime_days?: number | null;
  contest_enabled?: boolean;
  contest_enabled_at?: string | null;
  contest_enabled_by?: string | null;
  contest_ends_at?: string | null;
  /** Option Pro (chantier mariage) : galeries par table + mots aux mariés. */
  pro_enabled_at?: string | null;
  /** Nombre de tables du mariage — dimensionne QR et présentoirs. */
  table_count?: number | null;
};
