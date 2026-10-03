import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { FURNITURE_TYPES } from "./catalog";
import { houseSpecSchema, isOutdoor, layoutLlmSchema, sanitizeSpec, type HouseSpec } from "./spec";

const withYard: HouseSpec = {
  rooms: [
    { id: "living", name: "Living Room", x: 0, z: 0, width: 6, depth: 4, wallColor: "#eeeeee", floorColor: "#c8a27a" },
    { id: "yard", name: "Backyard", kind: "outdoor", x: 0, z: 4, width: 10, depth: 8, wallColor: "#eeeeee", floorColor: "#7fb069" },
  ],
  // The model put the back door on the yard's north edge; the walls that exist belong to the living room.
  doors: [{ roomId: "yard", wall: "n", offset: 2, width: 1.2 }],
  windows: [{ roomId: "yard", wall: "e", offset: 1, width: 1 }],
  furniture: [{ id: "t1", type: "tree", roomId: "yard", x: 8, z: 10, rotation: 0 }],
};

test("old specs without kind still parse and count as indoor", () => {
  const old = { ...withYard, rooms: [{ ...withYard.rooms[0] }], doors: [], windows: [], furniture: [] };
  delete (old.rooms[0] as { kind?: string }).kind;
  assert.equal(houseSpecSchema.safeParse(old).success, true);
  assert.equal(isOutdoor(old.rooms[0]), false);
});

test("outdoor catalog items exist", () => {
  for (const t of ["tree", "bush", "flowerbed", "lounger", "grill", "pool", "fence", "umbrella"]) {
    assert.ok((FURNITURE_TYPES as readonly string[]).includes(t), t);
  }
});

test("a door on an outdoor zone moves onto the adjoining indoor wall", () => {
  const s = sanitizeSpec(withYard);
  assert.deepEqual(s.doors, [{ roomId: "living", wall: "s", offset: 2, width: 1.2 }]);
});

test("windows on outdoor zones are dropped", () => {
  assert.deepEqual(sanitizeSpec(withYard).windows, []);
});

test("a door on an outdoor edge with no house wall behind it is dropped", () => {
  const s = sanitizeSpec({ ...withYard, doors: [{ roomId: "yard", wall: "s", offset: 2, width: 1 }] });
  assert.deepEqual(s.doors, []);
});

test("architect output schema requires kind on every room (OpenAI strict mode)", () => {
  const json = z.toJSONSchema(layoutLlmSchema) as unknown as { properties: { rooms: { items: { required: string[] } } } };
  assert.ok(json.properties.rooms.items.required.includes("kind"));
});
