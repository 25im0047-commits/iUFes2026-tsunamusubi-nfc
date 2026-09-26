import assert from "node:assert/strict";
import { test } from "node:test";
import { readNfcUrl } from "../src/lib/nfc.ts";

test("NFC processing removes only id and retains route, other parameters and hash", () => {
  assert.deepEqual(readNfcUrl("https://example.com/rally/?lang=ja&id=good-01&source=nfc#map"), {
    id: "good-01", cleanPath: "/rally/?lang=ja&source=nfc#map",
  });
});

test("missing, empty, repeated and unknown IDs have explicit predictable results", () => {
  assert.deepEqual(readNfcUrl("https://example.com/"), { id: null, cleanPath: "/" });
  assert.deepEqual(readNfcUrl("https://example.com/?id="), { id: "", cleanPath: "/" });
  assert.deepEqual(readNfcUrl("https://example.com/?id=good-01&id=bad-01#map"), { id: "good-01", cleanPath: "/#map" });
  assert.deepEqual(readNfcUrl("https://example.com/?id=unknown&source=qr"), { id: "unknown", cleanPath: "/?source=qr" });
});
