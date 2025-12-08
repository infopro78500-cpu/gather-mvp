const MS_IN_DAY = 24 * 60 * 60 * 1000;

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const parseExpiresAt = (expiresAt: Date | string | null): Date | null => {
  if (!expiresAt) return null;
  const parsed = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const calculateExpiresAt = (
  lifetimeDays: number,
  now = new Date()
): { expiresAt: Date } => {
  const safeDays = Number.isFinite(lifetimeDays) && lifetimeDays > 0
    ? lifetimeDays
    : 1;
  const expiresAt = new Date(now.getTime() + safeDays * MS_IN_DAY);
  return { expiresAt };
};

export const getExpirationInfo = (
  expiresAt: Date | string | null,
  now = new Date()
): {
  isExpired: boolean;
  remainingMs: number;
  remainingLabel: string;
  expiredAtLabel: string;
} => {
  const parsed = parseExpiresAt(expiresAt);

  if (!parsed) {
    return {
      isExpired: false,
      remainingMs: Number.POSITIVE_INFINITY,
      remainingLabel: "Durée indéfinie",
      expiredAtLabel: "Durée d'expiration non définie",
    };
  }

  const diffMs = parsed.getTime() - now.getTime();
  const remainingMs = Math.max(0, diffMs);
  const isExpired = remainingMs === 0;

  let remainingLabel = "Événement terminé";
  if (!isExpired) {
    const remainingHours = remainingMs / (1000 * 60 * 60);
    if (remainingHours < 24) {
      remainingLabel = `Expire dans ${Math.ceil(remainingHours)} heures`;
    } else {
      const remainingDays = remainingMs / MS_IN_DAY;
      remainingLabel = `Expire dans ${Math.ceil(remainingDays)} jours`;
    }
  }

  const expiredAtLabel = `Événement terminé le ${formatDateLabel(parsed)}`;

  return {
    isExpired,
    remainingMs,
    remainingLabel,
    expiredAtLabel,
  };
};
