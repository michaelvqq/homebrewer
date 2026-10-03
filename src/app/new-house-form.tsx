"use client";

import { useActionState, useRef } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { ModelPicker } from "@/components/model-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createHouse } from "./h/actions";

const EXAMPLES = [
  "Cozy 2-bedroom cottage with an open kitchen and a reading nook",
  "Modern studio apartment for a musician, minimalist, lots of plants",
  "Family home with 3 bedrooms, 2 bathrooms and a big living room",
];

export function NewHouseForm() {
  const [state, action, pending] = useActionState(createHouse, null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="rounded-3xl border bg-background shadow-sm transition-[box-shadow] focus-within:ring-[3px] focus-within:ring-ring/30">
        <Textarea
          ref={promptRef}
          name="prompt"
          required
          autoFocus
          maxLength={1000}
          rows={3}
          placeholder="Describe the house you want… the agents will name it."
          aria-label="House description"
          className="min-h-20 resize-none border-0 bg-transparent px-5 pt-4 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter adds a line, like a chat box.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <ModelPicker />
          <Button type="submit" size="icon" className="rounded-full" aria-label="Design my house" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
      </div>
      {state && !state.ok && <p className="px-2 text-sm text-destructive">{state.message ?? "Something went wrong."}</p>}
      <div className="flex flex-wrap justify-center gap-2">
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
