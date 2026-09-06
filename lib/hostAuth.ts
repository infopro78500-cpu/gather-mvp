// Autorité d'identité organisateur (chantier comptes hôtes, phase 2).
//
// Un appelant est l'hôte d'un événement s'il prouve SOIT son compte
// (host_user_id = auth.uid()), SOIT — en transition / fallback pour les coffres
// non encore réclamés — son jeton d'appareil (host_device_id). Un seul suffit.
// La reconnaissance par compte s'AJOUTE au jeton, elle ne le remplace pas : aucun
// hôte existant ne perd l'accès.

export type HostIdentityColumns = {
  host_user_id?: string | null;
  host_device_id?: string | null;
};

export function isEventHost(
  event: HostIdentityColumns | null | undefined,
  deviceId: string | null | undefined,
  userId: string | null | undefined
): boolean {
  if (!event) return false;
  if (userId && event.host_user_id && event.host_user_id === userId) return true;
  if (deviceId && event.host_device_id && event.host_device_id === deviceId) return true;
  return false;
}
