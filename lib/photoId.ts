const photoIdCache = new Map<string, string>();

const formatUuid = (bytes: Uint8Array): string => {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

export async function getContestPhotoId(path: string): Promise<string> {
  const cached = photoIdCache.get(path);
  if (cached) return cached;

  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Crypto API indisponible pour générer un identifiant de photo.");
  }

  const data = new TextEncoder().encode(path);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashBytes = new Uint8Array(hashBuffer).slice(0, 16);

  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50;
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80;

  const uuid = formatUuid(hashBytes);
  photoIdCache.set(path, uuid);
  return uuid;
}
