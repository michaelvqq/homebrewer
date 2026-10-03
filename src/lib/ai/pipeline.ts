import { generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { roomAt } from "@/lib/house/edits";
import { fromLlmFurnishing, furnishingLlmSchema, layoutLlmSchema, sanitizeSpec, type HouseSpec } from "@/lib/house/spec";
import { ARCHITECT_SYSTEM, DESIGNER_SYSTEM, architectPrompt, designerPrompt } from "./prompts";
import { routeEdit, type Focus } from "./router";
import { loadUserModel } from "./settings";

type HouseUpdate = Database["public"]["Tables"]["houses"]["Update"];

type Client = SupabaseClient<Database>;

// Appends a line to the house's build chat (owner-only by RLS).
export async function say(supabase: Client, houseId: string, role: "user" | "agent", body: string) {
  await supabase.from("house_messages").insert({ house_id: houseId, role, body: body.slice(0, 2000) });
}

function summarize(spec: HouseSpec, redesign: boolean) {
  const names = spec.rooms.map((r) => r.name).join(", ");
  return `${redesign ? "Redesigned the house" : "Built your house"}: ${spec.rooms.length} rooms (${names}) with ${spec.furniture.length} pieces of furniture.`;
}

export type PipelineArgs = {
  supabase: SupabaseClient<Database>; // the house owner's client
  houseId: string;
  prompt: string;
  current?: HouseSpec; // present for redesigns
  change?: string; // the approved comment
  focus?: Focus; // where a pinned suggestion points, house coordinates
};

// Architect -> interior designer. Writes progress to the house row so every viewer sees it via realtime.
// Never overwrites `spec` unless both steps succeed. Returns true on success.
export async function runPipeline({ supabase, houseId, prompt, current, change }: PipelineArgs): Promise<boolean> {
  const update = (patch: HouseUpdate) =>
    supabase.from("houses").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", houseId);

  try {
    const loaded = await loadUserModel(supabase);
    if (!loaded) {
      await update({ status: "error", status_message: "Add your API key in Settings, then retry." });
      await say(supabase, houseId, "agent", "I need an API key to work. Add one in Settings, then hit Retry.");
      return false;
    }

    await update({ status: "generating", status_message: `Architect is ${change ? "reworking" : "laying out"} the rooms…` });
    const { output: layout } = await generateText({
      model: loaded.model,
      system: ARCHITECT_SYSTEM,
      prompt: architectPrompt(prompt, current, change),
      output: Output.object({ schema: layoutLlmSchema }),
    });

    await update({ status_message: "Interior designer is furnishing…" });
    const { output: furnishing } = await generateText({
      model: loaded.model,
      system: DESIGNER_SYSTEM,
      prompt: designerPrompt(layout, prompt, current, change),
      output: Output.object({ schema: furnishingLlmSchema }),
    });

    const spec = sanitizeSpec({ ...layout, ...fromLlmFurnishing(furnishing) });
    const { data } = await supabase.from("houses").select("version").eq("id", houseId).single();
    await update({ spec: spec as Json, status: "ready", status_message: null, version: (data?.version ?? 0) + 1 });
    await say(supabase, houseId, "agent", summarize(spec, !!change));
    return true;
  } catch (err) {
    console.error("runPipeline failed:", err);
    const message = err instanceof Error ? err.message.slice(0, 160) : "unknown error";
    await update({ status: "error", status_message: `Agents hit a problem: ${message}` });
    await say(supabase, houseId, "agent", `Something went wrong: ${message}`);
    return false;
  }
}

// For a change request on an existing house (live build bar or an approved comment): the router applies
// small edits instantly and hands anything bigger to the full agent pipeline.
export async function runChange(args: PipelineArgs & { current: HouseSpec; change: string }): Promise<boolean> {
  const { supabase, houseId, current, change, focus } = args;
  const update = (patch: HouseUpdate) =>
    supabase.from("houses").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", houseId);

  try {
    const loaded = await loadUserModel(supabase);
    if (!loaded) {
      await update({ status: "error", status_message: "Add your API key in Settings, then retry." });
      await say(supabase, houseId, "agent", "I need an API key to work. Add one in Settings, then hit Retry.");
      return false;
    }
    await update({ status: "generating", status_message: `Router is reading “${change.slice(0, 60)}”…` });
    const routed = await routeEdit(loaded.model, current, change, focus);
    if (routed.kind === "redesign") {
      await say(supabase, houseId, "agent", "That needs a bigger change, so the architect and interior designer are on it.");
      const room = focus ? roomAt(current, focus.x, focus.z) : undefined;
      const where = focus ? ` (the visitor pinned x=${focus.x}, z=${focus.z}${room ? `, in the ${room.name}` : ", outside the current rooms"})` : "";
      return runPipeline({ ...args, change: `${change}${where}` });
    }

    const spec = sanitizeSpec(routed.spec);
    const { data } = await supabase.from("houses").select("version").eq("id", houseId).single();
    await update({ spec: spec as Json, status: "ready", status_message: routed.summary, version: (data?.version ?? 0) + 1 });
    await say(supabase, houseId, "agent", `${routed.summary}.`);
    return true;
  } catch (err) {
    console.error("runChange failed:", err);
    const message = err instanceof Error ? err.message.slice(0, 160) : "unknown error";
    await update({ status: "error", status_message: `Router hit a problem: ${message}` });
    await say(supabase, houseId, "agent", `Something went wrong: ${message}`);
    return false;
  }
}
