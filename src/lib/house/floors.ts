import { CATALOG, type FurnitureType } from "./catalog";
import type { HouseSpec } from "./spec";

// Height of one storey: a 2.6 m wall plus a 0.2 m floor slab.
export const STOREY = 2.8;
export const SLAB = 0.2;

export type Rect = { x: number; z: number; w: number; d: number };

export const roomFloor = (room: { floor?: number }) => room.floor ?? 0;

// Floors in use, lowest first.
export function levels(spec: HouseSpec): number[] {
  return [...new Set(spec.rooms.map(roomFloor))].sort((a, b) => a - b);
}

// The rectangle an item covers on the ground, after rotation.
export function footprint(item: { type: FurnitureType; x: number; z: number; rotation: number }): Rect {
  const { w, d } = CATALOG[item.type];
  const [fw, fd] = item.rotation === 90 || item.rotation === 270 ? [d, w] : [w, d];
  return { x: item.x - fw / 2, z: item.z - fd / 2, w: fw, d: fd };
}

// Splits a rectangle into pieces that leave out the holes (e.g. a stairwell in a floor slab).
export function slabPieces(rect: Rect, holes: Rect[]): Rect[] {
  let pieces = [rect];
  for (const h of holes) {
    pieces = pieces.flatMap((p) => {
      const x0 = Math.max(p.x, h.x);
      const x1 = Math.min(p.x + p.w, h.x + h.w);
      const z0 = Math.max(p.z, h.z);
      const z1 = Math.min(p.z + p.d, h.z + h.d);
      if (x1 <= x0 || z1 <= z0) return [p];
      const out: Rect[] = [
        { x: p.x, z: p.z, w: p.w, d: z0 - p.z }, // north strip
        { x: p.x, z: z1, w: p.w, d: p.z + p.d - z1 }, // south strip
        { x: p.x, z: z0, w: x0 - p.x, d: z1 - z0 }, // west strip
        { x: x1, z: z0, w: p.x + p.w - x1, d: z1 - z0 }, // east strip
      ];
      return out.filter((o) => o.w > 0.01 && o.d > 0.01);
    });
  }
  return pieces;
}
