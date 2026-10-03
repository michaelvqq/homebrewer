"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { runChange, runPipeline, say } from "@/lib/ai/pipeline";
import { provisionalTitle } from "@/lib/ai/title";
import { roomAt } from "@/lib/house/edits";
import { houseSpecSchema } from "@/lib/house/spec";
import { isStaleGenerating, pickRetry } from "@/lib/house/sync";
import { createClient } from "@/lib/supabase/server";

export type ActionError = "unauthorized" | "validation" | "not_found" | "busy" | "server";
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: ActionError; message?: string };

const createSchema = z.object({ prompt: z.string().trim().min(1).max(1000) });
const id = z.uuid();
const commentSchema = z.object({
  houseId: id,
  body: z.string().trim().min(1).max(500),
  pos: z.object({ x: z.number().min(-200).max(200), z: z.number().min(-200).max(200) }).nullable().optional(),
});

// Runs the agents after the response is sent, as the signed-in owner.
type Focus = { x: number; z: number };

function focusOf(c: { pos_x: number | null; pos_z: number | null }): Focus | undefined {
  return c.pos_x !== null && c.pos_z !== null ? { x: c.pos_x, z: c.pos_z } : undefined;
}

function generateLater(
  houseId: string,
  prompt: string,
  opts: { current?: unknown; change?: string; commentId?: string; focus?: Focus } = {},
) {
  after(async () => {
    const supabase = await createClient();
    const parsed = opts.current ? houseSpecSchema.safeParse(opts.current) : null;
    const current = parsed?.success ? parsed.data : undefined;
    // Changes to an existing house go through the router (instant edit or full redesign).
    const ok =
      current && opts.change
        ? await runChange({ supabase, houseId, prompt, current, change: opts.change, focus: opts.focus })
        : await runPipeline({ supabase, houseId, prompt });
    if (ok && opts.commentId) await supabase.from("comments").update({ status: "applied" }).eq("id", opts.commentId);
  });
}

export async function createHouse(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = createSchema.safeParse({ prompt: formData.get("prompt") });
  if (!parsed.success) return { ok: false, error: "validation", message: "Describe the house you want." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("houses")
    // The agents rename it during the first build; until then the prompt stands in.
    .insert({ ...parsed.data, title: provisionalTitle(parsed.data.prompt), owner_id: user.id, status: "generating", status_message: "Agents are getting ready…" })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createHouse failed:", error);
    return { ok: false, error: "server", message: "Could not create the house." };
  }

  await say(supabase, data.id, "user", parsed.data.prompt);
  generateLater(data.id, parsed.data.prompt);
  revalidatePath("/", "layout"); // sidebar project list
  redirect(`/h/${data.id}`);
}

// Owner-only house fetch; RLS lets anyone signed in read, so ownership is checked here.
async function ownedHouse(houseId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("houses").select("id, owner_id, prompt, spec, status, updated_at").eq("id", houseId).maybeSingle();
  return { supabase, house: data && data.owner_id === userId ? data : null, exists: !!data };
}

export async function retryHouse(houseId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsedId = id.safeParse(houseId);
  if (!parsedId.success) return { ok: false, error: "validation" };

  const { supabase, house, exists } = await ownedHouse(parsedId.data, user.id);
  if (!house) return { ok: false, error: exists ? "unauthorized" : "not_found" };
  if (house.status === "generating" && !isStaleGenerating(house.status, house.updated_at)) {
    return { ok: false, error: "busy", message: "The agents are already working." };
  }

  // Replay the latest change request (approved comment or build-chat edit) on the current spec;
  // only a house that was never built regenerates from the original prompt.
  const [{ data: comment }, { data: message }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, body, pos_x, pos_z, created_at")
      .eq("house_id", house.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("house_messages")
      .select("body, created_at")
      .eq("house_id", house.id)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const last = house.spec ? pickRetry(comment, message) : null;

  await supabase.from("houses").update({ status: "generating", updated_at: new Date().toISOString(), status_message: "Retrying…" }).eq("id", house.id);
  generateLater(
    house.id,
    house.prompt,
    !last
      ? {}
      : last === comment && comment
        ? { current: house.spec, change: comment.body, commentId: comment.id, focus: focusOf(comment) }
        : { current: house.spec, change: last.body },
  );
  return { ok: true, data: undefined };
}

export async function postComment(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", message: "Comments are 1-500 characters." };

  const supabase = await createClient();
  const { pos } = parsed.data;
  let roomId: string | null = null;
  if (pos) {
    // Derive the room server-side from the current spec rather than trusting the client.
    const { data: house } = await supabase.from("houses").select("spec").eq("id", parsed.data.houseId).maybeSingle();
    const spec = houseSpecSchema.safeParse(house?.spec);
    roomId = spec.success ? (roomAt(spec.data, pos.x, pos.z)?.id ?? null) : null;
  }
  const { error } = await supabase.from("comments").insert({
    house_id: parsed.data.houseId,
    body: parsed.data.body,
    pos_x: pos?.x ?? null,
    pos_z: pos?.z ?? null,
    room_id: roomId,
    author_id: user.id,
    author_name: user.email?.split("@")[0] ?? "guest",
  });
  if (error) {
    console.error("postComment failed:", error);
    return { ok: false, error: "server", message: "Could not post your comment." };
  }
  return { ok: true, data: undefined };
}

export async function moderateComment(commentId: unknown, decision: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = z.object({ commentId: id, decision: z.enum(["approve", "reject"]) }).safeParse({ commentId, decision });
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const { data: comment } = await supabase
    .from("comments")
    .select("id, body, status, house_id, author_name, pos_x, pos_z")
    .eq("id", parsed.data.commentId)
    .maybeSingle();
  if (!comment) return { ok: false, error: "not_found" };

  const { house } = await ownedHouse(comment.house_id, user.id);
  if (!house) return { ok: false, error: "unauthorized", message: "Only the owner can moderate comments." };
  if (comment.status !== "pending") return { ok: false, error: "validation", message: "Already moderated." };

  if (parsed.data.decision === "reject") {
    const { error } = await supabase.from("comments").update({ status: "rejected" }).eq("id", comment.id);
    return error ? { ok: false, error: "server" } : { ok: true, data: undefined };
  }

  if (house.status === "generating") return { ok: false, error: "busy", message: "Wait for the current redesign to finish." };
  await supabase.from("comments").update({ status: "approved" }).eq("id", comment.id);
  await say(supabase, house.id, "user", `Approved ${comment.author_name}'s suggestion: “${comment.body}”`);
  await supabase.from("houses").update({ status: "generating", updated_at: new Date().toISOString(), status_message: "Agents are reading the feedback…" }).eq("id", house.id);
  generateLater(house.id, house.prompt, { current: house.spec, change: comment.body, commentId: comment.id, focus: focusOf(comment) });
  return { ok: true, data: undefined };
}

export async function toggleLike(houseId: unknown): Promise<ActionResult<{ liked: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsedId = id.safeParse(houseId);
  if (!parsedId.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("likes")
    .select("house_id")
    .eq("house_id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("likes").delete().eq("house_id", parsedId.data).eq("user_id", user.id)
    : await supabase.from("likes").insert({ house_id: parsedId.data, user_id: user.id });
  if (error) {
    console.error("toggleLike failed:", error);
    return { ok: false, error: "server" };
  }
  return { ok: true, data: { liked: !existing } };
}

// Live build bar: the owner types an edit and it's routed to an instant change or a full redesign.
export async function liveEdit(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = z.object({ houseId: id, text: z.string().trim().min(2).max(300) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", message: "Describe the change in a few words." };

  const { supabase, house, exists } = await ownedHouse(parsed.data.houseId, user.id);
  if (!house) return { ok: false, error: exists ? "unauthorized" : "not_found" };
  if (house.status === "generating") return { ok: false, error: "busy", message: "Wait for the current change to finish." };
  if (!house.spec) return { ok: false, error: "validation", message: "The house isn't built yet." };

  await say(supabase, house.id, "user", parsed.data.text);
  await supabase.from("houses").update({ status: "generating", updated_at: new Date().toISOString(), status_message: "Router is reading your edit…" }).eq("id", house.id);
  generateLater(house.id, house.prompt, { current: house.spec, change: parsed.data.text });
  return { ok: true, data: undefined };
}

const organizeSchema = z.object({
  houseId: id,
  pinned: z.boolean().optional(),
  groupName: z.string().trim().max(40).nullable().optional(), // "" or null clears the group
});

// Sidebar organisation: pin/unpin and move a house into a named group.
export async function organizeHouse(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = organizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", message: "Group names are up to 40 characters." };

  const { houseId, pinned, groupName } = parsed.data;
  const patch: { pinned?: boolean; group_name?: string | null } = {};
  if (pinned !== undefined) patch.pinned = pinned;
  if (groupName !== undefined) patch.group_name = groupName || null;

  const supabase = await createClient();
  const { error } = await supabase.from("houses").update(patch).eq("id", houseId).eq("owner_id", user.id);
  if (error) {
    console.error("organizeHouse failed:", error);
    return { ok: false, error: "server" };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

// Permanently deletes a house; comments, likes and build chat cascade.
export async function deleteHouse(houseId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsedId = id.safeParse(houseId);
  if (!parsedId.success) return { ok: false, error: "validation" };

  const { supabase, house, exists } = await ownedHouse(parsedId.data, user.id);
  if (!house) return { ok: false, error: exists ? "unauthorized" : "not_found" };

  const { error } = await supabase.from("houses").delete().eq("id", house.id).eq("owner_id", user.id);
  if (error) {
    console.error("deleteHouse failed:", error);
    return { ok: false, error: "server", message: "Could not delete the house." };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
