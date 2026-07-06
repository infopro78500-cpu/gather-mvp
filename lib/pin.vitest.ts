import { strict as assert } from "node:assert";
import { test } from "vitest";

import { generatePin, isPinCollisionError } from "./pin";

test("generatePin retourne toujours 6 chiffres", () => {
  for (let i = 0; i < 50; i += 1) {
    const pin = generatePin();
    assert.match(pin, /^\d{6}$/);
  }
});

test("isPinCollisionError détecte le code Postgres 23505", () => {
  assert.equal(isPinCollisionError({ code: "23505" }), true);
});

test("isPinCollisionError rejette les autres erreurs", () => {
  assert.equal(isPinCollisionError({ code: "42501" }), false);
  assert.equal(isPinCollisionError(new Error("autre erreur")), false);
  assert.equal(isPinCollisionError(null), false);
  assert.equal(isPinCollisionError(undefined), false);
});
