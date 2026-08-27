/** 8 major planets + Moon. Distances and days are classroom-real, not ephemeris. */
export type BodyId =
  | "mercury"
  | "venus"
  | "earth"
  | "moon"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type Body = {
  id: BodyId
  name: string
  au: number
  daysFromEarth: number
  color: number
  land: number
  ocean: number
  cloud: number
  fog: number
  gas: boolean
  /** Superheavy required for surface lift. Only Earth in this sim. */
  booster: boolean
  /** Starship can take off from the surface on its own. */
  selfLaunch: boolean
  atmo: boolean
  /** Sky azimuth / altitude when viewed from Earth, radians. */
  az: number
  alt: number
  skyR: number
};

export const BODIES: Record<BodyId, Body> = {
  mercury: {
    id: "mercury",
    name: "Mercury",
    au: 0.39,
    daysFromEarth: 80,
    color: 0x8a7a68,
    land: 0x6e6256,
    ocean: 0x2a2420,
    cloud: 0x000000,
    fog: 0x1a1612,
    gas: false,
    booster: false,
    selfLaunch: true,
    atmo: false,
    az: 0.55,
    alt: 0.22,
    skyR: 10,
  },
  venus: {
    id: "venus",
    name: "Venus",
    au: 0.72,
    daysFromEarth: 150,
    color: 0xc4a86a,
    land: 0xb08a48,
    ocean: 0x8a7038,
    cloud: 0xe8d9b0,
    fog: 0xc4b07a,
    gas: false,
    booster: false,
    selfLaunch: true,
    atmo: true,
    az: 0.95,
    alt: 0.28,
    skyR: 16,
  },
  earth: {
    id: "earth",
    name: "Earth",
    au: 1,
    daysFromEarth: 0,
    color: 0x3d7a62,
    land: 0x3a6a38,
    ocean: 0x15616d,
    cloud: 0xe8f0f2,
    fog: 0x7aa8b0,
    gas: false,
    booster: true,
    selfLaunch: false,
    atmo: true,
    az: 0,
    alt: -1,
    skyR: 22,
  },
  moon: {
    id: "moon",
    name: "Moon",
    au: 0.00257,
    daysFromEarth: 3,
    color: 0xc9c4b8,
    land: 0x9a958c,
    ocean: 0x3a3834,
    cloud: 0x000000,
    fog: 0x2a2824,
    gas: false,
    booster: false,
    selfLaunch: true,
    atmo: false,
    az: 5.2,
    alt: 0.42,
    skyR: 22,
  },
  mars: {
    id: "mars",
    name: "Mars",
    au: 1.52,
    daysFromEarth: 90,
    color: 0xb85a38,
    land: 0xa04a2a,
    ocean: 0x5a3020,
    cloud: 0xe8c8b0,
    fog: 0x8a5a48,
    gas: false,
    booster: false,
    selfLaunch: true,
    atmo: true,
    az: 3.7,
    alt: 0.32,
    skyR: 14,
  },
  jupiter: {
    id: "jupiter",
    name: "Jupiter",
    au: 5.2,
    daysFromEarth: 600,
    color: 0xc4a06a,
    land: 0xb89050,
    ocean: 0x8a6030,
    cloud: 0xe8d0a0,
    fog: 0x4a3820,
    gas: true,
    booster: false,
    selfLaunch: false,
    atmo: true,
    az: 2.4,
    alt: 0.36,
    skyR: 36,
  },
  saturn: {
    id: "saturn",
    name: "Saturn",
    au: 9.5,
    daysFromEarth: 1200,
    color: 0xd4c48a,
    land: 0xc8b878,
    ocean: 0x8a7850,
    cloud: 0xf0e8c8,
    fog: 0x4a4030,
    gas: true,
    booster: false,
    selfLaunch: false,
    atmo: true,
    az: 4.1,
    alt: 0.24,
    skyR: 30,
  },
  uranus: {
    id: "uranus",
    name: "Uranus",
    au: 19.2,
    daysFromEarth: 2600,
    color: 0x7ec8d0,
    land: 0x5aa8b0,
    ocean: 0x2a6a78,
    cloud: 0xc8e8ec,
    fog: 0x1a3a42,
    gas: true,
    booster: false,
    selfLaunch: false,
    atmo: true,
    az: 1.6,
    alt: 0.18,
    skyR: 20,
  },
  neptune: {
    id: "neptune",
    name: "Neptune",
    au: 30.1,
    daysFromEarth: 4100,
    color: 0x3a62c4,
    land: 0x2a4a9a,
    ocean: 0x1a306a,
    cloud: 0xa0b8e8,
    fog: 0x121a38,
    gas: true,
    booster: false,
    selfLaunch: false,
    atmo: true,
    az: 5.8,
    alt: 0.14,
    skyR: 18,
  },
};

export const BODY_LIST: BodyId[] = [
  "moon",
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

export function daysBetween(a: BodyId, b: BodyId): number {
  if (a === b) return 0;
  const moonLeg = (x: BodyId, y: BodyId) => {
    if (x === "moon") return y === "earth" ? 3 : BODIES[y].daysFromEarth + 3;
    if (y === "moon") return x === "earth" ? 3 : BODIES[x].daysFromEarth + 3;
    return Math.abs(BODIES[x].daysFromEarth - BODIES[y].daysFromEarth) || 40;
  };
  return moonLeg(a, b);
}

/** Compressed cruise seconds for a trip of `days`. */
export function cruiseSeconds(days: number): number {
  return Math.min(36, Math.max(14, 11 + Math.log(Math.max(1, days)) * 3.4));
}

export function skyDir(id: BodyId): { x: number; y: number; z: number } {
  const b = BODIES[id];
  const c = Math.cos(b.alt);
  return {
    x: c * Math.sin(b.az),
    y: Math.sin(b.alt),
    z: -c * Math.cos(b.az),
  };
}
