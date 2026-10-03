import { generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { fromLlmFurnishing, furnishingLlmSchema, layoutSchema, sanitizeSpec, type HouseSpec } from "@/lib/house/spec";
import { ARCHITECT_SYSTEM, DESIGNER_SYSTEM, architectPrompt, designerPrompt } from "./prompts";
import { loadUserModel } from "./settings";

type HouseUpdate = Database["public"]["Tables"]["houses"]["Update"];

export type PipelineArgs = {
  supabase: SupabaseClient<Database>; // the house owner's client
  houseId: string;
  prompt: string;
  current?: HouseSpec; // present for redesigns
  change?: string; // the approved comment
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
      return false;
    }

    await update({ status: "generating", status_message: `Architect is ${change ? "reworking" : "laying out"} the rooms…` });
    const { output: layout } = await generateText({
      model: loaded.model,
      system: ARCHITECT_SYSTEM,
      prompt: architectPrompt(prompt, current, change),
      output: Output.object({ schema: layoutSchema }),
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
    return true;
  } catch (err) {
    console.error("runPipeline failed:", err);
    const message = err instanceof Error ? err.message.slice(0, 160) : "unknown error";
    await update({ status: "error", status_message: `Agents hit a problem: ${message}` });
    return false;
  }
}
