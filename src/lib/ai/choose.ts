import { PROVIDER_IDS, PROVIDERS, type Provider } from "./models";

export type ModelChoice = { provider: Provider; model: string; apiKey: string; shared: boolean };

// Picks the key and model for a run: the user's own key first, then the app's shared demo keys.
// Shared keys only run catalog models, never custom ids.
export function chooseModel(
  user: { provider: Provider; model: string; userKey: string | null },
  shared: Partial<Record<Provider, string>>,
): ModelChoice | null {
  if (user.userKey) return { provider: user.provider, model: user.model, apiKey: user.userKey, shared: false };

  const own = shared[user.provider];
  if (own) {
    const models = PROVIDERS[user.provider].models;
    return { provider: user.provider, model: models.includes(user.model) ? user.model : models[0], apiKey: own, shared: true };
  }

  const other = PROVIDER_IDS.find((p) => shared[p]);
  return other ? { provider: other, model: PROVIDERS[other].models[0], apiKey: shared[other]!, shared: true } : null;
}
