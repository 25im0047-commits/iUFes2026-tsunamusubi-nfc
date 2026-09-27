import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  goodGhosts,
  emptyProgress,
  normalizeProgress,
  recordGoodConversation,
  hasAllGoodStamps,
  isGhostComplete,
  isRallyComplete,
  canOpenGhost,
  completeBadConversation,
  loadProgress,
  saveProgress,
} from "../src/lib/rally.ts";
import { surveys } from "../src/lib/survey.ts";

function memoryStorage(initial = null, legacy = null) {
  const values = new Map([
    [STORAGE_KEY, initial],
    [LEGACY_STORAGE_KEY, legacy],
  ]);
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      assert.equal(key, STORAGE_KEY);
      values.set(key, value);
    },
  };
}
function unlocked() {
  return goodGhosts.reduce(
    (p, ghost) => recordGoodConversation(p, ghost.id),
    emptyProgress(),
  );
}

test("current progress round-trips and an empty browser starts at the title", () => {
  const progress = recordGoodConversation(emptyProgress(), "good-01");
  assert.deepEqual(loadProgress(memoryStorage(JSON.stringify(progress))), {
    progress,
    status: "loaded",
  });
  assert.deepEqual(loadProgress(memoryStorage()), {
    progress: emptyProgress(),
    status: "empty",
  });
});

test("legacy visits migrate good stamps only and never grant survey stamps", () => {
  const legacy = {
    goodStampIds: goodGhosts.map((g) => g.id),
    badVisitedIds: ["bad-01", "bad-02"],
  };
  const loaded = loadProgress(memoryStorage(JSON.stringify(legacy)));
  assert.equal(loaded.status, "migrated");
  assert.deepEqual(loaded.progress, unlocked());
  assert.equal(isRallyComplete(loaded.progress), false);
  const storage = memoryStorage(JSON.stringify(legacy));
  saveProgress(loaded.progress, storage);
  assert.equal(loadProgress(storage).status, "loaded");
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).schemaVersion, 3);
});

test("malformed data recovers without writes", () => {
  for (const raw of ["{broken", "null", "12", '"text"', "[]", "{}"]) {
    const storage = memoryStorage(raw);
    assert.deepEqual(loadProgress(storage), {
      progress: emptyProgress(),
      status: "repaired",
    });
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
});

test("normalization removes duplicate, unknown and wrong-kind IDs without mutation", () => {
  const input = {
    ...emptyProgress(),
    goodStampIds: ["good-01", "good-01", "bad-01", "deleted", null, 3],
  };
  const before = structuredClone(input);
  assert.deepEqual(
    normalizeProgress(input),
    recordGoodConversation(emptyProgress(), "good-01"),
  );
  assert.deepEqual(input, before);
  assert.equal(
    loadProgress(memoryStorage(JSON.stringify(input))).status,
    "repaired",
  );
});

test("completion requires every good ID, not just a matching array length", () => {
  assert.equal(
    hasAllGoodStamps({
      ...emptyProgress(),
      goodStampIds: Array(goodGhosts.length).fill("good-01"),
    }),
    false,
  );
  assert.equal(
    hasAllGoodStamps({
      ...emptyProgress(),
      goodStampIds: goodGhosts.map((g) => `unknown-${g.id}`),
    }),
    false,
  );
  assert.equal(hasAllGoodStamps(unlocked()), true);
  assert.equal(hasAllGoodStamps(emptyProgress()), false);
});

test("good conversation completion is idempotent and cannot award bad stamps", () => {
  const initial = Object.freeze({
    ...emptyProgress(),
    goodStampIds: Object.freeze([]),
    surveyResponses: Object.freeze({}),
  });
  const first = recordGoodConversation(initial, "good-01");
  assert.deepEqual(recordGoodConversation(first, "good-01"), first);
  assert.deepEqual(recordGoodConversation(first, "unknown"), first);
  assert.deepEqual(recordGoodConversation(first, "bad-01"), first);
  assert.deepEqual(initial, emptyProgress());
});

test("bad NFC access and completion are blocked until all good stamps exist", () => {
  for (let count = 0; count < goodGhosts.length; count++) {
    const progress = {
      ...emptyProgress(),
      goodStampIds: goodGhosts.slice(0, count).map((g) => g.id),
    };
    for (const id of ["bad-01", "bad-02"]) {
      assert.equal(canOpenGhost(progress, id), false);
      assert.ok(completeBadConversation(progress, id, {}).errors.form);
      assert.equal(
        isGhostComplete(completeBadConversation(progress, id, {}).progress, id),
        false,
      );
    }
  }
  assert.equal(canOpenGhost(unlocked(), "bad-01"), true);
  assert.equal(canOpenGhost(unlocked(), "bad-02"), true);
  assert.equal(canOpenGhost(emptyProgress(), "good-01"), true);
  assert.equal(canOpenGhost(unlocked(), "unknown"), false);
});

test("both bad-ghost orders lead to completion only after both conversations end", () => {
  for (const order of [
    ["bad-01", "bad-02"],
    ["bad-02", "bad-01"],
  ]) {
    const initial = unlocked();
    assert.equal(isRallyComplete(initial), false);
    const first = completeBadConversation(initial, order[0], {});
    assert.deepEqual(first.errors, {});
    assert.equal(isRallyComplete(first.progress), false);
    const second = completeBadConversation(first.progress, order[1], {});
    assert.equal(isRallyComplete(second.progress), true);
    assert.deepEqual(initial.surveyResponses, {});
  }
});

test("reopening a completed conversation cannot replace its answers", () => {
  const first = completeBadConversation(unlocked(), "bad-01", {
    recommendation: "0",
  }).progress;
  const second = completeBadConversation(first, "bad-01", {
    recommendation: "10",
  });
  assert.deepEqual(second.progress, first);
  assert.equal(
    second.progress.surveyResponses["bad-01"].answers.recommendation,
    "0",
  );
});

test("invalid answers, corrupted completions and legacy visits cannot unlock the ending", () => {
  const attempted = completeBadConversation(unlocked(), "bad-01", {
    recommendation: "11",
  });
  assert.ok(attempted.errors.recommendation);
  assert.equal(isGhostComplete(attempted.progress, "bad-01"), false);
  const corrupt = {
    ...unlocked(),
    surveyResponses: {
      "bad-01": { version: 1, answers: { recommendation: "11" } },
      "bad-02": { version: 99, answers: {} },
    },
  };
  assert.deepEqual(normalizeProgress(corrupt).surveyResponses, {});
  assert.equal(isRallyComplete(corrupt), false);
  assert.deepEqual(
    normalizeProgress({
      ...emptyProgress(),
      schemaVersion: 2,
      surveyResponses: { "bad-01": { version: 1, answers: {} } },
    }).surveyResponses,
    {},
  );
});

test("sequential writes from stale tabs preserve existing good stamps and survey completions", () => {
  const storage = memoryStorage();
  saveProgress(recordGoodConversation(emptyProgress(), "good-01"), storage);
  const second = saveProgress(
    recordGoodConversation(emptyProgress(), "good-02"),
    storage,
  );
  assert.deepEqual(second.progress.goodStampIds, ["good-01", "good-02"]);
  saveProgress(
    completeBadConversation(unlocked(), "bad-01", { recommendation: "0" })
      .progress,
    storage,
  );
  const final = saveProgress(
    completeBadConversation(unlocked(), "bad-02", { favorite: "工作" })
      .progress,
    storage,
  );
  assert.equal(isRallyComplete(final.progress), true);
  assert.deepEqual(loadProgress(storage).progress, final.progress);
});

test("an already saved response wins over a stale conflicting response", () => {
  const first = completeBadConversation(unlocked(), "bad-01", {
    recommendation: "0",
  }).progress;
  const storage = memoryStorage(JSON.stringify(first));
  const later = completeBadConversation(unlocked(), "bad-01", {
    recommendation: "10",
  }).progress;
  assert.equal(
    saveProgress(later, storage).progress.surveyResponses["bad-01"].answers
      .recommendation,
    "0",
  );
});

test("failed writes retain answers and stamps for retry, without persisting false success", () => {
  const storage = memoryStorage(JSON.stringify(unlocked()));
  const pending = completeBadConversation(unlocked(), "bad-02", {
    favorite: "工作",
  }).progress;
  const failure = saveProgress(pending, {
    getItem: storage.getItem,
    setItem() {
      throw new Error("quota");
    },
  });
  assert.equal(failure.ok, false);
  assert.equal(
    failure.progress.surveyResponses["bad-02"].answers.favorite,
    "工作",
  );
  assert.equal(
    isGhostComplete(loadProgress(storage).progress, "bad-02"),
    false,
  );
  const success = saveProgress(failure.progress, storage);
  assert.equal(success.ok, true);
  assert.equal(isGhostComplete(loadProgress(storage).progress, "bad-02"), true);
});

test("read failures never overwrite unreadable saved data", () => {
  let writes = 0;
  const storage = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      writes++;
    },
  };
  const pending = recordGoodConversation(emptyProgress(), "good-01");
  assert.equal(loadProgress(storage).status, "unavailable");
  assert.deepEqual(saveProgress(pending, storage), {
    ok: false,
    progress: pending,
  });
  assert.equal(writes, 0);
});

test("blocked localStorage property access is caught", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get localStorage() {
        throw new Error("SecurityError");
      },
    },
  });
  try {
    assert.equal(loadProgress().status, "unavailable");
    assert.equal(saveProgress(emptyProgress()).ok, false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
  }
});

test("v2 migration preserves completed answers and uses a key old clients cannot overwrite", () => {
  const legacy = JSON.stringify({
    schemaVersion: 2,
    hasStarted: true,
    goodStampIds: goodGhosts.map((g) => g.id),
    surveyResponses: {
      "bad-01": {
        version: 1,
        answers: {
          visitor: ["小学生", "親子"],
          satisfaction: "たのしかった！",
          recommendation: "0",
        },
      },
      "bad-02": {
        version: 1,
        answers: { favorite: "工作", return: "行きたい！" },
      },
    },
  });
  const storage = memoryStorage(null, legacy);
  const loaded = loadProgress(storage);
  assert.equal(loaded.status, "migrated");
  assert.equal(isRallyComplete(loaded.progress), true);
  assert.deepEqual(loaded.progress.surveyResponses["bad-01"].answers.visitor, [
    "elementary",
    "family",
  ]);
  assert.equal(
    loaded.progress.surveyResponses["bad-01"].answers.recommendation,
    "0",
  );
  assert.equal(
    loaded.progress.surveyResponses["bad-02"].answers.favorite,
    "工作",
  );
  assert.equal(saveProgress(loaded.progress, storage).ok, true);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), legacy);
  assert.equal(loadProgress(storage).status, "loaded");
  const newRaw = storage.getItem(STORAGE_KEY);
  const oldClientChanged = memoryStorage(
    newRaw,
    JSON.stringify({ goodStampIds: [] }),
  );
  assert.equal(isRallyComplete(loadProgress(oldClientChanged).progress), true);
});

test("display copy changes preserve both migrated and current completions", () => {
  const option = surveys["bad-01"].questions.find(
    (q) => q.id === "satisfaction",
  ).options[1];
  const label = option.label;
  const progress = completeBadConversation(unlocked(), "bad-01", {
    satisfaction: "happy",
  }).progress;
  option.label = "楽しかった！";
  try {
    const loaded = loadProgress(memoryStorage(JSON.stringify(progress)));
    assert.equal(loaded.status, "loaded");
    assert.equal(isGhostComplete(loaded.progress, "bad-01"), true);
    assert.equal(
      loaded.progress.surveyResponses["bad-01"].answers.satisfaction,
      "happy",
    );
    const old = {
      ...progress,
      schemaVersion: 2,
      surveyResponses: {
        "bad-01": { version: 1, answers: { satisfaction: "たのしかった！" } },
      },
    };
    assert.equal(
      isGhostComplete(
        loadProgress(memoryStorage(null, JSON.stringify(old))).progress,
        "bad-01",
      ),
      true,
    );
  } finally {
    option.label = label;
  }
});

test("earned stamps survive invalid answers and cannot be answered again", () => {
  let progress = completeBadConversation(unlocked(), "bad-01", {}).progress;
  progress = completeBadConversation(progress, "bad-02", {}).progress;
  progress.surveyResponses["bad-01"].answers.recommendation = "11";
  const loaded = loadProgress(memoryStorage(JSON.stringify(progress)));
  assert.equal(loaded.status, "repaired");
  assert.equal(isRallyComplete(loaded.progress), true);
  assert.equal(loaded.progress.surveyResponses["bad-01"], undefined);
  assert.equal(
    completeBadConversation(loaded.progress, "bad-01", { recommendation: "10" })
      .progress.surveyResponses["bad-01"],
    undefined,
  );
});

test("unknown storage or answer versions block writes without changing either key", () => {
  for (const value of [
    { ...unlocked(), schemaVersion: 4 },
    {
      ...unlocked(),
      surveyResponses: { "bad-01": { version: 99, answers: {} } },
    },
  ]) {
    for (const legacyKey of [false, true]) {
      const raw = JSON.stringify(value);
      const storage = memoryStorage(
        legacyKey ? null : raw,
        legacyKey ? raw : null,
      );
      assert.equal(loadProgress(storage).status, "unsupported");
      const pending = recordGoodConversation(emptyProgress(), "good-01");
      assert.deepEqual(saveProgress(pending, storage), {
        ok: false,
        reason: "unsupported",
        progress: pending,
      });
      assert.equal(storage.getItem(STORAGE_KEY), legacyKey ? null : raw);
      assert.equal(storage.getItem(LEGACY_STORAGE_KEY), legacyKey ? raw : null);
    }
  }
});

test("failed migration writes keep the legacy source and can be retried", () => {
  const raw = JSON.stringify({
    schemaVersion: 2,
    goodStampIds: ["good-01"],
    surveyResponses: {},
  });
  const storage = memoryStorage(null, raw);
  const pending = recordGoodConversation(
    loadProgress(storage).progress,
    "good-02",
  );
  const result = saveProgress(pending, {
    getItem: storage.getItem,
    setItem() {
      throw new Error("quota");
    },
  });
  assert.equal(result.ok, false);
  assert.equal(storage.getItem(LEGACY_STORAGE_KEY), raw);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(saveProgress(result.progress, storage).ok, true);
  assert.deepEqual(loadProgress(storage).progress.goodStampIds, [
    "good-01",
    "good-02",
  ]);
});
