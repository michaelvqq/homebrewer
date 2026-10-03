import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// SKIP_ENV_VALIDATION=1 lets CI/builds run without real secrets.
const skip = process.env.SKIP_ENV_VALIDATION === "1";

// NEXT_PUBLIC_ vars must be referenced statically so Next can inline them in the browser bundle.
const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || (skip ? "http://127.0.0.1:54321" : undefined),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || (skip ? "stub" : undefined),
};

export const env = schema.parse(raw);
