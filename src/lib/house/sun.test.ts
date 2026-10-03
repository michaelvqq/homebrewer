import { test } from "node:test";
import assert from "node:assert/strict";
import { formatClock, normalizeClock, sunAt } from "./sun";

test("the sun is highest at noon and below the horizon at midnight", () => {
  const noon = sunAt(12);
  const midnight = sunAt(0);
  assert.ok(noon.elevation > 50);
  assert.ok(midnight.elevation < -50);
  assert.ok(noon.direction[1] > 0.7);
});

test("sunrise is in the east (+x) and sunset in the west (-x)", () => {
  assert.ok(sunAt(7).sunPosition[0] > 0.5);
  assert.ok(sunAt(17).sunPosition[0] < -0.5);
});

test("light directions are unit vectors and the key light stays above the horizon", () => {
  for (const t of [0, 3, 6, 9, 12, 15, 18, 21]) {
    const l = sunAt(t);
    assert.ok(Math.abs(Math.hypot(...l.direction) - 1) < 1e-9, `t=${t}`);
    assert.ok(l.direction[1] > 0, `key light below ground at t=${t}`);
  }
});

test("daylight fades to night: stars out, moonlight dim", () => {
  const day = sunAt(13);
  const night = sunAt(23);
  assert.equal(day.daylight, 1);
  assert.equal(night.daylight, 0);
  assert.equal(night.starOpacity, 1);
  assert.equal(day.starOpacity, 0);
  assert.ok(night.keyIntensity < day.keyIntensity / 4);
});

test("golden hour is warmer than noon", () => {
  const red = (c: string) => parseInt(c.slice(1, 3), 16);
  const blue = (c: string) => parseInt(c.slice(5, 7), 16);
  const golden = sunAt(17.5).keyColor;
  const noon = sunAt(12).keyColor;
  assert.ok(red(golden) - blue(golden) > red(noon) - blue(noon));
});

test("clock helpers wrap and format", () => {
  assert.equal(normalizeClock(25), 1);
  assert.equal(normalizeClock(-1), 23);
  assert.equal(formatClock(6.5), "06:30");
  assert.equal(formatClock(14), "14:00");
  assert.equal(formatClock(23.999), "00:00");
});
