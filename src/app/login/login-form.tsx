"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState(signIn, null);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, null);

  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return (
    <form action={mode === "signin" ? signInAction : signUpAction} className="flex w-full max-w-sm flex-col gap-3">
      <h1 className="text-2xl font-semibold">{mode === "signin" ? "Sign in" : "Create an account"}</h1>

      <input name="email" type="email" required placeholder="you@example.com" autoComplete="email"
        className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
      <input name="password" type="password" required minLength={6} placeholder="Password"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />

      {state && (
        <p className={state.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>{state.message}</p>
      )}

      <button type="submit" disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
        {pending ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
      </button>

      <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-sm text-neutral-500 hover:underline">
        {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </form>
  );
}
