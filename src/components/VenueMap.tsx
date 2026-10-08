import { useState } from "react";
import { hasAllGoodStamps, isGhostComplete, isRallyComplete, type Ghost, type Progress } from "../lib/rally";
import { getGhostArtwork, ARTWORK_WIDTH, ARTWORK_HEIGHT } from "../lib/artwork";
import {
  getGhostPlacement,
  getPrizeLocation,
  getFloorplan,
  type VenueFloor,
  type WeatherMode,
} from "../lib/venue";
import "../venue-map.css";

type VenueMapProps = {
  ghosts: Ghost[];
  progress: Progress;
  weather: WeatherMode;
  weatherReady: boolean;
  weatherError: boolean;
  onWeatherRetry: () => void;
  showPrize: boolean;
};

const floors: VenueFloor[] = ["屋外", "1F", "2F", "3F"];

function Floorplan({ floor, weather, unlocked, prizeVisible }: { floor: Exclude<VenueFloor, "屋外">; weather: WeatherMode; unlocked: boolean; prizeVisible: boolean }) {
  const plan = getFloorplan(floor, weather);
  return <>
    <img className="venue-base" src={plan.src} width={plan.width} height={plan.height} alt={`${floor}の会場図（${weather === "sunny" ? "晴天" : "雨天"}時）`} />
    {floor === "1F" && <svg className="venue-source-mask" viewBox="0 0 2000 1414" aria-hidden="true">
      {!unlocked && ["bad-01", "bad-02"].map((id) => {
        const position = getGhostPlacement(id, weather)!.position!;
        return <circle key={id} data-hidden-ghost={id} cx={parseFloat(position.left) * 20} cy={parseFloat(position.top) * 14.14} r="51"
          fill={weather === "sunny" && id === "bad-01" ? "#e4bd4e" : "#000"} />;
      })}
      {!prizeVisible && <rect data-hidden-prize="true" x="960" y="580" width="238" height="286" fill="#000" />}
    </svg>}
  </>;
}

export function VenueMap({ ghosts, progress, weather, weatherReady, weatherError, onWeatherRetry, showPrize }: VenueMapProps) {
  const [floor, setFloor] = useState<VenueFloor>("1F");
  const prizeLocation = getPrizeLocation(weather);
  const unlocked = hasAllGoodStamps(progress);
  const visible = ghosts
    .filter((ghost) => ghost.type === "good" || unlocked)
    .map((ghost) => ({ ghost, placement: getGhostPlacement(ghost.id, weather), number: ghosts.indexOf(ghost) + 1 }))
    .filter(({ placement }) => floor === "屋外" ? placement?.floor === floor : (placement?.mapFloor ?? placement?.floor) === floor);
  const prizeVisible = showPrize && isRallyComplete(progress) && prizeLocation.floor === floor;

  return (
    <section className="panel map-panel venue-panel" aria-labelledby="venue-heading">
      <div className="panel-title">
        <div>
          <p className="label">VENUE MAP</p>
          <h2 id="venue-heading">おばけを探そう</h2>
        </div>
      </div>
      <p className="venue-weather-help" role="status">
        {weatherReady ? `当日の配置：${weather === "sunny" ? "晴天" : "雨天"}（運営が設定）` : weatherError ? "配置設定を取得できません。会場の案内を確認してください。" : "当日の配置を確認中…"}
      </p>
      {weatherError && <p role="alert">{weatherReady ? "最新の配置を確認できません。最後に取得した配置を表示しています。" : "接続後に再試行してください。"}
        <button type="button" className="text-button" onClick={onWeatherRetry}>配置を再確認</button>
      </p>}
      {weatherReady && <>
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
          <div className="venue-plan venue-plan-sunny" style={{ aspectRatio: "2000 / 1414" }}>
            <Floorplan floor={floor} weather={weather} unlocked={unlocked} prizeVisible={prizeVisible} />
            {visible.filter(({ placement }) => placement?.position).map(({ ghost, placement, number }) => {
              const artwork = floor !== "1F" || ghost.type === "bad" ? getGhostArtwork(ghost.id, "stamp") : undefined;
              return <div className={`venue-marker sunny-marker ${ghost.type} ${isGhostComplete(progress, ghost.id) ? "done" : ""}`} key={ghost.id} style={placement?.position} role="img" aria-label={`${ghost.name}：${placement?.location}`}>
                {artwork && <svg className={`venue-ghost-art ${["good-02", "good-05", "good-06"].includes(ghost.id) ? "venue-round-art" : ""}`} viewBox={artwork.viewBox} aria-hidden="true" focusable="false"><image href={artwork.src} width={ARTWORK_WIDTH} height={ARTWORK_HEIGHT} /></svg>}
                <span className="venue-marker-number">{number}</span>
              </div>;
            })}
            {prizeVisible && (
              <div className="venue-marker venue-prize sunny-prize-marker" style={prizeLocation.position} role="img" aria-label={`景品受け取り場所：${prizeLocation.location}`}>
                {floor !== "1F" && <svg className="venue-prize-art" viewBox="667 295 681 821" aria-hidden="true" focusable="false"><image href="/maps/rally-prize-20261008.png" width="2000" height="1414" /></svg>}
                <span className="venue-marker-number">★</span>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="venue-map-help">
        {floor === "屋外"
          ? "屋外は目印の案内です。建物との距離や方角は会場で確認してね。"
          : weather === "sunny" && floor === "1F"
            ? "1F図には建物周辺の屋外のおばけも表示しています。番号と下の場所案内を合わせて探してね。地図は横に動かせます。"
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
      </>}
      {!visible.length && !prizeVisible && <p className="venue-empty">このフロアのおばけは、まだ表示されていません。</p>}
    </section>
  );
}
