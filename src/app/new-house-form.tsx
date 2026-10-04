"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2 } from "lucide-react";
import { ModelPicker } from "@/components/model-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHouse } from "./h/actions";

const EXAMPLES = [
  "Cozy 2-bedroom cottage with an open kitchen and a reading nook",
  "Modern studio apartment for a musician, minimalist, lots of plants",
  "Family home with 3 bedrooms, 2 bathrooms and a big living room",
];

// `gated` (signed out): the same prompt box, but building sends you to sign up first, keeping the prompt.
export function NewHouseForm({ gated = false, defaultPrompt }: { gated?: boolean; defaultPrompt?: string }) {
  const [state, action, pending] = useActionState(createHouse, null);
  const promptRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function gate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const prompt = promptRef.current?.value.trim() ?? "";
    router.push(`/login?next=${encodeURIComponent(prompt ? `/?prompt=${encodeURIComponent(prompt)}` : "/")}`);
  }

  return (
    <form action={gated ? undefined : action} onSubmit={gated ? gate : undefined} className="flex flex-col gap-3">
      <div className="flex items-center gap-1 rounded-full border bg-background py-1 pl-4 pr-1 shadow-sm transition-[box-shadow] focus-within:ring-[3px] focus-within:ring-ring/30">
        <Input
          ref={promptRef}
          name="prompt"
          required
          autoFocus={!gated}
          defaultValue={defaultPrompt}
          maxLength={1000}
          placeholder="Describe the house you want…"
          aria-label="House description"
          className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {gated ? (
          <Button type="submit" className="shrink-0 rounded-full">
            Sign up to build <ArrowUp />
          </Button>
        ) : (
          <>
            <ModelPicker className="shrink-0" />
            <Button type="submit" size="icon" className="shrink-0 rounded-full" aria-label="Design my house" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
            </Button>
          </>
        )}
      </div>
      {state && !state.ok && <p className="px-2 text-sm text-destructive">{state.message ?? "Something went wrong."}</p>}
      <div className={gated ? "hidden" : "flex flex-wrap justify-center gap-2"}>
        {EXAMPLES.map((ex) => (
          <Badge key={ex} asChild variant="secondary" className="cursor-pointer font-normal hover:bg-secondary/70">
            <button type="button" onClick={() => promptRef.current && (promptRef.current.value = ex)}>
              {ex}
            </button>
          </Badge>
        ))}
      </div>
    </form>
  );
}
