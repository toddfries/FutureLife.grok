import { createNoise2D, createNoise3D } from "simplex-noise";
import { mulberry32, uhash } from "./rng";
import {
  AIR,
  CLAY,
  CRYSTAL,
  DIRT,
  GRASS,
  MOSS,
  SAND,
  STONE,
  WATER,
} from "./palette";

export const CHUNK = 16;
export const CHUNK_Y = 48;
export const Y_MIN = -8;
export const Y_MAX = Y_MIN + CHUNK_Y; // 40
export const CELL = 248;

export type Quality = {
  voxelSize: number;
  radius: number;
  treeDensity: number;
  giantTrees: boolean;
  spores: boolean;
  waterfalls: boolean;
  shadows: boolean;
};

export function qualityFromDetail(t: number): Quality {
  const u = Math.min(1, Math.max(0, t));
  return {
    voxelSize: 10 - u * 7,
    radius: Math.round(3 + u * 4),
    treeDensity: 0.028 + u * 0.09,
    giantTrees: u > 0.12,
    spores: u > 0.18,
    waterfalls: u > 0.16,
    shadows: u > 0.55,
  };
}

export type IslandInfo = {
  d: number;
  cx: number;
  cz: number;
  rnd: number;
  maxR: number;
  peak: number;
  base: number;
  present: boolean;
};

export type LandSample = {
  land: boolean;
  h: number;
  v: number;
  beach: boolean;
};

function fbm2(
  n: (x: number, y: number) => number,
  x: number,
  z: number,
  oct = 5,
): number {
  let a = 0;
  let amp = 1;
  let f = 1;
  let s = 0;
  for (let i = 0; i < oct; i++) {
    a += amp * n(x * f, z * f);
    s += amp;
    amp *= 0.5;
    f *= 2.05;
  }
  return a / s;
}

function fbm3(
  n: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  oct = 4,
): number {
  let a = 0;
  let amp = 1;
  let f = 1;
  let s = 0;
  for (let i = 0; i < oct; i++) {
    a += amp * n(x * f, y * f, z * f);
    s += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return a / s;
}

/**
 * Large continents (wavelength ~550u ≈ 50+ voxels at vs=10). Same function
 * paints the planet texture, so water on the globe is water under the craft.
 */
export function landValue(
  n2: (x: number, y: number) => number,
  n2b: (x: number, y: number) => number,
  wx: number,
  wz: number,
): LandSample {
  const n = fbm2(n2, wx * 0.0017, wz * 0.0017, 3);
  const dtl = fbm2(n2b, wx * 0.008, wz * 0.008, 3);
  const d = Math.hypot(wx, wz + 28);
  const gulf = d < 220 ? 0.5 : d < 340 ? (340 - d) / 240 : 0;
  const v = n * 0.82 + 0.1 + gulf;
  const land = v > 0.22;
  const h = land ? 1.4 + (v - 0.22) * 88 + dtl * 10 : 0;
  return { land, h, v, beach: land && v < 0.32 };
}

export class World {
  readonly seed: number;
  voxelSize: number;
  private readonly n2: (x: number, y: number) => number;
  private readonly n2b: (x: number, y: number) => number;
  private readonly n3: (x: number, y: number, z: number) => number;

  constructor(seed: number, voxelSize: number) {
    this.seed = seed;
    this.voxelSize = voxelSize;
    this.n2 = createNoise2D(mulberry32(seed));
    this.n2b = createNoise2D(mulberry32(seed ^ 0x9e3779b9));
    this.n3 = createNoise3D(mulberry32(seed ^ 0x85ebca6b));
  }

  landAt(wx: number, wz: number): LandSample {
    return landValue(this.n2, this.n2b, wx, wz);
  }

  islandAt(wx: number, wz: number): IslandInfo {
    const gx = Math.floor(wx / CELL);
    const gz = Math.floor(wz / CELL);
    let best = Infinity;
    let cx = 0;
    let cz = 0;
    let rnd = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const ix = gx + i;
        const iz = gz + j;
        const r = uhash(ix, iz, this.seed);
        const fx = (ix + 0.18 + uhash(ix, iz, this.seed + 1) * 0.64) * CELL;
        const fz = (iz + 0.18 + uhash(ix, iz, this.seed + 2) * 0.64) * CELL;
        const dx = wx - fx;
        const dz = wz - fz;
        const d = dx * dx + dz * dz;
        if (d < best) {
          best = d;
          cx = fx;
          cz = fz;
          rnd = r;
        }
      }
    }
    const L = this.landAt(cx, cz);
    const present = L.land && rnd > 0.38 && L.h > 10;
    const maxR = 48 + rnd * 72;
    const peak = L.h;
    return {
      d: Math.sqrt(best),
      cx,
      cz,
      rnd,
      maxR,
      peak,
      base: 0,
      present,
    };
  }

  /** Sample the voxel at a world-space point. Deterministic per (seed, voxelSize). */
  blockAt(wx: number, wy: number, wz: number): number {
    const vs = this.voxelSize;
    const x = Math.floor(wx / vs) * vs + vs * 0.5;
    const y = Math.floor(wy / vs) * vs + vs * 0.5;
    const z = Math.floor(wz / vs) * vs + vs * 0.5;

    if (y > 230 || y < -36) return AIR;

    // Keep Starbase Louisiana (origin ~ 0, −28) clear of voxel hills.
    const sbx = x;
    const sbz = z + 28;
    if (sbx * sbx + sbz * sbz < 190 * 190) {
      if (y < 1.4 && y > -8) return y > -2 ? SAND : STONE;
      return AIR;
    }

    const floor =
      -12 + fbm2(this.n2, x * 0.012, z * 0.012, 4) * 9 + this.n2b(x * 0.04, z * 0.04) * 2;
    if (y <= floor) {
      if (y > floor - vs * 1.6) return y > -4 ? SAND : STONE;
      return STONE;
    }

    const L = this.landAt(x, z);
    const n3 = fbm3(this.n3, x * 0.018, y * 0.028, z * 0.018, 3);

    if (!L.land) {
      // Ocean is the planet mesh + a local plane, not a voxel fill.
      return AIR;
    }

    const surface = L.h;
    if (y > surface + vs * 0.2) return AIR;

    const lake = fbm2(this.n2b, x * 0.02 + 30, z * 0.02, 3);
    const wantLake = lake > 0.38 && L.v > 0.4 && L.v < 0.62 && surface > 8 && !L.beach;

    if (wantLake && y > surface - vs * 2.2 && y <= surface) return WATER;
    if (wantLake && y > surface - vs * 3.2 && y <= surface - vs * 2.2) return SAND;

    const fromTop = surface - y;
    if (fromTop < vs * 0.95) {
      if (L.beach || surface < 3.2) return SAND;
      return n3 > 0.15 ? GRASS : MOSS;
    }
    if (fromTop < vs * 3.4) return DIRT;
    if (y < floor + vs * 2.8) return n3 > 0.38 ? CRYSTAL : STONE;
    if (n3 > 0.22 && (Math.floor(y / vs) & 3) === 0) return CLAY;
    return STONE;
  }

  surfaceAt(wx: number, wz: number): number {
    const vs = this.voxelSize;
    const L = this.landAt(wx, wz);
    if (L.land) return L.h;
    for (let y = 200; y > -4; y -= vs) {
      const b = this.blockAt(wx, y, wz);
      if (b !== AIR && b !== WATER) return y;
    }
    return -8;
  }
}

export function chunkOrigin(cx: number, cz: number, voxelSize: number) {
  const span = CHUNK * voxelSize;
  return { x: cx * span, z: cz * span, y: Y_MIN * voxelSize };
}
