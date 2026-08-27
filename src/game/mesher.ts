import * as THREE from "three";
import {
  AIR,
  BLOCK_RGB,
  CRYSTAL,
  FACE_SHADE,
  GRASS,
  isOpaque,
  LEAF,
  MOSS,
  WATER,
  WOOD,
} from "./palette";
import { CHUNK, CHUNK_Y, World, chunkOrigin } from "./world";
import { uhash, uhash3 } from "./rng";

export type Placement = {
  kind: "tree" | "fern" | "crystal" | "giant" | "fall";
  x: number;
  y: number;
  z: number;
  rot: number;
  scale: number;
  extra?: number;
};

export type ChunkMesh = {
  solid: THREE.BufferGeometry | null;
  water: THREE.BufferGeometry | null;
  placements: Placement[];
};

function pushQuad(
  pos: number[],
  nor: number[],
  col: number[],
  corners: number[][],
  nx: number,
  ny: number,
  nz: number,
  rgb: Float32Array,
  shade: number,
  jitter: number,
) {
  const r = Math.min(1, rgb[0]! * shade * jitter);
  const g = Math.min(1, rgb[1]! * shade * jitter);
  const b = Math.min(1, rgb[2]! * shade * jitter);
  const a = corners[0]!;
  const c1 = corners[1]!;
  const d = corners[2]!;
  const e = corners[3]!;
  const tri = [a, c1, d, a, d, e];
  for (const p of tri) {
    pos.push(p[0]!, p[1]!, p[2]!);
    nor.push(nx, ny, nz);
    col.push(r, g, b);
  }
}

/**
 * Culled-face mesh with greedy merging. Neighbor voxels are sampled from the
 * density function so chunk borders never leak faces.
 */
export function meshChunk(
  world: World,
  cx: number,
  cz: number,
  quality: { treeDensity: number; giantTrees: boolean; waterfalls: boolean },
): ChunkMesh {
  const vs = world.voxelSize;
  const origin = chunkOrigin(cx, cz, vs);
  const sx = CHUNK;
  const sy = CHUNK_Y;
  const sz = CHUNK;
  const data = new Uint8Array(sx * sy * sz);

  const at = (x: number, y: number, z: number) => {
    if (x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz) {
      return data[x + z * sx + y * sx * sz]!;
    }
    const wx = origin.x + x * vs;
    const wy = origin.y + y * vs;
    const wz = origin.z + z * vs;
    return world.blockAt(wx, wy, wz);
  };

  for (let y = 0; y < sy; y++) {
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const wx = origin.x + x * vs;
        const wy = origin.y + y * vs;
        const wz = origin.z + z * vs;
        data[x + z * sx + y * sx * sz] = world.blockAt(wx, wy, wz);
      }
    }
  }

  for (let z = 2; z < sz - 2; z++) {
    for (let x = 2; x < sx - 2; x++) {
      for (let y = sy - 2; y > 1; y--) {
        const i = x + z * sx + y * sx * sz;
        const b = data[i]!;
        if (b !== GRASS && b !== MOSS) continue;
        const h = uhash(cx * CHUNK + x, cz * CHUNK + z, world.seed + 91);
        if (h > quality.treeDensity * 0.45) break;
        const hgt = 2 + Math.floor(uhash(x, z, world.seed + 3) * 4);
        for (let t = 1; t <= hgt && y + t < sy - 1; t++) {
          data[x + z * sx + (y + t) * sx * sz] = WOOD;
        }
        const top = Math.min(sy - 2, y + hgt);
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.abs(dx) + Math.abs(dz) > 3) continue;
            const lx = x + dx;
            const lz = z + dz;
            if (lx < 0 || lz < 0 || lx >= sx || lz >= sz) continue;
            for (let dy = 0; dy <= 2; dy++) {
              const ly = top + dy;
              if (ly >= sy) continue;
              const li = lx + lz * sx + ly * sx * sz;
              if (data[li] === AIR) data[li] = LEAF;
            }
          }
        }
        break;
      }
    }
  }

  const solid = emitGreedy(at, sx, sy, sz, vs, origin, false);
  const water = emitGreedy(at, sx, sy, sz, vs, origin, true);
  const placements: Placement[] = [];
  collectPlacements(world, cx, cz, origin, vs, data, quality, placements);
  return { solid, water, placements };
}

function emitGreedy(
  at: (x: number, y: number, z: number) => number,
  sx: number,
  sy: number,
  sz: number,
  vs: number,
  origin: { x: number; y: number; z: number },
  waterPass: boolean,
): THREE.BufferGeometry | null {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const dims = [sx, sy, sz];
  const want = (b: number) => (waterPass ? b === WATER : isOpaque(b));

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[d] = 1;
    const mask = new Int16Array(dims[u]! * dims[v]!);

    for (x[d] = -1; x[d]! < dims[d]!; ) {
      let n = 0;
      for (x[v] = 0; x[v]! < dims[v]!; x[v]++) {
        for (x[u] = 0; x[u]! < dims[u]!; x[u]++) {
          const a = want(at(x[0]!, x[1]!, x[2]!));
          const b = want(at(x[0]! + q[0]!, x[1]! + q[1]!, x[2]! + q[2]!));
          const idA = at(x[0]!, x[1]!, x[2]!);
          const idB = at(x[0]! + q[0]!, x[1]! + q[1]!, x[2]! + q[2]!);
          if (a === b) mask[n++] = 0;
          else if (a) mask[n++] = idA;
          else mask[n++] = -idB;
        }
      }
      x[d]!++;

      n = 0;
      for (let j = 0; j < dims[v]!; j++) {
        for (let i = 0; i < dims[u]!; ) {
          const c = mask[n]!;
          if (c !== 0) {
            let w = 1;
            while (i + w < dims[u]! && mask[n + w] === c) w++;
            let h = 1;
            outer: while (j + h < dims[v]!) {
              for (let k = 0; k < w; k++) {
                if (mask[n + k + h * dims[u]!] !== c) break outer;
              }
              h++;
            }

            x[u] = i;
            x[v] = j;
            const du = [0, 0, 0];
            const dv = [0, 0, 0];
            du[u] = w * vs;
            dv[v] = h * vs;
            const block = Math.abs(c);
            const rgb = BLOCK_RGB[block] ?? BLOCK_RGB[1]!;
            const flip = c < 0;

            const ox = origin.x + x[0]! * vs;
            const oy = origin.y + x[1]! * vs;
            const oz = origin.z + x[2]! * vs;

            const nx = flip ? -q[0]! : q[0]!;
            const ny = flip ? -q[1]! : q[1]!;
            const nz = flip ? -q[2]! : q[2]!;

            let face = 0;
            if (d === 1) face = ny > 0 ? 0 : 1;
            else if (d === 0) face = nx > 0 ? 2 : 3;
            else face = nz > 0 ? 4 : 5;

            const jitter =
              0.88 +
              uhash3(Math.floor(ox), Math.floor(oy), Math.floor(oz), block * 17) *
                0.22;

            const p0 = [ox, oy, oz];
            const p1 = [ox + du[0]!, oy + du[1]!, oz + du[2]!];
            const p2 = [
              ox + du[0]! + dv[0]!,
              oy + du[1]! + dv[1]!,
              oz + du[2]! + dv[2]!,
            ];
            const p3 = [ox + dv[0]!, oy + dv[1]!, oz + dv[2]!];
            const corners = flip ? [p0, p3, p2, p1] : [p0, p1, p2, p3];
            pushQuad(
              pos,
              nor,
              col,
              corners,
              nx,
              ny,
              nz,
              rgb,
              FACE_SHADE[face]!,
              jitter,
            );

            for (let l = 0; l < h; l++) {
              for (let k = 0; k < w; k++) mask[n + k + l * dims[u]!] = 0;
            }
            i += w;
            n += w;
          } else {
            i++;
            n++;
          }
        }
      }
    }
  }

  if (pos.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}

function collectPlacements(
  world: World,
  cx: number,
  cz: number,
  origin: { x: number; y: number; z: number },
  vs: number,
  data: Uint8Array,
  quality: { treeDensity: number; giantTrees: boolean; waterfalls: boolean },
  out: Placement[],
) {
  const sx = CHUNK;
  const sy = CHUNK_Y;
  const sz = CHUNK;

  for (let z = 1; z < sz - 1; z += 2) {
    for (let x = 1; x < sx - 1; x += 2) {
      for (let y = sy - 2; y > 0; y--) {
        const b = data[x + z * sx + y * sx * sz]!;
        if (b !== GRASS && b !== MOSS) continue;
        const wx = origin.x + (x + 0.5) * vs;
        const wy = origin.y + (y + 1) * vs;
        const wz = origin.z + (z + 0.5) * vs;
        const h = uhash(Math.floor(wx), Math.floor(wz), world.seed + 44);
        if (h < quality.treeDensity) {
          out.push({
            kind: "tree",
            x: wx,
            y: wy,
            z: wz,
            rot: h * Math.PI * 2,
            scale: 0.7 + uhash(x, z, world.seed + 5) * 1.4,
          });
        } else if (h < quality.treeDensity + 0.08) {
          out.push({
            kind: "fern",
            x: wx,
            y: wy,
            z: wz,
            rot: h * 9.1,
            scale: 0.8 + h * 1.1,
          });
        }
        break;
      }
    }
  }

  for (let z = 1; z < sz; z += 3) {
    for (let x = 1; x < sx; x += 3) {
      for (let y = 1; y < sy - 1; y++) {
        const b = data[x + z * sx + y * sx * sz]!;
        if (b !== CRYSTAL) continue;
        const above = data[x + z * sx + (y + 1) * sx * sz]!;
        if (above !== AIR) continue;
        const wx = origin.x + (x + 0.5) * vs;
        const wy = origin.y + (y + 1) * vs;
        const wz = origin.z + (z + 0.5) * vs;
        if (uhash(x + cx * 16, z + cz * 16, world.seed + 2) > 0.55) continue;
        out.push({
          kind: "crystal",
          x: wx,
          y: wy,
          z: wz,
          rot: 0,
          scale: 0.6 + uhash(x, y, world.seed) * 1.6,
        });
      }
    }
  }

  if (quality.giantTrees || quality.waterfalls) {
    const midX = origin.x + CHUNK * vs * 0.5;
    const midZ = origin.z + CHUNK * vs * 0.5;
    const isle = world.islandAt(midX, midZ);
    if (isle.present && isle.d < isle.maxR * 0.45) {
      const containsCenter =
        isle.cx >= origin.x &&
        isle.cx < origin.x + CHUNK * vs &&
        isle.cz >= origin.z &&
        isle.cz < origin.z + CHUNK * vs;
      if (
        containsCenter &&
        quality.giantTrees &&
        isle.maxR > 72 &&
        isle.peak > 28
      ) {
        const top = world.surfaceAt(isle.cx, isle.cz);
        out.push({
          kind: "giant",
          x: isle.cx,
          y: top,
          z: isle.cz,
          rot: isle.rnd * 6.2,
          scale: 0.85 + isle.rnd * 0.7,
          extra: isle.maxR,
        });
      }
      if (quality.waterfalls && isle.base > 30 && isle.rnd > 0.62) {
        const ang = isle.rnd * Math.PI * 2;
        const ex = isle.cx + Math.cos(ang) * isle.maxR * 0.82;
        const ez = isle.cz + Math.sin(ang) * isle.maxR * 0.82;
        if (
          ex >= origin.x &&
          ex < origin.x + CHUNK * vs &&
          ez >= origin.z &&
          ez < origin.z + CHUNK * vs
        ) {
          const top = world.surfaceAt(ex, ez);
          if (top > 24) {
            out.push({
              kind: "fall",
              x: ex,
              y: top,
              z: ez,
              rot: ang,
              scale: 1,
              extra: top,
            });
          }
        }
      }
    }
  }
}
