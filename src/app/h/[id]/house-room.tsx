"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { houseSpecSchema } from "@/lib/house/spec";
import { colorFor, useHouseRoom, type CommentRow, type HouseRow } from "@/lib/realtime/use-house-room";
import { moderateComment, postComment, retryHouse, toggleLike } from "../actions";

const HouseScene = dynamic(() => import("@/components/house/house-scene").then((m) => m.HouseScene), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-sky-100 dark:bg-neutral-800" />,
});

type Props = {
  me: { id: string; name: string };
  isOwner: boolean;
  initialHouse: HouseRow;
  initialComments: CommentRow[];
  initialLikeCount: number;
  initialLikedByMe: boolean;
};

export function HouseRoom({ me, isOwner, ...initial }: Props) {
  const room = useHouseRoom({ me, ...initial });
  const { house, comments, viewers } = room;
  const parsed = house.spec ? houseSpecSchema.safeParse(house.spec) : null;
  const spec = parsed?.success ? parsed.data : null;

  const [showFurniture, setShowFurniture] = useState(true);
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: "orbit" | "walk") {
    if (next === "orbit") room.leaveWalk();
    setMode(next);
  }

  function like() {
    const was = room.likedByMe;
    room.setLikedByMe(!was); // optimistic; realtime reconciles the count
    startTransition(async () => {
      const r = await toggleLike(house.id);
      if (!r.ok) room.setLikedByMe(was);
    });
  }

  function retry() {
    setError(null);
    startTransition(async () => {
      const r = await retryHouse(house.id);
      if (!r.ok) setError(r.message ?? "Could not retry.");
    });
  }

  function share() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const generating = house.status === "generating";

  return (
    <div className="flex h-[calc(100vh-49px)] w-full">
      <section className="relative flex-1">
        <HouseScene
          spec={spec}
          showFurniture={showFurniture}
          mode={mode}
          avatars={room.avatars}
          onMove={room.sendMove}
        />

        <div className="absolute left-4 top-4 flex flex-col gap-2">
          <div className="flex gap-1 rounded-lg bg-white/90 p-1 shadow dark:bg-neutral-900/90">
            {(["orbit", "walk"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                disabled={!spec}
                className={`rounded-md px-3 py-1.5 text-sm capitalize disabled:opacity-40 ${mode === m ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : ""}`}
              >
                {m === "orbit" ? "Overview" : "Walk"}
              </button>
            ))}
            <button
              onClick={() => setShowFurniture((s) => !s)}
              disabled={!spec}
              className="rounded-md px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Furniture: {showFurniture ? "on" : "off"}
            </button>
          </div>
          {mode === "walk" && (
            <p className="rounded-md bg-black/60 px-3 py-1.5 text-xs text-white">
              Click the view to look around · WASD to move · Esc to release the mouse
            </p>
          )}
        </div>

        {(generating || house.status === "error") && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm shadow dark:bg-neutral-900/95">
            {generating && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
            {house.status === "error" && <span className="h-2 w-2 rounded-full bg-red-500" />}
            <span>{house.status_message ?? (generating ? "Agents are working…" : "Something went wrong")}</span>
            {house.status === "error" && isOwner && (
              <button onClick={retry} className="ml-1 font-medium underline">Retry</button>
            )}
          </div>
        )}
      </section>

      <aside className="flex w-[360px] shrink-0 flex-col border-l border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h1 className="text-lg font-semibold">{house.title}</h1>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{house.prompt}</p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <button onClick={like} className="rounded-md border border-neutral-300 px-2.5 py-1 dark:border-neutral-700">
              {room.likedByMe ? "♥" : "♡"} {room.likeCount}
            </button>
            <button onClick={share} className="rounded-md border border-neutral-300 px-2.5 py-1 dark:border-neutral-700">
              {copied ? "Link copied" : "Share link"}
            </button>
            <span className="ml-auto text-xs text-neutral-400">v{house.version}</span>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Here now · {viewers.length}</h2>
          <ul className="flex flex-wrap gap-2">
            {viewers.map((v) => (
              <li key={v.id} className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-sm dark:bg-neutral-800">
                <span className="h-2 w-2 rounded-full" style={{ background: v.color }} />
                {v.name}{v.id === me.id ? " (you)" : ""}
              </li>
            ))}
          </ul>
        </div>

        <Comments houseId={house.id} comments={comments} isOwner={isOwner} busy={generating} />
      </aside>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  approved: "bg-amber-100 text-amber-800",
  applied: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

function Comments({ houseId, comments, isOwner, busy }: { houseId: string; comments: CommentRow[]; isOwner: boolean; busy: boolean }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await postComment({ houseId, body });
      if (r.ok) setBody("");
      else setError(r.message ?? "Could not post.");
    });
  }

  function moderate(id: string, decision: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const r = await moderateComment(id, decision);
      if (!r.ok) setError(r.message ?? "Could not update the comment.");
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-4 pt-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Suggestions {isOwner ? "· approve one to redesign" : "· the owner can apply them"}
      </h2>
      <ul className="flex-1 space-y-3 overflow-y-auto p-4">
        {comments.length === 0 && <li className="text-sm text-neutral-400">No suggestions yet. Try “add a home office”.</li>}
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: colorFor(c.author_id) }} />
              <span className="font-medium">{c.author_name}</span>
              <span className={`ml-auto rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[c.status]}`}>{c.status}</span>
            </div>
            <p>{c.body}</p>
            {isOwner && c.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => moderate(c.id, "approve")}
                  disabled={pending || busy}
                  className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                >
                  Approve &amp; redesign
                </button>
                <button onClick={() => moderate(c.id, "reject")} disabled={pending} className="px-2 py-1 text-xs text-neutral-500">
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="Suggest a change…"
            className="flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          />
          <button disabled={pending || !body.trim()} className="rounded-md bg-neutral-900 px-3 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900">
            Post
          </button>
        </div>
      </form>
    </div>
  );
}
