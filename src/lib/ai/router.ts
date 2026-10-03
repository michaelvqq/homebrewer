import { generateText, Output, type LanguageModel } from "ai";
import { FURNITURE_TYPES, type FurnitureType } from "@/lib/house/catalog";
import { PALETTE, addFurniture, recolorRoom, removeFurniture } from "@/lib/house/edits";
import type { HouseSpec } from "@/lib/house/spec";

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
      return `- ${r.name}: ${items.length ? items.join(", ") : "empty"}`;
    })
    .join("\n");
}

// Turns a free-text request into an instant edit when it's a small change, or asks for a full redesign.
export async function routeEdit(model: LanguageModel, spec: HouseSpec, request: string): Promise<RoutedEdit> {
  const context = `House rooms and furniture:\n${describe(spec)}\n\nRequest: "${request}"`;
  const op = await decide(
    model,
    `${context}\n\nWhich single operation best fulfils the request? Use "redesign layout" for anything that adds, removes or resizes rooms, changes doors or windows, or needs several different changes.`,
    [...OPS],
  );

  const roomNames = spec.rooms.map((r) => r.name);
  const roomByName = (name: string) => spec.rooms.find((r) => r.name === name) ?? spec.rooms[0];

  if (op === "add furniture") {
    const [type, roomName] = await Promise.all([
      decide(model, `${context}\n\nWhich furniture type should be added?`, [...FURNITURE_TYPES]),
      decide(model, `${context}\n\nWhich room should it go in?`, roomNames),
    ]);
    const room = roomByName(roomName);
    return { kind: "edit", spec: addFurniture(spec, type as FurnitureType, room.id), summary: `Added a ${type} to the ${room.name}` };
  }

  if (op === "remove furniture") {
    if (!spec.furniture.length) return { kind: "redesign" };
    const labels = spec.furniture.map((f) => `${f.id}: ${f.type} in ${spec.rooms.find((r) => r.id === f.roomId)?.name ?? f.roomId}`);
    const label = await decide(model, `${context}\n\nWhich item should be removed?`, labels);
    const item = spec.furniture[labels.indexOf(label)];
    return { kind: "edit", spec: removeFurniture(spec, item.id), summary: `Removed the ${item.type}` };
  }

  if (op === "recolor walls" || op === "recolor floor") {
    const target = op === "recolor walls" ? "walls" : "floor";
    const [roomName, colorName] = await Promise.all([
      decide(model, `${context}\n\nWhich room's ${target} should change?`, roomNames),
      decide(model, `${context}\n\nWhich color best matches the request for the ${target}?`, Object.keys(PALETTE)),
    ]);
    const room = roomByName(roomName);
    return {
      kind: "edit",
      spec: recolorRoom(spec, room.id, target, PALETTE[colorName]),
      summary: `Painted the ${room.name} ${target} ${colorName}`,
    };
  }

  return { kind: "redesign" };
}
