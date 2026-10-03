"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { organizeHouse } from "@/app/h/actions";

type Project = { id: string; title: string; status: string; pinned: boolean; group_name: string | null };

const DOT: Record<string, string> = { generating: "bg-amber-500 animate-pulse", error: "bg-red-500", ready: "bg-green-500" };

// Pinned first, then named groups, then everything else as "Recent". Shrinks when a build chat is open below.
export function ProjectList({ houses }: { houses: Project[] }) {
  const onHouse = usePathname().startsWith("/h/");
  const pinned = houses.filter((h) => h.pinned);
  const groups = [...new Set(houses.filter((h) => !h.pinned && h.group_name).map((h) => h.group_name!))].sort();
  const recent = houses.filter((h) => !h.pinned && !h.group_name);

  return (
    <nav className={`flex min-h-0 flex-col overflow-y-auto px-2 pb-2 ${onHouse ? "max-h-[38%] shrink-0" : "flex-1"}`}>
      {!houses.length && <p className="px-2 pt-4 text-sm text-neutral-400">No houses yet.</p>}
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
      <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</p>
      {items.map((h) => <ProjectRow key={h.id} house={h} groups={groups} />)}
    </div>
  );
}

function ProjectRow({ house }: { house: Project; groups: string[] }) {
  const active = usePathname() === `/h/${house.id}`;
  const [editingGroup, setEditingGroup] = useState(false);
  const [pending, startTransition] = useTransition();

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
        <input
          name="group"
          list="project-groups"
          autoFocus
          defaultValue={house.group_name ?? ""}
          placeholder="Group name (empty = none)"
          maxLength={40}
          onBlur={() => setEditingGroup(false)}
          onKeyDown={(e) => e.key === "Escape" && setEditingGroup(false)}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </form>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-md pr-1 text-sm ${pending ? "opacity-50" : ""} ${active ? "bg-neutral-200 font-medium dark:bg-neutral-800" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"}`}
    >
      <Link href={`/h/${house.id}`} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[house.status] ?? "bg-neutral-400"}`} />
        <span className="truncate">{house.title}</span>
      </Link>
      <button
        title={house.pinned ? "Unpin" : "Pin"}
        onClick={() => organize({ pinned: !house.pinned })}
        className={`rounded px-1 text-xs ${house.pinned ? "" : "opacity-0 group-hover:opacity-100"}`}
      >
        {house.pinned ? "📌" : "📍"}
      </button>
      <button
        title="Move to group"
        onClick={() => setEditingGroup(true)}
        className="rounded px-1 text-xs opacity-0 group-hover:opacity-100"
      >
        ⋯
      </button>
    </div>
  );
}
