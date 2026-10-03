"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

// An animated layer of the house. Hiding folds it down onto `baseY` (and lifts it by `lift`, e.g. a roof
// coming off); showing reverses it. With `appear`, it also grows in on mount after `delay` seconds.
export function Layer({
  shown,
  baseY = 0,
  lift = 0,
  appear = false,
  delay = 0,
  children,
}: {
  shown: boolean;
  baseY?: number;
  lift?: number;
  appear?: boolean;
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  // Initial props only; useFrame animates from there (R3F only reapplies props that change).
  const [start] = useState(() => (appear ? 0 : shown ? 1 : 0));
  const p = useRef(start);
  const wait = useRef(appear ? delay : 0);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (wait.current > 0) {
      wait.current -= dt;
      g.visible = false;
      return;
    }
    const target = shown ? 1 : 0;
    let next = p.current + (target - p.current) * Math.min(1, dt * 7);
    if (Math.abs(target - next) < 0.002) next = target;
    p.current = next;
    // Ease-out-back on the way in for a little overshoot.
    const e = next === 1 ? 1 : 1 + 2.2 * Math.pow(next - 1, 3) + 1.2 * Math.pow(next - 1, 2);
    g.scale.set(1, Math.max(0.0001, e), 1);
    g.position.y = baseY + (1 - next) * lift;
    g.visible = next > 0.001;
  });

  return (
    <group ref={ref} position={[0, baseY, 0]} scale={[1, start || 0.0001, 1]} visible={start > 0}>
      <group position={[0, -baseY, 0]}>{children}</group>
    </group>
  );
}
