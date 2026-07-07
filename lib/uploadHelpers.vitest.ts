import { strict as assert } from "node:assert";
import { test } from "vitest";

import { withRetry } from "./uploadHelpers";

const noWait = async () => {};

test("withRetry réussit du premier coup sans attendre", async () => {
  let calls = 0;
  const outcome = await withRetry(
    async () => {
      calls += 1;
      return "ok";
    },
    { maxAttempts: 3 },
    noWait
  );
  assert.equal(outcome.success, true);
  assert.equal(calls, 1);
});

test("withRetry réessaie puis réussit", async () => {
  let calls = 0;
  const outcome = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("échec temporaire");
      return "ok";
    },
    { maxAttempts: 3 },
    noWait
  );
  assert.equal(outcome.success, true);
  assert.equal(calls, 3);
});

test("withRetry abandonne après maxAttempts échecs", async () => {
  let calls = 0;
  const outcome = await withRetry(
    async () => {
      calls += 1;
      throw new Error("échec permanent");
    },
    { maxAttempts: 3 },
    noWait
  );
  assert.equal(outcome.success, false);
  assert.equal(calls, 3);
});

test("withRetry appelle onAttemptFailed à chaque échec", async () => {
  const failedAttempts: number[] = [];
  await withRetry(
    async () => {
      throw new Error("toujours en échec");
    },
    { maxAttempts: 2, onAttemptFailed: (attempt) => failedAttempts.push(attempt) },
    noWait
  );
  assert.deepEqual(failedAttempts, [1, 2]);
});
