"use client";

import { useActionState, useRef } from "react";
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
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
      <input name="title" required maxLength={80} placeholder="Name your house"
        className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
      <textarea ref={promptRef} name="prompt" required maxLength={1000} rows={3} placeholder="Describe the house you want…"
        className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => promptRef.current && (promptRef.current.value = ex)}
            className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300">
            {ex}
          </button>
        ))}
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message ?? "Something went wrong."}</p>}
      <button disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
        {pending ? "Sending to the agents…" : "Design my house"}
      </button>
    </form>
  );
}
