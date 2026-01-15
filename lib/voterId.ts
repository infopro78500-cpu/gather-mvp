const STORAGE_KEY = "gather_voter_id";

const readCookieValue = (key: string): string | null => {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const writeCookieValue = (key: string, value: string) => {
  if (typeof document === "undefined") return;

  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${key}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
};

export function getVoterId(): string | null {
  if (typeof window === "undefined") return null;

  let id = window.localStorage.getItem(STORAGE_KEY);

  if (!id) {
    id = readCookieValue(STORAGE_KEY);
  }

  if (!id) {
    id = crypto.randomUUID();
  }

  window.localStorage.setItem(STORAGE_KEY, id);
  writeCookieValue(STORAGE_KEY, id);

  return id;
}
