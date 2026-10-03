import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { decryptKey } from "./crypto";
import { PROVIDER_IDS, type Provider } from "./models";
import { createModel } from "./provider";

type Client = SupabaseClient<Database>;
export type StoredKey = { c: string; last4: string };
export type StoredKeys = Partial<Record<Provider, StoredKey>>;

export type SettingsView = { provider: Provider; model: string; savedKeys: Record<Provider, string | null> };

const asProvider = (p: string | undefined): Provider =>
  (PROVIDER_IDS as readonly string[]).includes(p ?? "") ? (p as Provider) : "anthropic";

// The signed-in user's own settings (RLS limits the row to them). Never includes key material.
export async function readSettingsView(supabase: Client): Promise<SettingsView> {
  const { data } = await supabase.from("user_settings").select("provider, model, keys").maybeSingle();
  const keys = (data?.keys ?? {}) as StoredKeys;
  return {
    provider: asProvider(data?.provider),
    model: data?.model ?? "claude-sonnet-5-5",
    savedKeys: { anthropic: keys.anthropic?.last4 ?? null, openai: keys.openai?.last4 ?? null, google: keys.google?.last4 ?? null },
  };
}

// Model instance for the signed-in user, or null when they have no key for their selected provider.
export async function loadUserModel(supabase: Client) {
  const { data } = await supabase.from("user_settings").select("provider, model, keys").maybeSingle();
  const provider = asProvider(data?.provider);
  const stored = ((data?.keys ?? {}) as StoredKeys)[provider];
  if (!data || !stored) return null;
  return { model: createModel(provider, data.model, decryptKey(stored.c)), label: `${provider}/${data.model}` };
}
