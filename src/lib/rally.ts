import {
  isSurveyId,
  validateAnswers,
  type SurveyId,
  type SurveyResponse,
} from "./survey.ts";

export type GhostType = "good" | "bad";

export type Ghost = {
  id: string;
  type: GhostType;
  /** 本番素材を public/ に置いたら、例: /ghosts/good-01.webp を指定する。 */
  imageSrc?: string;
  name: string;
  location: string;
  area: string;
  position: { top: string; left: string };
  message: string;
  detail: string;
};

export type Progress = {
  schemaVersion: 2;
  hasStarted: boolean;
  goodStampIds: string[];
  surveyResponses: Partial<Record<SurveyId, SurveyResponse>>;
};

export const STORAGE_KEY = "iufes2026-system-prototype-progress";

export const ghosts: Ghost[] = [
  {
    id: "good-01",
    type: "good",
    name: "良いおばけ 01",
    location: "1-1",
    area: "1F",
    position: { top: "32%", left: "24%" },
    message: "この出店では、来場者参加型の企画を楽しめるよ。",
    detail: "会場を歩きながら、気になった企画にも遊びに行ってみてね。",
  },
  {
    id: "good-02",
    type: "good",
    name: "良いおばけ 02",
    location: "模擬店エリア",
    area: "1F",
    position: { top: "59%", left: "45%" },
    message: "おいしい匂いがするね。学園祭ならではの出店だよ。",
    detail: "出店の内容を楽しみながら、次のおばけを探そう。",
  },
  {
    id: "good-03",
    type: "good",
    name: "良いおばけ 03",
    location: "音楽室",
    area: "2F",
    position: { top: "25%", left: "70%" },
    message: "こんちわ",
    detail: "室内企画を中心に、いろいろな催しをめぐってみよう。",
  },
  {
    id: "good-04",
    type: "good",
    name: "良いおばけ 04",
    location: "ものづくり教室",
    area: "2F",
    position: { top: "72%", left: "74%" },
    message: "自分で作って遊べる企画も見つけたよ。",
    detail: "気配の場所へ向かい、NFCタグを探してみてね。",
  },
  {
    id: "good-05",
    type: "good",
    name: "良いおばけ 05",
    location: "図書室企画",
    area: "3F",
    position: { top: "18%", left: "43%" },
    message: "静かな場所にも、学園祭の企画があるみたい。",
    detail: "良いおばけのスタンプを集めると、新しい気配が現れるよ。",
  },
  {
    id: "bad-01",
    type: "bad",
    name: "メデューサ",
    location: "屋内・設置場所調整中",
    area: "屋内",
    position: { top: "86%", left: "14%" },
    message:
      "私は 見つめあうと 人をイシ（石）にしちゃうから、お祭りに入れなくて さみしいの…うぅ、あなたは どこから来たのか、私に教えてくれないかしら…？",
    detail: "こたえられる しつもんだけで だいじょうぶだよ。",
  },
  {
    id: "bad-02",
    type: "bad",
    name: "ヴァンパイア",
    location: "屋内・設置場所調整中",
    area: "屋内",
    position: { top: "86%", left: "86%" },
    message:
      "フフフ…ワタシは コウモリを使って ていさつにきた ヴァンパイアだ！このお祭りの『ひみつ』を教えてくれたら、仲よくなってあげても いいぞ…！",
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
    schemaVersion: 2,
    hasStarted: false,
    goodStampIds: [],
    surveyResponses: {},
  };
}

/** Legacy visits are not survey completions. Only good stamps are migrated. */
export function normalizeProgress(value: unknown): Progress {
  const next = emptyProgress();
  if (!value || typeof value !== "object" || Array.isArray(value)) return next;
  const data = value as Partial<Progress>;
  if (data.schemaVersion !== undefined && data.schemaVersion !== 2) return next;
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
  if (
    data.schemaVersion === 2 &&
    allGoodIdsPresent(next.goodStampIds) &&
    data.surveyResponses &&
    typeof data.surveyResponses === "object"
  ) {
    for (const ghost of badGhosts) {
      if (!isSurveyId(ghost.id)) continue;
      const response = data.surveyResponses[ghost.id];
      if (!response || response.version !== 1) continue;
      const checked = validateAnswers(ghost.id, response.answers);
      if (Object.keys(checked.errors).length === 0)
        next.surveyResponses[ghost.id] = {
          version: 1,
          answers: checked.answers,
        };
    }
  }
  return next;
}

export function mergeProgress(left: Progress, right: Progress): Progress {
  const a = normalizeProgress(left);
  const b = normalizeProgress(right);
  return normalizeProgress({
    schemaVersion: 2,
    hasStarted: a.hasStarted || b.hasStarted,
    goodStampIds: [...a.goodStampIds, ...b.goodStampIds],
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
    ? !!next.surveyResponses[id]
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
  if (next.surveyResponses[id]) return { progress: next, errors: {} };
  const checked = validateAnswers(id, answers);
  if (Object.keys(checked.errors).length)
    return { progress: next, errors: checked.errors };
  next.surveyResponses[id] = { version: 1, answers: checked.answers };
  return { progress: next, errors: {} };
}

export type ProgressStorage = Pick<Storage, "getItem" | "setItem">;
export type ProgressLoadResult = {
  progress: Progress;
  status: "empty" | "loaded" | "migrated" | "repaired" | "unavailable";
};
export type ProgressSaveResult =
  { ok: true; progress: Progress } | { ok: false; progress: Progress };

function decodeProgress(raw: string | null): ProgressLoadResult {
  if (raw === null) return { progress: emptyProgress(), status: "empty" };
  try {
    const parsed: unknown = JSON.parse(raw);
    const progress = normalizeProgress(parsed);
    const data = parsed as Partial<Progress> | null;
    const object =
      data !== null && typeof data === "object" && !Array.isArray(data);
    const legacy =
      object &&
      data.schemaVersion === undefined &&
      Array.isArray(data.goodStampIds);
    const intact =
      object &&
      data.schemaVersion === 2 &&
      data.hasStarted === progress.hasStarted &&
      JSON.stringify(data.goodStampIds) ===
        JSON.stringify(progress.goodStampIds) &&
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

function browserStorage(): ProgressStorage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function loadProgress(storage?: ProgressStorage): ProgressLoadResult {
  try {
    const target = storage ?? browserStorage();
    if (!target) return { progress: emptyProgress(), status: "unavailable" };
    return decodeProgress(target.getItem(STORAGE_KEY));
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
    next = mergeProgress(
      decodeProgress(target.getItem(STORAGE_KEY)).progress,
      next,
    );
    target.setItem(STORAGE_KEY, JSON.stringify(next));
    return { ok: true, progress: next };
  } catch {
    return { ok: false, progress: next };
  }
}
