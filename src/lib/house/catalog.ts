export const INDOOR_TYPES = ["bed","sofa","table","chair","desk","toilet","bathtub","counter","fridge","bookshelf","plant","rug","stairs"] as const;
export const OUTDOOR_TYPES = ["tree","bush","flowerbed","lounger","grill","pool","fence","umbrella"] as const;
export const FURNITURE_TYPES = [...INDOOR_TYPES, ...OUTDOOR_TYPES] as const;
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
  // Rises one full storey along its depth (from the -z end at rotation 0).
  stairs: { w: 1.0, d: 3.0, h: 2.8, color: "#a07850" },
  tree: { w: 2.0, d: 2.0, h: 4.5, color: "#3d7a3a" },
  bush: { w: 0.9, d: 0.9, h: 0.9, color: "#4f8a3f" },
  flowerbed: { w: 2.0, d: 0.7, h: 0.35, color: "#d9668a" },
  lounger: { w: 0.7, d: 1.9, h: 0.4, color: "#f0ebe0" },
  grill: { w: 1.0, d: 0.6, h: 1.1, color: "#2f2f33" },
  pool: { w: 3.5, d: 7.0, h: 0.1, color: "#4fb3d9" },
  fence: { w: 2.0, d: 0.08, h: 1.1, color: "#c9b28f" },
  umbrella: { w: 2.2, d: 2.2, h: 2.4, color: "#e4572e" },
};
