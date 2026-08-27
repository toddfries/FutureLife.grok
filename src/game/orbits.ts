import { BODIES, type BodyId } from "./bodies";

/** J2000.0 mean orbital elements — circular, ecliptic. Classroom-real, NASA periods. */
export type OrbitEl = {
  au: number;
  period: number;
  /** Mean longitude at J2000.0, degrees. */
  L0: number;
  /** Sidereal spin days. Negative = retrograde. */
  spin: number;
  radiusKm: number;
  map: string;
  disk: string;
};

export const ORBIT: Record<BodyId, OrbitEl> = {
  mercury: { au: 0.387, period: 87.969, L0: 252.251, spin: 58.646, radiusKm: 2440, map: "/planets/mercury.jpg", disk: "/planets/mercury-disk.png" },
  venus: { au: 0.723, period: 224.701, L0: 181.98, spin: -243.025, radiusKm: 6052, map: "/planets/venus.jpg", disk: "/planets/venus-disk.png" },
  earth: { au: 1, period: 365.256, L0: 100.464, spin: 0.997, radiusKm: 6371, map: "/planets/earth.jpg", disk: "/planets/earth-disk.png" },
  moon: { au: 0.00257, period: 27.3217, L0: 135.27, spin: 27.322, radiusKm: 1737, map: "/planets/moon.jpg", disk: "/planets/moon-disk.png" },
  mars: { au: 1.524, period: 686.98, L0: 355.453, spin: 1.026, radiusKm: 3390, map: "/planets/mars.jpg", disk: "/planets/mars-disk.png" },
  jupiter: { au: 5.203, period: 4332.59, L0: 34.404, spin: 0.414, radiusKm: 69911, map: "/planets/jupiter.jpg", disk: "/planets/jupiter-disk.png" },
  saturn: { au: 9.537, period: 10759.22, L0: 49.944, spin: 0.444, radiusKm: 58232, map: "/planets/saturn.jpg", disk: "/planets/saturn-disk.png" },
  uranus: { au: 19.191, period: 30685.4, L0: 313.232, spin: -0.718, radiusKm: 25362, map: "/planets/uranus.jpg", disk: "/planets/uranus-disk.png" },
  neptune: { au: 30.069, period: 60189, L0: 304.88, spin: 0.671, radiusKm: 24622, map: "/planets/neptune.jpg", disk: "/planets/neptune-disk.png" },
};

const J2000 = Date.UTC(2000, 0, 1, 12);

export function daysSinceJ2000(ms: number) {
  return (ms - J2000) / 86400000;
}

/** Heliocentric ecliptic longitude, radians, for a circular orbit. Moon is around Earth. */
export function heliocentric(id: BodyId, ms: number): { x: number; y: number; lon: number; au: number } {
  const d = daysSinceJ2000(ms);
  if (id === "moon") {
    const e = heliocentric("earth", ms);
    const o = ORBIT.moon;
    const lon = ((o.L0 + (360 * d) / o.period) % 360) * (Math.PI / 180);
    const au = 0.00257;
    return {
      x: e.x + Math.cos(lon) * au,
      y: e.y + Math.sin(lon) * au,
      lon,
      au: Math.hypot(e.x + Math.cos(lon) * au, e.y + Math.sin(lon) * au),
    };
  }
  const o = ORBIT[id];
  const lon = ((o.L0 + (360 * d) / o.period) % 360) * (Math.PI / 180);
  return { x: Math.cos(lon) * o.au, y: Math.sin(lon) * o.au, lon, au: o.au };
}

export function spinLon(id: BodyId, ms: number) {
  const o = ORBIT[id];
  const d = daysSinceJ2000(ms);
  return ((d / o.spin) % 1) * Math.PI * 2;
}

export const MAJOR: BodyId[] = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

export function planetRPx(id: BodyId) {
  const km = ORBIT[id].radiusKm;
  return 2.2 + Math.log10(km) * 1.15;
}

export { BODIES };
