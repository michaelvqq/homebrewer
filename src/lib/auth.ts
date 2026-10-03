import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

// Verified user from the JWT, or null. Use this in server actions and pages to self-authorize.
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  return { id: data.claims.sub, email: data.claims.email as string | undefined };
}
