import { test } from "node:test";
import assert from "node:assert/strict";
import { isStaleGenerating, mergeHouseUpdate, pickRetry } from "./sync";

test("realtime update without spec (unchanged TOAST) keeps the current spec", () => {
  const prev = { id: "h", status: "ready", spec: { rooms: [1] } };
  const next = { id: "h", status: "generating" } as unknown as typeof prev;
  assert.deepEqual(mergeHouseUpdate(prev, next), { id: "h", status: "generating", spec: { rooms: [1] } });
});

test("realtime update with a new spec replaces it", () => {
  const prev = { id: "h", status: "generating", spec: { rooms: [1] } };
  const next = { id: "h", status: "ready", spec: { rooms: [2] } };
  assert.deepEqual(mergeHouseUpdate(prev, next).spec, { rooms: [2] });
});

test("generating is stale only after five minutes", () => {
  const now = Date.parse("2026-10-03T22:30:00Z");
  assert.equal(isStaleGenerating("generating", "2026-10-03T22:27:00Z", now), false);
  assert.equal(isStaleGenerating("generating", "2026-10-03T22:24:00Z", now), true);
  assert.equal(isStaleGenerating("ready", "2026-10-03T20:00:00Z", now), false);
});

test("retry replays whichever of approved comment or chat edit is newer", () => {
  const comment = { kind: "comment" as const, created_at: "2026-10-03T22:00:00Z" };
  const message = { kind: "message" as const, created_at: "2026-10-03T22:10:00Z" };
  assert.equal(pickRetry(comment, message), message);
  assert.equal(pickRetry({ ...comment, created_at: "2026-10-03T22:20:00Z" }, message)?.kind, "comment");
  assert.equal(pickRetry(null, message), message);
  assert.equal(pickRetry(comment, null), comment);
  assert.equal(pickRetry(null, null), null);
});
