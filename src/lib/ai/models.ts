// Client-safe catalog of providers and models offered in Settings.
export const PROVIDER_IDS = ["anthropic", "openai", "google"] as const;
export type Provider = (typeof PROVIDER_IDS)[number];

export const PROVIDERS: Record<Provider, { label: string; models: string[]; keyHint: string }> = {
  anthropic: {
    label: "Anthropic",
    models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-haiku-4-5"],
    keyHint: "sk-ant-…",
  },
  openai: { label: "OpenAI", models: ["gpt-6-astra", "gpt-5.5", "gpt-5.4-mini"], keyHint: "sk-…" },
  google: { label: "Google", models: ["gemini-3.8-flash", "gemini-pro-latest"], keyHint: "AIza…" },
};

// "claude-opus-5-5" -> "Claude Opus 5.5": consecutive number parts become a version.
export function modelLabel(id: string) {
  const words: string[] = [];
  for (const part of id.split("-").filter(Boolean)) {
    const prev = words[words.length - 1];
    if (/^\d+$/.test(part) && prev && /^\d+$/.test(prev)) words[words.length - 1] = `${prev}.${part}`;
    else words.push(part);
  }
  return words.map((w) => (w === "gpt" ? "GPT" : w[0].toUpperCase() + w.slice(1))).join(" ");
}
