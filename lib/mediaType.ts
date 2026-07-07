const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "m4v"];

export function isVideoFilename(name: string | null | undefined): boolean {
  if (!name) return false;
  const ext = name.split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXTENSIONS.includes(ext);
}
