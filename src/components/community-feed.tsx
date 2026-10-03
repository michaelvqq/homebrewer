import Link from "next/link";
import { Heart, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Right panel on the "new house" screen: everyone's finished houses, newest first.
export async function CommunityFeed() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("houses")
    .select("id, title, prompt, version, updated_at, likes(count), comments(count)")
    .eq("status", "ready")
    .order("updated_at", { ascending: false })
    .limit(30);
  const houses = data ?? [];

  return (
    <aside className="hidden w-[340px] shrink-0 flex-col border-l bg-background lg:flex">
      <div className="p-4">
        <h2 className="font-semibold">Community</h2>
        <p className="text-xs text-muted-foreground">Houses people have built. Walk through one and suggest a change.</p>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-3 p-4">
          {houses.length === 0 && <li className="text-sm text-muted-foreground">Nothing published yet. Be the first.</li>}
          {houses.map((h) => (
            <li key={h.id}>
              <Link
                href={`/h/${h.id}`}
                className="block rounded-lg border bg-card p-3 text-sm text-card-foreground transition-colors hover:bg-accent"
              >
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-medium">{h.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{ago(h.updated_at)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{h.prompt}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="size-3" /> {h.likes[0]?.count ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3" /> {h.comments[0]?.count ?? 0}
                  </span>
                  <span className="ml-auto">v{h.version}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}
