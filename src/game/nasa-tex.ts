import * as THREE from "three";
import { ORBIT, type OrbitEl } from "./orbits";
import { type BodyId } from "./bodies";

const cache = new Map<string, THREE.Texture>();
const pending = new Map<string, Promise<THREE.Texture>>();
const loader = new THREE.TextureLoader();

export function nasaUrl(id: BodyId): string {
  return ORBIT[id].map;
}

export function loadNasaMap(id: BodyId | "sun"): Promise<THREE.Texture> {
  const url = id === "sun" ? "/planets/sun.jpg" : ORBIT[id as BodyId].map;
  const hit = cache.get(url);
  if (hit) return Promise.resolve(hit);
  const wait = pending.get(url);
  if (wait) return wait;
  const p = new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        cache.set(url, tex);
        pending.delete(url);
        resolve(tex);
      },
      undefined,
      (err) => {
        pending.delete(url);
        reject(err);
      },
    );
  });
  pending.set(url, p);
  return p;
}

export function applyNasaMap(mat: THREE.MeshPhongMaterial | THREE.MeshLambertMaterial, tex: THREE.Texture) {
  const old = mat.map;
  mat.map = tex;
  mat.color.setHex(0xffffff);
  mat.needsUpdate = true;
  if (old && old !== tex) old.dispose();
}

export type { OrbitEl };
