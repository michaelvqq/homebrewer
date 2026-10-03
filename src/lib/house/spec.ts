import { z } from "zod";
import { FURNITURE_TYPES } from "./catalog";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const roomSchema = z.object({
  id: z.string().min(1), name: z.string().min(1),
  x: z.number(), z: z.number(), width: z.number().min(1.5).max(20), depth: z.number().min(1.5).max(20),
  wallColor: hex, floorColor: hex,
});
export const openingSchema = z.object({
  roomId: z.string(), wall: z.enum(["n","s","e","w"]), offset: z.number().min(0), width: z.number().min(0.6).max(4),
});
export const furnitureSchema = z.object({
  id: z.string(), type: z.enum(FURNITURE_TYPES), roomId: z.string(),
  x: z.number(), z: z.number(), rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  color: hex.optional(),
});
export const layoutSchema = z.object({
  rooms: z.array(roomSchema).min(1).max(12), doors: z.array(openingSchema), windows: z.array(openingSchema),
});
export const furnishingSchema = z.object({ furniture: z.array(furnitureSchema).max(80) });
export const houseSpecSchema = layoutSchema.extend(furnishingSchema.shape);
export type HouseSpec = z.infer<typeof houseSpecSchema>;

export function sanitizeSpec(spec: HouseSpec): HouseSpec {
  const rooms = new Map(spec.rooms.map((r) => [r.id, r]));
  const inside = (f: HouseSpec["furniture"][number]) => {
    const r = rooms.get(f.roomId);
    return !!r && f.x >= r.x && f.x <= r.x + r.width && f.z >= r.z && f.z <= r.z + r.depth;
  };
  return {
    rooms: spec.rooms,
    doors: spec.doors.filter((d) => rooms.has(d.roomId)),
    windows: spec.windows.filter((w) => rooms.has(w.roomId)),
    furniture: spec.furniture.filter(inside),
  };
}
