import { generateText, type LanguageModel } from "ai";

const MAX_WORDS = 6;

// Shown until the agents name the house: the prompt's first few words.
export function provisionalTitle(prompt: string): string {
  const words = prompt.trim().split(/\s+/);
  let title = words.slice(0, MAX_WORDS).join(" ");
  if (title.length > 77) title = title.slice(0, 77);
  if (words.length > MAX_WORDS || title.length < prompt.trim().length) title += "…";
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// Model output -> a usable title, or null if it isn't one.
export function cleanTitle(raw: string): string | null {
  const title = raw
    .split("\n")[0]
    .replace(/^\s*title\s*:\s*/i, "")
    .replace(/[*_"“”'`]/g, "")
    .replace(/[.!\s]+$/, "")
    .trim();
  return title && title.length <= 60 ? title : null;
}

// A short, evocative name for a new house. Never throws; null means keep the provisional title.
export async function nameHouse(model: LanguageModel, prompt: string): Promise<string | null> {
  try {
    const { text } = await generateText({
      model,
      system:
        "You name homes. Reply with only a short, evocative name for the described house (2-4 words, Title Case, no quotes, no punctuation at the end).",
      prompt,
      maxOutputTokens: 20,
    });
    return cleanTitle(text);
  } catch (err) {
    console.error("nameHouse failed:", err);
    return null;
  }
}
