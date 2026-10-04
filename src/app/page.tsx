import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommunityFeed } from "@/components/community-feed";
import { getCurrentUser } from "@/lib/auth";
import { houseSpecSchema, type HouseSpec } from "@/lib/house/spec";
import { createClient } from "@/lib/supabase/server";
import { HomeViewport } from "./home-viewport";
import { NewHouseForm } from "./new-house-form";

// createHouse runs the agents via after(); give them room.
export const maxDuration = 300;


// A showcase for signed-out visitors: the biggest of the community's recent finished houses.
async function showcaseHouse() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("houses")
    .select("id, title, spec")
    .eq("status", "ready")
    .order("updated_at", { ascending: false })
    .limit(12);
  let best: { id: string; title: string; spec: HouseSpec } | null = null;
  for (const h of data ?? []) {
    const parsed = houseSpecSchema.safeParse(h.spec);
    if (parsed.success && (!best || parsed.data.rooms.length > best.spec.rooms.length)) best = { id: h.id, title: h.title, spec: parsed.data };
  }
  return best;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  const { prompt } = await searchParams;

  if (!user) {
    const showcase = await showcaseHouse();
    return (
      <div className="flex h-full min-h-0 w-full flex-1">
        <section className="relative flex min-w-0 flex-1">
          <div className="absolute inset-0">
            <HomeViewport spec={showcase?.spec ?? null} />
          </div>
          {/* Overlays let clicks through so visitors can orbit the showcase house. */}
          <div className="pointer-events-none relative flex flex-1 flex-col justify-between gap-6 p-4 sm:p-6">
            {showcase && (
              <div className="pointer-events-auto flex w-fit items-center gap-3 rounded-full border bg-background/85 py-1.5 pl-4 pr-1.5 text-sm shadow-sm backdrop-blur animate-in fade-in slide-in-from-top-2">
                <span className="text-muted-foreground">
                  Built by agents: <span className="font-medium text-foreground">{showcase.title}</span>
                </span>
                <Button asChild size="xs" variant="secondary" className="rounded-full">
                  <Link href={`/h/${showcase.id}`}>
                    Walk through it <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
            <div className="pointer-events-auto w-full max-w-lg rounded-xl border bg-background/85 p-5 shadow-sm backdrop-blur animate-in fade-in slide-in-from-bottom-4">
              <Badge variant="secondary" className="mb-3">Supabase Select 2026 Hackathon</Badge>
              <h1 className="mb-2 text-2xl font-semibold tracking-tight text-balance">
                Describe a home. Agents build it. Friends redesign it.
              </h1>
              <p className="mb-4 text-sm text-pretty text-muted-foreground">
                An architect agent and an interior designer agent turn your prompt into a furnished 3D house like this one. Share
                the link, and friends walk it with you and suggest changes the agents build live.
              </p>
              <NewHouseForm gated />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Have an account?{" "}
                <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>
        <CommunityFeed />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <section className="relative flex min-w-0 flex-1">
        <div className="absolute inset-0">
          <HomeViewport />
        </div>
        <div className="pointer-events-none relative flex flex-1 flex-col items-center justify-center p-8">
          <div className="pointer-events-auto w-full max-w-2xl rounded-xl border bg-background/80 p-6 shadow-sm backdrop-blur">
            <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight">What should we build?</h1>
            <p className="mb-6 text-center text-muted-foreground">
              Describe a home. An architect agent and an interior designer agent will build it in 3D.
            </p>
            <NewHouseForm defaultPrompt={typeof prompt === "string" ? prompt : undefined} />
          </div>
        </div>
      </section>
      <CommunityFeed />
    </div>
  );
}
