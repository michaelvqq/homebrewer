"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState(signIn, null);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, null);

  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return (
    <Card className="w-full max-w-sm">
      <form action={mode === "signin" ? signInAction : signUpAction} className="flex flex-col gap-6">
        <input type="hidden" name="next" value={next ?? "/"} />
        <CardHeader>
          <CardTitle className="text-2xl">{mode === "signin" ? "Sign in" : "Create an account"}</CardTitle>
          <CardDescription>
            {mode === "signin" ? "Welcome back. Your houses are waiting." : "Sign up to build and share houses."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          {state && (
            <p className={state.ok ? "text-sm text-green-600 dark:text-green-500" : "text-sm text-destructive"}>{state.message}</p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="w-full">
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Please wait" : mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
          <Button
            type="button"
            variant="link"
            className="text-muted-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
