import { useMemo } from "react";
import { MAJOR, ORBIT, heliocentric, planetRPx } from "@/game/orbits";
import { BODIES, type BodyId } from "@/game/bodies";
import { useFlight } from "@/game/store";

const VB = 200;
const CX = 100;
const CY = 100;

function rOrbit(au: number) {
  return 14 + Math.pow(Math.max(0.05, au), 0.38) / Math.pow(30.07, 0.38) * 82;
}

export function TripMap({
  from,
  to,
  left,
  days,
}: {
  from: BodyId;
  to: BodyId | null;
  left: number;
  days: number;
}) {
  const timeMode = useFlight((s) => s.timeMode);
  const simOffset = useFlight((s) => s.simOffset);
  const now = useMemo(() => Date.now(), [left]);
  const ms = timeMode === "sim" ? now + simOffset : now;
  const u = days <= 0 ? 1 : 1 - left / days;

  const bodies = MAJOR.map((id) => {
    const h = heliocentric(id, ms);
    const r = rOrbit(h.au);
    return {
      id,
      x: CX + Math.cos(h.lon) * r,
      y: CY + Math.sin(h.lon) * r,
      pr: planetRPx(id),
      name: BODIES[id].name,
    };
  });
  const earth = bodies.find((b) => b.id === "earth")!;
  const moonH = heliocentric("moon", ms);
  const moonR = 7;
  const moon = {
    x: earth.x + Math.cos(moonH.lon) * moonR,
    y: earth.y + Math.sin(moonH.lon) * moonR,
  };

  const origin = bodies.find((b) => b.id === from) ?? earth;
  const dest = to ? bodies.find((b) => b.id === to) : null;
  const ship = dest
    ? {
        x: origin.x + (dest.x - origin.x) * u,
        y: origin.y + (dest.y - origin.y) * u,
      }
    : origin;

  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 w-[min(94vw,22rem)] -translate-x-1/2 rounded-lg border border-border bg-surface p-3">
      <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
        Solar system · {timeMode === "sim" ? "sim epoch" : "now"}
      </p>
      <svg viewBox={`0 0 ${VB} ${VB}`} className="mt-1 size-full text-fg" aria-label="Solar path">
        {MAJOR.map((id) => {
          const r = rOrbit(ORBIT[id].au);
          return (
            <circle
              key={id}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.18"
              strokeWidth="0.4"
            />
          );
        })}
        <image href="/planets/sun-disk.png" x={CX - 8} y={CY - 8} width="16" height="16" />
        {bodies.map((b) => (
          <g key={b.id}>
            {b.id === "saturn" ? (
              <ellipse
                cx={b.x}
                cy={b.y}
                rx={b.pr * 2.1}
                ry={b.pr * 0.55}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="0.6"
              />
            ) : null}
            <image
              href={ORBIT[b.id].disk}
              x={b.x - b.pr}
              y={b.y - b.pr}
              width={b.pr * 2}
              height={b.pr * 2}
            />
            {b.id === from || b.id === to ? (
              <text
                x={b.x}
                y={b.y + b.pr + 4.2}
                textAnchor="middle"
                fill="currentColor"
                fontSize="3.2"
                opacity="0.75"
              >
                {b.name}
              </text>
            ) : null}
          </g>
        ))}
        <image href="/planets/moon-disk.png" x={moon.x - 1.6} y={moon.y - 1.6} width="3.2" height="3.2" />
        {dest ? (
          <line
            x1={origin.x}
            y1={origin.y}
            x2={dest.x}
            y2={dest.y}
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="2 1.5"
            strokeWidth="0.5"
          />
        ) : null}
        <circle cx={ship.x} cy={ship.y} r="1.6" fill="currentColor" />
        <circle cx={ship.x} cy={ship.y} r="2.6" fill="none" stroke="currentColor" strokeWidth="0.4" />
      </svg>
      <p className="mt-1 text-[11px] text-subtle">
        NASA / JPL / USGS maps · planets at J2000 mean longitude for this clock.
      </p>
    </div>
  );
}
