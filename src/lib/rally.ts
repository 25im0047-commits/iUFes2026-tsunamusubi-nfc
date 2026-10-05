import {
  isSurveyId,
  readSurveyResponse,
  validateAnswers,
  type SurveyId,
  type SurveyResponse,
} from "./survey.ts";

export type GhostType = "good" | "bad";

export type Ghost = {
  id: string;
  type: GhostType;
  /** 未登録キャラの画像フォールバック。確定11体の素材は artwork.ts で管理する。 */
  imageSrc?: string;
  name: string;
  location: string;
  area: string;
  message: string;
  detail: string;
};

export type Progress = {
  schemaVersion: 3;
  hasStarted: boolean;
  goodStampIds: string[];
  badStampIds: SurveyId[];
  surveyResponses: Partial<Record<SurveyId, SurveyResponse>>;
};

// Isolate new data from already-open, pre-migration clients that cannot reject it.
export const LEGACY_STORAGE_KEY = "iufes2026-system-prototype-progress";
export const PREVIOUS_STORAGE_KEY = `${LEGACY_STORAGE_KEY}-v3`;
export const STORAGE_KEY = `${LEGACY_STORAGE_KEY}-v3-confirmed-20261004`;

// The original five-character prototype also allowed completed v2 surveys.
const LEGACY_V2_GOOD_IDS = [
  "good-01",
  "good-02",
  "good-03",
  "good-04",
  "good-05",
];

export const ghosts: Ghost[] = [
  {
    id: "good-01",
    type: "good",
    name: "黒猫（A）",
    location: "受付（駐輪場付近）",
    area: "屋外",
    message: "ニャニャッ！おばけの街へようこそ！\niUFesを最後までたっぷり楽しんでいってニャ〜！",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "good-02",
    type: "good",
    name: "黒猫（B）",
    location: "受付（iUグラウンド側の外扉付近）",
    area: "屋外",
    message: "ニャ〜ん！\n迷子になったら受付に来るニャ！\n思い出をいっぱい作っていってニャ〜！",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "good-03",
    type: "good",
    name: "蜘蛛",
    location: "サロン前",
    area: "1F",
    message: "シュー！\n革や紙でカッコいいグッズ作ったんだぁ君もものづくりしてみな！",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "good-04",
    type: "good",
    name: "フランケン",
    location: "食堂外側（奥の壁寄り）",
    area: "屋外",
    message: "ウオォ〜！\n外でうまいごはんいっぱい食べたぞ！\n君もお腹すかせてもりもり食べな！",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "good-05",
    type: "good",
    name: "魔女",
    location: "2-1横の壁",
    area: "2F",
    message: "イヒヒ…魔法の粉を混ぜてシュワシュワのバスボム作ったぞ！君も魔法の実験やってみな！",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "good-06",
    type: "good",
    name: "ミイラ",
    location: "iU HUB内",
    area: "2F",
    message: "大きな紙にカッコいい文字書けたぞ！\n君も筆で書いてみて！\n,,,って僕の包帯には書かないで〜！",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "good-07",
    type: "good",
    name: "死神",
    location: "学生部屋3（3-5）",
    area: "3F",
    message: "ヒヒ…ハムスターに未来を占ってもらったぞ！\n君も自分の運命をたしかめてみな",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "good-08",
    type: "good",
    name: "ガイコツ",
    location: "3-8前",
    area: "3F",
    message: "カタカタ…大迫力のプラモ見てきたぞ！\n骨もしびれるカッコよさだから君も見にいってみな！",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "good-09",
    type: "good",
    name: "人魚",
    location: "3-10前の給湯室",
    area: "3F",
    message: "スイスイ〜3階には楽しい体験がたくさん！\nキミもお気に入りを見つけてね♪",
    detail: "会話を終えるとスタンプがつくよ。",
  },
  {
    id: "bad-01",
    type: "bad",
    name: "メデューサ",
    location: "大きな木の付近（セブンイレブン側から見た位置）",
    area: "屋外",
    message:
      "私は 見つめあうと 人をイシ（石）にしちゃうから、お祭りに入れなくて さみしいの…うぅ、あなたは どこから来たのか、私に教えてくれないかしら…？",
    detail: "こたえられる しつもんだけで だいじょうぶだよ。",
  },
  {
    id: "bad-02",
    type: "bad",
    name: "ヴァンパイア",
    location: "屋外倉庫（千葉大学側から見た位置）",
    area: "屋外",
    message:
      "フフフ…ワタシは コウモリを使って ていさつにきた ヴァンパイアだ！ \nこのお祭りの『ひみつ』を 教えてくれたら、仲よくなってあげても いいぞ…！",
    detail: "書きたいことだけ 教えてね。空らんでも なかよくなれるよ。",
  },
];

export const goodGhosts = ghosts.filter((ghost) => ghost.type === "good");
export const badGhosts = ghosts.filter((ghost) => ghost.type === "bad");

export function getGhost(id: string | null | undefined) {
  return ghosts.find((ghost) => ghost.id === id);
}

export function emptyProgress(): Progress {
  return {
    schemaVersion: 3,
    hasStarted: false,
    goodStampIds: [],
    badStampIds: [],
    surveyResponses: {},
  };
}

/** Versionless visits migrate good stamps only; v2 completed surveys also migrate. */
export function normalizeProgress(value: unknown): Progress {
  const next = emptyProgress();
  if (!value || typeof value !== "object" || Array.isArray(value)) return next;
  const data = value as Omit<Partial<Progress>, "schemaVersion"> & {
    schemaVersion?: unknown;
  };
  if (
    data.schemaVersion !== undefined &&
    data.schemaVersion !== 2 &&
    data.schemaVersion !== 3
  )
    return next;
  const allowed = new Set(goodGhosts.map((ghost) => ghost.id));
  if (Array.isArray(data.goodStampIds)) {
    next.goodStampIds = [
      ...new Set(
        data.goodStampIds.filter(
          (id) => typeof id === "string" && allowed.has(id),
        ),
      ),
    ];
  }
  next.hasStarted = data.hasStarted === true || next.goodStampIds.length > 0;
  if (data.schemaVersion === 3 && Array.isArray(data.badStampIds)) {
    next.badStampIds = [
      ...new Set(
        data.badStampIds.filter(
          (id) => typeof id === "string" && isSurveyId(id),
        ),
      ),
    ];
  }
  if (
    (data.schemaVersion === 3 ||
      (data.schemaVersion === 2 &&
        (allGoodIdsPresent(next.goodStampIds) ||
          LEGACY_V2_GOOD_IDS.every((id) => next.goodStampIds.includes(id))))) &&
    data.surveyResponses &&
    typeof data.surveyResponses === "object"
  ) {
    for (const ghost of badGhosts) {
      if (!isSurveyId(ghost.id)) continue;
      const response = readSurveyResponse(
        ghost.id,
        data.surveyResponses[ghost.id],
      );
      if (!response) continue;
      next.surveyResponses[ghost.id] = response;
      if (!next.badStampIds.includes(ghost.id)) next.badStampIds.push(ghost.id);
    }
  }
  return next;
}

export function mergeProgress(left: Progress, right: Progress): Progress {
  const a = normalizeProgress(left);
  const b = normalizeProgress(right);
  return normalizeProgress({
    schemaVersion: 3,
    hasStarted: a.hasStarted || b.hasStarted,
    goodStampIds: [...a.goodStampIds, ...b.goodStampIds],
    badStampIds: [...a.badStampIds, ...b.badStampIds],
    // First saved completion wins; reopening a completed conversation cannot overwrite it.
    surveyResponses: { ...b.surveyResponses, ...a.surveyResponses },
  });
}

export function recordGoodConversation(
  progress: Progress,
  id: string,
): Progress {
  const next = normalizeProgress(progress);
  const ghost = getGhost(id);
  if (!ghost || ghost.type !== "good") return next;
  if (!next.goodStampIds.includes(id)) next.goodStampIds.push(id);
  next.hasStarted = true;
  return next;
}

function allGoodIdsPresent(ids: string[]): boolean {
  return (
    goodGhosts.length > 0 && goodGhosts.every((ghost) => ids.includes(ghost.id))
  );
}

export function hasAllGoodStamps(progress: Progress): boolean {
  return allGoodIdsPresent(normalizeProgress(progress).goodStampIds);
}

export function isGhostComplete(progress: Progress, id: string): boolean {
  const next = normalizeProgress(progress);
  return isSurveyId(id)
    ? next.badStampIds.includes(id)
    : next.goodStampIds.includes(id);
}

export function isRallyComplete(progress: Progress): boolean {
  return (
    hasAllGoodStamps(progress) &&
    badGhosts.length > 0 &&
    badGhosts.every((ghost) => isGhostComplete(progress, ghost.id))
  );
}

export function canOpenGhost(progress: Progress, id: string): boolean {
  const ghost = getGhost(id);
  return !!ghost && (ghost.type === "good" || hasAllGoodStamps(progress));
}

export function completeBadConversation(
  progress: Progress,
  id: string,
  answers: unknown,
): {
  progress: Progress;
  errors: Record<string, string>;
} {
  const next = normalizeProgress(progress);
  if (!isSurveyId(id) || !canOpenGhost(next, id))
    return {
      progress: next,
      errors: { form: "まずは いいおばけと なかよくなろう！" },
    };
  if (next.badStampIds.includes(id)) return { progress: next, errors: {} };
  const checked = validateAnswers(id, answers);
  if (Object.keys(checked.errors).length)
    return { progress: next, errors: checked.errors };
  next.surveyResponses[id] = { version: 2, answers: checked.answers };
  next.badStampIds.push(id);
  return { progress: next, errors: {} };
}

export type ProgressStorage = Pick<Storage, "getItem" | "setItem">;
export type ProgressLoadResult = {
  progress: Progress;
  status:
    | "empty"
    | "loaded"
    | "migrated"
    | "repaired"
    | "unavailable"
    | "unsupported";
};
export type ProgressSaveResult =
  | { ok: true; progress: Progress }
  | { ok: false; progress: Progress; reason?: "unsupported" };

function decodeProgress(raw: string | null): ProgressLoadResult {
  if (raw === null) return { progress: emptyProgress(), status: "empty" };
  try {
    const parsed: unknown = JSON.parse(raw);
    const progress = normalizeProgress(parsed);
    const data = parsed as
      | (Omit<Partial<Progress>, "schemaVersion" | "surveyResponses"> & {
          schemaVersion?: unknown;
          surveyResponses?: Record<string, unknown>;
        })
      | null;
    const object =
      data !== null && typeof data === "object" && !Array.isArray(data);
    if (
      object &&
      data.schemaVersion !== undefined &&
      data.schemaVersion !== 2 &&
      data.schemaVersion !== 3
    )
      return { progress: emptyProgress(), status: "unsupported" };
    // Do not discard responses from a newer question version either.
    if (
      object &&
      data.surveyResponses &&
      typeof data.surveyResponses === "object" &&
      Object.values(data.surveyResponses).some(
        (response) =>
          response &&
          typeof response === "object" &&
          "version" in response &&
          response.version !== 1 &&
          response.version !== 2,
      )
    )
      return { progress, status: "unsupported" };
    const legacy =
      object &&
      (data.schemaVersion === undefined || data.schemaVersion === 2) &&
      Array.isArray(data.goodStampIds);
    const intact =
      object &&
      data.schemaVersion === 3 &&
      data.hasStarted === progress.hasStarted &&
      JSON.stringify(data.goodStampIds) ===
        JSON.stringify(progress.goodStampIds) &&
      JSON.stringify(data.badStampIds) ===
        JSON.stringify(progress.badStampIds) &&
      JSON.stringify(data.surveyResponses) ===
        JSON.stringify(progress.surveyResponses);
    return {
      progress,
      status: legacy ? "migrated" : intact ? "loaded" : "repaired",
    };
  } catch {
    return { progress: emptyProgress(), status: "repaired" };
  }
}

function readStoredProgress(storage: ProgressStorage): ProgressLoadResult {
  const current = storage.getItem(STORAGE_KEY);
  if (current !== null) return decodeProgress(current);
  const previous = storage.getItem(PREVIOUS_STORAGE_KEY);
  if (previous !== null) {
    const loaded = decodeProgress(previous);
    return loaded.status === "loaded"
      ? { ...loaded, status: "migrated" }
      : loaded;
  }
  const legacy = decodeProgress(storage.getItem(LEGACY_STORAGE_KEY));
  return legacy.status === "loaded"
    ? { ...legacy, status: "migrated" }
    : legacy;
}

function browserStorage(): ProgressStorage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function loadProgress(storage?: ProgressStorage): ProgressLoadResult {
  try {
    const target = storage ?? browserStorage();
    if (!target) return { progress: emptyProgress(), status: "unavailable" };
    return readStoredProgress(target);
  } catch {
    return { progress: emptyProgress(), status: "unavailable" };
  }
}

export function saveProgress(
  progress: Progress,
  storage?: ProgressStorage,
): ProgressSaveResult {
  let next = normalizeProgress(progress);
  try {
    const target = storage ?? browserStorage();
    if (!target) return { ok: false, progress: next };
    // Preserve progress saved by another tab before this write. localStorage is not transactional.
    const stored = readStoredProgress(target);
    if (stored.status === "unsupported")
      return { ok: false, progress: next, reason: "unsupported" };
    next = mergeProgress(stored.progress, next);
    target.setItem(STORAGE_KEY, JSON.stringify(next));
    return { ok: true, progress: next };
  } catch {
    return { ok: false, progress: next };
  }
}
