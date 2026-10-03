import { roomFloor, slabPieces, type Rect } from "./floors";
import { isOutdoor, type HouseSpec } from "./spec";

export type RoofPiece =
  | { kind: "gable"; floor: number; rect: Rect; ridge: "x" | "z" }
  | { kind: "flat"; floor: number; rect: Rect };

const area = (r: Rect) => r.w * r.d;

// Roofs over every part of the house with no storey above it. The top floor gets one gable roof
// when its outline is a rectangle (ridge along the long side); anything else gets flat roof pieces.
export function roofPlan(spec: HouseSpec): RoofPiece[] {
  const indoor = spec.rooms.filter((r) => !isOutdoor(r));
  if (!indoor.length) return [];
  const rect = (r: (typeof indoor)[number]): Rect => ({ x: r.x, z: r.z, w: r.width, d: r.depth });
  const top = Math.max(...indoor.map(roomFloor));
  const pieces: RoofPiece[] = [];

  for (const room of indoor) {
    const floor = roomFloor(room);
    if (floor === top) continue;
    const above = indoor.filter((o) => roomFloor(o) === floor + 1).map(rect);
    for (const p of slabPieces(rect(room), above)) if (area(p) > 0.25) pieces.push({ kind: "flat", floor, rect: p });
  }

  const topRooms = indoor.filter((r) => roomFloor(r) === top).map(rect);
  const x0 = Math.min(...topRooms.map((r) => r.x));
  const z0 = Math.min(...topRooms.map((r) => r.z));
  const x1 = Math.max(...topRooms.map((r) => r.x + r.w));
  const z1 = Math.max(...topRooms.map((r) => r.z + r.d));
  const box = { x: x0, z: z0, w: x1 - x0, d: z1 - z0 };
  const filled = topRooms.reduce((a, r) => a + area(r), 0);
  if (Math.abs(filled - area(box)) < 0.05 * area(box)) {
    pieces.unshift({ kind: "gable", floor: top, rect: box, ridge: box.w >= box.d ? "x" : "z" });
  } else {
    for (const r of topRooms) pieces.push({ kind: "flat", floor: top, rect: r });
  }
  return pieces;
}
