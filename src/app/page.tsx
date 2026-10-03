import Link from "next/link";
import { ArrowRight, Footprints, MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { NewHouseForm } from "./new-house-form";

// createHouse runs the agents via after(); give them room.
export const maxDuration = 300;

const FEATURES = [
  { icon: Sparkles, title: "Agents build it", body: "An architect lays out rooms, an interior designer furnishes them." },
  { icon: Footprints, title: "Walk through it", body: "Orbit the model or walk it in first person, together in realtime." },
  { icon: MessageSquare, title: "Redesign together", body: "Visitors pin suggestions in 3D; approve one and the agents rebuild live." },
];

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 p-8">
        <div className="flex flex-col gap-5">
          <Badge variant="secondary" className="w-fit">Supabase Select 2026 Hackathon</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Describe a home. Agents build it. Friends redesign it.
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            An architect agent and an interior designer agent turn your prompt into a furnished 3D house you can walk
            through. Share it, and when you approve a visitor&apos;s suggestion, the agents redesign it live for everyone in the room.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Get started <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground">
              <Icon className="size-5 text-muted-foreground" />
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight">What should we build?</h1>
        <p className="mb-6 text-center text-muted-foreground">
          Describe a home. An architect agent and an interior designer agent will build it in 3D.
        </p>
        <NewHouseForm />
      </div>
    </div>
  );
}
