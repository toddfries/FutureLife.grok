import * as THREE from "three";
import { mulberry32 } from "./rng";

export function makeSmallTree() {
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 2.2, 5);
  trunkGeo.translate(0, 1.1, 0);
  const canopyGeo = new THREE.SphereGeometry(1.15, 6, 5);
  canopyGeo.translate(0, 2.6, 0);
  return { trunkGeo, canopyGeo };
}

export function makeKelp() {
  const geo = new THREE.ConeGeometry(0.22, 5.4, 4);
  geo.translate(0, 2.7, 0);
  return geo;
}

export function makeCloudPuff() {
  const geo = new THREE.SphereGeometry(7.5, 8, 6);
  geo.scale(1.8, 0.42, 1.15);
  return geo;
}

export function makeAstronaut(): THREE.Group {
  const g = new THREE.Group();
  const suit = new THREE.MeshLambertMaterial({ color: 0xe8ece8 });
  const visor = new THREE.MeshPhongMaterial({
    color: 0x1a2a38,
    shininess: 140,
    specular: 0x88c8e0,
  });
  const pack = new THREE.MeshLambertMaterial({ color: 0xc8ccc8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.85, 4, 8), suit);
  body.position.y = 0.9;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), suit);
  head.position.y = 1.55;
  g.add(head);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), visor);
  glass.position.set(0, 1.55, -0.12);
  glass.scale.set(1, 0.85, 0.55);
  g.add(glass);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.18), pack);
  tank.position.set(0, 1.05, 0.28);
  g.add(tank);
  g.scale.setScalar(1.6);
  return g;
}

export function makeFern() {
  const geo = new THREE.ConeGeometry(0.55, 1.3, 5, 1, true);
  geo.translate(0, 0.65, 0);
  return geo;
}

export function makeCrystal() {
  const geo = new THREE.OctahedronGeometry(0.45, 0);
  geo.rotateZ(0.4);
  return geo;
}

export function makeSpore() {
  return new THREE.SphereGeometry(0.12, 5, 4);
}

export function makeWaterfallTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(210,240,245,0.0)");
  grad.addColorStop(0.08, "rgba(210,240,245,0.55)");
  grad.addColorStop(0.7, "rgba(160,210,220,0.28)");
  grad.addColorStop(1, "rgba(160,210,220,0.0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  g.strokeStyle = "rgba(255,255,255,0.28)";
  g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    const x = 6 + i * 6;
    g.moveTo(x, 0);
    for (let y = 0; y < 256; y += 8) {
      g.lineTo(x + Math.sin(y * 0.08 + i) * 3, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function makeGiantTree(seed: number, scale: number): THREE.Group {
  const rng = mulberry32(seed >>> 0);
  const g = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x4a3324 });
  const leafMat = new THREE.MeshLambertMaterial({
    color: 0x1f6b45,
    flatShading: true,
  });
  const glowMat = new THREE.MeshLambertMaterial({
    color: 0x7ee0d2,
    emissive: 0x1a6a62,
    emissiveIntensity: 0.85,
  });

  const h = 38 * scale;
  const trunkR = 2.4 * scale;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 0.45, trunkR, h, 8),
    woodMat,
  );
  trunk.position.y = h * 0.5;
  trunk.castShadow = true;
  g.add(trunk);

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.4;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.55 * scale, h * 0.55, 5),
      woodMat,
    );
    root.position.set(
      Math.cos(a) * trunkR * 1.1,
      h * 0.22,
      Math.sin(a) * trunkR * 1.1,
    );
    root.rotation.z = Math.cos(a) * 0.45;
    root.rotation.x = Math.sin(a) * 0.45;
    g.add(root);
  }

  const canopyY = h * 0.78;
  const blobs = 10 + Math.floor(rng() * 6);
  for (let i = 0; i < blobs; i++) {
    const a = rng() * Math.PI * 2;
    const r = (4 + rng() * 10) * scale;
    const s = (4.5 + rng() * 6) * scale;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMat);
    leaf.position.set(
      Math.cos(a) * r,
      canopyY + (rng() - 0.4) * 8 * scale,
      Math.sin(a) * r,
    );
    leaf.rotation.set(rng() * 0.6, rng() * 2, rng() * 0.6);
    leaf.castShadow = true;
    g.add(leaf);
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bough = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.55 * scale, 12 * scale, 5),
      woodMat,
    );
    bough.position.set(
      Math.cos(a) * 5 * scale,
      canopyY - 4 * scale,
      Math.sin(a) * 5 * scale,
    );
    bough.rotation.z = Math.cos(a) * 1.1;
    bough.rotation.x = -Math.sin(a) * 1.1;
    g.add(bough);
  }

  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const r = (3 + rng() * 9) * scale;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 5, 4), glowMat);
    orb.position.set(
      Math.cos(a) * r,
      canopyY - 2 * scale - rng() * 8 * scale,
      Math.sin(a) * r,
    );
    g.add(orb);
  }

  g.traverse((o) => {
    o.receiveShadow = true;
  });
  return g;
}

export function makeCraft(): THREE.Group {
  return makeRoadster().group;
}

export type Roadster = {
  group: THREE.Group;
  nozzles: Record<"fwd" | "back" | "left" | "right" | "up" | "down", THREE.Object3D>;
  nameplate: THREE.Group;
};

/** Compressed-air Tesla-like roadster — tiny nozzles on every axis. */
export function makeRoadster(): Roadster {
  const g = new THREE.Group();
  const body = new THREE.MeshPhongMaterial({
    color: 0xb42318,
    shininess: 110,
    specular: 0xff8a7a,
  });
  const dark = new THREE.MeshPhongMaterial({
    color: 0x1a1c1e,
    shininess: 40,
    specular: 0x444448,
  });
  const silver = new THREE.MeshPhongMaterial({
    color: 0xc5c8cc,
    shininess: 90,
    specular: 0xe8eaee,
  });
  const glass = new THREE.MeshPhongMaterial({
    color: 0x8ec8d4,
    transparent: true,
    opacity: 0.52,
    shininess: 160,
    specular: 0xffffff,
  });
  const glow = new THREE.MeshPhongMaterial({
    color: 0xe8f6ff,
    emissive: 0x6ab0d4,
    emissiveIntensity: 0.95,
    shininess: 20,
  });
  const tail = new THREE.MeshPhongMaterial({
    color: 0xff3a2a,
    emissive: 0xaa1810,
    emissiveIntensity: 0.7,
  });

  // Hull: long nose, low cabin — Roadster silhouette. Forward is −Z.
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.42, 3.15), body);
  hull.position.y = 0.38;
  hull.userData.hull = true;
  g.add(hull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.3, 0.85), body);
  nose.position.set(0, 0.3, -1.82);
  nose.userData.hull = true;
  g.add(nose);
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 0.4), dark);
  splitter.position.set(0, 0.14, -2.12);
  g.add(splitter);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.38, 1.15), glass);
  cabin.position.set(0, 0.68, -0.12);
  g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.05, 1.05), body);
  roof.position.set(0, 0.88, -0.08);
  roof.userData.hull = true;
  g.add(roof);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.05, 2.9), silver);
  belt.position.y = 0.58;
  g.add(belt);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.06, 0.32), dark);
  spoiler.position.set(0, 0.62, 1.52);
  g.add(spoiler);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.28), dark);
  diffuser.position.set(0, 0.18, 1.62);
  g.add(diffuser);

  for (const x of [-0.62, 0.62]) {
    for (const z of [-1.05, 1.12]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 14), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.28, z);
      g.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 10), silver);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(x, 0.28, z);
      g.add(rim);
    }
  }
  const lampL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), glow);
  lampL.position.set(-0.42, 0.34, -2.22);
  g.add(lampL);
  const lampR = lampL.clone();
  lampR.position.x = 0.42;
  g.add(lampR);
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), tail);
  tailL.position.set(-0.48, 0.42, 1.6);
  g.add(tailL);
  const tailR = tailL.clone();
  tailR.position.x = 0.48;
  g.add(tailR);

  const mkNoz = (x: number, y: number, z: number, ax: "x" | "y" | "z") => {
    const n = new THREE.Object3D();
    n.position.set(x, y, z);
    const vis = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 0.16, 8), silver);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), glow);
    if (ax === "z") {
      vis.rotation.x = Math.PI / 2;
      core.rotation.x = Math.PI / 2;
    } else if (ax === "x") {
      vis.rotation.z = Math.PI / 2;
      core.rotation.z = Math.PI / 2;
    }
    n.add(vis);
    n.add(core);
    g.add(n);
    return n;
  };

  const nozzles = {
    fwd: mkNoz(0, 0.26, 1.72, "z"),
    back: mkNoz(0, 0.26, -2.28, "z"),
    left: mkNoz(-0.78, 0.34, 0.15, "x"),
    right: mkNoz(0.78, 0.34, 0.15, "x"),
    up: mkNoz(0, 0.92, 0.4, "y"),
    down: mkNoz(0, 0.1, 0.25, "y"),
  };

  g.scale.setScalar(1.85);
  const nameplate = makeNameplate("Guest");
  g.add(nameplate);
  return { group: g, nozzles, nameplate };
}

/** Vanity-plate text: X handles keep @, guests become GUEST N. */
export function plateLabel(text: string) {
  const t = text.trim();
  if (!t) return "GUEST";
  if (t.startsWith("@")) return t.slice(0, 14);
  const g = t.match(/^guest\s*(\d+)$/i);
  if (g) return `GUEST ${g[1]}`;
  if (!/\s/.test(t) && t.length <= 14) return `@${t}`;
  return t.slice(0, 14).toUpperCase();
}

function drawPlateTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1a2623";
  g.fillRect(0, 0, 1024, 320);
  g.fillStyle = "#0c1614";
  g.beginPath();
  g.roundRect(18, 18, 988, 284, 22);
  g.fill();
  g.strokeStyle = "#d5d0c8";
  g.lineWidth = 10;
  g.beginPath();
  g.roundRect(28, 28, 968, 264, 16);
  g.stroke();
  g.strokeStyle = "rgba(232, 228, 220, 0.35)";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(42, 42, 940, 236, 12);
  g.stroke();
  g.fillStyle = "#9aa8a3";
  g.font = "600 36px Outfit, Segoe UI, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("FUTURELIFE", 512, 78);
  const label = plateLabel(text);
  const size = label.length > 10 ? 86 : label.length > 7 ? 104 : 124;
  g.fillStyle = "#f3eee4";
  g.font = `700 ${size}px Outfit, Segoe UI, sans-serif`;
  g.fillText(label, 512, 168);
  g.fillStyle = "#c5cec8";
  g.font = "600 28px Outfit, Segoe UI, sans-serif";
  g.fillText("LOUISIANA  ·  X", 512, 248);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function makeNameplate(text: string): THREE.Group {
  const g = new THREE.Group();
  const tex = drawPlateTexture(text);
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const silver = new THREE.MeshPhongMaterial({
    color: 0xc5c8cc,
    shininess: 90,
    specular: 0xe8eaee,
  });
  const geo = new THREE.PlaneGeometry(1.72, 0.52);
  const frameGeo = new THREE.PlaneGeometry(1.84, 0.62);

  const rearFrame = new THREE.Mesh(frameGeo, silver);
  rearFrame.position.set(0, 0.82, 1.42);
  rearFrame.rotation.x = -0.42;
  g.add(rearFrame);
  const rear = new THREE.Mesh(geo, mat);
  rear.position.set(0, 0.82, 1.45);
  rear.rotation.x = -0.42;
  rear.userData.plate = true;
  g.add(rear);

  const frontFrame = new THREE.Mesh(frameGeo, silver);
  frontFrame.position.set(0, 0.38, -2.24);
  frontFrame.rotation.y = Math.PI;
  g.add(frontFrame);
  const front = new THREE.Mesh(geo, mat);
  front.position.set(0, 0.38, -2.27);
  front.rotation.y = Math.PI;
  front.userData.plate = true;
  g.add(front);

  g.userData.label = plateLabel(text);
  g.userData.plateMat = mat;
  return g;
}

export function paintNameplate(root: THREE.Object3D, text: string) {
  const label = plateLabel(text);
  if (root.userData.label === label) return;
  root.userData.label = label;
  const next = drawPlateTexture(label);
  const mat = root.userData.plateMat as THREE.MeshBasicMaterial | undefined;
  if (mat) {
    const prev = mat.map;
    mat.map = next;
    mat.needsUpdate = true;
    prev?.dispose();
    return;
  }
  const prevSprite = (root as THREE.Sprite).material;
  if (prevSprite && "map" in prevSprite) {
    const m = prevSprite as THREE.SpriteMaterial;
    const prev = m.map;
    m.map = next;
    m.needsUpdate = true;
    prev?.dispose();
  }
}

export function paintHull(root: THREE.Object3D, hex: number) {
  root.traverse((o) => {
    if (!o.userData.hull || !(o instanceof THREE.Mesh)) return;
    const mat = o.material as THREE.MeshPhongMaterial;
    if (mat?.color) mat.color.setHex(hex);
  });
}

