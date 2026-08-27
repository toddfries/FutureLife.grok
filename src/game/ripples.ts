import * as THREE from "three";
import type { Roadster } from "./flora";

type Ripple = {
  mesh: THREE.Mesh;
  age: number;
  life: number;
  speed: number;
};

export class AirRipples {
  readonly group = new THREE.Group();
  private pool: Ripple[] = [];
  private geo: THREE.RingGeometry;
  private mat: THREE.MeshBasicMaterial;
  private acc = 0;

  constructor() {
    this.geo = new THREE.RingGeometry(0.1, 0.2, 20);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xd6f4ff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 48; i++) {
      const mesh = new THREE.Mesh(this.geo, this.mat.clone());
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({ mesh, age: 0, life: 0, speed: 1 });
    }
  }

  /**
   * localWish is in craft space: +Z back, −Z forward, +X right, +Y up.
   * Exhaust leaves the nozzle opposite the wish.
   */
  pulse(
    craft: THREE.Object3D,
    localWish: THREE.Vector3,
    nozzles: Roadster["nozzles"],
    dt: number,
  ) {
    const mag = localWish.length();
    if (mag < 0.15) return;
    this.acc += dt;
    if (this.acc < 0.055) return;
    this.acc = 0;

    const ax = Math.abs(localWish.x);
    const ay = Math.abs(localWish.y);
    const az = Math.abs(localWish.z);
    let noz: THREE.Object3D;
    if (az >= ax && az >= ay) noz = localWish.z < 0 ? nozzles.fwd : nozzles.back;
    else if (ax >= ay) noz = localWish.x > 0 ? nozzles.left : nozzles.right;
    else noz = localWish.y > 0 ? nozzles.down : nozzles.up;

    const origin = new THREE.Vector3();
    noz.getWorldPosition(origin);
    const dir = localWish.clone().normalize();
    const worldDir = dir.transformDirection(craft.matrixWorld);
    this.spawn(origin, worldDir, mag);
    if (mag > 20) {
      const side = origin.clone().add(new THREE.Vector3(0.12, 0.04, 0));
      this.spawn(side, worldDir, mag);
    }
  }

  private spawn(origin: THREE.Vector3, dir: THREE.Vector3, mag: number) {
    const slot = this.pool.find((r) => !r.mesh.visible);
    if (!slot) return;
    slot.age = 0;
    slot.life = 0.58;
    slot.speed = 5 + mag * 3.2;
    slot.mesh.visible = true;
    slot.mesh.position.copy(origin);
    slot.mesh.lookAt(origin.clone().add(dir));
    slot.mesh.scale.setScalar(0.35);
    const m = slot.mesh.material as THREE.MeshBasicMaterial;
    m.opacity = 0.7;
  }

  update(dt: number) {
    for (const r of this.pool) {
      if (!r.mesh.visible) continue;
      r.age += dt;
      const t = r.age / r.life;
      if (t >= 1) {
        r.mesh.visible = false;
        continue;
      }
      r.mesh.scale.setScalar(0.35 + t * 3.6);
      r.mesh.translateZ(-r.speed * dt);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t) * (1 - t);
    }
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    for (const r of this.pool) {
      (r.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
  }
}
