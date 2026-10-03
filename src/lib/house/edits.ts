import { CATALOG, type FurnitureType } from "./catalog";
import type { HouseSpec } from "./spec";

// Deterministic, instant edits applied without a full agent redesign.

type Item = HouseSpec["furniture"][number];
const CLEARANCE = 0.3;
const STEP = 0.25;

function footprint(item: Pick<Item, "type" | "rotation">) {
  const { w, d } = CATALOG[item.type];
  return item.rotation % 180 === 0 ? { w, d } : { w: d, d: w };
}

function overlaps(a: { x: number; z: number; w: number; d: number }, b: { x: number; z: number; w: number; d: number }) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.z - b.z) < (a.d + b.d) / 2;
}

function newId(spec: HouseSpec, type: FurnitureType) {
  const ids = new Set(spec.furniture.map((f) => f.id));
  let n = 1;
  while (ids.has(`${type}-${n}`)) n++;
  return `${type}-${n}`;
}

// Scans the room on a grid, nearest-to-walls first, for a spot that doesn't overlap other items.
// Rugs may sit under things. Falls back to the room center so the request always does something visible.
export function addFurniture(spec: HouseSpec, type: FurnitureType, roomId: string): HouseSpec {
  const room = spec.rooms.find((r) => r.id === roomId);
  if (!room) return spec;
  const { w, d } = footprint({ type, rotation: 0 });
  const others = spec.furniture
    .filter((f) => f.roomId === roomId && f.type !== "rug" && type !== "rug")
    .map((f) => ({ x: f.x, z: f.z, ...footprint(f) }));

  const minX = room.x + CLEARANCE + w / 2, maxX = room.x + room.width - CLEARANCE - w / 2;
  const minZ = room.z + CLEARANCE + d / 2, maxZ = room.z + room.depth - CLEARANCE - d / 2;
  const candidates: { x: number; z: number; edge: number }[] = [];
  for (let x = minX; x <= maxX + 1e-9; x += STEP)
    for (let z = minZ; z <= maxZ + 1e-9; z += STEP)
      candidates.push({ x, z, edge: Math.min(x - minX, maxX - x, z - minZ, maxZ - z) });
  candidates.sort((a, b) => a.edge - b.edge);

  const spot = candidates.find((c) => !others.some((o) => overlaps({ x: c.x, z: c.z, w, d }, o))) ?? {
    x: room.x + room.width / 2,
    z: room.z + room.depth / 2,
  };
  const item: Item = { id: newId(spec, type), type, roomId, x: round(spot.x), z: round(spot.z), rotation: 0 };
  return { ...spec, furniture: [...spec.furniture, item] };
}

export function removeFurniture(spec: HouseSpec, itemId: string): HouseSpec {
  return { ...spec, furniture: spec.furniture.filter((f) => f.id !== itemId) };
}

export function recolorRoom(spec: HouseSpec, roomId: string, target: "walls" | "floor", color: string): HouseSpec {
  return {
    ...spec,
    rooms: spec.rooms.map((r) =>
      r.id !== roomId ? r : target === "walls" ? { ...r, wallColor: color } : { ...r, floorColor: color },
    ),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

export const PALETTE: Record<string, string> = {
  white: "#f5f5f4", cream: "#f3ead8", beige: "#d8c8a8", "light gray": "#d1d5db", charcoal: "#3a3a3a",
  "sage green": "#a3b18a", "forest green": "#3f6b4e", "sky blue": "#a8c8e8", navy: "#2f3e5c",
  terracotta: "#c2683f", "blush pink": "#e8b4b8", "mustard yellow": "#d9a93f", lavender: "#c4b5e0",
  "light wood": "#c8a27a", "dark wood": "#6b4a2f", "gray tile": "#9ca3af",
};
