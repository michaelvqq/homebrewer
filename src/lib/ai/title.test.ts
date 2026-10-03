import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTitle, provisionalTitle } from "./title";

test("provisional title is the prompt's first words, capitalised", () => {
  assert.equal(provisionalTitle("cozy 2-bedroom cottage with an open kitchen and a reading nook"), "Cozy 2-bedroom cottage with an open…");
});

test("a short prompt is used whole", () => {
  assert.equal(provisionalTitle("  tiny cabin  "), "Tiny cabin");
});

test("provisional title never exceeds the 80-char column limit", () => {
  assert.ok(provisionalTitle("a".repeat(500)).length <= 80);
});

test("cleanTitle strips quotes, labels and trailing punctuation", () => {
  assert.equal(cleanTitle('Title: "The Reading Nook Cottage."'), "The Reading Nook Cottage");
  assert.equal(cleanTitle("**Maple Hollow**\nA cozy home"), "Maple Hollow");
});

test("cleanTitle rejects empty or overlong output", () => {
  assert.equal(cleanTitle("   "), null);
  assert.equal(cleanTitle("x".repeat(200)), null);
});
