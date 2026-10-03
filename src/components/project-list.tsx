"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DOT: Record<string, string> = { generating: "bg-amber-500 animate-pulse", error: "bg-red-500", ready: "bg-green-500" };

export function ProjectList({ houses }: { houses: { id: string; title: string; status: string }[] }) {
  const pathname = usePathname();
  if (!houses.length) return <p className="px-4 text-sm text-neutral-400">No houses yet.</p>;

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2">
      {houses.map((h) => {
        const active = pathname === `/h/${h.id}`;
        return (
          <Link
            key={h.id}
            href={`/h/${h.id}`}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active ? "bg-neutral-200 font-medium dark:bg-neutral-800" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[h.status] ?? "bg-neutral-400"}`} />
            <span className="truncate">{h.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
