"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowUp } from "lucide-react";
import { liveEdit } from "@/app/h/actions";
import { ModelPicker } from "@/components/model-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Message = Database["public"]["Tables"]["house_messages"]["Row"];
type HouseMeta = { owner_id: string; status: string; title: string };

// The current house's build conversation: the owner's prompts/edits and the agents' replies, live.
export function BuildChat({ userId }: { userId: string }) {
  const match = usePathname().match(/^\/h\/([0-9a-f-]{36})/);
  const houseId = match?.[1];
  if (!houseId) return <div className="flex-1" />;
  return <Chat key={houseId} houseId={houseId} userId={userId} />;
}

function Chat({ houseId, userId }: { houseId: string; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [house, setHouse] = useState<HouseMeta | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("house_messages").select("*").eq("house_id", houseId).order("created_at"),
      supabase.from("houses").select("owner_id, status, title").eq("id", houseId).maybeSingle(),
    ]).then(([m, h]) => {
      if (cancelled) return;
      setMessages(m.data ?? []);
      setHouse(h.data);
    });

    const channel = supabase
      .channel(`chat:${houseId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "house_messages", filter: `house_id=eq.${houseId}` }, (p) =>
        setMessages((ms) => (ms.some((m) => m.id === (p.new as Message).id) ? ms : [...ms, p.new as Message])),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "houses", filter: `id=eq.${houseId}` }, (p) =>
        setHouse((h) => (h ? { ...h, status: (p.new as HouseMeta).status } : h)),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, houseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const isOwner = house?.owner_id === userId;
  const busy = house?.status === "generating";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await liveEdit({ houseId, text });
      if (r.ok) setText("");
      else setError(r.message ?? "Could not apply that.");
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-sidebar-border">
      <p className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Build chat</p>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 px-3 pb-2">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={cn(
                  "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-1.5 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card text-card-foreground",
                )}
              >
                {m.body}
              </p>
            </div>
          ))}
          {busy && <p className="animate-pulse px-1 text-xs text-muted-foreground">Agents are working…</p>}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      {isOwner ? (
        <form onSubmit={submit} className="p-2">
          {error && <p className="mb-1 px-1 text-xs text-destructive">{error}</p>}
          <div className="rounded-2xl border bg-background p-1 shadow-xs focus-within:ring-[3px] focus-within:ring-ring/30">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={300}
              disabled={busy}
              placeholder={busy ? "Agents are working…" : "Add a plant to the bedroom…"}
              className="h-9 min-w-0 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <div className="flex items-center justify-between gap-1">
              <ModelPicker className="-ml-1 max-w-[70%]" />
              <Button
                type="submit"
                size="icon-sm"
                className="rounded-full"
                aria-label="Build"
                disabled={busy || pending || text.trim().length < 2}
              >
                <ArrowUp />
              </Button>
            </div>
          </div>
        </form>
      ) : (
        house && <p className="px-4 pb-3 text-xs text-muted-foreground">Only the owner builds here. Leave a suggestion on the right →</p>
      )}
    </div>
  );
}
