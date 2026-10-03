import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HouseRoom } from "./house-room";

// Server actions invoked from this page run the agents via after(); give them room.
export const maxDuration = 300;

export default async function HousePage({ params }: PageProps<"/h/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser(); // optional: shared links work signed out

  const supabase = await createClient();
  const { data: house } = await supabase.from("houses").select("*").eq("id", id).maybeSingle();
  if (!house) notFound();

  const [{ data: comments }, { count }, { data: mine }] = await Promise.all([
    supabase.from("comments").select("*").eq("house_id", id).order("created_at"),
    supabase.from("likes").select("*", { count: "exact", head: true }).eq("house_id", id),
    user
      ? supabase.from("likes").select("house_id").eq("house_id", id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <HouseRoom
      user={user ? { id: user.id, name: user.email?.split("@")[0] ?? "guest" } : null}
      isOwner={!!user && house.owner_id === user.id}
      initialHouse={house}
      initialComments={comments ?? []}
      initialLikeCount={count ?? 0}
      initialLikedByMe={!!mine}
    />
  );
}
