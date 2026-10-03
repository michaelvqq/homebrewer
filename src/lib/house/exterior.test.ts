import { test } from "node:test";
import assert from "node:assert/strict";
import { exteriorSpans } from "./exterior";
import type { HouseSpec } from "./spec";

const room = (id: string, x: number, z: number, width: number, depth: number, kind?: "indoor" | "outdoor") => ({
  id,
  name: id,
  x,
  z,
  width,
  depth,
  kind,
  wallColor: "#ffffff",
  floorColor: "#cccccc",
});

const rooms: HouseSpec["rooms"] = [
  room("living", 0, 0, 6, 4),
  room("bed", 6, 0, 3, 2), // covers the top 2 m of living's east wall
  room("yard", 0, 4, 9, 6, "outdoor"), // outdoor zones don't hide walls
];

test("a wall with no indoor neighbor is fully exterior", () => {
  assert.deepEqual(exteriorSpans(rooms[0], "n", rooms), [[0, 6]]);
  assert.deepEqual(exteriorSpans(rooms[0], "s", rooms), [[0, 6]]);
});

test("a shared wall is interior; a partly shared wall keeps the uncovered part", () => {
  assert.deepEqual(exteriorSpans(rooms[1], "w", rooms), []);
  assert.deepEqual(exteriorSpans(rooms[0], "e", rooms), [[2, 4]]);
});
