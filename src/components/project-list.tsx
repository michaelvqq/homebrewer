"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { FolderInput, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import { deleteHouse, organizeHouse } from "@/app/h/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Project = { id: string; title: string; status: string; pinned: boolean; group_name: string | null };

const DOT: Record<string, string> = { generating: "bg-amber-500 animate-pulse", error: "bg-red-500", ready: "bg-green-500" };

// Pinned first, then named groups, then everything else as "Recent". Shrinks when a build chat is open below.
export function ProjectList({ userId, houses }: { userId: string; houses: Project[] }) {
  const onHouse = usePathname().startsWith("/h/");
  const router = useRouter();

  // The agents name a new house mid-build; refresh the list when a title changes.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`projects:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "houses", filter: `owner_id=eq.${userId}` }, (p) => {
        const next = p.new as Partial<Project> & { id: string };
        const known = houses.find((h) => h.id === next.id);
        if (next.title && known && known.title !== next.title) router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, houses, router]);
  const pinned = houses.filter((h) => h.pinned);
  const groups = [...new Set(houses.filter((h) => !h.pinned && h.group_name).map((h) => h.group_name!))].sort();
  const recent = houses.filter((h) => !h.pinned && !h.group_name);

  return (
    <nav className={cn("flex min-h-0 flex-col overflow-y-auto px-2 pb-2", onHouse ? "max-h-[38%] shrink-0" : "flex-1")}>
      {!houses.length && <p className="px-2 pt-4 text-sm text-muted-foreground">No houses yet.</p>}
      {pinned.length > 0 && <Section title="Pinned" items={pinned} groups={groups} />}
      {groups.map((g) => (
        <Section key={g} title={g} items={houses.filter((h) => !h.pinned && h.group_name === g)} groups={groups} />
      ))}
      {recent.length > 0 && <Section title="Recent" items={recent} groups={groups} />}
      <datalist id="project-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
    </nav>
  );
}

function Section({ title, items, groups }: { title: string; items: Project[]; groups: string[] }) {
  return (
    <div className="pt-3">
      <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.map((h) => <ProjectRow key={h.id} house={h} groups={groups} />)}
    </div>
  );
}

function ProjectRow({ house }: { house: Project; groups: string[] }) {
  const active = usePathname() === `/h/${house.id}`;
  const router = useRouter();
  const [editingGroup, setEditingGroup] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const remove = () =>
    startDelete(async () => {
      setDeleteError(null);
      const r = await deleteHouse(house.id);
      if (!r.ok) {
        setDeleteError(r.message ?? "Could not delete the house.");
        return;
      }
      setConfirmDelete(false);
      if (active) router.push("/");
      router.refresh();
    });

  const organize = (patch: { pinned?: boolean; groupName?: string | null }) =>
    startTransition(async () => {
      await organizeHouse({ houseId: house.id, ...patch });
    });

  if (editingGroup) {
    return (
      <form
        className="px-1 py-0.5"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("group");
          organize({ groupName: typeof value === "string" ? value : null });
          setEditingGroup(false);
        }}
      >
        <Input
          name="group"
          list="project-groups"
          autoFocus
          defaultValue={house.group_name ?? ""}
          placeholder="Group name (empty = none)"
          maxLength={40}
          onBlur={() => setEditingGroup(false)}
          onKeyDown={(e) => e.key === "Escape" && setEditingGroup(false)}
          className="h-8"
        />
      </form>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-0.5 rounded-md pr-1 text-sm",
        pending && "opacity-50",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Link href={`/h/${house.id}`} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[house.status] ?? "bg-muted-foreground")} />
        <span className="truncate">{house.title}</span>
      </Link>
      {house.pinned && <Pin className="size-3 shrink-0 text-muted-foreground group-hover:hidden" aria-label="Pinned" />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Project actions"
            className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuItem onSelect={() => organize({ pinned: !house.pinned })}>
            {house.pinned ? <PinOff /> : <Pin />}
            {house.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditingGroup(true)}>
            <FolderInput />
            Move to group…
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmDelete} onOpenChange={(open) => !deleting && setConfirmDelete(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{house.title}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the house with its suggestions, likes and build chat. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              <Trash2 />
              {deleting ? "Deleting…" : "Delete house"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
