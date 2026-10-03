import { z } from "zod";

// Server-only env. Never import this from a client component.
const skip = process.env.SKIP_ENV_VALIDATION === "1";

export const serverEnv = z
  .object({
    KEY_ENCRYPTION_SECRET: z.string().min(32),
    // Optional shared demo keys, used when a user hasn't saved their own.
    SHARED_ANTHROPIC_API_KEY: z.string().min(1).optional(),
    SHARED_OPENAI_API_KEY: z.string().min(1).optional(),
    SHARED_GOOGLE_API_KEY: z.string().min(1).optional(),
  })
  .parse({
    KEY_ENCRYPTION_SECRET:
      process.env.KEY_ENCRYPTION_SECRET || (skip ? "stub-secret-stub-secret-stub-secret!" : undefined),
    SHARED_ANTHROPIC_API_KEY: process.env.SHARED_ANTHROPIC_API_KEY || undefined,
    SHARED_OPENAI_API_KEY: process.env.SHARED_OPENAI_API_KEY || undefined,
    SHARED_GOOGLE_API_KEY: process.env.SHARED_GOOGLE_API_KEY || undefined,
  });
