import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { serverEnv } from "@/lib/env.server";
import { chooseModel } from "./choose";
import { tryDecryptKey } from "./crypto";
import { PROVIDER_IDS, PROVIDERS, type Provider } from "./models";
import { createModel } from "./provider";

type Client = SupabaseClient<Database>;
export type StoredKey = { c: string; last4: string };
export type StoredKeys = Partial<Record<Provider, StoredKey>>;

// demo: providers with a shared key, usable without the user's own.
export type SettingsView = {
  provider: Provider;
  model: string;
  savedKeys: Record<Provider, string | null>;
  demo: Record<Provider, boolean>;
};

const asProvider = (p: string | undefined): Provider =>
  (PROVIDER_IDS as readonly string[]).includes(p ?? "") ? (p as Provider) : "anthropic";

const sharedKeys = () => ({
  anthropic: serverEnv.SHARED_ANTHROPIC_API_KEY,
  openai: serverEnv.SHARED_OPENAI_API_KEY,
  google: serverEnv.SHARED_GOOGLE_API_KEY,
});

// The signed-in user's own settings (RLS limits the row to them). Never includes key material.
// With no usable key for the saved provider, shows the model a build would actually fall back to.
export async function readSettingsView(supabase: Client): Promise<SettingsView> {
  const { data } = await supabase.from("user_settings").select("provider, model, keys").maybeSingle();
  const keys = (data?.keys ?? {}) as StoredKeys;
  const shared = sharedKeys();
  let provider = asProvider(data?.provider);
  let model = data?.model ?? "claude-opus-5-5";
  if (!keys[provider] && !shared[provider]) {
    const fallback = chooseModel({ provider, model, userKey: null }, shared);
    if (fallback) ({ provider, model } = fallback);
  }
  return {
    provider,
    model,
    savedKeys: { anthropic: keys.anthropic?.last4 ?? null, openai: keys.openai?.last4 ?? null, google: keys.google?.last4 ?? null },
    demo: { anthropic: !!shared.anthropic, openai: !!shared.openai, google: !!shared.google },
  };
}

// Model instance for the signed-in user: their own key, else a shared demo key, else null.
export async function loadUserModel(supabase: Client) {
  const { data } = await supabase.from("user_settings").select("provider, model, keys").maybeSingle();
  const provider = asProvider(data?.provider);
  const stored = ((data?.keys ?? {}) as StoredKeys)[provider];
  const choice = chooseModel(
    { provider, model: data?.model ?? PROVIDERS[provider].models[0], userKey: stored ? tryDecryptKey(stored.c) : null },
    sharedKeys(),
  );
  if (!choice) return null;
  return {
    model: createModel(choice.provider, choice.model, choice.apiKey),
    label: `${choice.provider}/${choice.model}${choice.shared ? " (demo key)" : ""}`,
  };
}
