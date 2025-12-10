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
  statusLabel: string;
  expiredAtLabel: string;
  diffDays: number;
} => {
  const parsed = parseExpiresAt(expiresAt);

  if (!parsed) {
    return {
      isExpired: false,
      remainingMs: Number.POSITIVE_INFINITY,
      remainingLabel: "Durée indéfinie",
      statusLabel: "Durée indéfinie",
      expiredAtLabel: "Durée d'expiration non définie",
      diffDays: Number.POSITIVE_INFINITY,
    };
  }

  const diffMs = parsed.getTime() - now.getTime();
  const remainingMs = Math.max(0, diffMs);
  const diffDays = Math.ceil(diffMs / MS_IN_DAY);
  const isExpired = diffMs < 0;

  let statusLabel: string;
  if (diffDays < 0 || isExpired) {
    statusLabel = "Coffre expiré";
  } else if (diffDays === 0) {
    statusLabel = "Expire aujourd’hui";
  } else if (diffDays === 1) {
    statusLabel = "Expire dans 1 jour";
  } else {
    statusLabel = `Expire dans ${diffDays} jours`;
  }

  const expiredAtLabel = `Coffre expiré le ${formatDateLabel(parsed)}`;

  return {
    isExpired,
    remainingMs,
    remainingLabel: statusLabel,
    statusLabel,
    expiredAtLabel,
    diffDays,
  };
};
