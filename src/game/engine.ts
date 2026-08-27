import * as THREE from "three";
import { CHUNK, qualityFromDetail, World, type Quality } from "./world";
import { meshChunk, type Placement } from "./mesher";
import {
  CRUISE_ANG,
  CRUISE_THRUST,
  FAST_ANG,
  FAST_THRUST,
  InputMap,
  NUDGE_ANG,
  NUDGE_THRUST,
  rateFromSample,
  type ControlsProbe,
} from "./flight";
import {
  makeAstronaut,
  makeCloudPuff,
  makeCrystal,
  makeFern,
  makeGiantTree,
  makeKelp,
  makeRoadster,
  makeSmallTree,
  makeSpore,
  makeWaterfallTexture,
  paintHull,
  paintNameplate,
  type Roadster,
} from "./flora";
import { addLights, addSky, placeSkyBodies } from "./sky";
import { WORLD_HEX } from "./palette";
import { xmur3 } from "./rng";
import { addPlanet, PLANET_R, retintPlanet, type GlobeDot } from "./planet";
import { makeStarbase, STARBASE_POI } from "./starbase";
import { AirRipples } from "./ripples";
import { CAR_SEP, minClearanceY, poseForSpawn } from "./spawn";
import { BODIES, type BodyId } from "./bodies";
import { makeTheater, type Theater } from "./theater";
import { Mission, type MissionSnap, type Phase } from "./mission";
import { GameAudio } from "./audio";

export type HudPatch = {
  altitude: number;
  speed: number;
  heading: number;
  zoom: number;
  seed: number;
  chunksLoaded: number;
  chunksQueued: number;
  braking: boolean;
  cruiseLabel: string;
  generating: boolean;
  fps: number;
  cpuPct: number;
  sights: GlobeDot[];
  mission: MissionSnap;
  currentBody: BodyId;
  simOffset: number;
};

type LoadedChunk = {
  cx: number;
  cz: number;
  solid: THREE.Mesh | null;
  water: THREE.Mesh | null;
  placements: Placement[];
};

const BRAKE_SEC = 2;
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");
const _mat = new THREE.Matrix4();
const _look = new THREE.Vector3();

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly input = new InputMap();
  readonly craft: THREE.Group;
  private roadster: Roadster;

  world: World;
  quality: Quality;
  seed: number;
  playing = false;

  pos = new THREE.Vector3(0, 80, 40);
  vel = new THREE.Vector3();
  yaw = 0;
  pitch = -0.12;
  roll = 0;
  yawRate = 0;
  pitchRate = 0;
  rollRate = 0;
  followDist = 11;
  brakingT = 0;
  detail = 0;

  private timer = new THREE.Timer();
  private unbind: (() => void) | null = null;
  private raf = 0;
  private disposed = false;
  private hudAcc = 0;
  private onHud: (p: HudPatch) => void;

  private chunks = new Map<string, LoadedChunk>();
  private queue: { cx: number; cz: number; d: number }[] = [];
  private solidMat: THREE.MeshLambertMaterial;
  private waterMat: THREE.MeshLambertMaterial;
  private lights: ReturnType<typeof addLights>;
  private sky: ReturnType<typeof addSky>;
  private planet: ReturnType<typeof addPlanet>;
  private ripples: AirRipples;
  private remotes = new Map<
    string,
    {
      mesh: THREE.Group;
      pos: THREE.Vector3;
      yaw: number;
      pitch: number;
      roll: number;
      plate: THREE.Group;
    }
  >();
  private frameCount = 0;
  private workMs = 0;
  private statsT = 0;
  private fpsOut = 0;
  private cpuOut = 0;
  private hudPeriod = 1;
  private localWish = new THREE.Vector3();
  private guide: THREE.Vector3 | null = null;
  private spawnIdx = 0;
  private lot = new Map<number, THREE.Group>();
  private theater: Theater;
  private mission: Mission;
  private audio = new GameAudio();
  private starbaseRoot: THREE.Group;
  private kelp: THREE.InstancedMesh;
  private clouds: THREE.InstancedMesh;
  private astronaut: THREE.Group;
  private hullColor = 0xb42318;
  private currentBody: BodyId = "earth";
  private simOffset = 0;
  private chunksVisible = true;

  private treeTrunk: THREE.InstancedMesh;
  private treeCanopy: THREE.InstancedMesh;
  private ferns: THREE.InstancedMesh;
  private crystals: THREE.InstancedMesh;
  private spores: THREE.InstancedMesh;
  private giants = new Map<string, THREE.Group>();
  private falls = new Map<string, THREE.Mesh>();
  private fallTex: THREE.CanvasTexture;
  private instancesDirty = false;
  private sporeOffsets: Float32Array;
  private dummy = new THREE.Object3D();
  private touch = { x: 0, y: 0, lookX: 0, lookY: 0, fwd: 0, back: 0 };

  constructor(canvas: HTMLCanvasElement, onHud: (p: HudPatch) => void, detail: number) {
    this.onHud = onHud;
    this.detail = detail;
    this.quality = qualityFromDetail(detail);
    this.seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    this.world = new World(this.seed, this.quality.voxelSize);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: detail > 0.25,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, detail > 0.4 ? 1.5 : 1));
    this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.4, 4200);
    this.scene.background = new THREE.Color(WORLD_HEX.fog);
    this.scene.fog = new THREE.Fog(WORLD_HEX.fog, 280, 2800);

    this.solidMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.waterMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });

    this.sky = addSky(this.scene);
    this.lights = addLights(this.scene, this.quality.shadows);
    this.planet = addPlanet(this.scene, this.seed, "earth");
    this.starbaseRoot = makeStarbase();
    this.scene.add(this.starbaseRoot);
    this.theater = makeTheater();
    this.scene.add(this.theater.root);
    this.mission = new Mission(this.theater, this.camera, {
      arrive: (id) => this.arrive(id),
      hideCraft: (v) => {
        this.craft.visible = !v;
      },
      setAstronaut: (v) => {
        this.astronaut.visible = v;
        this.craft.visible = !v;
      },
      addSimMs: (ms) => {
        this.simOffset += ms;
      },
      setSpace: (v) => this.setSpace(v),
    });
    this.dressLot();

    const { trunkGeo, canopyGeo } = makeSmallTree();
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3324 });
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x1f6b45 });
    this.treeTrunk = new THREE.InstancedMesh(trunkGeo, trunkMat, 1400);
    this.treeCanopy = new THREE.InstancedMesh(canopyGeo, canopyMat, 1400);
    this.ferns = new THREE.InstancedMesh(
      makeFern(),
      new THREE.MeshLambertMaterial({ color: 0x2d6a4f, side: THREE.DoubleSide }),
      900,
    );
    this.crystals = new THREE.InstancedMesh(
      makeCrystal(),
      new THREE.MeshLambertMaterial({
        color: 0x7ee0d2,
        emissive: 0x1a6a62,
        emissiveIntensity: 0.7,
      }),
      500,
    );
    this.spores = new THREE.InstancedMesh(
      makeSpore(),
      new THREE.MeshLambertMaterial({
        color: 0xa8fff4,
        emissive: 0x3aa89c,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.85,
      }),
      180,
    );
    for (const m of [this.treeTrunk, this.treeCanopy, this.ferns, this.crystals, this.spores]) {
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(m);
    }
    this.treeTrunk.count = 0;
    this.treeCanopy.count = 0;
    this.ferns.count = 0;
    this.crystals.count = 0;
    this.spores.count = 180;
    this.sporeOffsets = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      this.sporeOffsets[i * 3] = (Math.random() - 0.5) * 70;
      this.sporeOffsets[i * 3 + 1] = (Math.random() - 0.5) * 40;
      this.sporeOffsets[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    this.kelp = new THREE.InstancedMesh(
      makeKelp(),
      new THREE.MeshLambertMaterial({ color: 0x1d6a58, side: THREE.DoubleSide }),
      700,
    );
    this.clouds = new THREE.InstancedMesh(
      makeCloudPuff(),
      new THREE.MeshLambertMaterial({
        color: 0xe8f0f2,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
      80,
    );
    this.kelp.frustumCulled = false;
    this.clouds.frustumCulled = false;
    this.kelp.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.kelp.count = 0;
    this.clouds.count = 0;
    this.scene.add(this.kelp, this.clouds);

    this.fallTex = makeWaterfallTexture();
    this.roadster = makeRoadster();
    this.craft = this.roadster.group;
    this.scene.add(this.craft);
    this.astronaut = makeAstronaut();
    this.astronaut.visible = false;
    this.scene.add(this.astronaut);
    paintHull(this.craft, this.hullColor);
    this.ripples = new AirRipples();
    this.scene.add(this.ripples.group);

    this.placeSpawn();
    this.camera.position.copy(this.pos).add(new THREE.Vector3(0, 4, 11));

    this.unbind = this.input.bind(window);
    this.resize();
    window.addEventListener("resize", this.resize);
    this.timer.connect(document);

    this.primeChunks();
    this.installProbe();
  }

  setTouch(t: Partial<Engine["touch"]>) {
    Object.assign(this.touch, t);
  }

  snapshot() {
    return {
      x: this.pos.x,
      y: this.pos.y,
      z: this.pos.z,
      yaw: this.yaw,
      pitch: this.pitch,
      roll: this.roll,
      color: this.hullColor,
      lift: this.mission.phase === "lift" || this.mission.phase === "hold" ? this.mission.dest : null,
      body: this.currentBody,
    };
  }

  applySpawn(idx: number) {
    this.spawnIdx = Math.max(0, Math.trunc(idx));
    const p = poseForSpawn(this.spawnIdx);
    this.pos.set(p.x, p.y, p.z);
    this.yaw = p.yaw;
    this.pitch = p.pitch;
    this.followDist = 11;
    this.camera.position.copy(this.pos).add(new THREE.Vector3(0, 4, 11));
    this.hideLotStall(this.spawnIdx);
  }

  private dressLot() {
    // Park a front-and-middle scatter so the first (back-row) stall
    // looks through cars to the sign. Skip 0 — that's the local pad.
    for (const i of [8, 9, 10, 12, 14, 16, 18, 20, 22, 24]) {
      const p = poseForSpawn(i);
      const r = makeRoadster();
      r.group.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshPhongMaterial) {
          if (o.material.color.getHex() === 0xb42318) o.material.color.setHex(0x3d4744);
        }
      });
      paintNameplate(r.nameplate, "• • •");
      r.group.position.set(p.x, p.y, p.z);
      r.group.rotation.order = "YXZ";
      r.group.rotation.set(p.pitch, p.yaw, 0);
      this.scene.add(r.group);
      this.lot.set(i, r.group);
    }
  }

  private hideLotStall(idx: number) {
    for (const [i, g] of this.lot) g.visible = i !== idx;
  }

  setCallsign(name: string) {
    paintNameplate(this.roadster.nameplate, name);
  }

  setHullColor(hex: number) {
    this.hullColor = hex;
    paintHull(this.craft, hex);
  }

  beginGo(id: BodyId) {
    this.mission.go(id);
  }

  beginEva() {
    this.mission.eva();
  }

  returnToShip() {
    this.mission.returnShip();
  }

  observeLift() {
    this.mission.observeLift();
  }

  superspeedTo(x: number, y: number, z: number) {
    this.guide = new THREE.Vector3(x, y, z);
    this.playing = true;
  }

  setRemote(
    id: string,
    name: string,
    s: {
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      roll: number;
      color?: number;
    },
  ) {
    let slot = this.remotes.get(id);
    if (!slot) {
      const r = makeRoadster();
      r.group.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshPhongMaterial) {
          if (o.material.color.getHex() === 0xb42318) o.material.color.setHex(0x2a6fbb);
        }
      });
      paintNameplate(r.nameplate, name);
      if (typeof s.color === "number") paintHull(r.group, s.color);
      this.scene.add(r.group);
      slot = {
        mesh: r.group,
        pos: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        roll: 0,
        plate: r.nameplate,
      };
      this.remotes.set(id, slot);
    } else {
      paintNameplate(slot.plate, name);
      if (typeof s.color === "number") paintHull(slot.mesh, s.color);
    }
    slot.pos.set(s.x, s.y, s.z);
    slot.yaw = s.yaw;
    slot.pitch = s.pitch;
    slot.roll = s.roll;
  }

  pruneRemotes(live: Set<string>) {
    for (const [id, slot] of this.remotes) {
      if (live.has(id)) continue;
      this.scene.remove(slot.mesh);
      const mat = slot.plate.userData.plateMat as THREE.MeshBasicMaterial | undefined;
      mat?.map?.dispose();
      mat?.dispose();
      this.remotes.delete(id);
    }
  }

  setPlaying(v: boolean) {
    this.playing = v;
    if (v) {
      this.audio.unlock();
      this.timer.update();
      this.timer.getDelta();
    }
  }

  unlockAudio() {
    this.audio.unlock();
  }

  setMuted(v: boolean) {
    this.audio.setMuted(v);
  }

  setDetail(t: number) {
    this.detail = t;
    const q = qualityFromDetail(t);
    const voxelChanged = Math.abs(q.voxelSize - this.quality.voxelSize) > 0.15;
    const radiusChanged = q.radius !== this.quality.radius;
    this.quality = q;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, t > 0.4 ? 1.5 : 1));
    this.renderer.shadowMap.enabled = q.shadows;
    this.lights.sun.castShadow = q.shadows;
    if (voxelChanged) {
      this.world = new World(this.seed, q.voxelSize);
      this.clearChunks();
      this.primeChunks();
    } else if (radiusChanged) {
      this.markStream();
    }
  }

  newWorld() {
    this.seed = (this.seed + 0x9e3779b9) >>> 0;
    this.world = new World(this.seed, this.quality.voxelSize);
    this.clearChunks();
    this.placeSpawn();
    this.vel.set(0, 0, 0);
    this.primeChunks();
  }

  start() {
    this.resize();
    requestAnimationFrame(() => this.resize());
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      this.tick();
    };
    this.timer.reset();
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unbind?.();
    window.removeEventListener("resize", this.resize);
    this.clearChunks();
    this.renderer.dispose();
    this.solidMat.dispose();
    this.waterMat.dispose();
    this.fallTex.dispose();
    this.ripples.dispose();
    this.audio.dispose();
    this.planet.tex.dispose();
    this.planet.mesh.geometry.dispose();
    this.timer.dispose();
    if (window.__controlsTest) delete window.__controlsTest;
  }

  private resize = () => {
    const el = this.renderer.domElement;
    const parent = el.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private placeSpawn() {
    const p = poseForSpawn(this.spawnIdx);
    this.pos.set(p.x, p.y, p.z);
    this.yaw = p.yaw;
    this.pitch = p.pitch;
    this.followDist = 11;
    this.hideLotStall(this.spawnIdx);
  }

  private primeChunks() {
    this.markStream();
    const n = Math.min(12, this.queue.length);
    for (let i = 0; i < n; i++) this.buildNext();
    this.rebuildInstances();
  }

  private chunkKey(cx: number, cz: number) {
    return `${cx},${cz}`;
  }

  private markStream() {
    const span = CHUNK * this.world.voxelSize;
    const pcx = Math.floor(this.pos.x / span);
    const pcz = Math.floor(this.pos.z / span);
    const r = this.quality.radius;
    const needed = new Set<string>();
    this.queue.length = 0;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r + 1) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        const k = this.chunkKey(cx, cz);
        needed.add(k);
        if (!this.chunks.has(k)) {
          this.queue.push({ cx, cz, d: dx * dx + dz * dz });
        }
      }
    }
    this.queue.sort((a, b) => a.d - b.d);
    for (const [k, ch] of this.chunks) {
      if (!needed.has(k)) this.unload(k, ch);
    }
    const fogFar = Math.max(900, r * span * 3.2);
    const fog = this.scene.fog;
    if (fog instanceof THREE.Fog) fog.far = Math.max(2200, fogFar * 2);
    this.camera.far = Math.max(4200, PLANET_R * 5);
    this.camera.updateProjectionMatrix();
  }

  private unload(k: string, ch: LoadedChunk) {
    if (ch.solid) {
      this.scene.remove(ch.solid);
      ch.solid.geometry.dispose();
    }
    if (ch.water) {
      this.scene.remove(ch.water);
      ch.water.geometry.dispose();
    }
    this.chunks.delete(k);
    const gk = `g:${k}`;
    const g = this.giants.get(gk);
    if (g) {
      this.scene.remove(g);
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
        }
      });
      this.giants.delete(gk);
    }
    const f = this.falls.get(k);
    if (f) {
      this.scene.remove(f);
      f.geometry.dispose();
      this.falls.delete(k);
    }
    this.instancesDirty = true;
  }

  private clearChunks() {
    for (const [k, ch] of [...this.chunks]) this.unload(k, ch);
    this.queue.length = 0;
  }

  private buildNext() {
    const job = this.queue.shift();
    if (!job) return;
    const k = this.chunkKey(job.cx, job.cz);
    if (this.chunks.has(k)) return;
    const built = meshChunk(this.world, job.cx, job.cz, this.quality);
    const loaded: LoadedChunk = {
      cx: job.cx,
      cz: job.cz,
      solid: null,
      water: null,
      placements: built.placements,
    };
    if (built.solid) {
      const mesh = new THREE.Mesh(built.solid, this.solidMat);
      mesh.castShadow = this.quality.shadows;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      loaded.solid = mesh;
    }
    if (built.water) {
      const mesh = new THREE.Mesh(built.water, this.waterMat);
      this.scene.add(mesh);
      loaded.water = mesh;
    }
    this.chunks.set(k, loaded);

    for (const p of built.placements) {
      if (p.kind === "giant") {
        const gk = `g:${k}`;
        if (!this.giants.has(gk)) {
          const tree = makeGiantTree(xmur3(`${this.seed}:${p.x}:${p.z}`), p.scale);
          tree.position.set(p.x, p.y, p.z);
          tree.rotation.y = p.rot;
          this.scene.add(tree);
          this.giants.set(gk, tree);
        }
      }
      if (p.kind === "fall") {
        const h = Math.max(12, p.extra ?? 20);
        const geo = new THREE.PlaneGeometry(3.2, h);
        const mat = new THREE.MeshBasicMaterial({
          map: this.fallTex,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.x, p.y - h * 0.45, p.z);
        mesh.rotation.y = p.rot + Math.PI / 2;
        this.scene.add(mesh);
        this.falls.set(k, mesh);
      }
    }
    this.instancesDirty = true;
  }

  private rebuildInstances() {
    let ti = 0;
    let fi = 0;
    let ci = 0;
    let ki = 0;
    const dummy = this.dummy;
    for (const ch of this.chunks.values()) {
      for (const p of ch.placements) {
        if (p.kind === "tree" && ti < 1400) {
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(0, p.rot, 0);
          dummy.scale.setScalar(p.scale);
          dummy.updateMatrix();
          this.treeTrunk.setMatrixAt(ti, dummy.matrix);
          this.treeCanopy.setMatrixAt(ti, dummy.matrix);
          ti++;
        } else if (p.kind === "fern" && fi < 900) {
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(0, p.rot, 0.1);
          dummy.scale.setScalar(p.scale);
          dummy.updateMatrix();
          this.ferns.setMatrixAt(fi, dummy.matrix);
          fi++;
        } else if (p.kind === "crystal" && ci < 500) {
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(0.3, p.rot, 0.2);
          dummy.scale.setScalar(p.scale);
          dummy.updateMatrix();
          this.crystals.setMatrixAt(ci, dummy.matrix);
          ci++;
        } else if (p.kind === "kelp" && ki < 700) {
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(0.05, p.rot, 0);
          dummy.scale.setScalar(p.scale);
          dummy.updateMatrix();
          this.kelp.setMatrixAt(ki, dummy.matrix);
          ki++;
        }
      }
    }
    this.treeTrunk.count = ti;
    this.treeCanopy.count = ti;
    this.ferns.count = fi;
    this.crystals.count = ci;
    this.kelp.count = this.chunksVisible ? ki : 0;
    this.treeTrunk.instanceMatrix.needsUpdate = true;
    this.treeCanopy.instanceMatrix.needsUpdate = true;
    this.ferns.instanceMatrix.needsUpdate = true;
    this.crystals.instanceMatrix.needsUpdate = true;
    this.kelp.instanceMatrix.needsUpdate = true;
    this.placeClouds();
    this.instancesDirty = false;
  }

  private tick() {
    const t0 = performance.now();
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.input.tick(dt);

    if (this.playing) {
      const cinematic = this.mission.inCinematic();
      if (!cinematic || this.mission.phase === "eva") this.integrate(dt);
      this.mission.tick(dt, this.pos, this.craft, {
        yaw:
          (this.input.axes.rollL.held ? 1 : 0) -
          (this.input.axes.rollR.held ? 1 : 0) +
          this.touch.lookX,
        pitch:
          (this.input.axes.pitchUp.held ? 1 : 0) -
          (this.input.axes.pitchDn.held ? 1 : 0) -
          this.touch.lookY,
        zoomIn: this.input.zoomIn,
        zoomOut: this.input.zoomOut,
      });
      this.audio.sync(this.mission.phase, this.mission.fueling);
    }

    this.markStream();
    this.buildNext();
    if (this.queue.length > 8) this.buildNext();
    if (this.instancesDirty) this.rebuildInstances();

    if (!this.mission.inCinematic() || this.mission.phase === "eva" || this.mission.phase === "board") {
      this.updateCraftCamera(dt);
    }
    if (this.astronaut.visible) {
      this.astronaut.position.copy(this.pos);
      this.astronaut.rotation.copy(this.craft.rotation);
    }
    this.clouds.visible = this.chunksVisible && BODIES[this.currentBody].atmo && !this.mission.inCinematic();
    this.spores.visible = !this.mission.inCinematic();
    this.updateSpores(this.timer.getElapsed());
    this.sky.mesh.position.copy(this.pos);
    placeSkyBodies(
      this.sky,
      this.pos,
      this.currentBody,
      this.mission.phase === "approach" || this.mission.phase === "cruise"
        ? this.mission.dest
        : null,
    );
    this.ripples.pulse(this.craft, this.localWish, this.roadster.nozzles, dt);
    this.ripples.update(dt);
    this.updateRemotes(dt);

    this.renderer.render(this.scene, this.camera);

    this.frameCount += 1;
    this.workMs += performance.now() - t0;
    this.statsT += dt;
    if (this.statsT >= this.hudPeriod) {
      this.fpsOut = this.frameCount / this.statsT;
      this.cpuOut = Math.min(100, (this.workMs / (this.statsT * 1000)) * 100);
      this.hudPeriod = this.cpuOut > 1 ? 2 : 1;
      this.frameCount = 0;
      this.workMs = 0;
      this.statsT = 0;
    }

    this.hudAcc += dt;
    if (this.hudAcc > 0.12) {
      this.hudAcc = 0;
      const cruise = this.cruiseLabel();
      this.onHud({
        altitude: this.pos.y,
        speed: this.vel.length(),
        heading: THREE.MathUtils.radToDeg(this.yaw),
        zoom: this.followDist,
        seed: this.seed,
        chunksLoaded: this.chunks.size,
        chunksQueued: this.queue.length,
        braking: this.brakingT > 0,
        cruiseLabel: cruise,
        generating: this.queue.length > 0,
        fps: this.fpsOut,
        cpuPct: this.cpuOut,
        sights: [
          STARBASE_POI,
          { id: "crystal-arch", kind: "sight", name: "Crystal Arch", x: 210, y: 88, z: -40 },
          { id: "gulf-deep", kind: "sight", name: "Gulf Deep", x: -40, y: 12, z: 240 },
        ],
        mission: this.mission.snap(),
        currentBody: this.currentBody,
        simOffset: this.simOffset,
      });
    }
  }

  private cruiseLabel(): string {
    const f = this.input.axes.fwd.cruise;
    if (this.brakingT > 0) return "coasting";
    if (f === 2) return "fast cruise";
    if (f === 1 || this.input.axes.fwd.held) return "cruise";
    if (this.vel.length() > 1.2) return "gliding";
    return "still";
  }

  private integrate(dt: number) {
    if (this.input.stopLatched) {
      this.input.stopAll();
      this.brakingT = BRAKE_SEC;
    }

    if (this.input.zoomIn) this.followDist = Math.max(6, this.followDist - 22 * dt);
    if (this.input.zoomOut) this.followDist = Math.min(90, this.followDist + 28 * dt);

    _euler.set(this.pitch, this.yaw, this.roll, "YXZ");
    _quat.setFromEuler(_euler);
    _fwd.set(0, 0, -1).applyQuaternion(_quat);
    _right.set(1, 0, 0).applyQuaternion(_quat);
    _up.set(0, 1, 0).applyQuaternion(_quat);

    // Rotation
    let wishYaw = 0;
    let wishPitch = 0;
    let wishRoll = 0;
    const yl = this.input.sample("yawL", dt);
    const yr = this.input.sample("yawR", dt);
    const pu = this.input.sample("pitchUp", dt);
    const pd = this.input.sample("pitchDn", dt);
    const rl = this.input.sample("rollL", dt);
    const rr = this.input.sample("rollR", dt);

    if (yl === -1) this.yaw += NUDGE_ANG;
    else wishYaw += rateFromSample(yl, 0, CRUISE_ANG, FAST_ANG);
    if (yr === -1) this.yaw -= NUDGE_ANG;
    else wishYaw -= rateFromSample(yr, 0, CRUISE_ANG, FAST_ANG);
    wishYaw += this.input.steerInject * CRUISE_ANG;
    wishYaw += this.touch.lookX * CRUISE_ANG;

    if (pu === -1) this.pitch += NUDGE_ANG * 0.7;
    else wishPitch += rateFromSample(pu, 0, CRUISE_ANG * 0.75, FAST_ANG * 0.75);
    if (pd === -1) this.pitch -= NUDGE_ANG * 0.7;
    else wishPitch -= rateFromSample(pd, 0, CRUISE_ANG * 0.75, FAST_ANG * 0.75);
    wishPitch -= this.touch.lookY * CRUISE_ANG * 0.75;

    wishRoll += rateFromSample(rl, 0, 1.1, 1.8);
    wishRoll -= rateFromSample(rr, 0, 1.1, 1.8);
    if (rl === -1) this.roll += 0.22;
    if (rr === -1) this.roll -= 0.22;

    if (this.brakingT > 0) {
      const k = 1 - Math.exp(-Math.log(40) * dt / this.brakingT);
      this.yawRate += (0 - this.yawRate) * k;
      this.pitchRate += (0 - this.pitchRate) * k;
      this.rollRate += (0 - this.rollRate) * k;
    } else {
      const has = wishYaw !== 0 || wishPitch !== 0;
      if (has) {
        this.yawRate = wishYaw;
        this.pitchRate = wishPitch;
      } else {
        this.yawRate *= Math.exp(-dt * 5);
        this.pitchRate *= Math.exp(-dt * 5);
      }
      this.rollRate = wishRoll;
    }

    this.yaw += this.yawRate * dt;
    this.pitch += this.pitchRate * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.25, 1.25);

    const bank = THREE.MathUtils.clamp(this.yawRate * 0.32 + this.rollRate * 0.5, -0.7, 0.7);
    this.roll = THREE.MathUtils.damp(this.roll, bank, 6, dt);

    // Translation
    _wish.set(0, 0, 0);
    const apply = (s: number, dir: THREE.Vector3, cruise: number, fast: number) => {
      if (s === -1) this.vel.addScaledVector(dir, NUDGE_THRUST);
      else if (s === 1) _wish.addScaledVector(dir, cruise);
      else if (s === 2) _wish.addScaledVector(dir, fast);
    };
    apply(this.input.sample("fwd", dt), _fwd, CRUISE_THRUST, FAST_THRUST);
    apply(this.input.sample("back", dt), _fwd, -CRUISE_THRUST * 0.7, -FAST_THRUST * 0.7);
    apply(this.input.sample("left", dt), _right, -CRUISE_THRUST * 0.7, -FAST_THRUST * 0.55);
    apply(this.input.sample("right", dt), _right, CRUISE_THRUST * 0.7, FAST_THRUST * 0.55);
    apply(this.input.sample("up", dt), _up, CRUISE_THRUST * 0.7, FAST_THRUST * 0.55);
    apply(this.input.sample("down", dt), _up, -CRUISE_THRUST * 0.7, -FAST_THRUST * 0.55);

    if (this.touch.fwd > 0.1) _wish.addScaledVector(_fwd, CRUISE_THRUST * this.touch.fwd);
    if (this.touch.back > 0.1) _wish.addScaledVector(_fwd, -CRUISE_THRUST * 0.7 * this.touch.back);
    _wish.addScaledVector(_right, this.touch.x * CRUISE_THRUST * 0.7);
    _wish.addScaledVector(_up, this.touch.y * CRUISE_THRUST * 0.7);

    if (this.guide) {
      _tmp.copy(this.guide).sub(this.pos);
      const dist = _tmp.length();
      if (dist < 14) {
        this.guide = null;
      } else {
        _tmp.multiplyScalar(1 / dist);
        _wish.copy(_tmp).multiplyScalar(190);
        this.yaw = Math.atan2(-_tmp.x, -_tmp.z);
        this.pitch = Math.asin(THREE.MathUtils.clamp(_tmp.y, -0.95, 0.95));
      }
    }

    this.localWish.set(_wish.dot(_right), _wish.dot(_up), -_wish.dot(_fwd));

    if (this.brakingT > 0) {
      this.brakingT = Math.max(0, this.brakingT - dt);
      const k = Math.exp(-Math.log(50) * dt / Math.max(this.brakingT, 0.05));
      this.vel.multiplyScalar(this.brakingT <= 0 ? 0 : k);
      if (this.brakingT <= 0) this.vel.set(0, 0, 0);
    } else if (_wish.lengthSq() > 0.01) {
      this.vel.lerp(_wish, 1 - Math.exp(-dt * 2.4));
    } else {
      this.vel.multiplyScalar(Math.exp(-dt * 0.12));
    }

    this.pos.addScaledVector(this.vel, dt);
    const floor = minClearanceY(this.pos.x, this.pos.z);
    if (this.pos.y < floor) {
      this.pos.y = floor;
      if (this.vel.y < 0) this.vel.y = 0;
    }
    if (this.pos.y > PLANET_R + 80) {
      this.pos.y = PLANET_R + 80;
      if (this.vel.y > 0) this.vel.y = 0;
    }
    if (!this.guide) this.separateFromCars();
  }

  private separateFromCars() {
    for (const slot of this.remotes.values()) {
      _tmp.copy(this.pos).sub(slot.pos);
      const len = _tmp.length();
      if (len > 0.001 && len < CAR_SEP) {
        _tmp.multiplyScalar(1 / len);
        this.pos.addScaledVector(_tmp, CAR_SEP - len);
        const closing = this.vel.dot(_tmp);
        if (closing < 0) this.vel.addScaledVector(_tmp, -closing);
      }
    }
    const floor = minClearanceY(this.pos.x, this.pos.z);
    if (this.pos.y < floor) this.pos.y = floor;
  }

  private updateCraftCamera(dt: number) {
    _euler.set(this.pitch, this.yaw, this.roll, "YXZ");
    this.craft.rotation.copy(_euler);
    this.craft.position.copy(this.pos);

    // Chase cam follows yaw, but only a little pitch — otherwise a nose-down
    // amphitheater stall aims the camera at the sign and loses the car/plate.
    _euler.set(this.pitch * 0.1, this.yaw, 0, "YXZ");
    _fwd.set(0, 0, -1).applyEuler(_euler);
    _tmp.copy(this.pos).addScaledVector(_fwd, -this.followDist);
    _tmp.y += this.followDist * 0.14 + 1.05;
    this.camera.position.lerp(_tmp, 1 - Math.exp(-dt * 7));
    _look.copy(this.pos);
    _look.y += 0.55;
    this.camera.lookAt(_look);

    const speed = this.vel.length();
    const targetFov = 58 + Math.min(16, speed * 0.18) - (22 - Math.min(22, this.followDist)) * 0.35;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt);
    this.camera.updateProjectionMatrix();
  }

  private updateSpores(t: number) {
    if (!this.quality.spores) {
      this.spores.count = 0;
      return;
    }
    this.spores.count = 180;
    for (let i = 0; i < 180; i++) {
      const ox = this.sporeOffsets[i * 3]!;
      const oy = this.sporeOffsets[i * 3 + 1]!;
      const oz = this.sporeOffsets[i * 3 + 2]!;
      const x = this.pos.x + ox + Math.sin(t * 0.3 + i) * 6;
      const y = this.pos.y + oy + Math.cos(t * 0.21 + i * 0.4) * 4;
      const z = this.pos.z + oz + Math.cos(t * 0.27 + i) * 6;
      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(0.6 + (i % 5) * 0.15);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.spores.setMatrixAt(i, this.dummy.matrix);
    }
    this.spores.instanceMatrix.needsUpdate = true;
  }

  private updateRemotes(dt: number) {
    for (const slot of this.remotes.values()) {
      slot.mesh.position.lerp(slot.pos, 1 - Math.exp(-dt * 8));
      slot.mesh.rotation.order = "YXZ";
      slot.mesh.rotation.y = slot.yaw;
      slot.mesh.rotation.x = slot.pitch;
      slot.mesh.rotation.z = slot.roll;
    }
  }

  private placeClouds() {
    if (!this.chunksVisible) {
      this.clouds.count = 0;
      return;
    }
    const dummy = this.dummy;
    const span = 110;
    const pcx = Math.floor(this.pos.x / span);
    const pcz = Math.floor(this.pos.z / span);
    let n = 0;
    for (let dz = -5; dz <= 5; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        const gx = pcx + dx;
        const gz = pcz + dz;
        const h = (xmur3(`${this.seed}:c:${gx}:${gz}`) >>> 0) / 0xffffffff;
        if (h > 0.42) continue;
        dummy.position.set(
          gx * span + (h - 0.2) * 40,
          78 + h * 55,
          gz * span + ((h * 13) % 1) * 40,
        );
        dummy.rotation.set(0, h * 6, 0);
        dummy.scale.setScalar(0.8 + h * 1.6);
        dummy.updateMatrix();
        this.clouds.setMatrixAt(n, dummy.matrix);
        n++;
        if (n >= 80) break;
      }
    }
    this.clouds.count = n;
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  private setSpace(on: boolean) {
    const body = BODIES[this.currentBody];
    this.planet.mesh.visible = !on;
    this.planet.water.visible = !on;
    this.planet.atmo.visible = !on;
    this.planet.clouds.visible = !on;
    this.starbaseRoot.visible = !on && !body.gas;
    this.sky.mesh.visible = !on;
    this.chunksVisible = !on && !body.gas;
    for (const g of this.lot.values()) g.visible = !on && !body.gas;
    for (const ch of this.chunks.values()) {
      if (ch.solid) ch.solid.visible = this.chunksVisible;
      if (ch.water) ch.water.visible = this.chunksVisible;
    }
    if (on) {
      this.scene.background = new THREE.Color(0x02050a);
      const fog = this.scene.fog;
      if (fog instanceof THREE.Fog) {
        fog.color.setHex(0x02050a);
        fog.near = 2800;
        fog.far = 9000;
      }
      this.camera.far = 9000;
      this.camera.updateProjectionMatrix();
    } else {
      const fogCol = new THREE.Color(body.fog);
      this.scene.background = fogCol;
      const fog = this.scene.fog;
      if (fog instanceof THREE.Fog) {
        fog.color.copy(fogCol);
        fog.near = body.gas ? 220 : 280;
        fog.far = body.gas ? 1600 : 2800;
      }
      this.camera.far = Math.max(4200, PLANET_R * 5);
      this.camera.updateProjectionMatrix();
    }
    this.instancesDirty = true;
  }

  private arrive(id: BodyId) {
    this.currentBody = id;
    const body = BODIES[id];
    retintPlanet(this.planet, this.seed, id);
    const fogCol = new THREE.Color(body.fog);
    this.scene.background = fogCol;
    const fog = this.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.color.copy(fogCol);
      fog.near = body.gas ? 220 : 280;
      fog.far = body.gas ? 1600 : 2800;
    }
    this.chunksVisible = !body.gas;
    for (const ch of this.chunks.values()) {
      if (ch.solid) ch.solid.visible = this.chunksVisible;
      if (ch.water) ch.water.visible = this.chunksVisible;
    }
    for (const g of this.giants.values()) g.visible = this.chunksVisible;
    for (const f of this.falls.values()) f.visible = this.chunksVisible;
    this.treeTrunk.visible = this.chunksVisible;
    this.treeCanopy.visible = this.chunksVisible;
    this.ferns.visible = this.chunksVisible;
    this.crystals.visible = this.chunksVisible;
    this.kelp.visible = this.chunksVisible;
    this.clouds.visible = this.chunksVisible && body.atmo;
    this.starbaseRoot.visible = !body.gas;
    for (const g of this.lot.values()) g.visible = !body.gas;
    this.instancesDirty = true;
  }

  private installProbe() {
    const probe: ControlsProbe = {
      getYaw: () => this.yaw,
      getSpeed: () => this.vel.length(),
      getPose: () => ({
        x: this.pos.x,
        y: this.pos.y,
        z: this.pos.z,
        yaw: this.yaw,
        pitch: this.pitch,
      }),
      getCallsign: () => String(this.roadster.nameplate.userData.label ?? ""),
      getMission: () => {
        const s = this.mission.snap();
        return { phase: s.phase, fuel: s.fuel, callout: s.callout };
      },
      skipTo: (phase, dest) => {
        this.audio.unlock();
        this.mission.skipTo(phase as Phase, (dest as BodyId) || this.mission.dest || "moon");
      },
      beginGo: (id) => this.beginGo(id as BodyId),
      applySpawn: (idx) => this.applySpawn(idx),
      setCallsign: (name) => this.setCallsign(name),
      setSteer: (v) => this.input.setSteer(v),
      setKeys: (codes) => this.input.setKeys(codes),
    };
    window.__controlsTest = probe;
  }
}
