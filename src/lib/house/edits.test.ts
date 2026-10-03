import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "./catalog";
import { addFurniture, recolorRoom, removeFurniture } from "./edits";
import { sanitizeSpec, type HouseSpec } from "./spec";

const base: HouseSpec = {
  rooms: [{ id: "living", name: "Living Room", x: 0, z: 0, width: 5, depth: 4, wallColor: "#eeeeee", floorColor: "#c8a27a" }],
  doors: [],
  windows: [],
  furniture: [{ id: "sofa1", type: "sofa", roomId: "living", x: 2.5, z: 0.8, rotation: 0 }],
};

test("addFurniture places a new item inside the room without overlapping existing furniture", () => {
  const next = addFurniture(base, "plant", "living");
  assert.equal(next.furniture.length, 2);
  const plant = next.furniture[1];
  assert.equal(plant.type, "plant");
  assert.equal(sanitizeSpec(next).furniture.length, 2, "plant must be inside the room");
  const sofa = base.furniture[0];
  const overlapX = Math.abs(plant.x - sofa.x) < (CATALOG.plant.w + CATALOG.sofa.w) / 2;
  const overlapZ = Math.abs(plant.z - sofa.z) < (CATALOG.plant.d + CATALOG.sofa.d) / 2;
  assert.ok(!(overlapX && overlapZ), "plant overlaps the sofa");
  assert.notEqual(plant.id, sofa.id);
});

test("addFurniture still adds the item (at the room center) when the room is full", () => {
  let spec = base;
  for (let i = 0; i < 30; i++) spec = addFurniture(spec, "bookshelf", "living");
  assert.equal(spec.furniture.length, 31);
  assert.equal(sanitizeSpec(spec).furniture.length, 31);
});

test("removeFurniture removes only that item", () => {
  assert.deepEqual(removeFurniture(base, "sofa1").furniture, []);
  assert.equal(removeFurniture(base, "nope").furniture.length, 1);
});

test("recolorRoom changes walls or floor of one room", () => {
  assert.equal(recolorRoom(base, "living", "walls", "#a3b18a").rooms[0].wallColor, "#a3b18a");
  assert.equal(recolorRoom(base, "living", "floor", "#6b4a2f").rooms[0].floorColor, "#6b4a2f");
  assert.equal(recolorRoom(base, "living", "floor", "#6b4a2f").rooms[0].wallColor, "#eeeeee");
});
