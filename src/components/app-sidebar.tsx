import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { BuildChat } from "./build-chat";
import { ProjectList } from "./project-list";
import { SettingsButton } from "./settings-dialog";

// Left sidebar for signed-in users: new house, your projects, account.
export async function AppSidebar({ user }: { user: { id: string; email?: string } }) {
  const supabase = await createClient();
  const { data: houses } = await supabase
    .from("houses")
    .select("id, title, status, pinned, group_name")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">Homecraft</Link>
      </div>
      <div className="px-3">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
        >
          <span aria-hidden>＋</span> New house
        </Link>
      </div>
      <ProjectList houses={houses ?? []} />
      <BuildChat userId={user.id} />
      <div className="flex flex-col gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <p className="truncate px-1 text-xs text-neutral-500">{user.email}</p>
        <div className="flex items-center justify-between px-1">
          <SettingsButton />
          <form action={signOut}>
            <button className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">Sign out</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
