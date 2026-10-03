"use client";

import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { LABEL_FONT } from "./label-font";
import { Billboard, Text } from "@react-three/drei";
import type { Group } from "three";

export type Avatar = { id: string; name: string; color: string; x: number; z: number; yaw: number };

const RADIUS = 0.25;
const LENGTH = 1.2;
const BODY_Y = LENGTH / 2 + RADIUS;

function AvatarFigure({ avatar }: { avatar: Avatar }) {
  const ref = useRef<Group>(null);
  const placed = useRef(false);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (!placed.current) {
      g.position.set(avatar.x, 0, avatar.z);
      g.rotation.y = avatar.yaw;
      placed.current = true;
      return;
    }
    const a = Math.min(1, dt * 8);
    g.position.x += (avatar.x - g.position.x) * a;
    g.position.z += (avatar.z - g.position.z) * a;
    let dy = avatar.yaw - g.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.rotation.y += dy * a;
  });

  return (
    <group ref={ref}>
      <mesh position={[0, BODY_Y, 0]} castShadow>
        <capsuleGeometry args={[RADIUS, LENGTH, 8, 16]} />
        <meshStandardMaterial color={avatar.color} roughness={0.5} />
      </mesh>
      {/* Visor shows facing direction (cameras look down -z). */}
      <mesh position={[0, BODY_Y + 0.4, -RADIUS + 0.02]}>
        <boxGeometry args={[0.3, 0.1, 0.08]} />
        <meshStandardMaterial color="#1f2937" roughness={0.3} />
      </mesh>
      <Suspense fallback={null}>
        <Billboard position={[0, BODY_Y + LENGTH / 2 + RADIUS + 0.3, 0]}>
          <Text font={LABEL_FONT} fontSize={0.22} color="#111827" outlineWidth={0.015} outlineColor="#ffffff" anchorX="center" anchorY="middle">
            {avatar.name}
          </Text>
        </Billboard>
      </Suspense>
    </group>
  );
}

export function Avatars({ avatars }: { avatars: Avatar[] }) {
  return (
    <>
      {avatars.map((a) => (
        <AvatarFigure key={a.id} avatar={a} />
      ))}
    </>
  );
}
