"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { HouseSpec } from "@/lib/house/spec";

const HouseScene = dynamic(() => import("@/components/house/house-scene").then((m) => m.HouseScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

// The 3D viewport behind the "new house" prompt: empty for a signed-in user, so it feels like the room
// you're about to fill, or a showcase house from the community for a signed-out visitor.
export function HomeViewport({ spec = null }: { spec?: HouseSpec | null }) {
  return <HouseScene spec={spec} showFurniture mode="orbit" avatars={[]} />;
}
