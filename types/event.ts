export type EventData = {
  id: string;
  name: string;
  pin: string;
  host_device_id?: string | null; // 👈 nouveau champ
};
