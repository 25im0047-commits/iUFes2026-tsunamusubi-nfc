export type WeatherMode = "sunny" | "rainy";
export type VenueFloor = "屋外" | "1F" | "2F" | "3F";
export type GhostPlacement = {
  floor: VenueFloor;
  mapFloor?: VenueFloor;
  location: string;
  position?: { top: string; left: string };
};
const commonUpperFloors: Record<string, GhostPlacement> = {
  "good-05": { floor: "2F", location: "2-1左側の廊下", position: { top: "46.39%", left: "36.52%" } },
  "good-06": { floor: "2F", location: "HUB内", position: { top: "63.83%", left: "82.15%" } },
  "good-07": { floor: "3F", location: "エレベーター左側の廊下", position: { top: "54.00%", left: "60.10%" } },
  "good-08": { floor: "3F", location: "3-8前の廊下", position: { top: "65.95%", left: "52.75%" } },
  "good-09": { floor: "3F", location: "左側の階段付近", position: { top: "63.47%", left: "28.18%" } },
};
// Latest supplied sunny/rainy images change 1F only.
export const ghostPlacements: Record<WeatherMode, Record<string, GhostPlacement>> = {
  sunny: {
    ...commonUpperFloors,
    "good-01": { floor: "屋外", mapFloor: "1F", location: "1F図の下側の受付（屋外）", position: { top: "85.33%", left: "62.2%" } },
    "good-02": { floor: "屋外", mapFloor: "1F", location: "1F図の上側の受付（屋外）", position: { top: "22.81%", left: "72.35%" } },
    "good-03": { floor: "1F", location: "Salon前", position: { top: "42.79%", left: "73.52%" } },
    "good-04": { floor: "屋外", mapFloor: "1F", location: "Cafe上側の外扉付近", position: { top: "24.5%", left: "23.5%" } },
    "bad-01": { floor: "屋外", mapFloor: "1F", location: "建物右側の屋外（1F図の右端）", position: { top: "54.2%", left: "94.0%" } },
    "bad-02": { floor: "屋外", mapFloor: "1F", location: "外倉庫付近（1F図の左側）", position: { top: "66.8%", left: "5.83%" } },
  },
  rainy: {
    ...commonUpperFloors,
    "good-01": { floor: "1F", location: "1F図の下側の受付（屋内）", position: { top: "80.25%", left: "57.6%" } },
    "good-02": { floor: "1F", location: "1F図の上側の受付（屋内）", position: { top: "29.2%", left: "50.0%" } },
    "good-03": { floor: "1F", location: "Salon前", position: { top: "42.79%", left: "73.52%" } },
    "good-04": { floor: "1F", location: "Cafe内・上側の扉付近", position: { top: "31.3%", left: "21.5%" } },
    "bad-01": { floor: "屋外", mapFloor: "1F", location: "下側の入口付近（1F図の屋外）", position: { top: "84.7%", left: "49.5%" } },
    "bad-02": { floor: "1F", location: "景品受け取り場所の右側・エレベーター左側", position: { top: "58.8%", left: "58.2%" } },
  },
};
export function getGhostPlacement(id: string, weather: WeatherMode): GhostPlacement | undefined {
  return ghostPlacements[weather][id];
}
export const prizeLocation: GhostPlacement = {
  floor: "1F",
  location: "1F中央の廊下・エレベーター左側の景品受渡場所",
  position: { top: "51.06%", left: "53.80%" },
};
export const sunnyPrizeLocation = prizeLocation;
export function getPrizeLocation(_weather: WeatherMode): GhostPlacement { return prizeLocation; }
export const sunnyFloorplans = {
  "1F": { src: "/maps/rally-map-1f-sunny-final-20261008.png", width: 2000, height: 1414 },
  "2F": { src: "/maps/rally-map-2f-sunny-20261008.png", width: 2000, height: 1414 },
  "3F": { src: "/maps/rally-map-3f-sunny-20261008.png", width: 2000, height: 1414 },
};
export function getFloorplan(floor: Exclude<VenueFloor, "屋外">, weather: WeatherMode) {
  return floor === "1F" && weather === "rainy"
    ? { src: "/maps/rally-map-1f-rainy-final-20261008.png", width: 2000, height: 1414 }
    : sunnyFloorplans[floor];
}
