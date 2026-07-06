export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const PIN_UNIQUE_VIOLATION_CODE = "23505";

export function isPinCollisionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === PIN_UNIQUE_VIOLATION_CODE;
}
