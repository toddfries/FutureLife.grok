/**
 * 6DOF flight input.
 *
 * MOVE (vi) — view-relative translation
 *   h left · l right · k up · j down
 *   Space forward · Shift+Space back
 *
 * TILT / LOOK
 *   u tilt left (yaw+roll) · o tilt right
 *   i tilt forward (pitch down) · , tilt back (pitch up)
 *
 * Tap protocol on tilt + rotation + thrust:
 *   1 tap = nudge · 2 taps = continuous · 3 taps = fast continuous
 *   Hold = continuous while held
 *   s = stop, 2s ease if anything was cruising
 *
 * A/D alias tilt left/right so chase-cam A = nose left (controls skill).
 * W aliases Space (forward) for the mandatory self-test.
 */

const COMBO_MS = 0.42;
const HOLD_MS = 0.16;

export const NUDGE_THRUST = 18;
export const CRUISE_THRUST = 26;
export const FAST_THRUST = 62;
export const NUDGE_ANG = 0.18;
export const CRUISE_ANG = 0.85;
export const FAST_ANG = 1.85;

export type AxisName =
  | "yawL"
  | "yawR"
  | "pitchUp"
  | "pitchDn"
  | "rollL"
  | "rollR"
  | "left"
  | "right"
  | "up"
  | "down"
  | "fwd"
  | "back";

export class TapAxis {
  taps = 0;
  lastAt = -10;
  held = false;
  holdT = 0;
  cruise = 0;
  private nudge = false;

  down(t: number, fastOnDouble = false) {
    this.held = true;
    this.holdT = 0;
    if (t - this.lastAt < COMBO_MS) this.taps += 1;
    else this.taps = 1;
    this.lastAt = t;
    if (this.taps >= 3 || (fastOnDouble && this.taps >= 2)) {
      this.cruise = 2;
      this.nudge = false;
    } else if (this.taps === 2) {
      this.cruise = 1;
      this.nudge = false;
    }
  }

  up() {
    if (this.held && this.holdT < HOLD_MS && this.taps === 1 && this.cruise === 0) {
      this.nudge = true;
    }
    this.held = false;
    this.holdT = 0;
  }

  /** 0 none, -1 nudge pulse, 1 cruise, 2 fast. Injected holds are treated as 1. */
  sample(dt: number, injected: boolean): number {
    if (injected) {
      this.holdT += dt;
      return 1;
    }
    if (this.held) {
      this.holdT += dt;
      if (this.holdT >= HOLD_MS) return this.cruise === 2 ? 2 : 1;
    }
    if (this.cruise === 2) return 2;
    if (this.cruise === 1) return 1;
    if (this.nudge) {
      this.nudge = false;
      return -1;
    }
    return 0;
  }

  stop() {
    this.cruise = 0;
    this.nudge = false;
  }
}

export const AXIS_KEYS: Record<AxisName, string[]> = {
  yawL: ["KeyU", "KeyA", "ArrowLeft"],
  yawR: ["KeyO", "KeyD", "ArrowRight"],
  pitchUp: ["Comma", "KeyM"],
  pitchDn: ["KeyI"],
  rollL: ["KeyU"],
  rollR: ["KeyO"],
  left: ["KeyH"],
  right: ["KeyL"],
  up: ["KeyK", "ArrowUp"],
  down: ["KeyJ", "ArrowDown"],
  fwd: ["Space", "KeyW"],
  back: ["Space"], // only with shift — handled in InputMap
};

export class InputMap {
  readonly keys = new Set<string>();
  injected = new Set<string>();
  shift = false;
  injectedShift = false;
  readonly axes: Record<AxisName, TapAxis> = {
    yawL: new TapAxis(),
    yawR: new TapAxis(),
    pitchUp: new TapAxis(),
    pitchDn: new TapAxis(),
    rollL: new TapAxis(),
    rollR: new TapAxis(),
    left: new TapAxis(),
    right: new TapAxis(),
    up: new TapAxis(),
    down: new TapAxis(),
    fwd: new TapAxis(),
    back: new TapAxis(),
  };
  stopLatched = false;
  zoomIn = false;
  zoomOut = false;
  private t = 0;
  steerInject = 0;

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
    this.injectedShift = codes.includes("ShiftLeft") || codes.includes("ShiftRight");
  }

  setSteer(v: number) {
    this.steerInject = Math.max(-1, Math.min(1, v));
  }

  bind(target: Window | Document) {
    const down = (e: KeyboardEvent) => this.onDown(e);
    const up = (e: KeyboardEvent) => this.onUp(e);
    const clear = () => {
      this.keys.clear();
      this.shift = false;
      for (const a of Object.values(this.axes)) {
        if (a.held) a.up();
      }
      this.zoomIn = false;
      this.zoomOut = false;
    };
    target.addEventListener("keydown", down as EventListener);
    target.addEventListener("keyup", up as EventListener);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    return () => {
      target.removeEventListener("keydown", down as EventListener);
      target.removeEventListener("keyup", up as EventListener);
      window.removeEventListener("blur", clear);
    };
  }

  private onDown(e: KeyboardEvent) {
    if (e.repeat) return;
    const code = e.code;
    if (GAME_CODES.has(code)) e.preventDefault();
    this.shift = e.shiftKey;
    this.keys.add(code);

    if (code === "KeyS") {
      this.stopLatched = true;
      return;
    }
    if (code === "KeyZ") {
      if (e.shiftKey) this.zoomOut = true;
      else this.zoomIn = true;
      return;
    }

    if (code === "Space") {
      if (e.shiftKey) this.axes.back.down(this.t, true);
      else this.axes.fwd.down(this.t, true);
      return;
    }

    for (const [name, codes] of Object.entries(AXIS_KEYS) as [AxisName, string[]][]) {
      if (name === "back" || name === "fwd") continue;
      if (name === "rollL" || name === "rollR") continue;
      if (codes.includes(code)) this.axes[name].down(this.t);
    }
    if (code === "KeyU" || code === "KeyA") this.axes.rollL.down(this.t);
    if (code === "KeyO" || code === "KeyD") this.axes.rollR.down(this.t);
  }

  private onUp(e: KeyboardEvent) {
    const code = e.code;
    this.keys.delete(code);
    this.shift = e.shiftKey;

    if (code === "KeyZ") {
      this.zoomIn = false;
      this.zoomOut = false;
      return;
    }
    if (code === "Space") {
      this.axes.fwd.up();
      this.axes.back.up();
      return;
    }
    for (const [name, codes] of Object.entries(AXIS_KEYS) as [AxisName, string[]][]) {
      if (name === "back" || name === "fwd") continue;
      if (name === "rollL" || name === "rollR") continue;
      if (codes.includes(code)) this.axes[name].up();
    }
    if (code === "KeyU" || code === "KeyA") this.axes.rollL.up();
    if (code === "KeyO" || code === "KeyD") this.axes.rollR.up();
  }

  tick(dt: number) {
    this.t += dt;
  }

  held(code: string): boolean {
    return this.keys.has(code) || this.injected.has(code);
  }

  sample(name: AxisName, dt: number): number {
    const codes = AXIS_KEYS[name];
    let inj = false;
    if (name === "fwd") {
      inj = this.injected.has("Space") || this.injected.has("KeyW");
    } else if (name === "back") {
      inj =
        (this.injected.has("Space") && this.injectedShift) ||
        this.injected.has("ShiftLeft");
    } else {
      inj = codes.some((c) => this.injected.has(c));
    }
    return this.axes[name].sample(dt, inj);
  }

  stopAll() {
    for (const a of Object.values(this.axes)) a.stop();
    this.stopLatched = false;
  }
}

const GAME_CODES = new Set([
  "Space",
  "KeyH",
  "KeyJ",
  "KeyK",
  "KeyL",
  "KeyU",
  "KeyI",
  "KeyO",
  "Comma",
  "KeyM",
  "KeyZ",
  "KeyS",
  "KeyA",
  "KeyD",
  "KeyW",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

export function rateFromSample(s: number, nudge: number, cruise: number, fast: number): number {
  if (s === -1) return nudge;
  if (s === 2) return fast;
  if (s === 1) return cruise;
  return 0;
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getPose?: () => { x: number; y: number; z: number; yaw: number; pitch: number };
  getCallsign?: () => string;
  applySpawn?: (idx: number) => void;
  setCallsign?: (name: string) => void;
  setSteer: (v: number) => void;
  setKeys: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}
