import { z } from "zod";
import { FURNITURE_TYPES } from "./catalog";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
// Outdoor zones (backyard, patio, garden, driveway…) have a ground surface but no walls.
// Stored specs from before outdoor zones have no kind and are indoor.
const roomKind = z.enum(["indoor", "outdoor"]);
export const roomSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), kind: roomKind.optional(),
  x: z.number(), z: z.number(), width: z.number().min(1.5).max(30), depth: z.number().min(1.5).max(30),
  wallColor: hex, floorColor: hex,
});
export const isOutdoor = (room: { kind?: string }) => room.kind === "outdoor";
export const openingSchema = z.object({
  roomId: z.string(), wall: z.enum(["n","s","e","w"]), offset: z.number().min(0), width: z.number().min(0.6).max(4),
});
export const furnitureSchema = z.object({
  id: z.string(), type: z.enum(FURNITURE_TYPES), roomId: z.string(),
  x: z.number(), z: z.number(), rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  color: hex.optional(),
});
export const layoutSchema = z.object({
  rooms: z.array(roomSchema).min(1).max(16), doors: z.array(openingSchema), windows: z.array(openingSchema),
});
// What the architect is asked to produce: kind is required (OpenAI strict mode needs every property required).
export const layoutLlmSchema = layoutSchema.extend({
  rooms: z.array(roomSchema.extend({ kind: roomKind })).min(1).max(16),
});
export const furnishingSchema = z.object({ furniture: z.array(furnitureSchema).max(80) });
export const houseSpecSchema = layoutSchema.extend(furnishingSchema.shape);

// What the model is asked to produce. OpenAI strict mode needs every property required,
// so the optional color becomes a required nullable (null = catalog default).
export const furnishingLlmSchema = z.object({
  furniture: z.array(furnitureSchema.extend({ color: hex.nullable() })).max(80),
});

export function fromLlmFurnishing(out: z.infer<typeof furnishingLlmSchema>): z.infer<typeof furnishingSchema> {
  return { furniture: out.furniture.map(({ color, ...f }) => (color ? { ...f, color } : f)) };
}
export type HouseSpec = z.infer<typeof houseSpecSchema>;

export function sanitizeSpec(spec: HouseSpec): HouseSpec {
  const rooms = new Map(spec.rooms.map((r) => [r.id, r]));
  const inside = (f: HouseSpec["furniture"][number]) => {
    const r = rooms.get(f.roomId);
    return !!r && f.x >= r.x && f.x <= r.x + r.width && f.z >= r.z && f.z <= r.z + r.depth;
  };
  return {
    rooms: spec.rooms,
    doors: spec.doors.flatMap((d) => {
      const room = rooms.get(d.roomId);
      if (!room) return [];
      if (!isOutdoor(room)) return [d];
      const moved = toIndoorWall(spec.rooms, room, d);
      return moved ? [moved] : [];
    }),
    windows: spec.windows.filter((w) => rooms.has(w.roomId) && !isOutdoor(rooms.get(w.roomId)!)),
    furniture: spec.furniture.filter(inside),
  };
}

type Room = HouseSpec["rooms"][number];
type Opening = HouseSpec["doors"][number];
const OPPOSITE = { n: "s", s: "n", e: "w", w: "e" } as const;
const EPS = 0.05;

// Outdoor zones have no walls, so a door on one belongs on the indoor wall it touches (e.g. the back door).
function toIndoorWall(all: Room[], zone: Room, door: Opening): Opening | null {
  const alongX = door.wall === "n" || door.wall === "s";
  const line = door.wall === "n" ? zone.z : door.wall === "s" ? zone.z + zone.depth : door.wall === "w" ? zone.x : zone.x + zone.width;
  const start = (alongX ? zone.x : zone.z) + door.offset;
  const wall = OPPOSITE[door.wall];
  for (const r of all) {
    if (isOutdoor(r)) continue;
    const rLine = wall === "n" ? r.z : wall === "s" ? r.z + r.depth : wall === "w" ? r.x : r.x + r.width;
    const rStart = alongX ? r.x : r.z;
    const rLen = alongX ? r.width : r.depth;
    if (Math.abs(rLine - line) < EPS && start >= rStart - EPS && start + door.width <= rStart + rLen + EPS) {
      return { roomId: r.id, wall, offset: Math.max(0, start - rStart), width: door.width };
    }
  }
  return null;
}
