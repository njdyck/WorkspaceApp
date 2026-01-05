export interface Viewport {
  x: number;      // aktuelle X-Position (kann negativ sein)
  y: number;      // aktuelle Y-Position (kann negativ sein)
  scale: number;  // für später (V1: immer 1)
}

export const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  scale: 1,
};





