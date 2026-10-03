// Time-of-day lighting, in the spirit of Roblox's Lighting.ClockTime: one clock drives the sun's direction,
// its color temperature, sky/ground bounce, fog and stars. Pure so it can be tested without a renderer.

export type Lighting = {
  /** Unit vector pointing from the scene toward the sun (or the moon at night). */
  direction: [number, number, number];
  /** True sun elevation in degrees; negative below the horizon. */
  elevation: number;
  /** 0 at night, 1 in full daylight. */
  daylight: number;
  /** The shadow-casting light: the sun by day, the moon by night. */
  keyColor: string;
  keyIntensity: number;
  /** Sun position for the sky shader (always the real sun, even below the horizon). */
  sunPosition: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fog: string;
  starOpacity: number;
  exposure: number;
};

const MAX_ELEVATION = 58; // degrees at solar noon

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Wraps any clock value into [0, 24). */
export function normalizeClock(clockTime: number) {
  return ((clockTime % 24) + 24) % 24;
}

/** "HH:MM" for a clock value. */
export function formatClock(clockTime: number) {
  const t = normalizeClock(clockTime);
  let h = Math.floor(t);
  let m = Math.round((t - h) * 60);
  if (m === 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const k = clamp01(t);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

/** Piecewise-linear color ramp over elevation stops (ascending). */
function ramp(stops: [number, string][], v: number) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [e1, c1] = stops[i];
    const [e0, c0] = stops[i - 1];
    if (v <= e1) return mix(c0, c1, (v - e0) / (e1 - e0));
  }
  return stops[stops.length - 1][1];
}

export function sunAt(clockTime: number): Lighting {
  const t = normalizeClock(clockTime);
  // Sunrise 06:00 in the east (+x), noon toward +z (the default camera side), sunset 18:00 in the west.
  const phase = ((t - 6) / 12) * Math.PI;
  const elevation = MAX_ELEVATION * Math.sin(phase);
  const elev = (elevation * Math.PI) / 180;
  const az = phase;
  const sun: [number, number, number] = [
    Math.cos(elev) * Math.cos(az),
    Math.sin(elev),
    Math.cos(elev) * Math.sin(az) * 0.8 + 0.2 * Math.cos(elev),
  ];
  const len = Math.hypot(...sun);
  const sunDir = sun.map((v) => v / len) as [number, number, number];

  const daylight = smoothstep(-8, 6, elevation);
  const night = elevation < -2;
  // Key lights never graze or come from below: lift to a minimum height and re-normalize.
  const lift = (v: [number, number, number], minY: number) => {
    const m: [number, number, number] = [v[0], Math.max(minY, v[1]), v[2]];
    const l = Math.hypot(...m);
    return m.map((x) => x / l) as [number, number, number];
  };
  // At night the moon sits opposite the sun.
  const moonDir = lift([-sunDir[0], -sunDir[1], -sunDir[2]], 0.35);

  const sunColor = ramp(
    [
      [-2, "#ff6a2b"],
      [4, "#ff9550"],
      [12, "#ffc78f"],
      [25, "#ffe9cf"],
      [45, "#fff6ec"],
    ],
    elevation,
  );
  // Intensities are paired with a low exposure (below) so the physical sky shader is not blown out.
  const sunIntensity = 4.2 * smoothstep(-2, 30, elevation) + 0.85 * smoothstep(-2, 4, elevation);

  return {
    direction: night ? moonDir : lift(sunDir, 0.08),
    elevation,
    daylight,
    keyColor: night ? "#8fa6d9" : sunColor,
    keyIntensity: night ? 1 : sunIntensity,
    sunPosition: sunDir,
    hemiSky: ramp(
      [
        [-12, "#141c33"],
        [-2, "#3a3f63"],
        [6, "#e2a98a"],
        [20, "#b9cde6"],
        [45, "#a9c6ea"],
      ],
      elevation,
    ),
    hemiGround: ramp(
      [
        [-12, "#0b0f0c"],
        [4, "#4a3d2e"],
        [25, "#56603f"],
      ],
      elevation,
    ),
    hemiIntensity: 0.75 + 1.95 * smoothstep(-8, 30, elevation),
    fog: ramp(
      [
        [-12, "#0a0f1e"],
        [-3, "#2c3150"],
        [3, "#e09a72"],
        [12, "#e6d3c0"],
        [25, "#cddbe8"],
        [45, "#c3d6ea"],
      ],
      elevation,
    ),
    starOpacity: 1 - smoothstep(-10, 0, elevation),
    exposure: 0.5 + 0.1 * (1 - daylight),
  };
}
