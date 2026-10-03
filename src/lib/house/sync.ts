// Client-safe helpers for keeping a house consistent across realtime updates and retries.

// Realtime UPDATE payloads omit unchanged TOASTed columns, so a status-only write arrives without `spec`.
// The app never clears a spec, so a missing one means "unchanged".
export function mergeHouseUpdate<T extends { spec?: unknown }>(prev: T, next: T): T {
  return { ...prev, ...next, spec: next.spec ?? prev.spec };
}

export const STALE_GENERATING_MS = 5 * 60_000;

// A house left "generating" past the function time limit was killed mid-run and can be retried.
export function isStaleGenerating(status: string, updatedAt: string, now = Date.now()): boolean {
  return status === "generating" && now - Date.parse(updatedAt) >= STALE_GENERATING_MS;
}

// Retry replays the most recent change request, whether it came from an approved comment or the build chat.
export function pickRetry<C extends { created_at: string }, M extends { created_at: string }>(
  comment: C | null,
  message: M | null,
): C | M | null {
  if (!comment || !message) return comment ?? message;
  return Date.parse(message.created_at) > Date.parse(comment.created_at) ? message : comment;
}
