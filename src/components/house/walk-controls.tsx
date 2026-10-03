"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { Euler, Vector3 } from "three";

const SPEED = 3;
const EYE_HEIGHT = 1.7;
const SEND_INTERVAL = 0.1;

const FORWARD = ["KeyW", "ArrowUp"];
const BACK = ["KeyS", "ArrowDown"];
const LEFT = ["KeyA", "ArrowLeft"];
const RIGHT = ["KeyD", "ArrowRight"];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

// Walk-mode camera rig. `offset` converts world → house coordinates (house = world + offset).
export function WalkControls({
  selector,
  offset,
  baseY = 0,
  onMove,
}: {
  selector: string;
  offset: { x: number; z: number };
  baseY?: number; // floor height of the storey being walked
  onMove?: (pos: { x: number; z: number; yaw: number }) => void;
}) {
  const get = useThree((s) => s.get);
  const keys = useRef(new Set<string>());
  const onMoveRef = useRef(onMove);
  const offsetRef = useRef(offset);
  const baseRef = useRef(baseY);
  const lastSent = useRef({ t: 0, x: NaN, z: NaN, yaw: NaN });

  useEffect(() => {
    onMoveRef.current = onMove;
    offsetRef.current = offset;
    baseRef.current = baseY;
  });

  useEffect(() => {
    const { camera } = get();
    camera.position.set(0, baseRef.current + EYE_HEIGHT, 0);
    camera.rotation.set(0, 0, 0, "YXZ");
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      keys.current.add(e.code);
      if ([...FORWARD, ...BACK, ...LEFT, ...RIGHT].includes(e.code) && document.pointerLockElement) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    const pressed = keys.current;
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      pressed.clear();
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, [get]);

  const euler = useRef(new Euler(0, 0, 0, "YXZ"));
  const fwd = useRef(new Vector3());
  const right = useRef(new Vector3());

  useFrame((state, dt) => {
    const { camera } = state;
    const k = keys.current;
    const has = (codes: string[]) => codes.some((c) => k.has(c));
    const f = (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0);
    const r = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);

    euler.current.setFromQuaternion(camera.quaternion, "YXZ");
    const yaw = euler.current.y;

    if (f || r) {
      fwd.current.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.current.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const step = SPEED * Math.min(dt, 0.1) / Math.hypot(f, r);
      camera.position.addScaledVector(fwd.current, f * step).addScaledVector(right.current, r * step);
    }
    camera.position.y = baseRef.current + EYE_HEIGHT;

    const now = state.clock.elapsedTime;
    const last = lastSent.current;
    if (onMoveRef.current && now - last.t >= SEND_INTERVAL) {
      const x = camera.position.x + offsetRef.current.x;
      const z = camera.position.z + offsetRef.current.z;
      if (Math.abs(x - last.x) > 0.005 || Math.abs(z - last.z) > 0.005 || Math.abs(yaw - last.yaw) > 0.01 || Number.isNaN(last.x)) {
        lastSent.current = { t: now, x, z, yaw };
        onMoveRef.current({ x, z, yaw });
      }
    }
  });

  return <PointerLockControls selector={selector} />;
}
