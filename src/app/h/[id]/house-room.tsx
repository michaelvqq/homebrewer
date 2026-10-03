"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Check, Clock, Heart, Loader2, MapPin, MessageSquare, RotateCw, Share2, X } from "lucide-react";
import type { Pin } from "@/components/house/house-scene";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { levels } from "@/lib/house/floors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { roomAt } from "@/lib/house/edits";
import { houseSpecSchema, type HouseSpec } from "@/lib/house/spec";
import { formatClock } from "@/lib/house/sun";
import { isStaleGenerating } from "@/lib/house/sync";
import { colorFor, useHouseRoom, type CommentRow, type HouseRow, type Viewer } from "@/lib/realtime/use-house-room";
import { cn } from "@/lib/utils";
import { moderateComment, postComment, retryHouse, toggleLike } from "../actions";

const HouseScene = dynamic(() => import("@/components/house/house-scene").then((m) => m.HouseScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

type Props = {
  user: { id: string; name: string } | null; // null = signed-out visitor
  isOwner: boolean;
  initialHouse: HouseRow;
  initialComments: CommentRow[];
  initialLikeCount: number;
  initialLikedByMe: boolean;
};

// Floating surfaces over the 3D canvas.
const overlay = "rounded-lg border bg-background/80 shadow-sm backdrop-blur";

export function HouseRoom({ user, isOwner, ...initial }: Props) {
  // Signed-out visitors still join presence and walk around, as a per-tab guest.
  const [me] = useState(() => user ?? { id: `guest-${crypto.randomUUID()}`, name: "Guest" });
  const room = useHouseRoom({ me, ...initial });
  const loginHref = `/login?next=/h/${initial.initialHouse.id}`;
  const { house, comments, viewers } = room;
  const parsed = house.spec ? houseSpecSchema.safeParse(house.spec) : null;
  const spec = parsed?.success ? parsed.data : null;

  const [showFurniture, setShowFurniture] = useState(true);
  // Layers: the roof and each storey can be switched off to look inside. Walk mode walks on the lowest shown storey.
  const [hiddenFloors, setHiddenFloors] = useState<number[]>([]);
  const [showRoof, setShowRoof] = useState(true);
  const floors = spec ? levels(spec) : [0];
  const shownFloors = floors.filter((f) => !hiddenFloors.includes(f));
  const walkFloor = shownFloors[0] ?? 0;
  const layers = [...(showRoof ? ["roof"] : []), ...shownFloors.map((f) => `f${f}`)];
  function setLayers(next: string[]) {
    setShowRoof(next.includes("roof"));
    setHiddenFloors(floors.filter((f) => !next.includes(`f${f}`)));
  }
  const [clockTime, setClockTime] = useState(14); // per-viewer time of day, 0-24h
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const [panelOpen, setPanelOpen] = useState(true);
  // Pinning a suggestion: while `placing`, a click in the scene sets `draft` (house coordinates).
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<{ x: number; z: number } | null>(null);
  const pins: Pin[] = [
    ...comments
      .filter((c) => c.pos_x !== null && c.pos_z !== null && (c.status === "pending" || c.status === "approved"))
      .map((c) => ({ id: c.id, x: c.pos_x!, z: c.pos_z!, label: c.body, color: colorFor(c.author_id) })),
    ...(draft ? [{ id: "draft", x: draft.x, z: draft.z, label: "Your suggestion", color: "#111827" }] : []),
  ];
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const generating = house.status === "generating";
  // Re-check every 30s so a run killed by the time limit offers Retry.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [generating]);
  const stale = isStaleGenerating(house.status, house.updated_at, now);
  const pendingCount = comments.filter((c) => c.status === "pending").length;

  // A brief "done" notice for every viewer when a change lands after this page opened.
  const [openedAtVersion] = useState(house.version);
  const [dismissedVersion, setDismissedVersion] = useState<number | null>(null);
  const notice =
    house.status === "ready" && house.version > openedAtVersion && dismissedVersion !== house.version
      ? house.status_message ?? (house.version === 1 ? "Built · v1" : `Redesigned · v${house.version}`)
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
    <TooltipProvider>
      <div className="flex h-full min-h-0 w-full flex-1">
        <section className="relative min-w-0 flex-1">
          <HouseScene
            spec={spec}
            showFurniture={showFurniture}
            clockTime={clockTime}
            hiddenFloors={hiddenFloors}
            showRoof={showRoof}
            walkFloor={walkFloor}
            mode={mode}
            avatars={room.avatars}
            onMove={room.sendMove}
            pins={pins}
            onPick={
              placing
                ? (pos) => {
                    setDraft(pos);
                    setPlacing(false);
                    setPanelOpen(true);
                  }
                : undefined
            }
          />
          {placing && (
            <div className={cn(overlay, "absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full py-1 pl-4 pr-1 text-sm")}>
              <MapPin className="size-4 text-primary" />
              Click a spot in the house to pin your suggestion
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setPlacing(false)}>
                Cancel
              </Button>
            </div>
          )}

          {/* Top-left: project title and view controls */}
          <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className={cn(overlay, "pointer-events-auto px-3 py-2")}>
              <h1 className="max-w-[280px] truncate text-sm font-semibold">{house.title}</h1>
              <p className="text-xs text-muted-foreground">v{house.version}{isOwner ? " · yours" : ""}</p>
            </div>
            <div className={cn(overlay, "pointer-events-auto flex items-center gap-2 p-1")}>
              <ToggleGroup
                type="single"
                size="sm"
                value={mode}
                onValueChange={(v) => v && switchMode(v as "orbit" | "walk")}
                disabled={!spec}
              >
                <ToggleGroupItem value="orbit" className="px-3">Overview</ToggleGroupItem>
                <ToggleGroupItem value="walk" className="px-3">Walk</ToggleGroupItem>
              </ToggleGroup>
              <Separator orientation="vertical" className="h-5" />
              <ToggleGroup type="multiple" size="sm" value={layers} onValueChange={setLayers} disabled={!spec} aria-label="Layers">
                <ToggleGroupItem value="roof" className="px-3">Roof</ToggleGroupItem>
                {[...floors].reverse().map((f) => (
                  <ToggleGroupItem key={f} value={`f${f}`} className="px-3" aria-label={`Floor ${f + 1}`}>
                    {f + 1}F
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Separator orientation="vertical" className="h-5" />
              <Label className="cursor-pointer pr-2 text-sm font-normal">
                <Switch size="sm" checked={showFurniture} onCheckedChange={setShowFurniture} disabled={!spec} />
                Furniture
              </Label>
              <Separator orientation="vertical" className="h-5" />
              <TimeOfDay value={clockTime} onChange={setClockTime} />
            </div>
            {mode === "orbit" && spec && showRoof && (
              <p className={cn(overlay, "w-fit px-3 py-1.5 text-xs text-muted-foreground animate-in fade-in duration-700")}>
                Switch off Roof{floors.length > 1 ? " or a floor" : ""} to look inside
              </p>
            )}
            {mode === "walk" && (
              <p className={cn(overlay, "w-fit px-3 py-1.5 text-xs text-muted-foreground")}>
                Click the view to look around · WASD to move · Esc to release
              </p>
            )}
          </div>

          {/* Top-right: who's here + open the social panel */}
          {!panelOpen && (
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <ViewerStack viewers={viewers} meId={me.id} />
              <Button variant="outline" size="sm" onClick={() => setPanelOpen(true)} className="bg-background/80 shadow-sm backdrop-blur">
                <Heart className="size-4" /> {room.likeCount}
                <Separator orientation="vertical" className="mx-1 h-4" />
                <MessageSquare className="size-4" /> Suggestions
                {pendingCount ? <Badge className="ml-1 h-5 px-1.5">{pendingCount}</Badge> : null}
              </Button>
            </div>
          )}

          {/* Top-center: agent status or done notice */}
          {(generating || house.status === "error") && (
            <div className={cn(overlay, "absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-1.5 text-sm")}>
              {generating && <Loader2 className="size-4 animate-spin text-amber-500" />}
              {house.status === "error" && <span className="size-2 rounded-full bg-destructive" />}
              <span className="max-w-[420px] truncate">
                {house.status_message ?? (generating ? "Agents are working…" : "Something went wrong")}
              </span>
              {(house.status === "error" || stale) && isOwner && (
                <Button size="xs" variant="secondary" onClick={retry} className="ml-1 rounded-full">
                  <RotateCw /> Retry
                </Button>
              )}
            </div>
          )}
          {notice && !generating && (
            <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm text-white shadow">
              <Check className="size-4" /> {notice}
            </div>
          )}
          {error && (
            <p className="absolute left-1/2 top-16 -translate-x-1/2 rounded-md bg-destructive px-3 py-1.5 text-sm text-white shadow">{error}</p>
          )}
        </section>

        {panelOpen && (
          <aside className="flex w-[340px] shrink-0 flex-col border-l bg-background">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{house.title}</h2>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{house.prompt}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setPanelOpen(false)} aria-label="Close panel" className="text-muted-foreground">
                  <X />
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {user ? (
                  <Button variant="outline" size="sm" onClick={like} aria-pressed={room.likedByMe}>
                    <Heart className={cn(room.likedByMe && "fill-red-500 text-red-500")} /> {room.likeCount}
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={loginHref}>
                          <Heart /> {room.likeCount}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sign in to like</TooltipContent>
                  </Tooltip>
                )}
                <Button variant="outline" size="sm" onClick={share}>
                  {copied ? <Check /> : <Share2 />}
                  {copied ? "Link copied" : "Share"}
                </Button>
                <div className="ml-auto">
                  <ViewerStack viewers={viewers} meId={me.id} />
                </div>
              </div>
            </div>
            <Separator />
            <div className="px-4 pt-3">
              <h3 className="text-sm font-semibold">Suggestions</h3>
              <p className="text-xs text-muted-foreground">
                {isOwner ? "Approve one and the agents redesign live" : "Pin a spot and describe your idea — the owner can apply it live"}
              </p>
            </div>
            <Comments
              houseId={house.id}
              comments={comments}
              spec={spec}
              isOwner={isOwner}
              busy={generating}
              loginHref={user ? null : loginHref}
              draft={draft}
              placing={placing}
              onStartPlacing={() => setPlacing(true)}
              onClearDraft={() => setDraft(null)}
            />
          </aside>
        )}
      </div>
    </TooltipProvider>
  );
}

const TIME_PRESETS = [
  { label: "Dawn", value: 6.5 },
  { label: "Noon", value: 12 },
  { label: "Golden hour", value: 17.25 },
  { label: "Night", value: 22 },
];

// Like Roblox's Lighting.ClockTime: moves the sun, sky and shadows. Local to this viewer.
function TimeOfDay({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 px-2 font-normal tabular-nums">
              <Clock className="size-4" /> {formatClock(value)}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Time of day</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-72">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-sm font-medium">Time of day</p>
          <p className="text-sm tabular-nums text-muted-foreground">{formatClock(value)}</p>
        </div>
        <Slider
          min={0}
          max={24}
          step={0.25}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          aria-label="Time of day"
        />
        <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {TIME_PRESETS.map((p) => (
            <Button
              key={p.label}
              size="xs"
              variant={value === p.value ? "secondary" : "ghost"}
              onClick={() => onChange(p.value)}
              className="px-1 text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ViewerStack({ viewers, meId }: { viewers: Viewer[]; meId: string }) {
  if (!viewers.length) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <AvatarGroup>
          {viewers.slice(0, 5).map((v) => (
            <Avatar key={v.id}>
              <AvatarFallback className="text-xs font-semibold uppercase text-white" style={{ background: v.color }}>
                {v.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
          ))}
          {viewers.length > 5 && <AvatarGroupCount className="text-xs">+{viewers.length - 5}</AvatarGroupCount>}
        </AvatarGroup>
      </TooltipTrigger>
      <TooltipContent>{viewers.map((v) => (v.id === meId ? `${v.name} (you)` : v.name)).join(", ")}</TooltipContent>
    </Tooltip>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending: "",
  approved: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  applied: "border-transparent bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
  rejected: "border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

function Comments({
  houseId,
  comments,
  spec,
  isOwner,
  busy,
  loginHref,
  draft,
  placing,
  onStartPlacing,
  onClearDraft,
}: {
  houseId: string;
  comments: CommentRow[];
  spec: HouseSpec | null;
  isOwner: boolean;
  busy: boolean;
  loginHref: string | null; // set when signed out
  draft: { x: number; z: number } | null;
  placing: boolean;
  onStartPlacing: () => void;
  onClearDraft: () => void;
}) {
  const roomName = (x: number, z: number) => (spec ? roomAt(spec, x, z)?.name : undefined) ?? "outside";
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await postComment({ houseId, body, pos: draft });
      if (r.ok) {
        setBody("");
        onClearDraft();
      }
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
      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-3 p-4">
          {comments.length === 0 && <li className="text-sm text-muted-foreground">No suggestions yet. Try “add a home office”.</li>}
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border bg-card p-3 text-sm text-card-foreground">
              <div className="mb-1 flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: colorFor(c.author_id) }} />
                <span className="font-medium">{c.author_name}</span>
                <Badge
                  variant={c.status === "pending" ? "secondary" : "outline"}
                  className={cn("ml-auto capitalize", STATUS_STYLE[c.status])}
                >
                  {c.status}
                </Badge>
              </div>
              <p>{c.body}</p>
              {c.pos_x !== null && c.pos_z !== null && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {roomName(c.pos_x, c.pos_z)}
                </p>
              )}
              {isOwner && c.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <Button size="xs" onClick={() => moderate(c.id, "approve")} disabled={pending || busy}>
                    Approve &amp; redesign
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => moderate(c.id, "reject")} disabled={pending} className="text-muted-foreground">
                    Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
      <Separator />
      {loginHref ? (
        <div className="p-3">
          <Button asChild variant="outline" className="w-full">
            <Link href={loginHref}>Sign in to suggest a change</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="p-3">
          {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
          <div className="mb-2 flex items-center gap-2">
            {draft ? (
              <Badge variant="secondary" className="gap-1 rounded-full py-1 pl-2 pr-1">
                <MapPin className="size-3" /> Pinned in {roomName(draft.x, draft.z)}
                <Button type="button" variant="ghost" size="icon-xs" onClick={onClearDraft} aria-label="Remove pin" className="size-4 rounded-full">
                  <X />
                </Button>
              </Badge>
            ) : (
              <Button type="button" variant="outline" size="xs" onClick={onStartPlacing} disabled={placing || !spec} className="rounded-full">
                <MapPin /> {placing ? "Click in the house…" : "Pin a spot"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              placeholder="Suggest a change…"
              className="flex-1"
            />
            <Button type="submit" disabled={pending || !body.trim()}>
              Post
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
