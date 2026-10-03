"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Grid, Sky, Stars } from "@react-three/drei";
import { sunAt } from "@/lib/house/sun";

const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
};

// Sky, sun, bounce light, fog, ground and Studio-style grid, all driven by one clock (0-24h).
// `size` is the house's footprint in metres; it sizes the shadow camera so shadows stay crisp.
export function World({ clockTime, size }: { clockTime: number; size: number }) {
  const l = useMemo(() => sunAt(clockTime), [clockTime]);
  const get = useThree((s) => s.get);
  useEffect(() => {
    get().gl.toneMappingExposure = l.exposure;
  }, [get, l.exposure]);

  const extent = size / 2 + 4;
  const dist = Math.max(30, size * 2);
  const lightPos: [number, number, number] = [l.direction[0] * dist, l.direction[1] * dist, l.direction[2] * dist];
  // Low sun scatters more: redder, hazier sky near the horizon.
  const low = 1 - Math.min(1, Math.max(0, l.elevation / 25));
  // The grid is unlit, so dim it with the light or it glows at night.
  const cell = mixHex("#1b211a", "#5d6f49", l.daylight);
  const section = mixHex("#252c22", "#4c5c3a", l.daylight);

  return (
    <>
      <color attach="background" args={[l.fog]} />
      <fog attach="fog" args={[l.fog, 60, 320]} />
      <Sky
        distance={800}
        sunPosition={l.sunPosition}
        turbidity={2.5 + 6 * low}
        rayleigh={2 + 1.5 * low}
        mieCoefficient={0.003 + 0.005 * low}
        mieDirectionalG={0.82}
      />
      {l.starOpacity > 0.05 && <Stars radius={300} depth={60} count={2500} factor={6} saturation={0} fade speed={0.4} />}

      <hemisphereLight args={[l.hemiSky, l.hemiGround, l.hemiIntensity]} />
      <directionalLight
        position={lightPos}
        color={l.keyColor}
        intensity={l.keyIntensity}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={3}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={0.5}
        shadow-camera-far={dist * 2.5}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color="#6d8a49" roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.003, 0]}
        args={[120, 120]}
        cellSize={1}
        cellThickness={1}
        cellColor={cell}
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor={section}
        fadeDistance={Math.max(55, size * 4)}
        fadeStrength={1.6}
        infiniteGrid
      />
    </>
  );
}
