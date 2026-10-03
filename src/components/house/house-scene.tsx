"use client";

import { Suspense, useEffect, useId, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls, Text } from "@react-three/drei";
import type { HouseSpec } from "@/lib/house/spec";
import { LABEL_FONT } from "./label-font";
import { roomFloor, STOREY } from "@/lib/house/floors";
import { RoomShell } from "./walls";
import { Furniture } from "./furniture";
import { WalkControls } from "./walk-controls";
import { Avatars, type Avatar } from "./avatars";
import { World } from "./world";

export type { Avatar };
export type Pin = { id: string; x: number; z: number; label: string; color: string };

// A suggestion marker standing on the floor, in house coordinates.
function PinMarker({ pin }: { pin: Pin }) {
  return (
    <group position={[pin.x, 0, pin.z]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
        <meshStandardMaterial color={pin.color} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={pin.color} emissive={pin.color} emissiveIntensity={0.3} />
      </mesh>
      <Suspense fallback={null}>
        <Billboard position={[0, 1.6, 0]}>
          <Text font={LABEL_FONT} fontSize={0.18} color="#111827" outlineWidth={0.015} outlineColor="#ffffff" anchorX="center" maxWidth={2.5}>
            {pin.label.length > 32 ? `${pin.label.slice(0, 31)}…` : pin.label}
          </Text>
        </Billboard>
      </Suspense>
    </group>
  );
}

type Bounds = { cx: number; cz: number; size: number };

function houseBounds(spec: HouseSpec | null): Bounds {
  if (!spec || spec.rooms.length === 0) return { cx: 0, cz: 0, size: 10 };
  const minX = Math.min(...spec.rooms.map((r) => r.x));
  const maxX = Math.max(...spec.rooms.map((r) => r.x + r.width));
  const minZ = Math.min(...spec.rooms.map((r) => r.z));
  const maxZ = Math.max(...spec.rooms.map((r) => r.z + r.depth));
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, size: Math.max(maxX - minX, maxZ - minZ, 4) };
}

function OrbitRig({ size, empty }: { size: number; empty: boolean }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { camera } = get();
    const d = size * 0.85 + 4;
    // An empty lot gets a low, wide angle so the horizon and sky are in view.
    if (empty) camera.position.set(d * 0.9, d * 0.28, d * 1.1);
    else camera.position.set(d * 0.35, d * 0.75, d * 0.75);
    camera.lookAt(0, 0, 0);
  }, [get, size, empty]);
  return (
    <OrbitControls
      makeDefault
      target={[0, 0, 0]}
      enableDamping
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={2}
      maxDistance={size * 4 + 20}
    />
  );
}

export function HouseScene({
  spec,
  showFurniture,
  mode,
  avatars,
  onMove,
  pins = [],
  onPick,
  clockTime = 14,
  visibleFloor = null,
}: {
  spec: HouseSpec | null;
  showFurniture: boolean;
  mode: "orbit" | "walk";
  avatars: Avatar[];
  onMove?: (pos: { x: number; z: number; yaw: number }) => void;
  pins?: Pin[];
  onPick?: (pos: { x: number; z: number }) => void; // set while the user is placing a pin
  clockTime?: number; // 0-24h, drives the sun and sky
  visibleFloor?: number | null; // show storeys up to this one (null = all); walk mode walks on it
}) {
  const sceneId = useId();
  const selector = `[data-house-scene="${sceneId}"] canvas`;
  const bounds = useMemo(() => houseBounds(spec), [spec]);
  const offset = useMemo(() => ({ x: bounds.cx, z: bounds.cz }), [bounds]);
  const shown = (room: { floor?: number }) => visibleFloor === null || roomFloor(room) <= visibleFloor;
  const rooms = spec?.rooms.filter(shown) ?? [];
  const floorY = useMemo(() => {
    const byId = new Map((spec?.rooms ?? []).map((r) => [r.id, r]));
    return (roomId: string) => {
      const r = byId.get(roomId);
      if (!r) return 0;
      return visibleFloor === null || roomFloor(r) <= visibleFloor ? roomFloor(r) * STOREY : null;
    };
  }, [spec, visibleFloor]);

  return (
    <div data-house-scene={sceneId} className={`relative h-full w-full bg-[#c3d6ea] ${onPick ? "cursor-crosshair" : ""}`}>
      <Canvas shadows="soft" camera={{ fov: 55, near: 0.1, far: 1000, position: [8, 10, 12] }} dpr={[1, 2]}>
        <World clockTime={clockTime} size={bounds.size} />

        {/* Everything inside this group is in house coordinates. */}
        <group
          position={[-bounds.cx, 0, -bounds.cz]}
          onClick={(e) => {
            if (!onPick || e.delta > 4) return; // ignore orbit drags
            e.stopPropagation();
            onPick({ x: Math.round((e.point.x + bounds.cx) * 100) / 100, z: Math.round((e.point.z + bounds.cz) * 100) / 100 });
          }}
        >
          {spec &&
            rooms.map((room) => (
              <RoomShell key={room.id} room={room} spec={spec} />
            ))}
          {spec && <Furniture items={spec.furniture} visible={showFurniture} floorY={floorY} />}
          <Avatars avatars={avatars} />
          {pins.map((pin) => (
            <PinMarker key={pin.id} pin={pin} />
          ))}
          <Suspense fallback={null}>
            {mode === "orbit" &&
              rooms.map((room) => (
                <Billboard key={room.id} position={[room.x + room.width / 2, roomFloor(room) * STOREY + 2.8, room.z + room.depth / 2]}>
                  <Text font={LABEL_FONT} fontSize={0.4} color="#1f2937" outlineWidth={0.02} outlineColor="#ffffff" anchorX="center" anchorY="middle">
                    {room.name}
                  </Text>
                </Billboard>
              ))}
          </Suspense>
        </group>

        {mode === "orbit" ? (
          <OrbitRig key="orbit" size={bounds.size} empty={!spec} />
        ) : (
          <WalkControls key="walk" selector={selector} offset={offset} baseY={(visibleFloor ?? 0) * STOREY} onMove={onMove} />
        )}
      </Canvas>
    </div>
  );
}
