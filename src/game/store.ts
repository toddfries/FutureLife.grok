import { create } from "zustand";
import type { GlobeDot } from "./planet";

export type RemotePilot = GlobeDot & {
  yaw: number;
  pitch: number;
  roll: number;
};

export type FlightHud = {
  playing: boolean;
  helpOpen: boolean;
  globeOpen: boolean;
  altitude: number;
  speed: number;
  heading: number;
  zoom: number;
  detail: number;
  seed: number;
  chunksLoaded: number;
  chunksQueued: number;
  braking: boolean;
  cruiseLabel: string;
  generating: boolean;
  fps: number;
  cpuPct: number;
  selfId: string;
  callsign: string;
  spawnIdx: number;
  remotes: RemotePilot[];
  sights: GlobeDot[];
  setPlaying: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  setGlobeOpen: (v: boolean) => void;
  setDetail: (v: number) => void;
  patch: (p: Partial<FlightHud>) => void;
};

const savedDetail = (() => {
  if (typeof window === "undefined") return 0;
  const n = Number(
    window.localStorage.getItem("futurelife.detail") ??
      window.localStorage.getItem("cloudroot.detail"),
  );
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
})();

export const useFlight = create<FlightHud>((set) => ({
  playing: false,
  helpOpen: false,
  globeOpen: true,
  altitude: 0,
  speed: 0,
  heading: 0,
  zoom: 22,
  detail: savedDetail,
  seed: 0,
  chunksLoaded: 0,
  chunksQueued: 0,
  braking: false,
  cruiseLabel: "still",
  generating: true,
  fps: 0,
  cpuPct: 0,
  selfId: "",
  callsign: "",
  spawnIdx: -1,
  remotes: [],
  sights: [],
  setPlaying: (playing) => set({ playing }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setGlobeOpen: (globeOpen) => set({ globeOpen }),
  setDetail: (detail) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("futurelife.detail", String(detail));
    }
    set({ detail });
  },
  patch: (p) => set(p),
}));
