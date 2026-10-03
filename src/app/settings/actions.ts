"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { encryptKey } from "@/lib/ai/crypto";
import { PROVIDER_IDS } from "@/lib/ai/models";
import { readSettingsView, type SettingsView, type StoredKeys } from "@/lib/ai/settings";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type ActionError = "unauthorized" | "validation" | "server";
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: ActionError; message?: string };

const settingsSchema = z.object({
  provider: z.enum(PROVIDER_IDS),
  model: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().min(10).max(400).optional(),
});

export async function getSettings(): Promise<ActionResult<SettingsView>> {
  if (!(await getCurrentUser())) return { ok: false, error: "unauthorized" };
  return { ok: true, data: await readSettingsView(await createClient()) };
}

export async function saveSettings(input: unknown): Promise<ActionResult<SettingsView>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", message: "Pick a model and paste a valid key." };

  const supabase = await createClient();
  try {
    const { data: existing } = await supabase.from("user_settings").select("keys").maybeSingle();
    const keys = { ...((existing?.keys ?? {}) as StoredKeys) };
    const { provider, model, apiKey } = parsed.data;
    if (apiKey) keys[provider] = { c: encryptKey(apiKey), last4: apiKey.slice(-4) };

    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      provider,
      model,
      keys: keys as Json,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true, data: await readSettingsView(supabase) };
  } catch (err) {
    console.error("saveSettings failed:", err);
    return { ok: false, error: "server", message: "Could not save settings." };
  }
}
