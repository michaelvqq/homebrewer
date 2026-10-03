"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Avatar } from "@/components/house/house-scene";
import { mergeHouseUpdate } from "@/lib/house/sync";

export type HouseRow = Database["public"]["Tables"]["houses"]["Row"];
export type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
export type Viewer = { id: string; name: string; color: string };
type Pos = { x: number; z: number; yaw: number };

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
export function colorFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function useHouseRoom(opts: {
  me: { id: string; name: string };
  initialHouse: HouseRow;
  initialComments: CommentRow[];
  initialLikeCount: number;
  initialLikedByMe: boolean;
}) {
  const { me } = opts;
  const houseId = opts.initialHouse.id;
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [house, setHouse] = useState(opts.initialHouse);
  const [comments, setComments] = useState(opts.initialComments);
  const [likeCount, setLikeCount] = useState(opts.initialLikeCount);
  const [likedByMe, setLikedByMe] = useState(opts.initialLikedByMe);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [positions, setPositions] = useState<Record<string, Pos>>({});

  useEffect(() => {
    const channel = supabase.channel(`house:${houseId}`, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });

    channel
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "houses", filter: `id=eq.${houseId}` }, (p) =>
        setHouse((h) => mergeHouseUpdate(h, p.new as HouseRow)),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `house_id=eq.${houseId}` }, (p) =>
        setComments((cs) => (cs.some((c) => c.id === (p.new as CommentRow).id) ? cs : [...cs, p.new as CommentRow])),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "comments", filter: `house_id=eq.${houseId}` }, (p) =>
        setComments((cs) => cs.map((c) => (c.id === (p.new as CommentRow).id ? (p.new as CommentRow) : c))),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "likes", filter: `house_id=eq.${houseId}` }, (p) => {
        setLikeCount((n) => n + 1);
        if ((p.new as { user_id: string }).user_id === me.id) setLikedByMe(true);
      })
      // DELETE events can't be filtered server-side; the old row carries the primary key (house_id, user_id).
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "likes" }, (p) => {
        const old = p.old as { house_id?: string; user_id?: string };
        if (old.house_id !== houseId) return;
        setLikeCount((n) => Math.max(0, n - 1));
        if (old.user_id === me.id) setLikedByMe(false);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Viewer>();
        const list = Object.values(state).map((metas) => metas[0]).filter(Boolean);
        setViewers(list);
        const ids = new Set(list.map((v) => v.id));
        setPositions((ps) => Object.fromEntries(Object.entries(ps).filter(([id]) => ids.has(id))));
      })
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const { id, x, z, yaw } = payload as Pos & { id: string };
        setPositions((ps) => ({ ...ps, [id]: { x, z, yaw } }));
      })
      .on("broadcast", { event: "leave-walk" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setPositions(({ [id]: _gone, ...rest }) => rest);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ id: me.id, name: me.name, color: colorFor(me.id) });
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [supabase, houseId, me.id, me.name]);

  const sendMove = useCallback(
    (pos: Pos) => channelRef.current?.send({ type: "broadcast", event: "pos", payload: { id: me.id, ...pos } }),
    [me.id],
  );
  const leaveWalk = useCallback(
    () => channelRef.current?.send({ type: "broadcast", event: "leave-walk", payload: { id: me.id } }),
    [me.id],
  );

  const avatars: Avatar[] = viewers
    .filter((v) => v.id !== me.id && positions[v.id])
    .map((v) => ({ ...v, ...positions[v.id] }));

  return { house, comments, likeCount, likedByMe, setLikedByMe, setLikeCount, viewers, avatars, sendMove, leaveWalk };
}
