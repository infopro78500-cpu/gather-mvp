// lib/deviceId.ts

export function getDeviceId(): string | null {
  // Sécurité : en SSR (côté serveur) il n'y a pas de window
  if (typeof window === "undefined") return null;

  const STORAGE_KEY = "gather_device_id";

  let id = window.localStorage.getItem(STORAGE_KEY);

  if (!id) {
    // Génère un identifiant unique pour ce téléphone
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return id;
}
