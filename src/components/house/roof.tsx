"use client";

import { useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { STOREY } from "@/lib/house/floors";
import type { RoofPiece } from "@/lib/house/roof";
import { WALL_HEIGHT } from "./walls";

const ROOF = "#4a4f57"; // slate shingles
const GABLE = "#d4c5ab"; // matches the wall siding
const OVERHANG = 0.4;

function geometry(points: number[]) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(points, 3));
  g.computeVertexNormals();
  return g;
}

// A gable roof along local x: length `len` (ridge), `span` across; the slopes pass through the wall
// tops and run on past them as eaves. Gable triangles close the ends above the walls.
function Gable({ len, span }: { len: number; span: number }) {
  const { slopes, ends } = useMemo(() => {
    const h = Math.min(3, span * 0.3);
    const half = span / 2;
    const v = half + OVERHANG;
    const eave = (-h * OVERHANG) / half;
    const u0 = -len / 2 - OVERHANG;
    const u1 = len / 2 + OVERHANG;
    const quad = (a: number[], b: number[], c: number[], d: number[]) => [...a, ...b, ...c, ...a, ...c, ...d];
    return {
      slopes: geometry([
        ...quad([u0, eave, -v], [u1, eave, -v], [u1, h, 0], [u0, h, 0]),
        ...quad([u0, eave, v], [u0, h, 0], [u1, h, 0], [u1, eave, v]),
      ]),
      ends: geometry([
        ...[-len / 2, 0, -half, -len / 2, 0, half, -len / 2, h, 0],
        ...[len / 2, 0, -half, len / 2, h, 0, len / 2, 0, half],
      ]),
    };
  }, [len, span]);
  return (
    <>
      <mesh geometry={slopes} castShadow receiveShadow>
        <meshStandardMaterial color={ROOF} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh geometry={ends} castShadow receiveShadow>
        <meshStandardMaterial color={GABLE} roughness={0.9} side={DoubleSide} />
      </mesh>
    </>
  );
}

export function Roof({ piece }: { piece: RoofPiece }) {
  const { rect, floor } = piece;
  const y = floor * STOREY + WALL_HEIGHT + 0.015;
  const cx = rect.x + rect.w / 2;
  const cz = rect.z + rect.d / 2;
  if (piece.kind === "flat") {
    return (
      <mesh position={[cx, y + 0.08, cz]} castShadow receiveShadow>
        <boxGeometry args={[rect.w + 0.3, 0.16, rect.d + 0.3]} />
        <meshStandardMaterial color={ROOF} roughness={0.9} />
      </mesh>
    );
  }
  const alongX = piece.ridge === "x";
  return (
    <group position={[cx, y, cz]} rotation={[0, alongX ? 0 : Math.PI / 2, 0]}>
      <Gable len={alongX ? rect.w : rect.d} span={alongX ? rect.d : rect.w} />
    </group>
  );
}
