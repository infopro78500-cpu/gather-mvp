export type EventData = {
  id: string;
  name: string;
  pin: string;
  host_device_id?: string | null; // 👈 nouveau champ
  host_user_id?: string | null;
  expires_at?: string | null;
  lifetime_days?: number | null;
};
