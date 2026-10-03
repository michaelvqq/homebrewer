"use client";

import { isOutdoor, type HouseSpec } from "@/lib/house/spec";

export const WALL_HEIGHT = 2.6;
const WALL_THICKNESS = 0.1;
const SILL = 0.9;
const HEADER = 2.1;

type Room = HouseSpec["rooms"][number];
type Opening = HouseSpec["doors"][number];
type Side = Opening["wall"];

type Segment = { t0: number; t1: number; y0: number; y1: number; pane?: boolean };

// Splits a wall of the given length into solid segments around doors and windows.
function wallSegments(length: number, doors: Opening[], windows: Opening[]): Segment[] {
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
  let cursor = 0;
  for (const o of openings) {
    const t0 = Math.max(o.t0, cursor);
    if (t0 > cursor) segments.push({ t0: cursor, t1: t0, y0: 0, y1: WALL_HEIGHT });
    if (o.t1 <= t0) continue;
    if (o.kind === "window") {
      segments.push({ t0, t1: o.t1, y0: 0, y1: SILL });
      segments.push({ t0, t1: o.t1, y0: HEADER, y1: WALL_HEIGHT });
      segments.push({ t0, t1: o.t1, y0: SILL, y1: HEADER, pane: true });
    }
    cursor = Math.max(cursor, o.t1);
  }
  if (cursor < length) segments.push({ t0: cursor, t1: length, y0: 0, y1: WALL_HEIGHT });
  return segments;
}

function Wall({ room, side, doors, windows }: { room: Room; side: Side; doors: Opening[]; windows: Opening[] }) {
  const alongX = side === "n" || side === "s";
  const length = alongX ? room.width : room.depth;
  const x0 = side === "e" ? room.x + room.width : room.x;
  const z0 = side === "s" ? room.z + room.depth : room.z;

  return (
    <>
      {wallSegments(length, doors, windows).map((s, i) => {
        const mid = (s.t0 + s.t1) / 2;
        const len = s.t1 - s.t0;
        const h = s.y1 - s.y0;
        const pos: [number, number, number] = alongX
          ? [x0 + mid, s.y0 + h / 2, z0]
          : [x0, s.y0 + h / 2, z0 + mid];
        const size: [number, number, number] = alongX
          ? [len, h, s.pane ? 0.03 : WALL_THICKNESS]
          : [s.pane ? 0.03 : WALL_THICKNESS, h, len];
        return s.pane ? (
          <mesh key={i} position={pos}>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#a8d8f0" transparent opacity={0.35} roughness={0.1} metalness={0.1} />
          </mesh>
        ) : (
          <mesh key={i} position={pos} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={room.wallColor} roughness={0.9} />
          </mesh>
        );
      })}
    </>
  );
}

export function RoomShell({ room, spec }: { room: Room; spec: HouseSpec }) {
  const sides: Side[] = ["n", "s", "e", "w"];
  if (isOutdoor(room)) {
    // Ground surface only (lawn, deck, patio, driveway), just above the grass and below indoor floors.
    return (
      <mesh position={[room.x + room.width / 2, 0.005, room.z + room.depth / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={room.floorColor} roughness={0.95} />
      </mesh>
    );
  }
  return (
    <group>
      <mesh
        position={[room.x + room.width / 2, 0.01, room.z + room.depth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={room.floorColor} roughness={0.85} />
      </mesh>
      {sides.map((side) => (
        <Wall
          key={side}
          room={room}
          side={side}
          doors={spec.doors.filter((d) => d.roomId === room.id && d.wall === side)}
          windows={spec.windows.filter((w) => w.roomId === room.id && w.wall === side)}
        />
      ))}
    </group>
  );
}
