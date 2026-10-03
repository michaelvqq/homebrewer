import { isOutdoor, type HouseSpec } from "./spec";

type Room = HouseSpec["rooms"][number];
export type Side = "n" | "s" | "e" | "w";

const EPS = 0.05;

// Parts of a room's wall (as [from, to] meters along the wall) that face outside, i.e. no other
// indoor room sits on the far side. Same along-wall convention as doors: west->east for n/s, north->south for e/w.
export function exteriorSpans(room: Room, side: Side, rooms: Room[]): [number, number][] {
  const alongX = side === "n" || side === "s";
  const line = side === "n" ? room.z : side === "s" ? room.z + room.depth : side === "w" ? room.x : room.x + room.width;
  const start = alongX ? room.x : room.z;
  const length = alongX ? room.width : room.depth;

  const covered: [number, number][] = [];
  for (const o of rooms) {
    if (o.id === room.id || isOutdoor(o) || (o.floor ?? 0) !== (room.floor ?? 0)) continue;
    const far = side === "n" ? o.z + o.depth : side === "s" ? o.z : side === "w" ? o.x + o.width : o.x;
    if (Math.abs(far - line) > EPS) continue;
    const a = Math.max(0, (alongX ? o.x : o.z) - start);
    const b = Math.min(length, (alongX ? o.x + o.width : o.z + o.depth) - start);
    if (b - a > EPS) covered.push([a, b]);
  }
  covered.sort((p, q) => p[0] - q[0]);

  const spans: [number, number][] = [];
  let cursor = 0;
  for (const [a, b] of covered) {
    if (a - cursor > EPS) spans.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (length - cursor > EPS) spans.push([cursor, length]);
  return spans;
}

const OPPOSITE: Record<Side, Side> = { n: "s", s: "n", e: "w", w: "e" };

// Doors that other rooms put on the far side of this wall, re-expressed on this room's wall,
// so the shared wall is open from both sides.
export function neighborDoors(room: Room, side: Side, rooms: Room[], doors: HouseSpec["doors"]): HouseSpec["doors"] {
  const alongX = side === "n" || side === "s";
  const line = side === "n" ? room.z : side === "s" ? room.z + room.depth : side === "w" ? room.x : room.x + room.width;
  const start = alongX ? room.x : room.z;
  const out: HouseSpec["doors"] = [];
  for (const d of doors) {
    if (d.roomId === room.id || d.wall !== OPPOSITE[side]) continue;
    const o = rooms.find((r) => r.id === d.roomId);
    if (!o || isOutdoor(o) || (o.floor ?? 0) !== (room.floor ?? 0)) continue;
    const far = side === "n" ? o.z + o.depth : side === "s" ? o.z : side === "w" ? o.x + o.width : o.x;
    if (Math.abs(far - line) > EPS) continue;
    out.push({ ...d, roomId: room.id, wall: side, offset: (alongX ? o.x : o.z) + d.offset - start });
  }
  return out;
}
