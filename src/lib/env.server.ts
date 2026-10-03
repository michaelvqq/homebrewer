import { z } from "zod";

// Server-only env. Never import this from a client component.
const skip = process.env.SKIP_ENV_VALIDATION === "1";

export const serverEnv = z
  .object({ KEY_ENCRYPTION_SECRET: z.string().min(32) })
  .parse({
    KEY_ENCRYPTION_SECRET:
      process.env.KEY_ENCRYPTION_SECRET || (skip ? "stub-secret-stub-secret-stub-secret!" : undefined),
  });
