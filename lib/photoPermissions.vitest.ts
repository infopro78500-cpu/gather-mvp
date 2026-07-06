import { strict as assert } from "node:assert";
import { test } from "vitest";

import { canDeletePhoto, getUploaderDeviceId } from "./photoPermissions";

test("getUploaderDeviceId extrait le deviceId d'un nom de fichier normal", () => {
  assert.equal(
    getUploaderDeviceId("abc-123__1700000000000-photo.jpg"),
    "abc-123"
  );
});

test("getUploaderDeviceId retourne undefined sans séparateur __", () => {
  assert.equal(getUploaderDeviceId("photo-sans-prefixe.jpg"), undefined);
});

test("canDeletePhoto refuse sans deviceId", () => {
  assert.equal(
    canDeletePhoto({ isHost: false, deviceId: null, uploaderDeviceId: "abc" }),
    false
  );
});

test("canDeletePhoto autorise toujours l'hôte, même sur la photo d'un autre", () => {
  assert.equal(
    canDeletePhoto({ isHost: true, deviceId: "host-id", uploaderDeviceId: "autre-id" }),
    true
  );
});

test("canDeletePhoto autorise le propriétaire de la photo", () => {
  assert.equal(
    canDeletePhoto({ isHost: false, deviceId: "abc", uploaderDeviceId: "abc" }),
    true
  );
});

test("canDeletePhoto refuse un non-hôte sur la photo d'un autre", () => {
  assert.equal(
    canDeletePhoto({ isHost: false, deviceId: "abc", uploaderDeviceId: "xyz" }),
    false
  );
});
