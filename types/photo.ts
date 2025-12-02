export type Photo = {
  name: string;
  url: string;
  path: string;
  uploaderDeviceId?: string; // 👈 important (optionnel)
};
