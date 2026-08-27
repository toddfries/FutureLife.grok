import { useEffect, useState } from "react";
import { Map, Rocket, UserRound, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripMap } from "@/components/trip-map";
import { BODIES, BODY_LIST, daysBetween, type BodyId } from "@/game/bodies";
import { engineHandle } from "@/game/handle";
import { useFlight } from "@/game/store";

export function LaunchHud() {
  const playing = useFlight((s) => s.playing);
  const mission = useFlight((s) => s.mission);
  const mapOpen = useFlight((s) => s.mapOpen);
  const setMapOpen = useFlight((s) => s.setMapOpen);
  const body = useFlight((s) => s.currentBody);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!mission) return;
    if (mission.phase === "approach" || (mission.phase === "cruise" && mission.cruiseLeft <= 20)) {
      setMapOpen(false);
    }
  }, [mission?.phase, mission?.cruiseLeft, setMapOpen]);

  if (!playing || !mission) return null;

  const showPicker = mission.padMenu || mission.phase === "orbit";
  const cine =
    mission.phase !== "fly" && mission.phase !== "eva" && mission.phase !== "orbit";
  const showTrip = mission.phase === "cruise";
  const showFuel = mission.phase === "fuel" || mission.fueling;
  const showApproach = mission.phase === "approach";
  const cruiseLeft = mission.cruiseLeft;
  const showMap = mapOpen && showTrip && cruiseLeft > 20;
  const gas = BODIES[body].gas;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {showPicker ? <PlanetPicker current={body} gas={gas} phase={mission.phase} /> : null}

      {cine ? (
        <div className="pointer-events-none absolute bottom-24 left-3 w-[min(100%-1.5rem,20rem)] rounded-lg border border-border bg-surface/95 px-3 py-2.5 sm:left-5">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
            Starship · {labelFor(mission.phase)}
          </p>
          {mission.callout ? (
            <p className="mt-1 text-xs leading-snug text-fg">{mission.callout}</p>
          ) : null}
          <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs text-fg tabular-nums">
            <div>
              <dt className="text-[11px] text-muted">Speed</dt>
              <dd>{fmt(mission.speedKm)} km/h</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">Altitude</dt>
              <dd>{mission.altKm.toFixed(1)} km</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">Distance</dt>
              <dd>{distLabel(mission.distKm)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">Engines</dt>
              <dd>{mission.engines}</dd>
            </div>
          </dl>
          {showFuel ? <FuelMeter value={mission.fuel} /> : null}
        </div>
      ) : null}

      {showApproach ? (
        <div className="pointer-events-none absolute top-28 left-1/2 z-10 w-[min(92vw,22rem)] -translate-x-1/2 rounded-lg border border-border bg-surface px-4 py-3 text-center sm:top-4">
          <p className="font-display text-lg text-fg">
            Approaching {mission.dest ? BODIES[mission.dest].name : "target"}
          </p>
          <p className="mt-1 font-mono text-sm text-muted tabular-nums">
            {mission.approachLeft > 0.2
              ? `Atmosphere in ${mission.approachLeft.toFixed(0)}s`
              : "Ready to enter atmosphere"}
          </p>
          <p className="mt-1 text-[11px] text-subtle">
            Tiny disk to interface — twenty seconds of real closing.
          </p>
        </div>
      ) : null}

      {showTrip ? (
        <div className="pointer-events-auto absolute top-28 left-1/2 z-10 w-[min(92vw,22rem)] -translate-x-1/2 rounded-lg border border-border bg-surface px-4 py-3 text-center sm:top-4">
          <p className="font-display text-lg text-fg">
            Trip of {Math.round(mission.tripDays)} days to {mission.dest ? BODIES[mission.dest].name : "—"}
          </p>
          <p className="mt-1 font-mono text-sm text-muted tabular-nums">
            {mission.tripLeft.toFixed(1)} days remaining
          </p>
          <p className="mt-1 text-[11px] text-subtle">Turn, tilt, zoom. Camera resets before approach.</p>
          {cruiseLeft > 20 ? (
            <Button
              variant="secondary"
              size="default"
              className="mt-2 h-11 px-3 text-xs"
              onClick={() => setMapOpen(!mapOpen)}
              aria-label="Overview map"
            >
              <Map className="size-4" />
              {mapOpen ? "Hide path" : "Watch journey"}
            </Button>
          ) : (
            <p className="mt-2 text-[11px] text-subtle">Map stowed · planet approach</p>
          )}
        </div>
      ) : null}

      {showMap ? <TripMap from={body} to={mission.dest} left={mission.tripLeft} days={mission.tripDays} /> : null}

      {mission.phase === "orbit" ? (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 z-10 -translate-x-1/2">
          <Button
            variant="default"
            size="default"
            className="h-11 px-4"
            onClick={() => engineHandle.current?.beginEva()}
          >
            <UserRound className="size-4" />
            Exit as astronaut
          </Button>
        </div>
      ) : null}

      {mission.phase === "eva" ? (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 z-10 -translate-x-1/2">
          <Button
            variant="default"
            size="default"
            className="h-11 px-4"
            onClick={() => engineHandle.current?.returnToShip()}
          >
            <Rocket className="size-4" />
            Return to Starship
          </Button>
        </div>
      ) : null}

      {cine || showPicker ? (
        <div className="pointer-events-auto absolute right-3 bottom-24 sm:right-5">
          <Button
            variant="secondary"
            size="icon"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              engineHandle.current?.setMuted(next);
            }}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FuelMeter({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="mt-2.5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Propellant</p>
        <p className="font-mono text-xs text-fg tabular-nums">{pct}%</p>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-label="Propellant"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="h-full rounded-full bg-fg transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-subtle">Near empty to full · five-second dock</p>
    </div>
  );
}

function labelFor(phase: string) {
  const map: Record<string, string> = {
    tanker: "rendezvous",
    fuel: "docked",
    undock: "undock",
    burn: "trans-burn",
    approach: "approach",
    clearpad: "pad clear",
    brake: "entry",
    land: "landing",
    lift: "liftoff",
    tilt: "pitch-over",
    sep: "hot-stage",
    board: "board",
    hold: "hold-down",
    cruise: "cruise",
  };
  return map[phase] ?? phase;
}

function PlanetPicker({
  current,
  gas,
  phase,
}: {
  current: BodyId;
  gas: boolean;
  phase: string;
}) {
  const dests = BODY_LIST.filter((id) => id !== current);
  const [pick, setPick] = useState<BodyId>(dests[0] ?? "mars");
  return (
    <div className="pointer-events-auto absolute bottom-24 left-3 w-[min(100%-1.5rem,16.5rem)] rounded-lg border border-border bg-surface p-3 sm:left-5">
      <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
        {phase === "orbit" ? "Next body" : "Board Starship"}
      </p>
      <p className="mt-1 text-xs text-subtle">
        {gas
          ? "Orbit only — pick a floor, or EVA first."
          : "Select a world, then Go. Autopilot boards the stack."}
      </p>
      <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
        {dests.map((id) => (
          <li key={id}>
            <button
              type="button"
              className={`flex h-11 w-full items-center justify-between rounded-md border px-2.5 text-left text-sm ${
                pick === id
                  ? "border-fg bg-surface-2 text-fg"
                  : "border-border bg-surface text-muted"
              }`}
              onClick={() => setPick(id)}
            >
              <span>{BODIES[id].name}</span>
              <span className="font-mono text-[11px] text-muted">
                {daysBetween(current, id)}d
                {BODIES[id].gas ? " · orbit" : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Button
        variant="default"
        size="default"
        className="mt-2 h-11 w-full"
        onClick={() => engineHandle.current?.beginGo(pick)}
      >
        Go
      </Button>
    </div>
  );
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function distLabel(km: number) {
  if (km <= 0) return "—";
  if (km > 1e6) return `${(km / 1.496e8).toFixed(3)} AU`;
  return `${Math.round(km).toLocaleString()} km`;
}
