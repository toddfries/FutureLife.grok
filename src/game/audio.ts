/**
 * Procedural Web Audio — unlock on the first gesture (Start flight).
 * No sample files; oscillators + noise keep the bundle small and iOS-safe.
 */

type Bus = { rumble: GainNode; hiss: GainNode; sfx: GainNode; master: GainNode };

export class GameAudio {
  private ctx: AudioContext | null = null;
  private bus: Bus | null = null;
  private noise: AudioBuffer | null = null;
  private rumbleOsc: OscillatorNode[] = [];
  private hissSrc: AudioBufferSourceNode | null = null;
  private lastPhase = "";
  muted = false;
  private masterWant = 0.55;
  private visWired = false;

  unlock() {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      this.buildGraph();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.wireVisibility();
  }

  setMuted(v: boolean) {
    this.muted = v;
    const b = this.bus;
    const ctx = this.ctx;
    if (!b || !ctx) return;
    b.master.gain.setTargetAtTime(v ? 0 : this.masterWant, ctx.currentTime, 0.04);
  }

  sync(phase: string, fueling: boolean) {
    if (phase !== this.lastPhase) {
      this.onPhase(phase);
      this.lastPhase = phase;
    }
    if (fueling) this.ensureHiss();
    else this.stopHiss();
    const rumble =
      phase === "lift" ||
      phase === "tilt" ||
      phase === "burn" ||
      phase === "land" ||
      phase === "hold";
    if (rumble) this.ensureRumble(phase === "hold" ? 0.08 : phase === "land" ? 0.22 : 0.42);
    else this.stopRumble();
  }

  dispose() {
    this.stopRumble();
    this.stopHiss();
    void this.ctx?.close();
    this.ctx = null;
    this.bus = null;
  }

  private onPhase(phase: string) {
    switch (phase) {
      case "board":
        this.blip(880, 0.07);
        this.blip(660, 0.08, 0.08);
        break;
      case "hold":
        this.blip(520, 0.12);
        break;
      case "lift":
        this.roar(1.4);
        break;
      case "sep":
        this.clank();
        break;
      case "tanker":
        this.radio();
        this.puff();
        break;
      case "fuel":
        this.clank();
        this.blip(440, 0.1);
        break;
      case "undock":
        this.clank();
        this.puff();
        break;
      case "burn":
        this.roar(1.1);
        break;
      case "approach":
        this.whoosh(1.8);
        break;
      case "clearpad":
        this.radio();
        this.blip(390, 0.14);
        break;
      case "brake":
        this.whoosh(0.9);
        break;
      case "land":
        this.roar(0.7);
        break;
      case "fly":
        if (this.lastPhase === "land") this.thud();
        break;
      default:
        break;
    }
  }

  private buildGraph() {
    const ctx = this.ctx!;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.masterWant;
    const rumble = ctx.createGain();
    rumble.gain.value = 0;
    const hiss = ctx.createGain();
    hiss.gain.value = 0;
    const sfx = ctx.createGain();
    sfx.gain.value = 0.8;
    rumble.connect(master);
    hiss.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);
    this.bus = { rumble, hiss, sfx, master };
    this.noise = makeNoise(ctx, 1.2);
  }

  private wireVisibility() {
    if (this.visWired) return;
    this.visWired = true;
    const onVis = () => {
      if (document.hidden) return;
      if (this.ctx?.state === "suspended") void this.ctx.resume();
    };
    document.addEventListener("visibilitychange", onVis);
  }

  private ensureRumble(level: number) {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus) return;
    if (this.rumbleOsc.length === 0) {
      for (const f of [52, 86, 118]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.18;
        o.connect(g);
        g.connect(bus.rumble);
        o.start();
        this.rumbleOsc.push(o);
      }
    }
    bus.rumble.gain.setTargetAtTime(level, ctx.currentTime, 0.2);
  }

  private stopRumble() {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus) return;
    bus.rumble.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  }

  private ensureHiss() {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus || !this.noise || this.hissSrc) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = 1800;
    filt.Q.value = 0.7;
    src.connect(filt);
    filt.connect(bus.hiss);
    src.start();
    this.hissSrc = src;
    bus.hiss.gain.setTargetAtTime(0.18, ctx.currentTime, 0.15);
  }

  private stopHiss() {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus) return;
    bus.hiss.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    const src = this.hissSrc;
    if (src) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      src.disconnect();
      this.hissSrc = null;
    }
  }

  private sfxGain(v: number) {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus) return null;
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(bus.sfx);
    return g;
  }

  private blip(freq: number, dur: number, delay = 0) {
    const ctx = this.ctx;
    const g = this.sfxGain(0.12);
    if (!ctx || !g) return;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    o.connect(g);
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private clank() {
    const ctx = this.ctx;
    const g = this.sfxGain(0.28);
    if (!ctx || !g || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filt = ctx.createBiquadFilter();
    filt.type = "highpass";
    filt.frequency.value = 900;
    src.connect(filt);
    filt.connect(g);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.start(t);
    src.stop(t + 0.2);
    this.blip(180, 0.09);
  }

  private puff() {
    const ctx = this.ctx;
    const g = this.sfxGain(0.16);
    if (!ctx || !g || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 700;
    src.connect(filt);
    filt.connect(g);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.start(t);
    src.stop(t + 0.24);
  }

  private roar(dur: number) {
    const ctx = this.ctx;
    const g = this.sfxGain(0.35);
    if (!ctx || !g || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 420;
    src.connect(filt);
    filt.connect(g);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.01, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private whoosh(dur: number) {
    const ctx = this.ctx;
    const g = this.sfxGain(0.22);
    if (!ctx || !g || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = 600;
    src.connect(filt);
    filt.connect(g);
    const t = ctx.currentTime;
    filt.frequency.setValueAtTime(400, t);
    filt.frequency.exponentialRampToValueAtTime(2400, t + dur);
    g.gain.setValueAtTime(0.05, t);
    g.gain.linearRampToValueAtTime(0.28, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private radio() {
    this.blip(1240, 0.05);
    this.blip(1480, 0.05, 0.07);
    this.blip(1100, 0.08, 0.14);
  }

  private thud() {
    const ctx = this.ctx;
    const g = this.sfxGain(0.3);
    if (!ctx || !g) return;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 70;
    o.connect(g);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.26);
    o.start(t);
    o.stop(t + 0.3);
  }
}

function makeNoise(ctx: AudioContext, seconds: number) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
