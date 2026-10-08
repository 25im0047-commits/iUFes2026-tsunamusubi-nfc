import assert from "node:assert/strict";
import { test } from "node:test";
import { ghosts } from "../src/lib/rally.ts";
import { getGhostPlacement, getPrizeLocation, getFloorplan, isPlacementOnFloor } from "../src/lib/venue.ts";
test("both arrangements place all eleven ghosts with bounded coordinates",()=>{
 for(const weather of ["sunny","rainy"])for(const ghost of ghosts){
  const placement=getGhostPlacement(ghost.id,weather);assert.ok(placement);
  assert.ok(placement.location.trim());
  for(const coordinate of Object.values(placement.position))assert.ok(parseFloat(coordinate)>=0&&parseFloat(coordinate)<=100);
 }
 assert.equal(getGhostPlacement("unknown","sunny"),undefined);
});
test("latest rainy 1F relocates cats, Franken and survey ghosts to supplied positions",()=>{
 assert.equal(getGhostPlacement("good-04","sunny").floor,"屋外");
 assert.equal(getGhostPlacement("good-04","rainy").floor,"1F");
 assert.match(getGhostPlacement("good-04","rainy").location,/Cafe内/);
 assert.equal(getGhostPlacement("good-04","sunny").position.left,"23.5%");
 assert.equal(getGhostPlacement("good-01","rainy").position.left,"57.6%");
 assert.equal(getGhostPlacement("good-02","rainy").position.left,"50.0%");
 assert.equal(getGhostPlacement("bad-01","rainy").mapFloor,"1F");
 assert.equal(getGhostPlacement("bad-02","rainy").floor,"1F");
});
test("only 1F changes between weather modes; upper floors and prize remain common",()=>{
 for(const id of ["good-05","good-06","good-07","good-08","good-09"])assert.deepEqual(getGhostPlacement(id,"sunny"),getGhostPlacement(id,"rainy"));
 for(const floor of ["2F","3F"])assert.deepEqual(getFloorplan(floor,"sunny"),getFloorplan(floor,"rainy"));
 assert.equal(getFloorplan("1F","sunny").src,"/maps/rally-map-1f-sunny-20261008.png");
 assert.deepEqual(getFloorplan("1F","sunny"),getFloorplan("1F","rainy"));
 assert.deepEqual(getPrizeLocation("sunny"),getPrizeLocation("rainy"));
 assert.match(getPrizeLocation("rainy").location,/中央.*エレベーター左側/);
});

test("outdoor installations shown on 1F never appear twice in the outdoor tab",()=>{
 for(const weather of ["sunny","rainy"]) {
  for(const id of ["good-01","good-02","good-03","good-04","bad-01","bad-02"]) {
   const placement=getGhostPlacement(id,weather);
   assert.equal(isPlacementOnFloor(placement,"1F"),true);
   assert.equal(isPlacementOnFloor(placement,"屋外"),false);
  }
 }
 assert.equal(isPlacementOnFloor({floor:"屋外",location:"屋外専用"},"屋外"),true);
 assert.equal(isPlacementOnFloor(undefined,"屋外"),false);
});
