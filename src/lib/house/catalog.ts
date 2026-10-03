export const FURNITURE_TYPES = ["bed","sofa","table","chair","desk","toilet","bathtub","counter","fridge","bookshelf","plant","rug"] as const;
export type FurnitureType = (typeof FURNITURE_TYPES)[number];
export const CATALOG: Record<FurnitureType, { w: number; d: number; h: number; color: string }> = {
  bed: { w: 1.6, d: 2.1, h: 0.55, color: "#e8e2d6" },
  sofa: { w: 2.0, d: 0.9, h: 0.8, color: "#6b7a8f" },
  table: { w: 1.6, d: 0.9, h: 0.75, color: "#8b5e3c" },
  chair: { w: 0.5, d: 0.5, h: 0.9, color: "#8b5e3c" },
  desk: { w: 1.4, d: 0.7, h: 0.75, color: "#a07850" },
  toilet: { w: 0.4, d: 0.7, h: 0.8, color: "#f5f5f5" },
  bathtub: { w: 0.8, d: 1.7, h: 0.6, color: "#f5f5f5" },
  counter: { w: 2.4, d: 0.6, h: 0.9, color: "#d9d4cc" },
  fridge: { w: 0.8, d: 0.7, h: 1.8, color: "#cfd4d9" },
  bookshelf: { w: 1.0, d: 0.35, h: 1.9, color: "#7a5230" },
  plant: { w: 0.5, d: 0.5, h: 1.1, color: "#3f7d4e" },
  rug: { w: 2.0, d: 1.4, h: 0.02, color: "#b5654a" },
};
