import * as THREE from "three";
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
  tanker: THREE.Group;
  flameB: THREE.Mesh;
  flameS: THREE.Mesh;
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
  const spare = makeStarship(mats, false);
  spare.rotation.z = Math.PI / 2;
  spare.position.set(0, 1.6, 0);
  spare.scale.setScalar(0.95);
  truck.add(spare);
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
  tanker.scale.setScalar(1.15);
  tanker.visible = false;
  root.add(tanker);

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
    tanker,
    flameB,
    flameS,
  };
}

export type Restack = "idle" | "boostback" | "catch" | "lower" | "roll" | "stack" | "ready";

export function resetPad(th: Theater, withBooster: boolean) {
  th.ground.visible = true;
  th.booster.visible = withBooster;
  th.ship.visible = true;
  th.ship.position.set(0, withBooster ? 17.4 : 0, 0);
  th.fly.visible = false;
  th.fly.position.set(PAD.x, PAD.y, PAD.z);
  th.fly.rotation.set(0, 0, 0);
  th.flyBoost.position.set(0, 0, 0);
  th.flyBoost.rotation.set(0, 0, 0);
  th.flyBoost.visible = withBooster;
  th.flyShip.position.set(0, withBooster ? 17.4 : 0, 0);
  th.flyShip.rotation.set(0, 0, 0);
  th.tanker.visible = false;
  th.truck.visible = false;
  th.flameB.visible = false;
  th.flameS.visible = false;
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
