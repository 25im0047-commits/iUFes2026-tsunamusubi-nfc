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

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      goodStampIds: Array.isArray(parsed.goodStampIds)
        ? parsed.goodStampIds
        : [],
      badVisitedIds: Array.isArray(parsed.badVisitedIds)
        ? parsed.badVisitedIds
        : [],
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
