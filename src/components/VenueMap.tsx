import { useState } from "react";
import { hasAllGoodStamps, isGhostComplete, isRallyComplete, type Ghost, type Progress } from "../lib/rally";
import {
  getGhostPlacement,
  prizeLocation,
  type VenueFloor,
  type WeatherMode,
} from "../lib/venue";
import "../venue-map.css";

type VenueMapProps = {
  ghosts: Ghost[];
  progress: Progress;
  weather: WeatherMode;
  onWeatherChange: (weather: WeatherMode) => void;
  showPrize: boolean;
};

type RoomMask = { x: number; y: number; width: number; height: number; label?: string };
const indoorPlans = {
  "1F": {
    src: "/maps/rally-map-1f-base.webp",
    height: 431,
    masks: [
      { x: 25, y: 29, width: 258, height: 122, label: "iU Cafe" },
      { x: 26, y: 155, width: 149, height: 146 },
      { x: 290, y: 29, width: 143, height: 106, label: "1-1" },
      { x: 442, y: 32, width: 40, height: 103 },
      { x: 579, y: 29, width: 199, height: 107, label: "サロン" },
      { x: 610, y: 140, width: 181, height: 35 },
      { x: 241, y: 192, width: 91, height: 35 },
      { x: 27, y: 333, width: 194, height: 84, label: "厨房" },
      { x: 316, y: 332, width: 31, height: 86 },
      { x: 358, y: 334, width: 124, height: 83 },
      { x: 580, y: 332, width: 196, height: 84, label: "iU Office" },
      { x: 0, y: 0, width: 800, height: 9 },
    ],
  },
  "2F": {
    src: "/maps/rally-map-2f-base.webp",
    height: 444,
    masks: [
      { x: 24, y: 23, width: 148, height: 287, label: "iU Library" },
      { x: 279, y: 49, width: 25, height: 62 },
      { x: 307, y: 21, width: 103, height: 93, label: "2-1" },
      { x: 412, y: 20, width: 360, height: 89 },
      { x: 431, y: 173, width: 64, height: 75, label: "2-5" },
      { x: 625, y: 231, width: 143, height: 72 },
      { x: 24, y: 319, width: 176, height: 90, label: "iU Common Room" },
      { x: 209, y: 321, width: 62, height: 87 },
      { x: 281, y: 321, width: 25, height: 87 },
      { x: 318, y: 323, width: 60, height: 89, label: "2-2" },
      { x: 383, y: 297, width: 72, height: 116, label: "2-3" },
      { x: 460, y: 318, width: 71, height: 116, label: "2-4" },
      { x: 533, y: 317, width: 239, height: 96 },
    ],
  },
  "3F": {
    src: "/maps/rally-map-3f-base.webp",
    height: 439,
    masks: [
      { x: 24, y: 28, width: 127, height: 111, label: "3-1" },
      { x: 163, y: 27, width: 100, height: 112, label: "3-2" },
      { x: 316, y: 28, width: 68, height: 111, label: "3-3" },
      { x: 397, y: 27, width: 63, height: 112, label: "3-4" },
      { x: 469, y: 27, width: 62, height: 112, label: "3-5" },
      { x: 543, y: 67, width: 35, height: 73 },
      { x: 590, y: 66, width: 76, height: 73, label: "3-6" },
      { x: 24, y: 150, width: 92, height: 140, label: "iU Presentation Room" },
      { x: 390, y: 179, width: 65, height: 34 },
      { x: 390, y: 220, width: 65, height: 34 },
      { x: 633, y: 188, width: 20, height: 24 },
      { x: 690, y: 62, width: 90, height: 323, label: "iU Hall" },
      { x: 24, y: 304, width: 127, height: 114, label: "3-11" },
      { x: 163, y: 304, width: 100, height: 114, label: "3-10" },
      { x: 318, y: 304, width: 66, height: 114, label: "3-9" },
      { x: 396, y: 304, width: 64, height: 114, label: "3-8" },
      { x: 470, y: 304, width: 68, height: 114, label: "3-7" },
      { x: 587, y: 300, width: 96, height: 117, label: "実習室" },
    ],
  },
} satisfies Record<Exclude<VenueFloor, "屋外">, { src: string; height: number; masks: RoomMask[] }>;

const floors: VenueFloor[] = ["屋外", "1F", "2F", "3F"];

function Floorplan({ floor }: { floor: Exclude<VenueFloor, "屋外"> }) {
  const plan = indoorPlans[floor];
  return (
    <>
      <img className="venue-base" src={plan.src} width={800} height={plan.height} alt="" />
      <svg className="venue-label-overlay" viewBox={`0 0 800 ${plan.height}`} aria-hidden="true">
        {plan.masks.map((mask, index) => (
          <g key={index}>
            <rect x={mask.x} y={mask.y} width={mask.width} height={mask.height} fill="#fff" />
            {"label" in mask && (
              <text x={mask.x + mask.width / 2} y={mask.y + mask.height / 2} textAnchor="middle" dominantBaseline="central">
                {mask.label === "iU Presentation Room" ? (
                  <>
                    <tspan x={mask.x + mask.width / 2} dy="-1.2em">iU</tspan>
                    <tspan x={mask.x + mask.width / 2} dy="1.2em">Presentation</tspan>
                    <tspan x={mask.x + mask.width / 2} dy="1.2em">Room</tspan>
                  </>
                ) : mask.label}
              </text>
            )}
          </g>
        ))}
        {floor === "2F" && (
          <g stroke="#d1d1d1" strokeWidth="2">
            {[440, 472, 502, 533, 562, 591, 622, 652, 682, 712, 741].map((x) => <line key={x} x1={x} y1="21" x2={x} y2="106" />)}
            {[560, 590, 621, 650, 680, 711, 740].map((x) => <line key={x} x1={x} y1="320" x2={x} y2="412" />)}
          </g>
        )}
      </svg>
    </>
  );
}

export function VenueMap({ ghosts, progress, weather, onWeatherChange, showPrize }: VenueMapProps) {
  const [floor, setFloor] = useState<VenueFloor>("1F");
  const unlocked = hasAllGoodStamps(progress);
  const visible = ghosts
    .filter((ghost) => ghost.type === "good" || unlocked)
    .map((ghost) => ({ ghost, placement: getGhostPlacement(ghost.id, weather), number: ghosts.indexOf(ghost) + 1 }))
    .filter((entry) => entry.placement?.floor === floor);
  const prizeVisible = showPrize && isRallyComplete(progress) && prizeLocation.floor === floor;

  return (
    <section className="panel map-panel venue-panel" aria-labelledby="venue-heading">
      <div className="panel-title">
        <div>
          <p className="label">VENUE MAP</p>
          <h2 id="venue-heading">おばけを探そう</h2>
        </div>
      </div>
      <fieldset className="venue-weather">
        <legend>当日の配置</legend>
        {(["sunny", "rainy"] as const).map((mode) => (
          <label key={mode}>
            <input type="radio" name="venue-weather" value={mode} checked={weather === mode} onChange={() => onWeatherChange(mode)} />
            {mode === "sunny" ? "晴天" : "雨天"}
          </label>
        ))}
      </fieldset>
      <p className="venue-weather-help">会場の案内に合わせて、晴天・雨天を切り替えてね。</p>
      <div className="venue-floors" role="group" aria-label="表示するフロア">
        {floors.map((candidate) => (
          <button type="button" key={candidate} aria-pressed={floor === candidate} onClick={() => setFloor(candidate)}>
            {candidate}
          </button>
        ))}
      </div>
      {floor === "屋外" ? (
        <div className="venue-outdoor" aria-label="屋外の設置場所">
          <p>屋外のおばけは、次の目印を探してね。</p>
          <div className="venue-outdoor-cards">
            {visible.map(({ ghost, placement, number }) => (
              <div className="venue-outdoor-card" key={ghost.id}>
                <span className={`venue-number ${ghost.type} ${isGhostComplete(progress, ghost.id) ? "done" : ""}`}>{number}</span>
                <strong>{ghost.name}</strong>
                <span>{placement?.location}</span>
              </div>
            ))}
          </div>
          {!visible.length && <p>この配置では、屋外の表示はありません。</p>}
        </div>
      ) : (
        <div className="venue-scroll" tabIndex={0} aria-label={`${floor}の会場図。横にスクロールできます。`}>
          <div className="venue-plan" style={{ aspectRatio: `800 / ${indoorPlans[floor].height}` }}>
            <Floorplan floor={floor} />
            {visible.filter(({ placement }) => placement?.position).map(({ ghost, placement, number }) => (
              <div className={`venue-marker ${ghost.type} ${isGhostComplete(progress, ghost.id) ? "done" : ""}`} key={ghost.id} style={placement?.position} role="img" aria-label={`${ghost.name}：${placement?.location}`}>
                <span>{number}</span>
              </div>
            ))}
            {prizeVisible && (
              <div className="venue-marker venue-prize" style={prizeLocation.position} role="img" aria-label={`景品受け取り場所：${prizeLocation.location}`}>
                <span>★</span>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="venue-map-help">
        {floor === "屋外"
          ? "屋外は目印の案内です。建物との距離や方角は会場で確認してね。"
          : "番号は設置場所の目安です。下の場所案内と合わせて探してね。地図は横に動かせます。"}
        おばけとの会話は現地のNFCタグにタッチして始めよう。
      </p>
      <ol className="venue-locations" aria-label={`${floor}のおばけの場所`}>
        {visible.map(({ ghost, placement, number }) => (
          <li key={ghost.id}>
            <span className={`venue-number ${ghost.type} ${isGhostComplete(progress, ghost.id) ? "done" : ""}`} aria-hidden="true">{number}</span>
            <div><strong>{ghost.name}</strong><span>{placement?.location}</span></div>
            {isGhostComplete(progress, ghost.id) && <small>なかよし</small>}
          </li>
        ))}
        {prizeVisible && (
          <li className="venue-prize-location"><span className="venue-number prize" aria-hidden="true">★</span><div><strong>景品受け取り場所</strong><span>{prizeLocation.location}</span></div></li>
        )}
      </ol>
      {!visible.length && !prizeVisible && <p className="venue-empty">このフロアのおばけは、まだ表示されていません。</p>}
    </section>
  );
}
