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
  goodStampIds: string[];
  badVisitedIds: string[];
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
    name: "悪いおばけ 01",
    location: "千葉大学側",
    area: "学外",
    position: { top: "86%", left: "14%" },
    message: "学園祭を、地域の人にももっと知ってもらえたらいいのにな。",
    detail: "iUFesについての質問は、受付でクイズとして答えよう。",
  },
  {
    id: "bad-02",
    type: "bad",
    name: "悪いおばけ 02",
    location: "セブンイレブン側",
    area: "学外",
    position: { top: "86%", left: "86%" },
    message: "どこから入ればいいのかな。案内が見えたら安心だね。",
    detail: "iUFesについての質問は、受付でクイズとして答えよう。",
  },
];

export const goodGhosts = ghosts.filter((ghost) => ghost.type === "good");
export const badGhosts = ghosts.filter((ghost) => ghost.type === "bad");

export function getGhost(id: string | null | undefined) {
  return ghosts.find((ghost) => ghost.id === id);
}

export function emptyProgress(): Progress {
  return { goodStampIds: [], badVisitedIds: [] };
}

/** Only IDs in the current prototype catalog count toward progress. */
export function normalizeProgress(value: unknown): Progress {
  const data = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<Progress>
    : {};
  function validIds(ids: unknown, catalog: Ghost[]): string[] {
    if (!Array.isArray(ids)) return [];
    const allowed = new Set(catalog.map((ghost) => ghost.id));
    return [...new Set(ids.filter((id): id is string =>
      typeof id === "string" && allowed.has(id),
    ))];
  }
  return {
    goodStampIds: validIds(data.goodStampIds, goodGhosts),
    badVisitedIds: validIds(data.badVisitedIds, badGhosts),
  };
}

export function mergeProgress(left: Progress, right: Progress): Progress {
  const a = normalizeProgress(left);
  const b = normalizeProgress(right);
  return normalizeProgress({
    goodStampIds: [...a.goodStampIds, ...b.goodStampIds],
    badVisitedIds: [...a.badVisitedIds, ...b.badVisitedIds],
  });
}

/** Retains the prototype's bad-ghost visit semantics; this is not a survey completion. */
export function recordGhost(progress: Progress, id: string): Progress {
  const next = normalizeProgress(progress);
  const ghost = getGhost(id);
  if (!ghost) return next;
  const ids = ghost.type === "good" ? next.goodStampIds : next.badVisitedIds;
  if (!ids.includes(id)) ids.push(id);
  return next;
}

export function hasAllGoodStamps(progress: Progress): boolean {
  const ids = new Set(normalizeProgress(progress).goodStampIds);
  return goodGhosts.length > 0 && goodGhosts.every((ghost) => ids.has(ghost.id));
}

export function hasAllBadVisits(progress: Progress): boolean {
  const ids = new Set(normalizeProgress(progress).badVisitedIds);
  return badGhosts.length > 0 && badGhosts.every((ghost) => ids.has(ghost.id));
}

export type ProgressStorage = Pick<Storage, "getItem" | "setItem">;
export type ProgressLoadResult = {
  progress: Progress;
  status: "empty" | "loaded" | "repaired" | "unavailable";
};
export type ProgressSaveResult =
  | { ok: true; progress: Progress }
  | { ok: false; progress: Progress };

function decodeProgress(raw: string | null): ProgressLoadResult {
  if (raw === null) return { progress: emptyProgress(), status: "empty" };
  try {
    const parsed: unknown = JSON.parse(raw);
    const progress = normalizeProgress(parsed);
    const data = parsed as Partial<Progress> | null;
    const intact = data !== null && typeof data === "object" && !Array.isArray(data)
      && JSON.stringify(data.goodStampIds) === JSON.stringify(progress.goodStampIds)
      && JSON.stringify(data.badVisitedIds) === JSON.stringify(progress.badVisitedIds);
    return {
      progress,
      status: intact ? "loaded" : "repaired",
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

export function saveProgress(progress: Progress, storage?: ProgressStorage): ProgressSaveResult {
  let next = normalizeProgress(progress);
  try {
    const target = storage ?? browserStorage();
    if (!target) return { ok: false, progress: next };
    // Preserve progress saved by another tab before this write. localStorage is not transactional.
    next = mergeProgress(decodeProgress(target.getItem(STORAGE_KEY)).progress, next);
    target.setItem(STORAGE_KEY, JSON.stringify(next));
    return { ok: true, progress: next };
  } catch {
    return { ok: false, progress: next };
  }
}
