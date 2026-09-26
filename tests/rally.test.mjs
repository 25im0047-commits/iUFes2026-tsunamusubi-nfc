import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STORAGE_KEY, goodGhosts, badGhosts, emptyProgress, normalizeProgress,
  recordGhost, hasAllGoodStamps, hasAllBadVisits, loadProgress, saveProgress,
} from "../src/lib/rally.ts";

function memoryStorage(initial = null) {
  let raw = initial;
  return {
    getItem(key) { assert.equal(key, STORAGE_KEY); return raw; },
    setItem(key, value) { assert.equal(key, STORAGE_KEY); raw = value; },
  };
}

test("existing valid progress loads without changing the storage format", () => {
  const progress = { goodStampIds: ["good-01"], badVisitedIds: ["bad-01"] };
  assert.deepEqual(loadProgress(memoryStorage(JSON.stringify(progress))), { progress, status: "loaded" });
  assert.deepEqual(loadProgress(memoryStorage()), { progress: emptyProgress(), status: "empty" });
});

test("malformed JSON and unexpected top-level values recover without throwing or writing", () => {
  for (const raw of ["{broken", "null", "12", '"text"', "[]", "{}", '{"goodStampIds":null,"badVisitedIds":42}']) {
    const storage = memoryStorage(raw);
    assert.deepEqual(loadProgress(storage), { progress: emptyProgress(), status: "repaired" });
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
});

test("property order and unrelated metadata do not trigger a false repair warning", () => {
  const storage = memoryStorage(JSON.stringify({ badVisitedIds: [], goodStampIds: ["good-01"], metadata: "ignored" }));
  assert.deepEqual(loadProgress(storage), { status: "loaded", progress: { goodStampIds: ["good-01"], badVisitedIds: [] } });
});

test("normalization keeps valid IDs while removing duplicates, unknown and wrong-kind IDs", () => {
  const input = { goodStampIds: ["good-01", "good-01", "bad-01", "deleted", null, 3], badVisitedIds: ["bad-02", "good-01", "bad-02"] };
  const before = structuredClone(input);
  assert.deepEqual(normalizeProgress(input), { goodStampIds: ["good-01"], badVisitedIds: ["bad-02"] });
  assert.deepEqual(input, before);
  assert.equal(loadProgress(memoryStorage(JSON.stringify(input))).status, "repaired");
});

test("completion requires every catalog ID, not just an array length", () => {
  assert.equal(hasAllGoodStamps({ goodStampIds: Array(goodGhosts.length).fill("good-01"), badVisitedIds: [] }), false);
  assert.equal(hasAllBadVisits({ goodStampIds: [], badVisitedIds: Array(badGhosts.length).fill("bad-01") }), false);
  assert.equal(hasAllGoodStamps({ goodStampIds: goodGhosts.map(g => `unknown-${g.id}`), badVisitedIds: [] }), false);
  const complete = { goodStampIds: goodGhosts.map(g => g.id).reverse(), badVisitedIds: badGhosts.map(g => g.id) };
  assert.equal(hasAllGoodStamps(complete), true);
  assert.equal(hasAllBadVisits(complete), true);
  assert.equal(hasAllGoodStamps(emptyProgress()), false);
});

test("repeated acquisition is idempotent and does not mutate its input", () => {
  const initial = Object.freeze({ goodStampIds: Object.freeze([]), badVisitedIds: Object.freeze([]) });
  const first = recordGhost(initial, "good-01");
  assert.deepEqual(recordGhost(first, "good-01"), first);
  assert.deepEqual(recordGhost(first, "unknown"), first);
  assert.deepEqual(recordGhost(first, "bad-01"), { goodStampIds: ["good-01"], badVisitedIds: ["bad-01"] });
  assert.deepEqual(initial, emptyProgress());
});

test("sequential writes from stale tabs merge existing progress", () => {
  const storage = memoryStorage();
  saveProgress(recordGhost(emptyProgress(), "good-01"), storage);
  const second = saveProgress(recordGhost(emptyProgress(), "good-02"), storage);
  assert.equal(second.ok, true);
  assert.deepEqual(second.progress.goodStampIds, ["good-01", "good-02"]);
  assert.deepEqual(loadProgress(storage).progress, second.progress);
});

test("failed writes retain in-memory progress and retry combines recovered storage", () => {
  const existing = recordGhost(emptyProgress(), "good-01");
  const storage = memoryStorage(JSON.stringify(existing));
  const pending = recordGhost(emptyProgress(), "good-02");
  const failure = saveProgress(pending, { getItem: storage.getItem, setItem() { throw new Error("quota"); } });
  assert.equal(failure.ok, false);
  assert.deepEqual(failure.progress.goodStampIds, ["good-01", "good-02"]);
  assert.deepEqual(loadProgress(storage).progress, existing);
  const success = saveProgress(failure.progress, storage);
  assert.equal(success.ok, true);
  assert.deepEqual(loadProgress(storage).progress, failure.progress);
});

test("read failures do not overwrite unreadable saved data", () => {
  let writes = 0;
  const storage = { getItem() { throw new Error("denied"); }, setItem() { writes++; } };
  const pending = recordGhost(emptyProgress(), "good-01");
  assert.equal(loadProgress(storage).status, "unavailable");
  assert.deepEqual(saveProgress(pending, storage), { ok: false, progress: pending });
  assert.equal(writes, 0);
});

test("blocked localStorage property access is caught, including during saves", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    get localStorage() { throw new Error("SecurityError"); },
  } });
  try {
    assert.equal(loadProgress().status, "unavailable");
    assert.equal(saveProgress(emptyProgress()).ok, false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
  }
});

test("saving repaired data writes only valid, unique IDs", () => {
  const storage = memoryStorage("not json");
  const result = saveProgress({ goodStampIds: ["good-01", "good-01", "unknown"], badVisitedIds: ["bad-01", "good-01"] }, storage);
  assert.equal(result.ok, true);
  assert.deepEqual(loadProgress(storage), { status: "loaded", progress: { goodStampIds: ["good-01"], badVisitedIds: ["bad-01"] } });
});
