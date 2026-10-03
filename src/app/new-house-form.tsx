"use client";

import { useActionState, useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardContent>
        <form action={action} className="flex flex-col gap-3">
          <Textarea
            ref={promptRef}
            name="prompt"
            required
            autoFocus
            maxLength={1000}
            rows={4}
            placeholder="Describe the house you want… the agents will name it."
            aria-label="House description"
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a line, like a chat box.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <Badge key={ex} asChild variant="secondary" className="cursor-pointer font-normal hover:bg-secondary/70">
                <button type="button" onClick={() => promptRef.current && (promptRef.current.value = ex)}>
                  {ex}
                </button>
              </Badge>
            ))}
          </div>
          {state && !state.ok && <p className="text-sm text-destructive">{state.message ?? "Something went wrong."}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {pending ? "Sending to the agents…" : "Design my house"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
