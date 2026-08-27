import { PLANET_R } from "./planet";
import { SIGN_LOCAL, STARBASE_ORIGIN, signWorld } from "./starbase";

/** Roadster length in world units (hull × group scale). */
export const CAR_LEN = 6.2;
export const CAR_SEP = 5.8;

const PAD_GAP = 46;
const TOWER_HALF = 9;
const TOWER_LOCAL_Z = -2.2;
const KEEP_R = 11;

/** Front-row radius from the sign. Deeper rows step one car-length out. */
const R0 = 46;
const ROW_STEP = CAR_LEN * 1.25;
const ELEV0 = 0.08;
const RAKE = 0.18;
const LAYERS = 3;
const STALLS = [7, 9, 11] as const;

export type SpawnPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

/** World position of one of the 10 catch towers, starting at complex 3. */
export function towerAt(index: number) {
  const i = ((index % 10) + 10) % 10;
  const complex = (3 + Math.floor(i / 2)) % 5;
  const side = i % 2 === 0 ? -1 : 1;
  return {
    x: (complex - 2) * PAD_GAP + side * TOWER_HALF,
    y: 22,
    z: STARBASE_ORIGIN.z + TOWER_LOCAL_Z,
  };
}

function starbaseDeckY(x: number, z: number) {
  const lx = x - STARBASE_ORIGIN.x;
  const lz = z - STARBASE_ORIGIN.z;
  if (Math.abs(lx) < 128 && Math.abs(lz - 8) < 42) return 7.2;
  if (Math.abs(lx) < 140 && Math.abs(lz - 38) < 28) return 5.4;
  return 0;
}

export function minClearanceY(x: number, z: number) {
  const r2 = x * x + z * z;
  let surf = 2.4;
  if (r2 < PLANET_R * PLANET_R - 4) {
    surf = -PLANET_R + Math.sqrt(PLANET_R * PLANET_R - r2);
  }
  return Math.max(surf + 2.6, starbaseDeckY(x, z), 4.2);
}

function tooCloseToTower(x: number, y: number, z: number) {
  for (let i = 0; i < 10; i++) {
    const t = towerAt(i);
    const dx = x - t.x;
    const dz = z - t.z;
    if (dx * dx + dz * dz < KEEP_R * KEEP_R && y < t.y + 16) return true;
  }
  return false;
}

function lookAtSign(x: number, y: number, z: number): Pick<SpawnPose, "yaw" | "pitch"> {
  const s = signWorld();
  const dx = s.x - x;
  const dy = s.y - y;
  const dz = s.z - z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.asin(Math.max(-0.85, Math.min(0.85, dy / len))),
  };
}

/** Center-out stall offsets so the first joiner gets the dead-center seat. */
function stallOrder(n: number): number[] {
  const out = [0];
  for (let k = 1; out.length < n; k++) {
    out.push(k);
    if (out.length < n) out.push(-k);
  }
  return out;
}

/**
 * Three-row amphitheater on a sphere centered on the sign. Every slot is the
 * same radial distance as its row (equal distance from the lettering), higher
 * rows rake up and look down, and odd rows stagger a half-stall so rear
 * drivers see through the cars ahead to STARBASE LOUISIANA — never the back
 * of the board.
 */
function packPoses(): SpawnPose[] {
  const sign = signWorld();
  const poses: SpawnPose[] = [];
  for (let layer = LAYERS - 1; layer >= 0; layer--) {
    const n = STALLS[layer]!;
    const R = R0 + layer * ROW_STEP;
    const elev = ELEV0 + layer * RAKE;
    const ce = Math.cos(elev);
    const se = Math.sin(elev);
    const stagger = layer % 2 === 1 ? 0.5 : 0;
    const dAz = CAR_LEN / Math.max(8, R * ce);
    for (const stall of stallOrder(n)) {
      const az = (stall + stagger) * dAz;
      const x = sign.x + R * ce * Math.sin(az);
      const y = sign.y + R * se;
      const z = sign.z + R * ce * Math.cos(az);
      const floor = minClearanceY(x, z);
      if (y < floor + 0.4) continue;
      if (tooCloseToTower(x, y, z)) continue;
      const lx = x - STARBASE_ORIGIN.x;
      const lz = z - STARBASE_ORIGIN.z;
      if (Math.hypot(lx - SIGN_LOCAL.x, lz - SIGN_LOCAL.z) < 18 && Math.abs(y - sign.y) < 10) {
        continue;
      }
      poses.push({ x, y, z, ...lookAtSign(x, y, z) });
    }
  }
  if (poses.length === 0) {
    const y = Math.max(sign.y, minClearanceY(sign.x, sign.z + R0));
    poses.push({
      x: sign.x,
      y,
      z: sign.z + R0,
      ...lookAtSign(sign.x, y, sign.z + R0),
    });
  }
  return poses;
}

const PACK = packPoses();

export function poseForSpawn(spawnIdx: number): SpawnPose {
  const i = ((Math.trunc(spawnIdx) % PACK.length) + PACK.length) % PACK.length;
  return PACK[i]!;
}
