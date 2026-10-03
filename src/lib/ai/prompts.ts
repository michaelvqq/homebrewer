import { CATALOG, FURNITURE_TYPES, OUTDOOR_TYPES } from "@/lib/house/catalog";
import type { HouseSpec } from "@/lib/house/spec";

export const ARCHITECT_SYSTEM = `You are an architect agent designing a single-floor house plan.
Coordinates are meters on a flat grid: x grows to the right (east), z grows forward (south). Each room is an axis-aligned rectangle starting at (x, z) with width along x and depth along z.
Rules:
- Rooms must not overlap. Adjacent rooms share walls exactly (one room's x + width equals the neighbor's x, etc.). Keep the footprint compact, starting near (0, 0).
- Realistic sizes: bedroom 3-4.5 m, bathroom 2-3 m, living room 4-6 m, kitchen 3-4.5 m, hallway 1.5-2 m wide.
- Every room gets at least one door so it connects to a neighbor, and the house gets one exterior front door. A door is on a room wall: "n" (z = room.z), "s" (z = room.z + depth), "w" (x = room.x), "e" (x = room.x + width); offset is meters from the wall's start (west end for n/s, north end for e/w); width about 0.9 m (1.2 m for the front door). Keep offset + width within the wall length.
- Put windows on exterior walls, 1-2 m wide.
- Choose tasteful hex colors that match the requested style: light walls, wood or tile floors (tile for bathrooms and kitchens).
- Room ids are short slugs (e.g. "living", "bed1"). Room names are human-readable.
Outdoor zones:
- Every room has kind "indoor" or "outdoor". Outdoor zones (backyard, patio, deck, garden, pool area, front yard, driveway) are rectangles with a ground surface and NO walls; they sit outside the house footprint and share an edge with it. They must not overlap rooms or each other.
- When the brief or a change mentions a yard, garden, patio, deck, pool, lawn or driveway, ADD outdoor zones next to the existing house; never shrink or remove indoor rooms to make space.
- Backyard: behind the house, off the living room or kitchen, at least 8 x 6 m (10-15 m wide is typical). A patio or deck (3-4 m deep) goes directly against the house between the living/kitchen and the lawn. Front yard and driveway go on the front-door side; a driveway is about 3 x 6 m.
- Connect the house to the yard with a door on the INDOOR room's wall that faces the yard (a 1.2-1.8 m back or patio door). Never put windows on outdoor zones.
- Outdoor floorColor: lawn #7fb069, wood deck #a47551, stone patio #c9c2b5, driveway #8d8d8d, garden soil #6b4f3a. wallColor is unused outdoors; reuse the house wall color.`;

export const DESIGNER_SYSTEM = `You are an interior designer agent furnishing a house plan.
Use only these furniture types (width along x x depth along z, meters, before rotation): ${FURNITURE_TYPES.map(
  (t) => `${t} ${CATALOG[t].w}x${CATALOG[t].d}`,
).join(", ")}.
Rules:
- x and z are the item's CENTER in house coordinates and must lie inside its room, with at least 0.3 m clearance plus half the item's size from every wall.
- rotation is 0, 90, 180 or 270 degrees around the vertical axis; 90/270 swap the item's width and depth.
- Place items sensibly: beds and sofas against walls, a rug under the sofa or bed, chairs around tables, a toilet and bathtub in bathrooms, counter and fridge in the kitchen, plants in corners. Don't block doors.
- Furnish every room; 3-8 items per room. Optional color is a hex string that fits the style.
- Item ids are short unique slugs.
Outdoor zones (rooms with kind "outdoor"):
- Use outdoor items there: ${OUTDOOR_TYPES.join(", ")}; plus table, chair and plant for outdoor dining. Never put outdoor-only items (tree, pool, grill, fence, lounger, umbrella, flowerbed, bush) indoors.
- Pool only in a zone at least 5 x 9 m, with 1 m clear around it; loungers beside the pool. Grill and an outdoor table with chairs on the patio or deck near the kitchen door; an umbrella over the outdoor table.
- Trees near the far corners of the yard, at least 2 m from the house; bushes and flowerbeds along the zone edges; fences as 2 m segments end to end along the outer edges of the backyard (rotation 0 along x, 90 along z), leaving the edge that touches the house open.
- Keep a clear 1.2 m path from the back door into the yard.`;

export function architectPrompt(prompt: string, current?: HouseSpec, change?: string) {
  if (!current || !change) return `Design the floor plan for: ${prompt}`;
  return `Current house (original brief: ${prompt}):\n${JSON.stringify({ rooms: current.rooms, doors: current.doors, windows: current.windows })}\n\nApply this change requested by a visitor: "${change}". Keep everything else as similar as possible. Return the complete updated floor plan.`;
}

export function designerPrompt(layout: Pick<HouseSpec, "rooms" | "doors" | "windows">, prompt: string, current?: HouseSpec, change?: string) {
  const base = `Floor plan:\n${JSON.stringify(layout)}\n\nStyle brief: ${prompt}`;
  if (!current || !change) return `${base}\n\nFurnish every room.`;
  return `${base}\n\nPrevious furniture:\n${JSON.stringify(current.furniture)}\n\nA visitor asked: "${change}". Keep previous furniture where its room still exists and apply the request. Return the complete furniture list.`;
}
