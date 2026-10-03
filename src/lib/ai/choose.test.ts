import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseModel } from "./choose";

test("a user's own key wins, with their exact model", () => {
  const r = chooseModel({ provider: "openai", model: "my-custom", userKey: "sk-user" }, { openai: "sk-shared" });
  assert.deepEqual(r, { provider: "openai", model: "my-custom", apiKey: "sk-user", shared: false });
});

test("no user key falls back to the shared key for their provider", () => {
  const r = chooseModel({ provider: "openai", model: "gpt-5.5", userKey: null }, { openai: "sk-shared" });
  assert.deepEqual(r, { provider: "openai", model: "gpt-5.5", apiKey: "sk-shared", shared: true });
});

test("shared key never runs a custom model id; it uses the provider default", () => {
  const r = chooseModel({ provider: "anthropic", model: "some-custom-id", userKey: null }, { anthropic: "sk-shared" });
  assert.equal(r?.model, "claude-opus-5-5");
});

test("falls back to another provider's shared key when theirs has none", () => {
  const r = chooseModel({ provider: "google", model: "gemini-3.8-flash", userKey: null }, { openai: "sk-shared" });
  assert.deepEqual(r, { provider: "openai", model: "gpt-6-astra", apiKey: "sk-shared", shared: true });
});

test("no keys anywhere returns null", () => {
  assert.equal(chooseModel({ provider: "anthropic", model: "claude-sonnet-5-5", userKey: null }, {}), null);
});
