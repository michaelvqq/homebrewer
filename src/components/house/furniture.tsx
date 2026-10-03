"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Color } from "three";
import { CATALOG, type FurnitureType } from "@/lib/house/catalog";
import type { HouseSpec } from "@/lib/house/spec";

type Item = HouseSpec["furniture"][number];
type Vec3 = [number, number, number];

function shade(color: string, amount: number) {
  const c = new Color(color);
  return amount >= 0 ? c.lerp(new Color("#ffffff"), amount).getStyle() : c.lerp(new Color("#000000"), -amount).getStyle();
}

function Box({ pos, size, color, opacity }: { pos: Vec3; size: Vec3; color: string; opacity?: number }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.7} transparent={opacity !== undefined} opacity={opacity ?? 1} />
    </mesh>
  );
}

function Cyl({ pos, r, rTop, h, color }: { pos: Vec3; r: number; rTop?: number; h: number; color: string }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, h, 20]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

function Legs({ w, d, h, color, inset = 0.06, size = 0.05 }: { w: number; d: number; h: number; color: string; inset?: number; size?: number }) {
  const lx = w / 2 - inset;
  const lz = d / 2 - inset;
  return (
    <>
      {[
        [-lx, -lz],
        [lx, -lz],
        [-lx, lz],
        [lx, lz],
      ].map(([x, z], i) => (
        <Box key={i} pos={[x, h / 2, z]} size={[size, h, size]} color={color} />
      ))}
    </>
  );
}

function Parts({ type, color }: { type: FurnitureType; color: string }) {
  const { w, d, h } = CATALOG[type];
  const dark = shade(color, -0.3);
  switch (type) {
    case "bed":
      return (
        <>
          <Box pos={[0, 0.15, 0]} size={[w, 0.3, d]} color={shade("#8b6a4a", 0)} />
          <Box pos={[0, h - 0.06, d * 0.04]} size={[w - 0.08, 0.2, d * 0.92]} color={color} />
          <Box pos={[0, h + 0.07, -d / 2 + 0.3]} size={[w * 0.7, 0.12, 0.35]} color="#ffffff" />
          <Box pos={[0, 0.5, -d / 2 + 0.03]} size={[w, 1.0, 0.06]} color="#8b6a4a" />
        </>
      );
    case "sofa":
      return (
        <>
          <Box pos={[0, 0.22, 0.05]} size={[w, 0.44, d - 0.1]} color={color} />
          <Box pos={[0, h / 2, -d / 2 + 0.1]} size={[w, h, 0.2]} color={dark} />
          <Box pos={[-w / 2 + 0.1, 0.32, 0.05]} size={[0.2, 0.64, d - 0.1]} color={dark} />
          <Box pos={[w / 2 - 0.1, 0.32, 0.05]} size={[0.2, 0.64, d - 0.1]} color={dark} />
        </>
      );
    case "table":
    case "desk":
      return (
        <>
          <Box pos={[0, h - 0.025, 0]} size={[w, 0.05, d]} color={color} />
          <Legs w={w} d={d} h={h - 0.05} color={dark} />
        </>
      );
    case "chair":
      return (
        <>
          <Box pos={[0, 0.45, 0]} size={[w, 0.05, d]} color={color} />
          <Box pos={[0, 0.45 + (h - 0.45) / 2, -d / 2 + 0.025]} size={[w, h - 0.45, 0.05]} color={color} />
          <Legs w={w} d={d} h={0.43} color={dark} size={0.04} inset={0.04} />
        </>
      );
    case "toilet":
      return (
        <>
          <Cyl pos={[0, 0.2, 0.1]} r={0.17} rTop={0.2} h={0.4} color={color} />
          <Box pos={[0, 0.4 + (h - 0.4) / 2, -d / 2 + 0.1]} size={[w, h - 0.4 + 0.2, 0.2]} color={color} />
        </>
      );
    case "bathtub":
      return (
        <>
          <Box pos={[0, h / 2, 0]} size={[w, h, d]} color={color} />
          <Box pos={[0, h + 0.002, 0]} size={[w - 0.14, 0.01, d - 0.14]} color="#cfe9f7" />
        </>
      );
    case "counter":
      return (
        <>
          <Box pos={[0, (h - 0.04) / 2, 0]} size={[w, h - 0.04, d]} color={color} />
          <Box pos={[0, h - 0.02, 0]} size={[w + 0.02, 0.04, d + 0.02]} color={shade(color, -0.5)} />
        </>
      );
    case "fridge":
      return (
        <>
          <Box pos={[0, h / 2, 0]} size={[w, h, d]} color={color} />
          <Box pos={[0, h * 0.62, d / 2 + 0.005]} size={[w - 0.02, 0.01, 0.01]} color={dark} />
          <Box pos={[w / 2 - 0.08, h * 0.75, d / 2 + 0.02]} size={[0.03, 0.3, 0.03]} color={dark} />
        </>
      );
    case "bookshelf":
      return (
        <>
          <Box pos={[0, h / 2, 0]} size={[w, h, d]} color={color} />
          {[0.35, 0.75, 1.15, 1.55].map((y) => (
            <Box key={y} pos={[0, y, d / 2 + 0.003]} size={[w - 0.06, 0.03, 0.01]} color={dark} />
          ))}
        </>
      );
    case "plant":
      return (
        <>
          <Cyl pos={[0, 0.2, 0]} r={0.15} rTop={0.2} h={0.4} color="#b5764a" />
          <mesh position={[0, 0.75, 0]} castShadow>
            <sphereGeometry args={[0.32, 20, 16]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </>
      );
    case "rug":
      return <Box pos={[0, 0.02, 0]} size={[w, h, d]} color={color} />;
    default:
      return <Box pos={[0, h / 2, 0]} size={[w, h, d]} color={color} />;
  }
}

export function FurnitureItem({ item }: { item: Item }) {
  if (!CATALOG[item.type]) return null;
  const color = item.color ?? CATALOG[item.type].color;
  return (
    <group position={[item.x, 0, item.z]} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
      <Parts type={item.type} color={color} />
    </group>
  );
}
export function Furniture({ items, visible }: { items: Item[]; visible: boolean }) {
  const ref = useRef<Group>(null);
  // Initial scale only; afterwards useFrame animates it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialScale = useMemo<Vec3>(() => [1, visible ? 1 : 0, 1], []);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = visible ? 1 : 0;
    const s = g.scale.y + (target - g.scale.y) * Math.min(1, dt * 10);
    const next = Math.abs(target - s) < 0.01 ? target : s;
    g.scale.set(1, next, 1);
    g.visible = next > 0.001;
  });
  return (
    <group ref={ref} scale={initialScale}>
      {items.map((item) => (
        <FurnitureItem key={item.id} item={item} />
      ))}
    </group>
  );
}
