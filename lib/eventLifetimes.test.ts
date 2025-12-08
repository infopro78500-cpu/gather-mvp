import { strict as assert } from "node:assert";
import test from "node:test";

import { calculateExpiresAt, getExpirationInfo } from "./eventLifetimes";

test("calculateExpiresAt ajoute le bon nombre de jours", () => {
  const now = new Date("2024-01-01T00:00:00Z");
  const { expiresAt } = calculateExpiresAt(7, now);

  assert.equal(expiresAt.toISOString(), "2024-01-08T00:00:00.000Z");
});

test("getExpirationInfo retourne le label en heures sous 24h", () => {
  const now = new Date("2024-01-01T00:00:00Z");
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

  const info = getExpirationInfo(expiresAt, now);
  assert.equal(info.isExpired, false);
  assert.equal(info.remainingLabel, "Expire dans 6 heures");
});

test("getExpirationInfo détecte un événement expiré", () => {
  const now = new Date("2024-01-02T00:00:00Z");
  const expiresAt = "2024-01-01T00:00:00Z";

  const info = getExpirationInfo(expiresAt, now);
  assert.equal(info.isExpired, true);
  assert.equal(info.remainingMs, 0);
  assert.ok(info.expiredAtLabel.includes("01/01/2024"));
});
