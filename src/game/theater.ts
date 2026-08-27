import * as THREE from "three";
import { BODIES, type BodyId } from "./bodies";
import { loadNasaMap, applyNasaMap } from "./nasa-tex";
import { STARBASE_ORIGIN, makeMats, makeStarship } from "./starbase";

/** Center-right pad of complex 3 — the live stack the player boards. */
export const PAD = {
  x: STARBASE_ORIGIN.x + 9,
  y: STARBASE_ORIGIN.y + 5.4,
  z: STARBASE_ORIGIN.z + 0.4,
};

function flameMesh() {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 6.4, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffc078,
      transparent: true,
      opacity: 0.85,
      toneMapped: false,
    }),
  );
  m.rotation.x = Math.PI;
  m.position.y = -3.1;
  m.visible = false;
  return m;
}

function makeBooster(mats: ReturnType<typeof makeMats>): THREE.Group {
  const g = new THREE.Group();
  const s = mats.stainless;
  const h = 17.4;
  const boost = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.38, h, 18), s);
  boost.position.y = h / 2;
  g.add(boost);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.62, 1.1, 12), mats.steelDark);
  skirt.position.y = 0.55;
  g.add(skirt);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.1), mats.steel);
    fin.position.set(Math.cos(a) * 1.45, 14.2, Math.sin(a) * 1.45);
    fin.lookAt(0, 14.2, 0);
    g.add(fin);
  }
  return g;
}

function makeStars() {
  const n = 780;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 2400 + Math.random() * 2200;
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(v) * Math.cos(u);
    pos[i * 3 + 1] = r * Math.cos(v);
    pos[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xe8e4dc,
      size: 2.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  pts.visible = false;
  pts.frustumCulled = false;
  return pts;
}

function makeDestGlobe() {
  const group = new THREE.Group();
  group.visible = false;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshPhongMaterial({
      color: 0x3d7a62,
      shininess: 12,
      emissive: 0x102018,
      emissiveIntensity: 0.55,
    }),
  );
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 32, 24),
    new THREE.MeshBasicMaterial({
      color: 0x7aa8b0,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 2.15, 48),
    new THREE.MeshBasicMaterial({
      color: 0xd4c48a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    }),
  );
  ring.rotation.x = 1.05;
  ring.visible = false;
  group.add(mesh, atmo, ring);
  return { group, mesh, atmo, ring };
}

export type Theater = {
  root: THREE.Group;
  ground: THREE.Group;
  booster: THREE.Group;
  ship: THREE.Group;
  fly: THREE.Group;
  flyBoost: THREE.Group;
  flyShip: THREE.Group;
  arms: THREE.Group;
  truck: THREE.Group;
  cargo: THREE.Group;
  tanker: THREE.Group;
  boom: THREE.Mesh;
  flameB: THREE.Mesh;
  flameS: THREE.Mesh;
  flameT: THREE.Mesh;
  stars: THREE.Points;
  dest: ReturnType<typeof makeDestGlobe>;
};

export function makeTheater(): Theater {
  const mats = makeMats();
  const root = new THREE.Group();
  const ground = new THREE.Group();
  ground.position.set(PAD.x, PAD.y, PAD.z);
  root.add(ground);

  const booster = makeBooster(mats);
  ground.add(booster);
  const ship = makeStarship(mats, false);
  ship.position.y = 17.4;
  ground.add(ship);

  const arms = new THREE.Group();
  const L = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 18), mats.steel);
  L.position.set(-3.4, 28, 6);
  const R = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 18), mats.steel);
  R.position.set(3.4, 28, 6);
  arms.add(L, R);
  arms.userData.L = L;
  arms.userData.R = R;
  ground.add(arms);

  const truck = new THREE.Group();
  truck.add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 16), mats.steelDark));
  const wheels = mats.black;
  for (const z of [-5.2, 5.2]) {
    for (const x of [-1.8, 1.8]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), wheels);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, -0.4, z);
      truck.add(w);
    }
  }
  const cargo = makeStarship(mats, false);
  cargo.rotation.z = Math.PI / 2;
  cargo.position.set(0, 1.6, 0);
  cargo.scale.setScalar(0.95);
  truck.add(cargo);
  truck.position.set(-90, 1.2, 22);
  truck.visible = false;
  root.add(truck);

  const fly = new THREE.Group();
  fly.visible = false;
  const flyBoost = makeBooster(mats);
  const flyShip = makeStarship(mats, false);
  flyShip.position.y = 17.4;
  fly.add(flyBoost, flyShip);
  const flameB = flameMesh();
  const flameS = flameMesh();
  flyBoost.add(flameB);
  flyShip.add(flameS);
  root.add(fly);

  const tanker = makeStarship(mats, false);
  tanker.scale.setScalar(1.12);
  tanker.visible = false;
  const flameT = flameMesh();
  tanker.add(flameT);
  root.add(tanker);

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 1, 8),
    new THREE.MeshPhongMaterial({ color: 0xa8b0b6, shininess: 80 }),
  );
  boom.visible = false;
  root.add(boom);

  const stars = makeStars();
  root.add(stars);
  const dest = makeDestGlobe();
  root.add(dest.group);

  return {
    root,
    ground,
    booster,
    ship,
    fly,
    flyBoost,
    flyShip,
    arms,
    truck,
    cargo,
    tanker,
    boom,
    flameB,
    flameS,
    flameT,
    stars,
    dest,
  };
}

export type Restack = "idle" | "boostback" | "catch" | "lower" | "roll" | "stack" | "ready";

function parkShip(th: Theater, withBooster: boolean) {
  if (th.ship.parent !== th.ground) th.ground.attach(th.ship);
  th.ship.visible = true;
  th.ship.position.set(0, withBooster ? 17.4 : 0, 0);
  th.ship.rotation.set(0, 0, 0);
  th.ship.scale.setScalar(1);
}

export function resetPad(th: Theater, withBooster: boolean) {
  parkShip(th, withBooster);
  th.ground.visible = true;
  th.booster.visible = withBooster;
  th.booster.position.set(0, 0, 0);
  th.booster.rotation.set(0, 0, 0);
  th.fly.visible = false;
  th.fly.position.set(PAD.x, PAD.y, PAD.z);
  th.fly.rotation.set(0, 0, 0);
  th.flyBoost.position.set(0, 0, 0);
  th.flyBoost.rotation.set(0, 0, 0);
  th.flyBoost.visible = withBooster;
  th.flyShip.position.set(0, withBooster ? 17.4 : 0, 0);
  th.flyShip.rotation.set(0, 0, 0);
  th.tanker.visible = false;
  th.boom.visible = false;
  th.truck.visible = false;
  th.cargo.visible = true;
  th.flameB.visible = false;
  th.flameS.visible = false;
  th.flameT.visible = false;
  th.dest.group.visible = false;
  const L = th.arms.userData.L as THREE.Mesh;
  const R = th.arms.userData.R as THREE.Mesh;
  L.position.set(-3.4, 28, 6);
  R.position.set(3.4, 28, 6);
}

export function beginLift(th: Theater, withBooster: boolean) {
  th.fly.position.set(PAD.x, PAD.y, PAD.z);
  th.fly.rotation.set(0, 0, 0);
  th.fly.visible = true;
  th.flyBoost.visible = withBooster;
  th.flyShip.visible = true;
  th.flyShip.position.y = withBooster ? 17.4 : 0;
  th.ground.visible = false;
  th.flameB.visible = withBooster;
  th.flameS.visible = true;
}

/** Occupying Starship on the catch tower so a landing isn't a physics cheat. */
export function occupyPad(th: Theater, withBooster: boolean) {
  parkShip(th, withBooster);
  th.ground.visible = true;
  th.booster.visible = withBooster;
  th.booster.position.set(0, 0, 0);
  th.truck.visible = true;
  th.cargo.visible = false;
  th.truck.position.set(-22, 1.2, 18);
  const L = th.arms.userData.L as THREE.Mesh;
  const R = th.arms.userData.R as THREE.Mesh;
  L.position.set(-3.4, withBooster ? 28 : 12, 6);
  R.position.set(3.4, withBooster ? 28 : 12, 6);
}

/** 0–2 close arms, 2–5 lower onto transporter, 5–10 roll off the pad. */
export function tickClearPad(th: Theater, t: number, withBooster: boolean) {
  const L = th.arms.userData.L as THREE.Mesh;
  const R = th.arms.userData.R as THREE.Mesh;
  const startY = withBooster ? 28 : 12;
  if (t < 2) {
    const u = t / 2;
    L.position.x = -3.4 + u * 1.6;
    R.position.x = 3.4 - u * 1.6;
    L.position.y = startY;
    R.position.y = startY;
    return;
  }
  if (t < 5) {
    const u = (t - 2) / 3;
    const y = startY * (1 - u) + 2.2 * u;
    th.ship.position.set(0, y, 0);
    L.position.y = y;
    R.position.y = y;
    th.truck.position.set(-22 + u * 14, 1.2, 18 - u * 10);
    return;
  }
  const u = Math.min(1, (t - 5) / 5);
  if (th.ship.parent !== th.truck) {
    th.truck.attach(th.ship);
  }
  th.ship.position.set(0, 1.8, 0);
  th.ship.rotation.z = u * (Math.PI / 2);
  th.ship.scale.setScalar(0.95);
  L.position.set(-3.4, 4, 6);
  R.position.set(3.4, 4, 6);
  th.truck.position.set(-8 + u * 78, 1.2, 8 + u * 36);
  if (u > 0.92) th.truck.visible = u < 1;
}

const _boomDir = new THREE.Vector3();
const _boomMid = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export function placeBoom(th: Theater, from: THREE.Vector3, to: THREE.Vector3, on: boolean) {
  th.boom.visible = on;
  if (!on) return;
  _boomMid.copy(from).add(to).multiplyScalar(0.5);
  _boomDir.copy(to).sub(from);
  const len = _boomDir.length() || 0.01;
  th.boom.position.copy(_boomMid);
  th.boom.scale.set(1, len, 1);
  th.boom.quaternion.setFromUnitVectors(_up, _boomDir.multiplyScalar(1 / len));
}

export function tintDest(th: Theater, id: BodyId, seed: number) {
  const body = BODIES[id];
  const mat = th.dest.mesh.material as THREE.MeshPhongMaterial;
  mat.color.setHex(0xffffff);
  mat.emissive.setHex(body.land);
  mat.emissiveIntensity = 0.12;
  mat.needsUpdate = true;
  (th.dest.atmo.material as THREE.MeshBasicMaterial).color.setHex(body.atmo ? body.fog : 0x111111);
  (th.dest.atmo.material as THREE.MeshBasicMaterial).opacity = body.atmo ? 0.2 : 0.04;
  th.dest.ring.visible = id === "saturn";
  void loadNasaMap(id)
    .then((tex) => applyNasaMap(mat, tex))
    .catch(() => {
      mat.color.setHex(body.color);
    });
}

export function placeDest(th: Theater, dist: number, radius: number, visible: boolean) {
  th.dest.group.visible = visible;
  if (!visible) return;
  th.dest.group.position.set(0, 8, -dist);
  th.dest.group.scale.setScalar(radius);
  th.dest.group.rotation.y += 0.0008;
}

/** Observer restack after the flying stack has left. */
export function tickRestack(th: Theater, phase: Restack, t: number) {
  const L = th.arms.userData.L as THREE.Mesh;
  const R = th.arms.userData.R as THREE.Mesh;
  if (phase === "boostback") {
    th.ground.visible = true;
    th.booster.visible = true;
    th.ship.visible = false;
    const u = Math.min(1, t / 8);
    const arc = Math.sin(u * Math.PI);
    th.booster.position.set(Math.sin(u * 3.2) * 40 * (1 - u), 80 * arc + (1 - u) * 120, -u * 8);
    th.booster.rotation.z = (1 - u) * 0.4;
  } else if (phase === "catch") {
    th.booster.position.set(0, 28, 0);
    th.booster.rotation.set(0, 0, 0);
    const u = Math.min(1, t / 3);
    L.position.x = -3.4 + u * 1.6;
    R.position.x = 3.4 - u * 1.6;
  } else if (phase === "lower") {
    const u = Math.min(1, t / 5);
    th.booster.position.set(0, 28 - u * 28, 0);
    L.position.y = 28 - u * 28;
    R.position.y = 28 - u * 28;
  } else if (phase === "roll") {
    th.truck.visible = true;
    const u = Math.min(1, t / 6);
    th.truck.position.set(-90 + u * 90, 1.2, 22 - u * 20);
    th.booster.position.set(0, 0, 0);
    L.position.set(-3.4, 4, 6);
    R.position.set(3.4, 4, 6);
  } else if (phase === "stack") {
    th.truck.visible = t < 2;
    th.ship.visible = true;
    const u = Math.min(1, t / 8);
    th.ship.position.set(0, u * 17.4, 0);
    L.position.set(-3.4, 4 + u * 24, 6);
    R.position.set(3.4, 4 + u * 24, 6);
  } else if (phase === "ready") {
    resetPad(th, true);
  }
}
