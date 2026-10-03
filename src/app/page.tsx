import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewHouseForm } from "./new-house-form";

// createHouse runs the agents via after(); give them room.
export const maxDuration = 300;

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-5 p-8">
        <h1 className="text-4xl font-semibold tracking-tight">Describe a home. Agents build it. Friends redesign it.</h1>
        <p className="text-lg text-neutral-500">
          An architect agent and an interior designer agent turn your prompt into a furnished 3D house you can walk
          through. Share it, and when you approve a visitor&apos;s suggestion, the agents redesign it live for everyone in the room.
        </p>
        <Link href="/login" className="w-fit rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900">
          Get started
        </Link>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: houses } = await supabase
    .from("houses")
    .select("id, title, status, version, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <section>
        <h1 className="mb-3 text-2xl font-semibold">Design a new house</h1>
        <NewHouseForm />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Your houses</h2>
        {!houses?.length && <p className="text-sm text-neutral-500">Nothing yet. Describe one above.</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {houses?.map((h) => (
            <li key={h.id}>
              <Link href={`/h/${h.id}`} className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800">
                <p className="font-medium">{h.title}</p>
                <p className="text-sm text-neutral-500">{h.status} · v{h.version}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
