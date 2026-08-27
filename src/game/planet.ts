import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { BODIES, type Body, type BodyId } from "./bodies";
import { WORLD_HEX } from "./palette";
import { mulberry32 } from "./rng";
import { landValue } from "./world";

/** Playable tangent sits on the north pole: planet center is (0, −R, 0). */
export const PLANET_R = 680;

export type GlobeDot = {
  id: string;
  kind: "player" | "sight";
  name: string;
  x: number;
  y: number;
  z: number;
};

export function planetCenter(): THREE.Vector3 {
  return new THREE.Vector3(0, -PLANET_R, 0);
}

/** World position → lat/lon (degrees). Pole at the playable isles. */
export function worldToLatLon(x: number, y: number, z: number) {
  const cy = y + PLANET_R;
  const r = Math.hypot(x, cy, z) || 1;
  const lat = (Math.asin(cy / r) * 180) / Math.PI;
  const lon = (Math.atan2(z, x) * 180) / Math.PI;
  return { lat, lon, r };
}

export function latLonToWorld(lat: number, lon: number, r = PLANET_R) {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return {
    x: r * Math.cos(la) * Math.cos(lo),
    y: r * Math.sin(la) - PLANET_R,
    z: r * Math.cos(la) * Math.sin(lo),
  };
}

/** Azimuthal map so the globe north cap matches local XZ land/water. */
export function latLonToXZ(lat: number, lon: number) {
  const colat = ((90 - lat) * Math.PI) / 180 * PLANET_R;
  const lo = (lon * Math.PI) / 180;
  return { x: colat * Math.cos(lo), z: colat * Math.sin(lo) };
}

function hexRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

export function makeEarthTexture(
  w = 1024,
  h = 512,
  seed = 1,
  bodyId: BodyId = "earth",
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  paintBodyCanvas(g, w, h, seed, BODIES[bodyId]);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function paintBodyCanvas(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  body: Body,
) {
  g.fillStyle = `#${body.ocean.toString(16).padStart(6, "0")}`;
  g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const n2 = createNoise2D(mulberry32(seed));
  const n2b = createNoise2D(mulberry32(seed ^ 0x9e3779b9));
  const landRgb = hexRgb(body.land);
  const oceanRgb = hexRgb(body.ocean);
  const cloudRgb = hexRgb(body.cloud);

  for (let y = 0; y < h; y++) {
    const lat = 90 - (y / (h - 1)) * 180;
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * 360 - 180;
      const i = (y * w + x) * 4;
      if (body.gas) {
        const band = Math.sin(lat * 0.18 + n2(x * 0.02, lat * 0.04) * 2);
        const t = 0.5 + band * 0.35 + n2b(x * 0.05, y * 0.08) * 0.12;
        d[i] = Math.floor(oceanRgb[0] + (landRgb[0] - oceanRgb[0]) * t);
        d[i + 1] = Math.floor(oceanRgb[1] + (landRgb[1] - oceanRgb[1]) * t);
        d[i + 2] = Math.floor(oceanRgb[2] + (landRgb[2] - oceanRgb[2]) * t);
        d[i + 3] = 255;
        continue;
      }
      const xz = latLonToXZ(lat, lon);
      const L = landValue(n2, n2b, xz.x, xz.z);
      const pole = Math.abs(lat) > 72;
      if (L.land) {
        const t = Math.min(1, (L.v - 0.22) * 2.2);
        if (L.beach) {
          d[i] = 194;
          d[i + 1] = 176;
          d[i + 2] = 110;
        } else {
          d[i] = Math.floor(landRgb[0] * (0.7 + t * 0.4));
          d[i + 1] = Math.floor(landRgb[1] * (0.75 + t * 0.35));
          d[i + 2] = Math.floor(landRgb[2] * (0.7 + t * 0.3));
        }
        if (pole) {
          d[i] = 236;
          d[i + 1] = 244;
          d[i + 2] = 248;
        }
      } else {
        const deep = Math.max(0, 0.22 - L.v);
        d[i] = Math.floor(oceanRgb[0] * (1 - deep * 0.4));
        d[i + 1] = Math.floor(oceanRgb[1] * (1 - deep * 0.25));
        d[i + 2] = Math.floor(oceanRgb[2] * (1 - deep * 0.15));
        if (pole) {
          d[i] = 210;
          d[i + 1] = 224;
          d[i + 2] = 232;
        }
      }
      d[i + 3] = 255;
    }
  }

  if (body.atmo && body.cloud) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cld =
          n2b(x * 0.018 + 9, y * 0.04) * 0.55 + n2(x * 0.05, y * 0.07 + 4) * 0.45;
        if (cld < 0.28) continue;
        const a = Math.min(0.55, (cld - 0.28) * 1.4);
        const i = (y * w + x) * 4;
        d[i] = Math.floor(d[i]! * (1 - a) + cloudRgb[0] * a);
        d[i + 1] = Math.floor(d[i + 1]! * (1 - a) + cloudRgb[1] * a);
        d[i + 2] = Math.floor(d[i + 2]! * (1 - a) + cloudRgb[2] * a);
      }
    }
  }
  g.putImageData(img, 0, 0);
}

export function addPlanet(scene: THREE.Scene, seed = 1, bodyId: BodyId = "earth") {
  const body = BODIES[bodyId];
  const tex = makeEarthTexture(1024, 512, seed, bodyId);
  const geo = new THREE.SphereGeometry(PLANET_R, 96, 64);
  const mat = new THREE.MeshPhongMaterial({
    map: tex,
    shininess: 22,
    specular: new THREE.Color(0x2a4a58),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, -PLANET_R, 0);
  mesh.receiveShadow = true;
  scene.add(mesh);

  const water = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_R + 0.6, 64, 40),
    new THREE.MeshPhongMaterial({
      color: body.ocean,
      transparent: true,
      opacity: body.gas ? 0.08 : 0.22,
      depthWrite: false,
      shininess: 80,
      specular: 0x88c8d4,
    }),
  );
  water.position.copy(mesh.position);
  scene.add(water);

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_R + 28, 48, 32),
    new THREE.MeshBasicMaterial({
      color: body.atmo ? body.fog : 0x111111,
      transparent: true,
      opacity: body.atmo ? 0.11 : 0.02,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  atmo.position.copy(mesh.position);
  scene.add(atmo);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_R + 6, 48, 32),
    new THREE.MeshLambertMaterial({
      color: body.cloud || 0xffffff,
      transparent: true,
      opacity: body.atmo ? 0.18 : 0,
      depthWrite: false,
    }),
  );
  clouds.position.copy(mesh.position);
  scene.add(clouds);

  return { mesh, water, atmo, clouds, tex, bodyId };
}

export function retintPlanet(
  planet: ReturnType<typeof addPlanet>,
  seed: number,
  bodyId: BodyId,
) {
  const body = BODIES[bodyId];
  const next = makeEarthTexture(1024, 512, seed, bodyId);
  const mat = planet.mesh.material as THREE.MeshPhongMaterial;
  mat.map?.dispose();
  mat.map = next;
  mat.needsUpdate = true;
  planet.tex = next;
  planet.bodyId = bodyId;
  (planet.water.material as THREE.MeshPhongMaterial).color.setHex(body.ocean);
  (planet.water.material as THREE.MeshPhongMaterial).opacity = body.gas ? 0.08 : 0.22;
  (planet.atmo.material as THREE.MeshBasicMaterial).color.setHex(body.atmo ? body.fog : 0x111111);
  (planet.atmo.material as THREE.MeshBasicMaterial).opacity = body.atmo ? 0.11 : 0.02;
  (planet.clouds.material as THREE.MeshLambertMaterial).color.setHex(body.cloud || 0xffffff);
  (planet.clouds.material as THREE.MeshLambertMaterial).opacity = body.atmo ? 0.18 : 0;
}
