"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const HouseScene = dynamic(() => import("@/components/house/house-scene").then((m) => m.HouseScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

// The empty 3D viewport shown behind the "new house" prompt, so it feels like the room you're about to fill.
export function HomeViewport() {
  return <HouseScene spec={null} showFurniture mode="orbit" avatars={[]} />;
}
