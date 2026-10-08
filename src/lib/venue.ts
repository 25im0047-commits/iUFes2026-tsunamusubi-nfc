export type WeatherMode = "sunny" | "rainy";
export type VenueFloor = "屋外" | "1F" | "2F" | "3F";
export type GhostPlacement = {
  floor: VenueFloor;
  /** A floor drawing may also include outdoor installations around the building. */
  mapFloor?: VenueFloor;
  location: string;
  /** Marker positions indicate the area; the location text identifies the installation. */
  position?: { top: string; left: string };
};

// Sunny follows the supplied 2026-10-08 PNG maps, confirmed as sunny-only.
// Rainy remains the existing arrangement until its replacement map is supplied.
// Keep both weather arrangements explicit: changing one must not move the other.
export const ghostPlacements: Record<WeatherMode, Record<string, GhostPlacement>> = {
  sunny: {
    "good-01": { floor: "屋外", mapFloor: "1F", location: "1F図の下側の受付（屋外）", position: { top: "85.33%", left: "62.2%" } },
    "good-02": { floor: "屋外", mapFloor: "1F", location: "1F図の上側の受付（屋外）", position: { top: "22.81%", left: "72.35%" } },
    "good-03": { floor: "1F", location: "Salon前", position: { top: "42.79%", left: "73.52%" } },
    "good-04": { floor: "屋外", mapFloor: "1F", location: "Cafe・1-1の上側の外扉付近", position: { top: "24.86%", left: "31.92%" } },
    "good-05": { floor: "2F", location: "2-1左側の廊下", position: { top: "46.39%", left: "36.52%" } },
    "good-06": { floor: "2F", location: "HUB内", position: { top: "63.83%", left: "82.15%" } },
    "good-07": { floor: "3F", location: "エレベーター左側の廊下", position: { top: "54.00%", left: "60.10%" } },
    "good-08": { floor: "3F", location: "3-8前の廊下", position: { top: "65.95%", left: "52.75%" } },
    "good-09": { floor: "3F", location: "左側の階段付近", position: { top: "63.47%", left: "28.18%" } },
    "bad-01": { floor: "屋外", mapFloor: "1F", location: "建物右側の屋外（1F図の右端）", position: { top: "54.2%", left: "94.0%" } },
    "bad-02": { floor: "屋外", mapFloor: "1F", location: "外倉庫付近（1F図の左側）", position: { top: "66.8%", left: "5.83%" } },
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

export const sunnyPrizeLocation: GhostPlacement = {
  floor: "1F",
  location: "1F中央の廊下・エレベーター左側の景品受渡場所",
  position: { top: "51.06%", left: "53.80%" },
};

export function getPrizeLocation(weather: WeatherMode): GhostPlacement {
  return weather === "sunny" ? sunnyPrizeLocation : prizeLocation;
}

export const sunnyFloorplans = {
  "1F": { src: "/maps/rally-map-1f-sunny-20261008.png", width: 2000, height: 1414 },
  "2F": { src: "/maps/rally-map-2f-sunny-20261008.png", width: 2000, height: 1414 },
  "3F": { src: "/maps/rally-map-3f-sunny-20261008.png", width: 2000, height: 1414 },
};
