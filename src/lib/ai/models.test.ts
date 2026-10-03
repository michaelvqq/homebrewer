import { test } from "node:test";
import assert from "node:assert/strict";
import { modelLabel } from "./models";

test("modelLabel turns model ids into display names", () => {
  assert.equal(modelLabel("claude-opus-5-5"), "Claude Opus 5.5");
  assert.equal(modelLabel("claude-haiku-4-5"), "Claude Haiku 4.5");
  assert.equal(modelLabel("claude-fable-5-1"), "Claude Fable 5.1");
  assert.equal(modelLabel("gpt-6-astra"), "GPT 6 Astra");
  assert.equal(modelLabel("gpt-5.4-mini"), "GPT 5.4 Mini");
  assert.equal(modelLabel("gemini-3.8-flash"), "Gemini 3.8 Flash");
  assert.equal(modelLabel("gemini-pro-latest"), "Gemini Pro Latest");
});
