"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { credentialsSchema } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AuthError = "validation" | "invalid_credentials" | "server";
export type AuthState = { ok: false; error: AuthError; message?: string } | { ok: true; message: string } | null;

// Only same-site relative paths, so ?next= can't redirect off-site.
function nextPath(formData: FormData) {
  const next = formData.get("next");
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function readCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  if (!parsed.success) return { ok: false, error: "validation", message: "Enter an email and a password of 6+ characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.error("signIn failed:", error.message);
    return { ok: false, error: "invalid_credentials", message: error.message };
  }

  revalidatePath("/", "layout");
  redirect(nextPath(formData));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  if (!parsed.success) return { ok: false, error: "validation", message: "Enter an email and a password of 6+ characters." };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) {
    console.error("signUp failed:", error.message);
    return { ok: false, error: "server", message: error.message };
  }

  // With email confirmation off (local default), signUp returns a session immediately.
  if (!data.session) return { ok: true, message: "Check your email to confirm your account." };

  revalidatePath("/", "layout");
  redirect(nextPath(formData));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
