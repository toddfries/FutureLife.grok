export const AIR = 0;
export const GRASS = 1;
export const DIRT = 2;
export const STONE = 3;
export const SAND = 4;
export const WATER = 5;
export const LEAF = 6;
export const WOOD = 7;
export const MOSS = 8;
export const CRYSTAL = 9;
export const CLAY = 10;
export const BLOCK_COUNT = 11;

export const BLOCK_RGB: Float32Array[] = [
  new Float32Array([0, 0, 0]),
  new Float32Array([0.22, 0.48, 0.28]), // grass
  new Float32Array([0.38, 0.26, 0.16]), // dirt
  new Float32Array([0.55, 0.5, 0.42]), // stone
  new Float32Array([0.76, 0.68, 0.48]), // sand
  new Float32Array([0.1, 0.38, 0.46]), // water
  new Float32Array([0.18, 0.55, 0.32]), // leaf
  new Float32Array([0.33, 0.22, 0.14]), // wood
  new Float32Array([0.14, 0.36, 0.24]), // moss
  new Float32Array([0.42, 0.82, 0.78]), // crystal
  new Float32Array([0.62, 0.4, 0.28]), // clay / warm strata
];

export const FACE_SHADE = [1.05, 0.52, 0.82, 0.82, 0.7, 0.7];

export function isOpaque(b: number): boolean {
  return b !== AIR && b !== WATER;
}

export function isSolid(b: number): boolean {
  return b !== AIR && b !== WATER;
}

/** Hex used by the sky / fog / ocean — keep in sync with CSS tokens conceptually. */
export const WORLD_HEX = {
  fog: 0x7aa8b0,
  skyZenith: 0x16384a,
  skyHorizon: 0xb7d4d0,
  ocean: 0x15616d,
  sun: 0xffe6c2,
  ambientSky: 0x8ec9d6,
  ambientGround: 0x24382c,
};
