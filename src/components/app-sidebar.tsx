import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">Homebrewer</Link>
      </div>
      <div className="px-3">
        <Button asChild className="w-full">
          <Link href="/">
            <Plus />
            New house
          </Link>
        </Button>
      </div>
      <ProjectList userId={user.id} houses={houses ?? []} />
      <BuildChat userId={user.id} />
      <Separator className="bg-sidebar-border" />
      <div className="flex flex-col gap-1 p-3">
        <p className="truncate px-1 text-xs text-muted-foreground">{user.email}</p>
        <div className="flex items-center justify-between">
          <SettingsButton />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
              <LogOut />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
