import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Session refresh only — not an authz layer. Server actions and routes must self-authorize.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
