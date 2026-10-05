export type WeatherMode = "sunny" | "rainy";
export type VenueFloor = "屋外" | "1F" | "2F" | "3F";
export type GhostPlacement = {
  floor: VenueFloor;
  location: string;
  /** Marker positions indicate the area; the location text identifies the installation. */
  position?: { top: string; left: string };
};

// Source precedence: sunny follows confirmed Slack text and photographs;
// rainy follows the current Canva page, explicitly confirmed by the organizer on 2026-10-04.
// Keep both weather arrangements explicit: changing one must not move the other.
export const ghostPlacements: Record<WeatherMode, Record<string, GhostPlacement>> = {
  sunny: {
    "good-01": { floor: "屋外", location: "受付・駐輪場付近", position: { top: "25%", left: "24%" } },
    "good-02": { floor: "屋外", location: "受付・iUグラウンド側の外扉付近", position: { top: "25%", left: "76%" } },
    "good-03": { floor: "1F", location: "サロン前", position: { top: "37%", left: "70%" } },
    "good-04": { floor: "屋外", location: "食堂外側・奥側の壁", position: { top: "65%", left: "50%" } },
    "good-05": { floor: "2F", location: "2-1 横の壁", position: { top: "27%", left: "39%" } },
    "good-06": { floor: "2F", location: "iU HUB 内", position: { top: "55%", left: "87%" } },
    "good-07": { floor: "3F", location: "学生室3（3-5）", position: { top: "26%", left: "63%" } },
    "good-08": { floor: "3F", location: "3-8 前", position: { top: "65%", left: "54%" } },
    "good-09": { floor: "3F", location: "3-10 前の給湯室", position: { top: "74%", left: "36%" } },
    "bad-01": { floor: "屋外", location: "セブンイレブン側からiUを見て、大きな木の付近", position: { top: "80%", left: "24%" } },
    "bad-02": { floor: "屋外", location: "千葉大学側から見た屋外の倉庫", position: { top: "80%", left: "76%" } },
  },
  rainy: {
    "good-01": { floor: "1F", location: "受付・入口のiUロゴの壁", position: { top: "76%", left: "64%" } },
    "good-02": { floor: "1F", location: "受付・事務室付近", position: { top: "73%", left: "75%" } },
    "good-03": { floor: "1F", location: "サロン前", position: { top: "37%", left: "70%" } },
    // No separate rainy relocation has been supplied for Franken.
    "good-04": { floor: "屋外", location: "食堂外側・奥側の壁", position: { top: "65%", left: "50%" } },
    "good-05": { floor: "2F", location: "2-1 横の壁", position: { top: "27%", left: "39%" } },
    "good-06": { floor: "2F", location: "iU HUB 内", position: { top: "55%", left: "87%" } },
    "good-07": { floor: "3F", location: "学生室3（3-5）", position: { top: "26%", left: "63%" } },
    "good-08": { floor: "3F", location: "3-8 前", position: { top: "65%", left: "54%" } },
    "good-09": { floor: "3F", location: "3-10 前の給湯室", position: { top: "74%", left: "36%" } },
    // Organizer confirmation on 2026-10-04 adopts the current Canva rainy page,
    // superseding the reversed assignments in the 2026-09-30 Slack text.
    "bad-01": { floor: "1F", location: "事務室側の入口付近・iUの二重扉付近", position: { top: "91%", left: "69%" } },
    "bad-02": { floor: "1F", location: "景品受け取り場所付近・入口のテレビがある壁の向かい側", position: { top: "59%", left: "80%" } },
  },
};

export function getGhostPlacement(
  id: string,
  weather: WeatherMode,
): GhostPlacement | undefined {
  return ghostPlacements[weather][id];
}

export const prizeLocation: GhostPlacement = {
  floor: "1F",
  location: "入口・テレビがある壁の向かい側",
  position: { top: "66%", left: "80%" },
};
