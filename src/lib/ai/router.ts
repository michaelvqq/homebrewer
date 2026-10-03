import { generateText, Output, type LanguageModel } from "ai";
import { FURNITURE_TYPES, type FurnitureType } from "@/lib/house/catalog";
import { PALETTE, addFurniture, recolorRoom, removeFurniture, roomAt } from "@/lib/house/edits";
import { isOutdoor, type HouseSpec } from "@/lib/house/spec";

// Picks one of a fixed set of options. This is the seam where a faster decision
// endpoint (e.g. OpenAI's Decisions API) can be swapped in.
export async function decide(model: LanguageModel, question: string, options: string[]): Promise<string> {
  const { output } = await generateText({
    model,
    output: Output.choice({ options }),
    prompt: question,
  });
  return output;
}

const OPS = ["add furniture", "remove furniture", "recolor walls", "recolor floor", "redesign layout"] as const;

export type RoutedEdit =
  | { kind: "edit"; spec: HouseSpec; summary: string }
  | { kind: "redesign" };

function describe(spec: HouseSpec) {
  return spec.rooms
    .map((r) => {
      const items = spec.furniture.filter((f) => f.roomId === r.id).map((f) => f.type);
      return `- ${r.name}${isOutdoor(r) ? " (outdoor)" : ""}: ${items.length ? items.join(", ") : "empty"}`;
    })
    .join("\n");
}

export type Focus = { x: number; z: number };

// Turns a free-text request into an instant edit when it's a small change, or asks for a full redesign.
// A focus point (from a pinned suggestion) fixes the room and where new furniture goes.
export async function routeEdit(model: LanguageModel, spec: HouseSpec, request: string, focus?: Focus): Promise<RoutedEdit> {
  const focusRoom = focus ? roomAt(spec, focus.x, focus.z) : undefined;
  const where = focusRoom ? ` (pinned at x=${focus!.x}, z=${focus!.z} in the ${focusRoom.name})` : "";
  const context = `House rooms and furniture:\n${describe(spec)}\n\nRequest${where}: "${request}"`;
  const op = await decide(
    model,
    `${context}\n\nWhich single operation best fulfils the request? Use "redesign layout" for anything that adds, removes or resizes rooms or outdoor areas (a backyard, patio, deck, garden, pool, lawn or driveway that isn't listed above), changes doors or windows, or needs several different changes.`,
    [...OPS],
  );

  const roomNames = spec.rooms.map((r) => r.name);
  const roomByName = (name: string) => spec.rooms.find((r) => r.name === name) ?? spec.rooms[0];
  const pickRoom = async (question: string) => focusRoom ?? roomByName(await decide(model, `${context}\n\n${question}`, roomNames));

  if (op === "add furniture") {
    const [type, room] = await Promise.all([
      decide(model, `${context}\n\nWhich furniture type should be added?`, [...FURNITURE_TYPES]),
      pickRoom("Which room should it go in?"),
    ]);
    const near = focusRoom && focus ? focus : undefined;
    return { kind: "edit", spec: addFurniture(spec, type as FurnitureType, room.id, near), summary: `Added a ${type} to the ${room.name}` };
  }

  if (op === "remove furniture") {
    // With a pin, only consider the items in that room, nearest first.
    const pool = focusRoom
      ? spec.furniture.filter((f) => f.roomId === focusRoom.id).sort((a, b) => Math.hypot(a.x - focus!.x, a.z - focus!.z) - Math.hypot(b.x - focus!.x, b.z - focus!.z))
      : spec.furniture;
    if (!pool.length) return { kind: "redesign" };
    const labels = pool.map((f) => `${f.id}: ${f.type} in ${spec.rooms.find((r) => r.id === f.roomId)?.name ?? f.roomId}`);
    const label = await decide(model, `${context}\n\nWhich item should be removed?`, labels);
    const item = pool[labels.indexOf(label)];
    return { kind: "edit", spec: removeFurniture(spec, item.id), summary: `Removed the ${item.type}` };
  }

  if (op === "recolor walls" || op === "recolor floor") {
    const target = op === "recolor walls" ? "walls" : "floor";
    const [room, colorName] = await Promise.all([
      pickRoom(`Which room's ${target} should change?`),
      decide(model, `${context}\n\nWhich color best matches the request for the ${target}?`, Object.keys(PALETTE)),
    ]);
    return {
      kind: "edit",
      spec: recolorRoom(spec, room.id, target, PALETTE[colorName]),
      summary: `Painted the ${room.name} ${target} ${colorName}`,
    };
  }

  return { kind: "redesign" };
}
