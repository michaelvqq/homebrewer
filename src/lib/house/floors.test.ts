import { test } from "node:test";
import assert from "node:assert/strict";
import { footprint, levels, roomFloor, slabPieces, STOREY } from "./floors";
import { exteriorSpans } from "./exterior";
import { houseSpecSchema, type HouseSpec } from "./spec";

const r = (id: string, x: number, z: number, width: number, depth: number, floor?: number) => ({
  id, name: id, x, z, width, depth, floor, wallColor: "#ffffff", floorColor: "#cccccc",
});

test("rooms without a floor are on the ground floor; levels lists the floors in use", () => {
  const spec: HouseSpec = { rooms: [r("a", 0, 0, 4, 4), r("b", 0, 0, 4, 4, 1)], doors: [], windows: [], furniture: [] };
  assert.equal(houseSpecSchema.safeParse(spec).success, true);
  assert.equal(roomFloor(spec.rooms[0]), 0);
  assert.deepEqual(levels(spec), [0, 1]);
  assert.ok(STOREY > 2.6);
});

test("footprint swaps width and depth for 90/270 rotations", () => {
  assert.deepEqual(footprint({ type: "stairs", x: 5, z: 5, rotation: 0 }), { x: 4.5, z: 3.5, w: 1, d: 3 });
  assert.deepEqual(footprint({ type: "stairs", x: 5, z: 5, rotation: 90 }), { x: 3.5, z: 4.5, w: 3, d: 1 });
});

test("slabPieces cuts a hole out of a rectangle", () => {
  const room = { x: 0, z: 0, w: 4, d: 4 };
  assert.deepEqual(slabPieces(room, []), [room]);
  const pieces = slabPieces(room, [{ x: 1, z: 1, w: 1, d: 2 }]);
  const area = pieces.reduce((a, p) => a + p.w * p.d, 0);
  assert.equal(area, 16 - 2);
  assert.deepEqual(slabPieces(room, [{ x: 10, z: 10, w: 1, d: 1 }]), [room]);
});

test("rooms on another floor don't make a wall interior", () => {
  const rooms = [r("down", 0, 0, 4, 4), r("up", 4, 0, 4, 4, 1)];
  assert.deepEqual(exteriorSpans(rooms[0], "e", rooms), [[0, 4]]);
});
