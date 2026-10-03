"use client";

import { Suspense, useEffect, useId, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Billboard, Grid, OrbitControls, Text } from "@react-three/drei";
import type { HouseSpec } from "@/lib/house/spec";
import { RoomShell } from "./walls";
import { Furniture } from "./furniture";
import { WalkControls } from "./walk-controls";
import { Avatars, type Avatar } from "./avatars";

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
          <Text fontSize={0.18} color="#111827" outlineWidth={0.015} outlineColor="#ffffff" anchorX="center" maxWidth={2.5}>
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

function OrbitRig({ size }: { size: number }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { camera } = get();
    const d = size * 0.85 + 4;
    camera.position.set(d * 0.35, d * 0.75, d * 0.75);
    camera.lookAt(0, 0, 0);
  }, [get, size]);
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
}: {
  spec: HouseSpec | null;
  showFurniture: boolean;
  mode: "orbit" | "walk";
  avatars: Avatar[];
  onMove?: (pos: { x: number; z: number; yaw: number }) => void;
  pins?: Pin[];
  onPick?: (pos: { x: number; z: number }) => void; // set while the user is placing a pin
}) {
  const sceneId = useId();
  const selector = `[data-house-scene="${sceneId}"] canvas`;
  const bounds = useMemo(() => houseBounds(spec), [spec]);
  const offset = useMemo(() => ({ x: bounds.cx, z: bounds.cz }), [bounds]);
  const shadowExtent = bounds.size / 2 + 4;

  return (
    <div data-house-scene={sceneId} className={`relative h-full w-full bg-[#d6ecfa] ${onPick ? "cursor-crosshair" : ""}`}>
      <Canvas shadows camera={{ fov: 55, near: 0.05, far: 500, position: [8, 10, 12] }} dpr={[1, 2]}>
        <color attach="background" args={["#d6ecfa"]} />
        <fog attach="fog" args={["#d6ecfa", 40, 140]} />
        <hemisphereLight args={["#ffffff", "#8fbf6a", 0.6]} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[bounds.size * 0.6 + 6, 14, bounds.size * 0.4 + 5]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
          shadow-camera-left={-shadowExtent}
          shadow-camera-right={shadowExtent}
          shadow-camera-top={shadowExtent}
          shadow-camera-bottom={-shadowExtent}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#8fbf6a" roughness={1} />
        </mesh>

        {/* Empty lot: a faint grid so the blank viewport still reads as a space to build in. */}
        {!spec && (
          <Grid
            position={[0, 0.01, 0]}
            args={[60, 60]}
            cellSize={1}
            sectionSize={5}
            cellColor="#6f9a50"
            sectionColor="#4f7a36"
            fadeDistance={45}
            infiniteGrid
          />
        )}

        {/* Everything inside this group is in house coordinates. */}
        <group
          position={[-bounds.cx, 0, -bounds.cz]}
          onClick={(e) => {
            if (!onPick || e.delta > 4) return; // ignore orbit drags
            e.stopPropagation();
            onPick({ x: Math.round((e.point.x + bounds.cx) * 100) / 100, z: Math.round((e.point.z + bounds.cz) * 100) / 100 });
          }}
        >
          {spec?.rooms.map((room) => (
            <RoomShell key={room.id} room={room} spec={spec} />
          ))}
          {spec && <Furniture items={spec.furniture} visible={showFurniture} />}
          <Avatars avatars={avatars} />
          {pins.map((pin) => (
            <PinMarker key={pin.id} pin={pin} />
          ))}
          <Suspense fallback={null}>
            {mode === "orbit" &&
              spec?.rooms.map((room) => (
                <Billboard key={room.id} position={[room.x + room.width / 2, 2.8, room.z + room.depth / 2]}>
                  <Text fontSize={0.4} color="#1f2937" outlineWidth={0.02} outlineColor="#ffffff" anchorX="center" anchorY="middle">
                    {room.name}
                  </Text>
                </Billboard>
              ))}
          </Suspense>
        </group>

        {mode === "orbit" ? (
          <OrbitRig key="orbit" size={bounds.size} />
        ) : (
          <WalkControls key="walk" selector={selector} offset={offset} onMove={onMove} />
        )}
      </Canvas>
    </div>
  );
}
