"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { houseSpecSchema } from "@/lib/house/spec";
import { colorFor, useHouseRoom, type CommentRow, type HouseRow, type Viewer } from "@/lib/realtime/use-house-room";
import { liveEdit, moderateComment, postComment, retryHouse, toggleLike } from "../actions";

const HouseScene = dynamic(() => import("@/components/house/house-scene").then((m) => m.HouseScene), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-sky-100 dark:bg-neutral-800" />,
});

type Props = {
  user: { id: string; name: string } | null; // null = signed-out visitor
  isOwner: boolean;
  initialHouse: HouseRow;
  initialComments: CommentRow[];
  initialLikeCount: number;
  initialLikedByMe: boolean;
};

const chip = "rounded-lg bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-neutral-900/90 dark:ring-white/10";

export function HouseRoom({ user, isOwner, ...initial }: Props) {
  // Signed-out visitors still join presence and walk around, as a per-tab guest.
  const [me] = useState(() => user ?? { id: `guest-${crypto.randomUUID()}`, name: "Guest" });
  const room = useHouseRoom({ me, ...initial });
  const loginHref = `/login?next=/h/${initial.initialHouse.id}`;
  const { house, comments, viewers } = room;
  const parsed = house.spec ? houseSpecSchema.safeParse(house.spec) : null;
  const spec = parsed?.success ? parsed.data : null;

  const [showFurniture, setShowFurniture] = useState(true);
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const generating = house.status === "generating";
  const pendingCount = comments.filter((c) => c.status === "pending").length;

  // A brief "done" notice for every viewer when a change lands after this page opened.
  const [openedAtVersion] = useState(house.version);
  const [dismissedVersion, setDismissedVersion] = useState<number | null>(null);
  const notice =
    house.status === "ready" && house.version > openedAtVersion && dismissedVersion !== house.version
      ? house.status_message ?? `Redesigned · v${house.version}`
      : null;
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setDismissedVersion(house.version), 3500);
    return () => clearTimeout(t);
  }, [notice, house.version]);

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

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <section className="relative min-w-0 flex-1">
        <HouseScene spec={spec} showFurniture={showFurniture} mode={mode} avatars={room.avatars} onMove={room.sendMove} />

        {/* Top-left: project title and view controls */}
        <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
          <div className={`${chip} pointer-events-auto px-3 py-2`}>
            <h1 className="max-w-[280px] truncate text-sm font-semibold">{house.title}</h1>
            <p className="text-xs text-neutral-500">v{house.version}{isOwner ? " · yours" : ""}</p>
          </div>
          <div className={`${chip} pointer-events-auto flex gap-1 p-1`}>
            {(["orbit", "walk"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                disabled={!spec}
                className={`rounded-md px-3 py-1.5 text-sm disabled:opacity-40 ${mode === m ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
              >
                {m === "orbit" ? "Overview" : "Walk"}
              </button>
            ))}
            <button
              onClick={() => setShowFurniture((s) => !s)}
              disabled={!spec}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800"
            >
              Furniture {showFurniture ? "on" : "off"}
            </button>
          </div>
          {mode === "walk" && (
            <p className="w-fit rounded-md bg-black/60 px-3 py-1.5 text-xs text-white">
              Click the view to look around · WASD to move · Esc to release
            </p>
          )}
        </div>

        {/* Top-right: who's here, like, share, panel toggle */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <ViewerStack viewers={viewers} meId={me.id} />
          {user ? (
            <button onClick={like} className={`${chip} px-3 py-1.5 text-sm`}>
              {room.likedByMe ? "♥" : "♡"} {room.likeCount}
            </button>
          ) : (
            <Link href={loginHref} title="Sign in to like" className={`${chip} px-3 py-1.5 text-sm`}>
              ♡ {room.likeCount}
            </Link>
          )}
          <button onClick={share} className={`${chip} px-3 py-1.5 text-sm`}>
            {copied ? "Link copied" : "Share"}
          </button>
          {!panelOpen && (
            <button onClick={() => setPanelOpen(true)} className={`${chip} px-3 py-1.5 text-sm`}>
              Suggestions{pendingCount ? ` · ${pendingCount}` : ""}
            </button>
          )}
        </div>

        {/* Top-center: agent status or done notice */}
        {(generating || house.status === "error") && (
          <div className={`${chip} absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm`}>
            {generating && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
            {house.status === "error" && <span className="h-2 w-2 rounded-full bg-red-500" />}
            <span className="max-w-[420px] truncate">
              {house.status_message ?? (generating ? "Agents are working…" : "Something went wrong")}
            </span>
            {house.status === "error" && isOwner && (
              <button onClick={retry} className="ml-1 font-medium underline">Retry</button>
            )}
          </div>
        )}
        {notice && !generating && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-green-600 px-4 py-2 text-sm text-white shadow">
            ✓ {notice}
          </div>
        )}
        {error && (
          <p className="absolute left-1/2 top-16 -translate-x-1/2 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{error}</p>
        )}

        {isOwner && spec && <BuildBar houseId={house.id} busy={generating} />}
      </section>

      {panelOpen && (
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-semibold">Suggestions</h2>
              <p className="text-xs text-neutral-500">
                {isOwner ? "Approve one and the agents redesign live" : "The owner can apply your idea live"}
              </p>
            </div>
            <button onClick={() => setPanelOpen(false)} aria-label="Close panel" className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              ✕
            </button>
          </div>
          <Comments houseId={house.id} comments={comments} isOwner={isOwner} busy={generating} loginHref={user ? null : loginHref} />
        </aside>
      )}
    </div>
  );
}

function ViewerStack({ viewers, meId }: { viewers: Viewer[]; meId: string }) {
  if (!viewers.length) return null;
  return (
    <div className="flex -space-x-2" title={viewers.map((v) => (v.id === meId ? `${v.name} (you)` : v.name)).join(", ")}>
      {viewers.slice(0, 5).map((v) => (
        <span
          key={v.id}
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase text-white ring-2 ring-white dark:ring-neutral-900"
          style={{ background: v.color }}
        >
          {v.name.slice(0, 1)}
        </span>
      ))}
      {viewers.length > 5 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-xs text-white ring-2 ring-white">
          +{viewers.length - 5}
        </span>
      )}
    </div>
  );
}

function BuildBar({ houseId, busy }: { houseId: string; busy: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await liveEdit({ houseId, text });
      if (r.ok) setText("");
      else setError(r.message ?? "Could not apply that.");
    });
  }

  return (
    <form onSubmit={submit} className="absolute bottom-5 left-1/2 w-[min(640px,90%)] -translate-x-1/2">
      {error && <p className="mb-2 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white">{error}</p>}
      <div className={`${chip} flex gap-2 rounded-xl p-2 shadow-lg`}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          disabled={busy}
          placeholder={busy ? "Agents are working…" : "Build live: “add a plant to the bedroom”, “paint the kitchen sage green”"}
          className="flex-1 bg-transparent px-2 text-sm outline-none disabled:opacity-50"
        />
        <button
          disabled={busy || pending || text.trim().length < 2}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          Build
        </button>
      </div>
    </form>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  approved: "bg-amber-100 text-amber-800",
  applied: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

function Comments({
  houseId,
  comments,
  isOwner,
  busy,
  loginHref,
}: {
  houseId: string;
  comments: CommentRow[];
  isOwner: boolean;
  busy: boolean;
  loginHref: string | null; // set when signed out
}) {
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
      {loginHref ? (
        <div className="border-t border-neutral-200 p-3 text-center text-sm dark:border-neutral-800">
          <Link href={loginHref} className="font-medium underline">Sign in to suggest a change</Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
