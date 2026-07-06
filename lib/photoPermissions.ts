export function getUploaderDeviceId(filename: string): string | undefined {
  return filename.includes("__") ? filename.split("__")[0] : undefined;
}

export function canDeletePhoto({
  isHost,
  deviceId,
  uploaderDeviceId,
}: {
  isHost: boolean;
  deviceId: string | null | undefined;
  uploaderDeviceId: string | null | undefined;
}): boolean {
  if (!deviceId) return false;
  if (isHost) return true;
  return uploaderDeviceId === deviceId;
}
