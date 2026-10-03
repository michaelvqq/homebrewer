"use client";

import { Color } from "three";
import { exteriorSpans, neighborDoors } from "@/lib/house/exterior";
import { footprint, roomFloor, SLAB, slabPieces, STOREY } from "@/lib/house/floors";
import { isOutdoor, type HouseSpec } from "@/lib/house/spec";

export const WALL_HEIGHT = 2.6;
const WALL_THICKNESS = 0.1;
const SILL = 0.9;
const HEADER = 2.1;

type Room = HouseSpec["rooms"][number];
type Opening = HouseSpec["doors"][number];
type Side = Opening["wall"];

type Segment = { t0: number; t1: number; y0: number; y1: number; pane?: boolean };
type Gap = { t0: number; t1: number; kind: "door" | "window" };
type Vec3 = [number, number, number];

const TRIM = "#3d3a36"; // window frames and the wall-top cap
const CASING = "#9a7650"; // wooden door casing
const SIDING = ["#d4c5ab", "#c9b99c"]; // exterior lap boards, alternating
const BOARD = 0.2;

// Splits a wall of the given length into solid segments around doors and windows.
function wallSegments(length: number, doors: Opening[], windows: Opening[]): { segments: Segment[]; gaps: Gap[] } {
  const openings = [
    ...doors.map((o) => ({ ...o, kind: "door" as const })),
    ...windows.map((o) => ({ ...o, kind: "window" as const })),
  ]
    .map((o) => {
      const t0 = Math.max(0, Math.min(length, o.offset));
      const t1 = Math.max(t0, Math.min(length, o.offset + o.width));
      return { t0, t1, kind: o.kind };
    })
    .filter((o) => o.t1 - o.t0 > 0.05)
    .sort((a, b) => a.t0 - b.t0);

  const segments: Segment[] = [];
  const gaps: Gap[] = [];
  let cursor = 0;
  for (const o of openings) {
    const t0 = Math.max(o.t0, cursor);
    if (t0 > cursor) segments.push({ t0: cursor, t1: t0, y0: 0, y1: WALL_HEIGHT });
    if (o.t1 <= t0) continue;
    gaps.push({ t0, t1: o.t1, kind: o.kind });
    if (o.kind === "window") {
      segments.push({ t0, t1: o.t1, y0: 0, y1: SILL });
      segments.push({ t0, t1: o.t1, y0: SILL, y1: HEADER, pane: true });
    }
    segments.push({ t0, t1: o.t1, y0: HEADER, y1: WALL_HEIGHT });
    cursor = Math.max(cursor, o.t1);
  }
  if (cursor < length) segments.push({ t0: cursor, t1: length, y0: 0, y1: WALL_HEIGHT });
  return { segments, gaps };
}

function Block({ pos, size, color, shadow }: { pos: Vec3; size: Vec3; color: string; shadow?: boolean }) {
  return (
    <mesh position={pos} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function Wall({ room, side, doors, windows, exterior }: { room: Room; side: Side; doors: Opening[]; windows: Opening[]; exterior: [number, number][] }) {
  const alongX = side === "n" || side === "s";
  const length = alongX ? room.width : room.depth;
  const x0 = side === "e" ? room.x + room.width : room.x;
  const z0 = side === "s" ? room.z + room.depth : room.z;
  const out = side === "n" || side === "w" ? -1 : 1; // outward normal along the wall's thickness axis
  const { segments, gaps } = wallSegments(length, doors, windows);
  const baseboard = new Color(room.wallColor).lerp(new Color("#000000"), 0.35).getStyle();

  // A box spanning [t0, t1] along the wall, [y0, y1] high, `thick` deep, pushed `push` meters outward.
  const box = (t0: number, t1: number, y0: number, y1: number, thick: number, push = 0): { pos: Vec3; size: Vec3 } => {
    const mid = (t0 + t1) / 2;
    const len = t1 - t0;
    const h = y1 - y0;
    return alongX
      ? { pos: [x0 + mid, y0 + h / 2, z0 + push * out], size: [len, h, thick] }
      : { pos: [x0 + push * out, y0 + h / 2, z0 + mid], size: [thick, h, len] };
  };

  const parts: React.ReactNode[] = [];
  segments.forEach((s, i) => {
    if (s.pane) {
      const b = box(s.t0, s.t1, s.y0, s.y1, 0.03);
      parts.push(
        <mesh key={`p${i}`} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#a8d8f0" transparent opacity={0.35} roughness={0.1} metalness={0.1} />
        </mesh>,
      );
      return;
    }
    // Each room draws only the inner half of its walls, so two rooms sharing a wall never overlap
    // (no z-fighting) and each side shows its own room's color. Exterior parts get their outer half below.
    const T = WALL_THICKNESS;
    parts.push(<Block key={`s${i}`} {...box(s.t0, s.t1, s.y0, s.y1, T / 2, -T / 4)} color={room.wallColor} shadow />);
    if (s.y0 === 0) parts.push(<Block key={`b${i}`} {...box(s.t0, s.t1, 0, 0.1, 0.015, -(T / 2 + 0.0075))} color={baseboard} />);
    if (s.y1 === WALL_HEIGHT)
      parts.push(<Block key={`c${i}`} {...box(s.t0, s.t1, WALL_HEIGHT - 0.04, WALL_HEIGHT + 0.015, T + 0.04)} color={TRIM} />);
    // Lap siding on the parts of this segment that face outside.
    for (const [e0, e1] of exterior) {
      const t0 = Math.max(s.t0, e0);
      const t1 = Math.min(s.t1, e1);
      if (t1 - t0 < 0.05) continue;
      parts.push(<Block key={`o${i}-${t0}`} {...box(t0, t1, s.y0, s.y1, WALL_THICKNESS / 2, WALL_THICKNESS / 4)} color={SIDING[1]} shadow />);
      for (let y = s.y0, k = Math.round(s.y0 / BOARD); y < s.y1 - 0.02; y += BOARD, k++) {
        const top = Math.min(s.y1, y + BOARD - 0.015);
        parts.push(<Block key={`x${i}-${t0}-${k}`} {...box(t0, t1, y, top, 0.025, WALL_THICKNESS / 2 + 0.0125)} color={SIDING[k % 2]} />);
      }
    }
  });

  gaps.forEach((g, i) => {
    const color = g.kind === "window" ? TRIM : CASING;
    // Frames overlap the opening by 3 cm so they cover the cut wall and siding ends (no flicker).
    const deep = WALL_THICKNESS + 0.08;
    const bottom = g.kind === "window" ? SILL : 0;
    parts.push(<Block key={`gl${i}`} {...box(g.t0 - 0.06, g.t0 + 0.03, bottom, HEADER + 0.06, deep)} color={color} />);
    parts.push(<Block key={`gr${i}`} {...box(g.t1 - 0.03, g.t1 + 0.06, bottom, HEADER + 0.06, deep)} color={color} />);
    parts.push(<Block key={`gh${i}`} {...box(g.t0 - 0.06, g.t1 + 0.06, HEADER - 0.03, HEADER + 0.06, deep)} color={color} />);
    if (g.kind === "window") {
      const mid = (g.t0 + g.t1) / 2;
      parts.push(<Block key={`gs${i}`} {...box(g.t0 - 0.1, g.t1 + 0.1, SILL - 0.05, SILL + 0.03, WALL_THICKNESS + 0.12)} color={TRIM} />);
      parts.push(<Block key={`gv${i}`} {...box(mid - 0.02, mid + 0.02, SILL, HEADER, 0.05)} color={TRIM} />);
      parts.push(<Block key={`gm${i}`} {...box(g.t0, g.t1, (SILL + HEADER) / 2 - 0.02, (SILL + HEADER) / 2 + 0.02, 0.05)} color={TRIM} />);
    }
  });

  return <>{parts}</>;
}

export function RoomShell({ room, spec }: { room: Room; spec: HouseSpec }) {
  const sides: Side[] = ["n", "s", "e", "w"];
  const floor = roomFloor(room);
  const roomFloors = new Map(spec.rooms.map((r) => [r.id, roomFloor(r)]));
  // Upper storeys stand on a slab with a stairwell cut out above any stairs from the floor below.
  const holes = spec.furniture.filter((f) => f.type === "stairs" && roomFloors.get(f.roomId) === floor - 1).map(footprint);
  const ground =
    floor === 0 ? (
      <mesh
        position={[room.x + room.width / 2, isOutdoor(room) ? 0.005 : 0.01, room.z + room.depth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={room.floorColor} roughness={isOutdoor(room) ? 0.95 : 0.85} />
      </mesh>
    ) : (
      slabPieces({ x: room.x, z: room.z, w: room.width, d: room.depth }, holes).map((p, i) => (
        <mesh key={i} position={[p.x + p.w / 2, -SLAB / 2 + 0.005, p.z + p.d / 2]} castShadow receiveShadow>
          <boxGeometry args={[p.w, SLAB, p.d]} />
          <meshStandardMaterial color={room.floorColor} roughness={0.85} />
        </mesh>
      ))
    );

  return (
    <group position={[0, floor * STOREY, 0]}>
      {ground}
      {/* Outdoor zones (lawn, deck, patio, driveway) are a surface only, no walls. */}
      {!isOutdoor(room) &&
        sides.map((side) => (
          <Wall
            key={side}
            room={room}
            side={side}
            doors={[
              ...spec.doors.filter((d) => d.roomId === room.id && d.wall === side),
              ...neighborDoors(room, side, spec.rooms, spec.doors),
            ]}
            windows={spec.windows.filter((w) => w.roomId === room.id && w.wall === side)}
            exterior={exteriorSpans(room, side, spec.rooms)}
          />
        ))}
    </group>
  );
}
