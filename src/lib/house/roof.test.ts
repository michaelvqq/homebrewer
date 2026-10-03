import { test } from "node:test";
import assert from "node:assert/strict";
import { roofPlan } from "./roof";
import type { HouseSpec } from "./spec";

const r = (id: string, x: number, z: number, width: number, depth: number, floor = 0, kind?: "outdoor") => ({
  id, name: id, x, z, width, depth, floor, kind, wallColor: "#ffffff", floorColor: "#cccccc",
});
const spec = (rooms: HouseSpec["rooms"]): HouseSpec => ({ rooms, doors: [], windows: [], furniture: [] });

test("a rectangular single-storey house gets one gable roof with the ridge along its long side", () => {
  const plan = roofPlan(spec([r("a", 0, 0, 6, 4), r("b", 6, 0, 4, 4), r("yard", 0, 4, 10, 8, 0, "outdoor")]));
  assert.deepEqual(plan, [{ kind: "gable", floor: 0, rect: { x: 0, z: 0, w: 10, d: 4 }, ridge: "x" }]);
});

test("an L-shaped top floor gets flat roofs per room", () => {
  const plan = roofPlan(spec([r("a", 0, 0, 6, 4), r("b", 0, 4, 3, 3)]));
  assert.equal(plan.length, 2);
  assert.ok(plan.every((p) => p.kind === "flat" && p.floor === 0));
});

test("two storeys: gable on top, flat roof only over the uncovered part of the ground floor", () => {
  const plan = roofPlan(spec([r("down", 0, 0, 8, 6), r("up", 0, 0, 5, 6, 1)]));
  const gable = plan.find((p) => p.kind === "gable");
  assert.deepEqual(gable, { kind: "gable", floor: 1, rect: { x: 0, z: 0, w: 5, d: 6 }, ridge: "z" });
  const flats = plan.filter((p) => p.kind === "flat");
  assert.deepEqual(flats, [{ kind: "flat", floor: 0, rect: { x: 5, z: 0, w: 3, d: 6 } }]);
});
