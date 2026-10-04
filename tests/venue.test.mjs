import assert from "node:assert/strict";
import { test } from "node:test";
import { ghosts } from "../src/lib/rally.ts";
import { getGhostPlacement, prizeLocation } from "../src/lib/venue.ts";

test("both weather arrangements place all eleven confirmed ghosts", () => {
  for (const weather of ["sunny", "rainy"]) {
    for (const ghost of ghosts) {
      const placement = getGhostPlacement(ghost.id, weather);
      assert.ok(placement, `${weather} placement is missing for ${ghost.id}`);
      assert.ok(["屋外", "1F", "2F", "3F"].includes(placement.floor));
      assert.ok(placement.location.trim());
      assert.doesNotMatch(placement.location, /確認中|未定/);
      assert.ok(placement.position, `${weather} marker is missing for ${ghost.id}`);
      for (const coordinate of Object.values(placement.position)) {
        assert.match(coordinate, /^\d+(?:\.\d+)?%$/);
        assert.ok(parseFloat(coordinate) >= 0 && parseFloat(coordinate) <= 100);
      }
    }
    assert.equal(getGhostPlacement("unknown", weather), undefined);
  }
});

test("the reception cats move indoors for rain and indoor ghosts stay in place", () => {
  for (const id of ["good-01", "good-02"]) {
    assert.equal(getGhostPlacement(id, "sunny").floor, "屋外");
    assert.equal(getGhostPlacement(id, "rainy").floor, "1F");
  }
  assert.match(getGhostPlacement("good-01", "sunny").location, /駐輪場/);
  assert.match(getGhostPlacement("good-02", "sunny").location, /グラウンド/);
  assert.match(getGhostPlacement("good-01", "rainy").location, /iUロゴ/);
  assert.match(getGhostPlacement("good-02", "rainy").location, /事務室/);
  const indoorFloors = {
    "good-03": "1F",
    "good-05": "2F",
    "good-06": "2F",
    "good-07": "3F",
    "good-08": "3F",
    "good-09": "3F",
  };
  for (const [id, floor] of Object.entries(indoorFloors)) {
    const sunny = getGhostPlacement(id, "sunny");
    assert.equal(sunny.floor, floor);
    assert.deepEqual(getGhostPlacement(id, "rainy"), sunny);
  }
  assert.match(getGhostPlacement("good-06", "sunny").location, /iU HUB/);
  assert.match(getGhostPlacement("good-09", "sunny").location, /3-10.*給湯室/);
});

test("bad ghosts use the confirmed current Canva arrangement when rainy", () => {
  assert.equal(getGhostPlacement("bad-01", "sunny").floor, "屋外");
  assert.match(getGhostPlacement("bad-01", "sunny").location, /大きな木/);
  assert.equal(getGhostPlacement("bad-02", "sunny").floor, "屋外");
  assert.match(getGhostPlacement("bad-02", "sunny").location, /倉庫/);
  assert.equal(getGhostPlacement("bad-01", "rainy").floor, "1F");
  assert.match(getGhostPlacement("bad-01", "rainy").location, /入口/);
  assert.equal(getGhostPlacement("bad-02", "rainy").floor, "1F");
  assert.match(getGhostPlacement("bad-02", "rainy").location, /景品受け取り場所/);
});

test("the prize is at the entrance opposite the television wall", () => {
  assert.equal(prizeLocation.floor, "1F");
  assert.match(prizeLocation.location, /入口/);
  assert.match(prizeLocation.location, /テレビ.*向かい/);
  assert.ok(prizeLocation.position);
});
