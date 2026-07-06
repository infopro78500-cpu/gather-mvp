import { strict as assert } from "node:assert";
import { test } from "vitest";

import { calculateExpiresAt, getExpirationInfo } from "./eventLifetimes";

test("calculateExpiresAt ajoute le bon nombre de jours", () => {
  const now = new Date("2024-01-01T00:00:00Z");
  const { expiresAt } = calculateExpiresAt(7, now);

  assert.equal(expiresAt.toISOString(), "2024-01-08T00:00:00.000Z");
});

test("getExpirationInfo arrondit le nombre de jours restants", () => {
  const now = new Date("2024-01-01T00:00:00Z");
  const expiresAt = "2024-01-04T06:00:00Z"; // 3,25 jours -> arrondi à 4

  const info = getExpirationInfo(expiresAt, now);
  assert.equal(info.isExpired, false);
  assert.equal(info.remainingLabel, "Expire dans 4 jours");
  assert.equal(info.statusLabel, "Expire dans 4 jours");
  assert.equal(info.diffDays, 4);
});

test("getExpirationInfo affiche 1 jour restant", () => {
  const now = new Date("2024-01-01T12:00:00Z");
  const expiresAt = "2024-01-02T00:00:00Z";

  const info = getExpirationInfo(expiresAt, now);
  assert.equal(info.isExpired, false);
  assert.equal(info.statusLabel, "Expire dans 1 jour");
  assert.equal(info.diffDays, 1);
});

test("getExpirationInfo retourne 'Expire aujourd’hui' le jour même", () => {
  const now = new Date("2024-01-01T00:00:00Z");
  const expiresAt = "2024-01-01T00:00:00Z";

  const info = getExpirationInfo(expiresAt, now);
  assert.equal(info.isExpired, false);
  assert.equal(info.remainingLabel, "Expire aujourd’hui");
  assert.equal(info.diffDays, 0);
});

test("getExpirationInfo gère l'expiration passée", () => {
  const now = new Date("2024-01-02T00:00:00Z");
  const expiresAt = "2024-01-01T00:00:00Z";

  const info = getExpirationInfo(expiresAt, now);
  assert.equal(info.isExpired, true);
  assert.equal(info.remainingMs, 0);
  assert.equal(info.statusLabel, "Coffre expiré");
  assert.ok(info.expiredAtLabel.includes("01/01/2024"));
});
