import * as THREE from "three";

/** Gulf-coast origin: north pole tangent, looking −Z from spawn. */
export const STARBASE_ORIGIN = { x: 0, y: 0, z: -28 };

/** Billboard center in local (root) space. Front of the words faces +Z (south). */
export const SIGN_LOCAL = { x: 0, y: 14, z: 42 };

/** World-space center of the STARBASE LOUISIANA lettering. */
export function signWorld() {
  return {
    x: STARBASE_ORIGIN.x + SIGN_LOCAL.x,
    y: STARBASE_ORIGIN.y + SIGN_LOCAL.y,
    z: STARBASE_ORIGIN.z + SIGN_LOCAL.z,
  };
}

type Mats = {
  steel: THREE.MeshPhongMaterial;
  steelDark: THREE.MeshPhongMaterial;
  stainless: THREE.MeshPhongMaterial;
  concrete: THREE.MeshLambertMaterial;
  white: THREE.MeshLambertMaterial;
  rust: THREE.MeshLambertMaterial;
  flame: THREE.MeshLambertMaterial;
  black: THREE.MeshLambertMaterial;
  light: THREE.MeshPhongMaterial;
  marsh: THREE.MeshLambertMaterial;
  asphalt: THREE.MeshLambertMaterial;
  stripe: THREE.MeshLambertMaterial;
};

function box(
  mat: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export type { Mats };
export function makeMats(): Mats {
  return {
    steel: new THREE.MeshPhongMaterial({
      color: 0xa8b0b6,
      shininess: 90,
      specular: 0xc8d0d6,
    }),
    steelDark: new THREE.MeshPhongMaterial({
      color: 0x3d444a,
      shininess: 40,
      specular: 0x667078,
    }),
    stainless: new THREE.MeshPhongMaterial({
      color: 0xe8ecef,
      shininess: 180,
      specular: 0xffffff,
    }),
    concrete: new THREE.MeshLambertMaterial({ color: 0x9aa09a }),
    white: new THREE.MeshLambertMaterial({ color: 0xe8ece8 }),
    rust: new THREE.MeshLambertMaterial({ color: 0x6b5344 }),
    flame: new THREE.MeshLambertMaterial({ color: 0x2a2420 }),
    black: new THREE.MeshLambertMaterial({ color: 0x16181a }),
    light: new THREE.MeshPhongMaterial({
      color: 0xfff1c8,
      emissive: 0xcc9944,
      emissiveIntensity: 0.95,
      shininess: 20,
    }),
    marsh: new THREE.MeshLambertMaterial({ color: 0x3d5a3a }),
    asphalt: new THREE.MeshLambertMaterial({ color: 0x3a3a3c }),
    stripe: new THREE.MeshLambertMaterial({ color: 0xd4c48a }),
  };
}

/** Stainless Starship stack (booster + ship + flaps + grid fins). */
export function makeStarship(mats: Mats, stacked: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = mats.stainless;
  const b = mats.black;
  const hBoost = stacked ? 17.4 : 0;
  if (stacked) {
    const boost = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.38, hBoost, 18), s);
    boost.position.y = hBoost / 2;
    boost.castShadow = true;
    g.add(boost);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.62, 1.1, 12), mats.steelDark);
    skirt.position.y = 0.55;
    g.add(skirt);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const fin = box(mats.steel, 1.8, 0.12, 1.1, Math.cos(a) * 1.45, 14.2, Math.sin(a) * 1.45);
      fin.lookAt(0, 14.2, 0);
      g.add(fin);
    }
  }
  const shipH = 12.6;
  const ship = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.28, shipH, 18), s);
  ship.position.y = hBoost + shipH / 2;
  ship.castShadow = true;
  g.add(ship);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.18, 5.4, 18), s);
  nose.position.y = hBoost + shipH + 2.7;
  nose.castShadow = true;
  g.add(nose);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 8), b);
  cap.position.y = hBoost + shipH + 5.5;
  g.add(cap);
  const flapY = hBoost + 8.4;
  for (const sx of [-1, 1]) {
    const flap = box(s, 0.12, 4.8, 2.4, sx * 1.35, flapY, 0.15);
    flap.rotation.z = sx * 0.18;
    g.add(flap);
  }
  for (const sx of [-1, 1]) {
    const flap = box(s, 0.12, 3.2, 1.6, sx * 1.32, hBoost + 3.2, 0.1);
    flap.rotation.z = sx * 0.22;
    g.add(flap);
  }
  const heat = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.22, shipH * 0.7, 18, 1, true),
    mats.black,
  );
  heat.position.set(0.04, hBoost + shipH * 0.45, 0);
  heat.scale.x = 0.92;
  g.add(heat);
  return g;
}

/** Mechazilla-style catch tower with chopsticks, carriage, QD arm. */
function makeTower(mats: Mats, height: number): THREE.Group {
  const g = new THREE.Group();
  const s = mats.steel;
  const sd = mats.steelDark;
  for (const sx of [-1.35, 1.35]) {
    for (const sz of [-1.35, 1.35]) {
      g.add(box(s, 0.55, height, 0.55, sx, height / 2, sz));
    }
  }
  for (let i = 0; i < 8; i++) {
    const y = 4 + i * (height / 9);
    g.add(box(sd, 3.1, 0.28, 0.28, 0, y, -1.35));
    g.add(box(sd, 3.1, 0.28, 0.28, 0, y, 1.35));
    g.add(box(sd, 0.28, 0.28, 3.1, -1.35, y, 0));
    g.add(box(sd, 0.28, 0.28, 3.1, 1.35, y, 0));
  }
  g.add(box(sd, 3.6, 1.4, 3.6, 0, height + 0.5, 0));
  const armY = height * 0.72;
  const armL = box(s, 0.7, 0.7, height * 0.62, -2.55, armY, 4.2);
  armL.rotation.y = 0.08;
  g.add(armL);
  const armR = box(s, 0.7, 0.7, height * 0.62, 2.55, armY, 4.2);
  armR.rotation.y = -0.08;
  g.add(armR);
  g.add(box(sd, 6.2, 1.8, 2.6, 0, armY - 2.4, 0.6));
  const qd = box(s, 0.45, 0.45, 9.5, 3.1, height * 0.28, 4.4);
  qd.rotation.y = 0.32;
  g.add(qd);
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, height * 0.85, 6), s);
  hose.position.set(-1.9, height * 0.42, 1.7);
  g.add(hose);
  return g;
}

function makePadPair(
  mats: Mats,
  spacing: number,
  towerH: number,
  ships: [boolean, boolean],
): THREE.Group {
  const g = new THREE.Group();
  const { concrete: c, flame: f, white: w, rust: r } = mats;
  g.add(box(c, 44, 1.6, 34, 0, 0.8, 2));
  g.add(box(f, 12, 2.4, 22, 0, -0.2, 6));
  g.add(box(mats.steelDark, 13, 0.4, 1.2, 0, 1.5, 16));

  const placePad = (x: number, withShip: boolean) => {
    const olm = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.6, 3.4, 10), mats.steelDark);
    olm.position.set(x, 2.6, 0);
    olm.castShadow = true;
    g.add(olm);
    const t = makeTower(mats, towerH);
    t.position.set(x, 1.6, -2.2);
    g.add(t);
    if (withShip) {
      const ship = makeStarship(mats, true);
      ship.position.set(x, 4.2, 0.4);
      g.add(ship);
    }
  };
  placePad(-spacing / 2, ships[0]);
  placePad(spacing / 2, ships[1]);

  for (let i = 0; i < 5; i++) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 8 + (i % 2) * 1.4, 12),
      i % 2 ? r : w,
    );
    tank.position.set(-18 + i * 3.6, 5.1, 13);
    tank.castShadow = true;
    g.add(tank);
  }
  const ch4 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 6.2, 12), r);
  ch4.position.set(16, 4.2, 13);
  g.add(ch4);

  for (const sx of [-18, 18]) {
    g.add(box(mats.steel, 0.28, 11, 0.28, sx, 6.2, -14));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), mats.light);
    lamp.position.set(sx, 11.4, -14);
    g.add(lamp);
  }
  return g;
}

function makeSign(mats: Mats): THREE.Group {
  const g = new THREE.Group();
  g.position.set(SIGN_LOCAL.x, 0, SIGN_LOCAL.z);
  g.add(box(mats.steelDark, 0.7, 15.2, 0.7, -19.5, 7.6, 0));
  g.add(box(mats.steelDark, 0.7, 15.2, 0.7, 19.5, 7.6, 0));
  g.add(box(mats.steel, 44.5, 0.55, 1.4, 0, 19.6, 0.15));

  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#d8c078";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = "#1a1810";
  ctx.font = "700 64px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STARBASE LOUISIANA", 512, 110);
  ctx.font = "500 28px sans-serif";
  ctx.fillText("VERMILION PARISH  ·  5 COMPLEXES  ·  10 TOWERS", 512, 175);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 11),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }),
  );
  mesh.position.set(0, SIGN_LOCAL.y, 0.4);
  // Tilt the face up toward the lot so higher rows read the words, not the edge.
  mesh.rotation.x = -0.22;
  g.add(mesh);
  return g;
}

/**
 * Starbase Louisiana: five complexes × two catch towers (10 pads),
 * Vermilion Parish Gulf coast layout from the Aug 2026 announcement.
 */
export function makeStarbase(): THREE.Group {
  const root = new THREE.Group();
  root.position.set(STARBASE_ORIGIN.x, STARBASE_ORIGIN.y, STARBASE_ORIGIN.z);
  const mats = makeMats();

  root.add(box(mats.concrete, 248, 1.2, 78, 0, 0.5, 8));
  root.add(box(mats.marsh, 270, 0.7, 48, 0, 0.25, 38));
  root.add(box(mats.marsh, 80, 0.5, 90, -150, 0.2, 10));
  root.add(box(mats.marsh, 80, 0.5, 90, 150, 0.2, 10));

  const gap = 46;
  const ships: [boolean, boolean][] = [
    [true, true],
    [true, false],
    [false, false],
    [true, true],
    [false, false],
  ];
  for (let i = 0; i < 5; i++) {
    const pad = makePadPair(mats, 18, 38 + (i % 2) * 3, ships[i]!);
    pad.position.set((i - 2) * gap, 1.2, 0);
    root.add(pad);
  }

  root.add(box(mats.steelDark, 56, 16, 26, -118, 9, 22));
  root.add(box(mats.steel, 56, 0.5, 26, -118, 17.2, 22));
  root.add(box(mats.steel, 18, 26, 18, -118, 14, 4));
  for (let i = 0; i < 6; i++) {
    root.add(box(mats.light, 4, 2.2, 0.3, -140 + i * 8.4, 8, 35.1));
  }

  root.add(box(mats.asphalt, 236, 0.28, 5.2, 0, 1.22, 26));
  root.add(box(mats.stripe, 236, 0.04, 0.18, 0, 1.38, 26));

  root.add(makeSign(mats));

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return root;
}

export const STARBASE_POI = {
  id: "starbase-la",
  kind: "sight" as const,
  name: "Starbase Louisiana",
  x: STARBASE_ORIGIN.x,
  y: STARBASE_ORIGIN.y + 22,
  z: STARBASE_ORIGIN.z,
};
