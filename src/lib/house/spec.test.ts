import { test } from "node:test";
import assert from "node:assert/strict";
import { houseSpecSchema, sanitizeSpec, type HouseSpec } from "./spec";

const sample: HouseSpec = {
  rooms: [
    { id: "living", name: "Living Room", x: 0, z: 0, width: 5, depth: 4, wallColor: "#eeeeee", floorColor: "#c8a27a" },
    { id: "bed1", name: "Bedroom", x: 5, z: 0, width: 4, depth: 4, wallColor: "#dde6f0", floorColor: "#b89270" },
  ],
  doors: [{ roomId: "living", wall: "s", offset: 2, width: 1 }],
  windows: [{ roomId: "bed1", wall: "n", offset: 1, width: 1.5 }],
  furniture: [
    { id: "f1", type: "sofa", roomId: "living", x: 2.5, z: 1, rotation: 0 },
    { id: "f2", type: "bed", roomId: "bed1", x: 7, z: 2, rotation: 90 },
  ],
};

test("valid spec parses", () => {
  assert.equal(houseSpecSchema.safeParse(sample).success, true);
});

test("unknown furniture type is rejected", () => {
  const bad = { ...sample, furniture: [{ ...sample.furniture[0], type: "piano" }] };
  assert.equal(houseSpecSchema.safeParse(bad).success, false);
});

test("sanitizeSpec drops out-of-room furniture and openings with unknown rooms", () => {
  const dirty: HouseSpec = {
    ...sample,
    doors: [...sample.doors, { roomId: "ghost", wall: "e", offset: 0, width: 1 }],
    furniture: [...sample.furniture, { id: "f3", type: "chair", roomId: "living", x: 12, z: 1, rotation: 0 }],
  };
  const clean = sanitizeSpec(dirty);
  assert.equal(clean.doors.length, 1);
  assert.deepEqual(clean.furniture.map((f) => f.id), ["f1", "f2"]);
});
