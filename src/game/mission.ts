import * as THREE from "three";
import {
  BODIES,
  BODY_LIST,
  cruiseSeconds,
  daysBetween,
  skyDir,
  type BodyId,
} from "./bodies";
import {
  PAD,
  beginLift,
  occupyPad,
  placeBoom,
  placeDest,
  resetPad,
  tickClearPad,
  tickRestack,
  tintDest,
  type Restack,
  type Theater,
} from "./theater";

export type Phase =
  | "fly"
  | "board"
  | "hold"
  | "lift"
  | "tilt"
  | "sep"
  | "tanker"
  | "fuel"
  | "undock"
  | "burn"
  | "cruise"
  | "approach"
  | "clearpad"
  | "brake"
  | "land"
  | "orbit"
  | "eva";

export type MissionSnap = {
  phase: Phase;
  body: BodyId;
  dest: BodyId | null;
  speedKm: number;
  altKm: number;
  distKm: number;
  engines: string;
  tripDays: number;
  tripLeft: number;
  padMenu: boolean;
  canEva: boolean;
  restack: Restack;
  nearPad: boolean;
  fuel: number;
  fueling: boolean;
  callout: string;
  approachLeft: number;
  cruiseLeft: number;
};

export type MissionHooks = {
  arrive: (id: BodyId) => void;
  hideCraft: (v: boolean) => void;
  setAstronaut: (v: boolean) => void;
  addSimMs: (ms: number) => void;
  setSpace: (v: boolean) => void;
};

const APPROACH_SEC = 20;
const FUEL_SEC = 5;
const TANKER_SEC = 9;
const CLEAR_SEC = 10;
/** Hull-to-hull gap ~0.4 m — two Starships parked parallel, nearly touching. */
const DOCK_X = 3.15;

const _dir = new THREE.Vector3();
const _cam = new THREE.Vector3();
const _look = new THREE.Vector3();
const _shipNose = new THREE.Vector3();
const _tankNose = new THREE.Vector3();

export class Mission {
  phase: Phase = "fly";
  body: BodyId = "earth";
  dest: BodyId | null = null;
  t = 0;
  cruiseT = 0;
  cruiseDur = 20;
  tripDays = 0;
  tripLeft = 0;
  speedKm = 0;
  altKm = 0;
  distKm = 0;
  engines = "—";
  padMenu = false;
  restack: Restack = "idle";
  restackT = 0;
  lookYaw = 0;
  lookPitch = 0;
  zoom = 1;
  savedLook = { yaw: 0, pitch: 0, zoom: 1 };
  nearPad = false;
  liftId = 0;
  fuel = 0.08;
  fueling = false;
  callout = "";
  private yawAim = 0;
  private destTinted: BodyId | null = null;
  private spaceOn = false;

  constructor(
    private th: Theater,
    private cam: THREE.PerspectiveCamera,
    private hooks: MissionHooks,
  ) {
    resetPad(th, true);
  }

  snap(): MissionSnap {
    return {
      phase: this.phase,
      body: this.body,
      dest: this.dest,
      speedKm: this.speedKm,
      altKm: this.altKm,
      distKm: this.distKm,
      engines: this.engines,
      tripDays: this.tripDays,
      tripLeft: this.tripLeft,
      padMenu: this.padMenu,
      canEva: this.phase === "orbit" || this.phase === "eva",
      restack: this.restack,
      nearPad: this.nearPad,
      fuel: this.fuel,
      fueling: this.fueling,
      callout: this.callout,
      approachLeft: this.phase === "approach" ? Math.max(0, APPROACH_SEC - this.t) : 0,
      cruiseLeft: this.phase === "cruise" ? Math.max(0, this.cruiseDur - this.cruiseT) : 0,
    };
  }

  inCinematic() {
    return this.phase !== "fly" && this.phase !== "eva";
  }

  destinations() {
    return BODY_LIST.filter((id) => id !== this.body);
  }

  go(id: BodyId) {
    if (this.phase !== "fly" && this.phase !== "orbit" && this.phase !== "eva") return;
    this.dest = id;
    this.tripDays = daysBetween(this.body, id);
    this.tripLeft = this.tripDays;
    this.cruiseDur = cruiseSeconds(this.tripDays);
    this.padMenu = false;
    this.fuel = 0.08;
    const d = skyDir(id);
    this.yawAim = Math.atan2(-d.x, -d.z);
    if (this.phase === "orbit" || this.phase === "eva") {
      this.hooks.setAstronaut(false);
      this.hooks.hideCraft(true);
      this.th.fly.visible = true;
      this.th.tanker.visible = false;
      this.enter("tanker");
      return;
    }
    this.enter("board");
    this.liftId += 1;
  }

  eva() {
    if (this.phase !== "orbit") return;
    this.enter("eva");
    this.hooks.setAstronaut(true);
    this.hooks.hideCraft(false);
  }

  returnShip() {
    if (this.phase !== "eva") return;
    this.enter("orbit");
    this.hooks.setAstronaut(false);
    this.hooks.hideCraft(true);
    this.padMenu = true;
  }

  observeLift() {
    if (this.phase !== "fly") return;
    this.restack = "boostback";
    this.restackT = 0;
    this.th.ground.visible = true;
    this.th.ship.visible = false;
  }

  /** QA: jump to a named phase with a destination already set. */
  skipTo(phase: Phase, dest: BodyId = this.dest ?? "moon") {
    this.dest = dest;
    this.tripDays = daysBetween(this.body, dest);
    this.tripLeft = this.tripDays;
    this.cruiseDur = cruiseSeconds(this.tripDays);
    if (phase === "tanker" || phase === "fuel" || phase === "undock") {
      this.hooks.hideCraft(true);
      this.th.fly.visible = true;
      this.th.flyBoost.visible = false;
      this.th.flyShip.position.y = 0;
      this.th.fly.position.set(0, 520, 0);
      this.th.fly.rotation.set(-1.15, 0, 0);
      this.setSpace(false);
    }
    if (phase === "approach" || phase === "cruise" || phase === "burn") {
      this.hooks.hideCraft(true);
      this.th.fly.visible = true;
      this.th.flyBoost.visible = false;
      this.setSpace(true);
    }
    if (phase === "clearpad" || phase === "brake" || phase === "land") {
      this.body = dest;
      this.hooks.arrive(dest);
      this.setSpace(false);
    }
    if (phase === "fly") {
      resetPad(this.th, BODIES[this.body].booster);
      this.hooks.hideCraft(false);
      this.setSpace(false);
    }
    this.enter(phase);
  }

  private enter(phase: Phase) {
    this.phase = phase;
    this.t = 0;
    if (phase !== "approach") placeDest(this.th, 0, 1, false);
    if (phase === "cruise") {
      this.cruiseT = 0;
      this.resetLook();
      this.savedLook = { yaw: 0, pitch: 0.18, zoom: 1 };
    }
    if (phase === "approach" && this.dest && this.destTinted !== this.dest) {
      tintDest(this.th, this.dest, 7);
      this.destTinted = this.dest;
    }
    if (phase === "clearpad" && this.dest) {
      occupyPad(this.th, BODIES[this.dest].booster);
      this.th.fly.visible = true;
      this.th.flyBoost.visible = false;
      this.th.flyShip.position.y = 0;
      this.callout = "Pad-clear uplink · roll Starship to transporter";
    }
    if (phase === "fuel") {
      this.fueling = true;
      this.fuel = 0.08;
      this.callout = "Alongside · LOX / CH4 transfer";
    } else {
      this.fueling = false;
    }
    if (phase === "tanker") this.callout = "Tanker rendezvous";
    if (phase === "undock") this.callout = "Undock · tanker peels aside";
    if (phase === "burn") this.callout = "Trans-planetary burn";
    if (phase === "approach") this.callout = this.dest ? `Approaching ${BODIES[this.dest].name}` : "Approach";
    if (phase === "board") this.callout = "Boarding";
    if (phase === "lift") this.callout = "Liftoff";
    if (phase === "fly" || phase === "orbit") this.callout = "";
  }

  private setSpace(v: boolean) {
    this.spaceOn = v;
    this.th.stars.visible = v;
    this.hooks.setSpace(v);
  }

  private resetLook() {
    this.lookYaw = 0;
    this.lookPitch = 0.18;
    this.zoom = 1;
  }

  tick(
    dt: number,
    pos: THREE.Vector3,
    craft: THREE.Object3D,
    look: { yaw: number; pitch: number; zoomIn: boolean; zoomOut: boolean },
  ) {
    const dx = pos.x - PAD.x;
    const dz = pos.z - PAD.z;
    this.nearPad = this.phase === "fly" && dx * dx + dz * dz < 130 * 130 && pos.y < 120;
    this.padMenu = (this.nearPad && this.phase === "fly") || this.phase === "orbit";

    if (this.restack !== "idle" && this.restack !== "ready") {
      this.restackT += dt;
      tickRestack(this.th, this.restack, this.restackT);
      const next: Record<Restack, [number, Restack]> = {
        idle: [9e9, "idle"],
        boostback: [8, "catch"],
        catch: [3, "lower"],
        lower: [5, "roll"],
        roll: [6, "stack"],
        stack: [8, "ready"],
        ready: [0.2, "idle"],
      };
      const [dur, nx] = next[this.restack];
      if (this.restackT >= dur) {
        this.restack = nx;
        this.restackT = 0;
        if (nx === "idle") resetPad(this.th, BODIES[this.body].booster);
      }
    }

    if (this.phase === "fly") return;

    this.t += dt;
    const dest = this.dest;
    const boost = BODIES[this.body].booster;

    if (this.phase === "board") {
      const hatch = new THREE.Vector3(PAD.x, PAD.y + (boost ? 32 : 14), PAD.z);
      pos.lerp(hatch, 1 - Math.exp(-dt * 1.8));
      craft.position.copy(pos);
      if (this.t > 3.2 || pos.distanceTo(hatch) < 2.4) {
        this.hooks.hideCraft(true);
        beginLift(this.th, boost);
        this.th.fly.rotation.y = this.yawAim;
        this.enter("hold");
      }
      this.engines = "hold";
      return;
    }

    if (this.phase === "hold") {
      this.engines = boost ? "33 / 33" : "6 / 6";
      if (this.t < 0.08) this.cam.position.set(PAD.x + 42, 14, PAD.z + 22);
      this.wideCam(dt, 42, 16, 52);
      if (this.t > 1.6) this.enter("lift");
      return;
    }

    if (this.phase === "lift") {
      const u = Math.min(1, this.t / 8);
      this.th.fly.position.y = PAD.y + u * u * 420;
      this.th.fly.position.x = PAD.x + Math.sin(this.yawAim) * u * 40;
      this.th.fly.position.z = PAD.z - Math.cos(this.yawAim) * u * 40;
      this.th.fly.rotation.x = -u * 0.35;
      this.speedKm = 200 + u * 4500;
      this.altKm = u * 42;
      this.engines = boost ? "33 / 33" : "6 / 6";
      this.pulseFlames(this.t);
      this.wideCam(dt, 48 - u * 8, 18 + u * 30, 58 - u * 10);
      if (u >= 1) {
        this.enter("tilt");
        if (boost) {
          this.restack = "boostback";
          this.restackT = 0;
        }
      }
      return;
    }

    if (this.phase === "tilt") {
      const u = Math.min(1, this.t / 4);
      this.th.fly.position.y = PAD.y + 420 + u * 280;
      this.th.fly.rotation.x = -0.35 - u * 0.9;
      this.speedKm = 4700 + u * 1800;
      this.altKm = 42 + u * 40;
      this.engines = boost ? "33 / 33" : "6 / 6";
      this.pulseFlames(this.t);
      this.followStack(dt, 90, 0.6);
      if (u >= 1) this.enter("sep");
      return;
    }

    if (this.phase === "sep") {
      const u = Math.min(1, this.t / 3.2);
      this.th.flyShip.position.y = (boost ? 17.4 : 0) + u * 28;
      this.th.flyBoost.position.y = -u * 40;
      this.th.flyBoost.rotation.z = u * 0.4;
      this.th.flameB.visible = false;
      this.speedKm = 6500 + u * 1200;
      this.altKm = 82 + u * 30;
      this.engines = "6 / 6";
      this.followStack(dt, 70, 0.2);
      if (u >= 1) {
        this.th.flyBoost.visible = false;
        this.th.flameS.visible = false;
        this.enter("tanker");
      }
      return;
    }

    if (this.phase === "tanker") this.tickTanker(dt);
    else if (this.phase === "fuel") this.tickFuel(dt);
    else if (this.phase === "undock") this.tickUndock(dt);
    else if (this.phase === "burn") this.tickBurn(dt);
    else if (this.phase === "cruise") this.tickCruise(dt, look);
    else if (this.phase === "approach") this.tickApproach(dt);
    else if (this.phase === "clearpad") this.tickClear(dt);
    else if (this.phase === "brake") this.tickBrake(dt);
    else if (this.phase === "land") this.tickLand(dt, pos);
    else if (this.phase === "orbit") this.tickOrbit(dt);
  }

  private tickTanker(dt: number) {
    const u = Math.min(1, this.t / TANKER_SEC);
    this.th.tanker.visible = true;
    this.th.flameT.visible = u < 0.78;
    this.th.fly.position.set(0, 520, 0);
    this.th.fly.rotation.set(-1.15, 0, 0);
    this.th.flyShip.position.y = 0;
    const p = this.th.fly.position;
    // Slide in from the flank and match pitch — never stack like a probe-and-drogue.
    const ax = THREE.MathUtils.lerp(36, DOCK_X, easeOut(Math.min(1, u / 0.75)));
    const ay = THREE.MathUtils.lerp(5, 0, easeOut(u));
    const az = THREE.MathUtils.lerp(-22, 0, easeOut(Math.min(1, u / 0.8)));
    this.th.tanker.position.set(p.x + ax, p.y + ay, p.z + az);
    this.th.tanker.rotation.copy(this.th.fly.rotation);
    this.th.tanker.rotation.z = (1 - u) * 0.1;
    const docked = u > 0.84;
    this.shipPorts();
    placeBoom(this.th, _shipNose, _tankNose, docked);
    this.speedKm = 28000;
    this.altKm = 220;
    this.engines = docked ? "alongside" : "RCS";
    this.callout = u < 0.45 ? "Tanker on approach" : u < 0.84 ? "Matching attitude" : "Alongside";
    this.dockCam(dt);
    if (u >= 1) this.enter("fuel");
  }

  private tickFuel(dt: number) {
    const u = Math.min(1, this.t / FUEL_SEC);
    this.fueling = true;
    this.fuel = 0.08 + 0.92 * u;
    this.th.tanker.visible = true;
    const p = this.th.fly.position;
    this.th.tanker.position.set(p.x + DOCK_X, p.y + Math.sin(this.t * 1.2) * 0.04, p.z);
    this.th.tanker.rotation.copy(this.th.fly.rotation);
    this.th.flameT.visible = false;
    this.th.flameS.visible = false;
    this.shipPorts();
    placeBoom(this.th, _shipNose, _tankNose, true, true);
    this.speedKm = 27500;
    this.altKm = 220;
    this.engines = "transfer";
    this.callout = `Propellant ${Math.round(this.fuel * 100)}%`;
    this.dockCam(dt);
    if (u >= 1) {
      this.fuel = 1;
      this.fueling = false;
      this.enter("undock");
    }
  }

  private tickUndock(dt: number) {
    const u = Math.min(1, this.t / 2.4);
    const p = this.th.fly.position;
    this.th.tanker.visible = true;
    this.th.tanker.position.set(p.x + DOCK_X + u * 16, p.y + u * 2.5, p.z - u * 8);
    this.th.tanker.rotation.copy(this.th.fly.rotation);
    this.th.tanker.rotation.z = u * 0.12;
    this.th.flameT.visible = u > 0.2;
    this.shipPorts();
    placeBoom(this.th, _shipNose, _tankNose, u < 0.18);
    this.speedKm = 27800;
    this.engines = "RCS";
    this.dockCam(dt);
    if (u >= 1) {
      this.th.tanker.visible = false;
      this.th.boom.visible = false;
      this.th.flameT.visible = false;
      this.setSpace(true);
      this.enter("burn");
    }
  }

  private tickBurn(dt: number) {
    const u = Math.min(1, this.t / 3.2);
    this.th.flameS.visible = true;
    this.th.fly.position.set(0, 520 + u * 80, -u * 40);
    this.th.fly.rotation.set(-1.15 - u * 0.15, 0, 0);
    this.pulseFlames(this.t);
    this.speedKm = 28000 + u * 14000;
    this.altKm = 400;
    this.engines = "6 / 6";
    this.followStack(dt, 62, 0.25);
    if (u >= 1) {
      this.th.flameS.visible = false;
      this.enter("cruise");
    }
  }

  private tickCruise(dt: number, look: { yaw: number; pitch: number; zoomIn: boolean; zoomOut: boolean }) {
    this.cruiseT += dt;
    const u = Math.min(1, this.cruiseT / this.cruiseDur);
    this.tripLeft = Math.max(0, this.tripDays * (1 - u));
    this.hooks.addSimMs(this.tripDays * 86400000 * (dt / this.cruiseDur));
    this.speedKm = 40000;
    this.distKm = this.dest
      ? Math.abs(BODIES[this.dest].au - BODIES[this.body].au) * 1.496e8 * (1 - u)
      : 0;
    this.altKm = 400;
    this.engines = "cruise";
    this.th.fly.position.set(0, 540, 0);
    this.th.fly.rotation.set(-1.2, this.t * 0.02, 0);
    placeDest(this.th, 0, 1, false);
    const remain = this.cruiseDur - this.cruiseT;
    if (remain < 4) {
      this.lookYaw = THREE.MathUtils.damp(this.lookYaw, 0, 3, dt);
      this.lookPitch = THREE.MathUtils.damp(this.lookPitch, 0.08, 3, dt);
      this.zoom = THREE.MathUtils.damp(this.zoom, 1, 3, dt);
    } else {
      this.lookYaw += look.yaw * dt;
      this.lookPitch = THREE.MathUtils.clamp(this.lookPitch + look.pitch * dt, -1.1, 1.1);
      if (look.zoomIn) this.zoom = Math.max(0.45, this.zoom - dt * 0.6);
      if (look.zoomOut) this.zoom = Math.min(2.4, this.zoom + dt * 0.6);
    }
    this.cruiseCam(dt);
    if (u >= 1 && this.dest) this.enter("approach");
  }

  private tickApproach(dt: number) {
    const u = Math.min(1, this.t / APPROACH_SEC);
    // Ease-in: stays a spark for a long beat, then rushes to fill the sky.
    const e = u * u * u;
    const dist = THREE.MathUtils.lerp(2800, 380, e);
    const radius = THREE.MathUtils.lerp(16, 220, e);
    placeDest(this.th, dist, radius, true);
    this.th.fly.position.set(0, 24, 80);
    this.th.fly.rotation.set(-0.12, 0, 0);
    this.th.flyBoost.visible = false;
    this.th.flyShip.position.y = 0;
    this.speedKm = 38000 * (1 - e * 0.55);
    this.altKm = 12000 * (1 - e) + 80;
    this.distKm = dist * 12;
    this.engines = e > 0.72 ? "flaps" : "coast";
    this.callout =
      e < 0.15
        ? `${this.dest ? BODIES[this.dest].name : "Target"} · visual acquired`
        : e < 0.72
          ? `Approach · atmosphere in ${Math.max(0, APPROACH_SEC - this.t).toFixed(0)}s`
          : "Interface · ready to enter atmosphere";
    this.approachCam(dt, dist, radius);
    if (u >= 1 && this.dest) {
      placeDest(this.th, 0, 1, false);
      this.body = this.dest;
      this.hooks.arrive(this.dest);
      this.setSpace(false);
      if (BODIES[this.dest].gas) this.enter("orbit");
      else this.enter("clearpad");
    }
  }

  private tickClear(dt: number) {
    const u = Math.min(1, this.t / CLEAR_SEC);
    const withB = BODIES[this.body].booster;
    tickClearPad(this.th, this.t, withB);
    this.th.fly.visible = true;
    this.th.fly.position.set(PAD.x + 36, PAD.y + 210 - u * 40, PAD.z + 88);
    this.th.fly.rotation.set(-0.55, 0.15, 0);
    this.th.flameS.visible = true;
    this.speedKm = 2400;
    this.altKm = 18;
    this.engines = "landing";
    this.callout =
      u < 0.2
        ? "Pad-clear uplink sent"
        : u < 0.5
          ? "Mechazilla undock · Starship onto transporter"
          : "Rolling clear of the chopsticks";
    this.wideCam(dt, 44, 16, 56);
    this.cam.lookAt(PAD.x, PAD.y + 14, PAD.z);
    if (u >= 1) this.enter("brake");
  }

  private tickBrake(dt: number) {
    const u = Math.min(1, this.t / 6);
    this.th.fly.visible = true;
    this.th.fly.position.set(PAD.x + (1 - u) * 48, 280 - u * 120, PAD.z + 70 - u * 30);
    this.th.fly.rotation.set(-0.9 + u * 0.7, 0, 0);
    this.th.flameS.visible = true;
    this.speedKm = 18000 * (1 - u) + 400;
    this.altKm = 80 * (1 - u);
    this.engines = "flaps";
    this.callout = "Empty tower · suicide burn";
    this.followStack(dt, 80, 0.4);
    if (u >= 1) this.enter("land");
  }

  private tickLand(dt: number, pos: THREE.Vector3) {
    const u = Math.min(1, this.t / 8);
    const withB = BODIES[this.body].booster;
    this.th.fly.position.set(PAD.x, PAD.y + (1 - u) * 160, PAD.z);
    this.th.fly.rotation.set(0, 0, 0);
    this.th.flyBoost.visible = false;
    this.th.flyShip.position.y = 0;
    this.th.flameS.visible = u < 0.92;
    this.speedKm = 180 * (1 - u);
    this.altKm = 12 * (1 - u);
    this.engines = "landing";
    this.callout = u > 0.85 ? "Catch" : "Descending empty chopsticks";
    this.wideCam(dt, 36, 14, 48);
    if (u >= 1) {
      resetPad(this.th, withB);
      this.hooks.hideCraft(false);
      pos.set(PAD.x + 14, PAD.y + 8, PAD.z + 22);
      this.dest = null;
      this.engines = "—";
      this.padMenu = false;
      this.enter("fly");
    }
  }

  private tickOrbit(dt: number) {
    this.th.fly.visible = true;
    this.th.fly.position.set(0, 260, 80);
    this.th.fly.rotation.set(-0.4, this.t * 0.05, 0);
    this.hooks.hideCraft(true);
    this.padMenu = true;
    this.speedKm = 24000;
    this.altKm = 400;
    this.engines = "orbit";
    this.followStack(dt, 60, 0.2);
  }

  private shipPorts() {
    this.th.fly.updateMatrixWorld();
    this.th.tanker.updateMatrixWorld();
    _shipNose.set(1.22, 6.4, 0).applyMatrix4(this.th.fly.matrixWorld);
    _tankNose.set(-1.22, 6.4, 0).applyMatrix4(this.th.tanker.matrixWorld);
  }

  private pulseFlames(t: number) {
    const s = 0.85 + Math.sin(t * 28) * 0.12;
    this.th.flameB.scale.setScalar(s);
    this.th.flameS.scale.setScalar(s * 0.7);
    (this.th.flameB.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(t * 40) * 0.2;
  }

  private wideCam(dt: number, _back: number, _up: number, _side: number) {
    const p = this.th.fly.position;
    _cam.set(PAD.x + 42, 14, PAD.z + 22);
    this.cam.position.lerp(_cam, 1 - Math.exp(-dt * 3));
    _look.copy(p);
    _look.y += 14;
    this.cam.lookAt(_look);
    this.cam.fov = THREE.MathUtils.damp(this.cam.fov, 58, 4, dt);
    this.cam.updateProjectionMatrix();
  }

  private dockCam(dt: number) {
    const p = this.th.fly.position;
    const tk = this.th.tanker.position;
    _look.copy(p).lerp(tk, 0.5);
    _look.y += 6.5;
    _cam.set(_look.x - 4, _look.y + 7, _look.z + 22);
    this.cam.position.lerp(_cam, 1 - Math.exp(-dt * 2.8));
    this.cam.lookAt(_look);
    this.cam.fov = THREE.MathUtils.damp(this.cam.fov, 38, 4, dt);
    this.cam.updateProjectionMatrix();
  }

  private followStack(dt: number, dist: number, lift: number) {
    const p = this.th.fly.position;
    _dir.set(0, lift, 1).normalize();
    _cam.copy(p).addScaledVector(_dir, dist);
    this.cam.position.lerp(_cam, 1 - Math.exp(-dt * 2.4));
    this.cam.lookAt(p);
    this.cam.fov = THREE.MathUtils.damp(this.cam.fov, 58, 4, dt);
    this.cam.updateProjectionMatrix();
  }

  private cruiseCam(dt: number) {
    const p = this.th.fly.position;
    const dist = 48 * this.zoom;
    _cam.set(
      p.x + Math.sin(this.lookYaw) * dist,
      p.y + 12 + this.lookPitch * 40,
      p.z + Math.cos(this.lookYaw) * dist,
    );
    this.cam.position.lerp(_cam, 1 - Math.exp(-dt * 4));
    this.cam.lookAt(p);
    this.cam.fov = THREE.MathUtils.damp(this.cam.fov, 55, 4, dt);
    this.cam.updateProjectionMatrix();
  }

  private approachCam(dt: number, dist: number, radius: number) {
    const p = this.th.fly.position;
    _cam.set(p.x + 18, p.y + 11, p.z + 28);
    this.cam.position.lerp(_cam, 1 - Math.exp(-dt * 2.2));
    _look.set(0, 8, -dist);
    this.cam.lookAt(_look);
    const fov = 52 + Math.min(14, radius / 40);
    this.cam.fov = THREE.MathUtils.damp(this.cam.fov, fov, 3, dt);
    this.cam.far = 9000;
    this.cam.updateProjectionMatrix();
  }
}

function easeOut(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) * (1 - x);
}
