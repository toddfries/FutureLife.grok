import { useEffect, useState } from "react";
import { Mountain, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlight } from "@/game/store";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";

const GAGARIN_MS = new Date("1961-04-12T00:00:00Z").getTime();

export function Hud() {
  const playing = useFlight((s) => s.playing);
  const altitude = useFlight((s) => s.altitude);
  const speed = useFlight((s) => s.speed);
  const heading = useFlight((s) => s.heading);
  const detail = useFlight((s) => s.detail);
  const setDetail = useFlight((s) => s.setDetail);
  const cruiseLabel = useFlight((s) => s.cruiseLabel);
  const braking = useFlight((s) => s.braking);
  const generating = useFlight((s) => s.generating);
  const chunksLoaded = useFlight((s) => s.chunksLoaded);
  const chunksQueued = useFlight((s) => s.chunksQueued);
  const fps = useFlight((s) => s.fps);
  const cpuPct = useFlight((s) => s.cpuPct);
  const callsign = useFlight((s) => s.callsign);
  const setHelpOpen = useFlight((s) => s.setHelpOpen);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Slash" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHelpOpen(!useFlight.getState().helpOpen);
      }
      if (e.code === "Escape" && useFlight.getState().playing) {
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setHelpOpen]);

  useEffect(() => {
    if (!playing) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  if (!playing) return null;

  const tz = tzOffset(now);
  const fpsLabel = fps > 0 ? `${Math.round(fps)} fps` : "— fps";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-3 sm:p-5">
      <div className="pointer-events-auto flex items-start justify-between gap-3">
        <div className="rounded-lg border border-border bg-surface px-3 py-2">
          <p className="font-display text-lg leading-tight tracking-display text-fg">
            FutureLife{" "}
            <span className="font-mono text-[11px] font-normal text-muted tabular-nums">
              {fpsLabel}
              {cpuPct > 1 ? " · load" : ""}
            </span>
          </p>
          <p className="font-mono text-[11px] text-muted tabular-nums">
            {fmt(altitude)}m · {fmt(speed)} u/s · {normHead(heading)}°
            {callsign ? ` · ${callsign}` : ""}
          </p>
          <p className="font-mono text-[11px] text-subtle">
            {braking ? "coasting to halt" : cruiseLabel}
            {generating ? ` · weaving ${chunksQueued}` : ` · ${chunksLoaded} isles`}
          </p>
          <table className="mt-2 w-full border-collapse border-t border-border">
            <thead>
              <tr>
                <th className="pr-4 pt-1.5 text-left text-[11px] font-medium tracking-[0.12em] text-muted whitespace-nowrap">
                  date {tz}
                </th>
                <th className="pt-1.5 text-left text-[11px] font-medium tracking-[0.12em] text-muted">
                  stardate
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-4 font-mono text-[11px] text-fg tabular-nums whitespace-nowrap">
                  {localStamp(now)}
                </td>
                <td className="font-mono text-[11px] text-fg tabular-nums whitespace-nowrap">
                  {stardateOf(now)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <Button
                variant="secondary"
                size="default"
                className="h-11 px-3 text-xs"
                onClick={() => {
                  const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");
                  if (x) void signIn(x.providerId, { callbackURL: "/" });
                }}
              >
                Sign in with X
              </Button>
            </SignedOut>
          </div>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Pause and controls"
            onClick={() => setHelpOpen(true)}
          >
            <Pause className="size-4" />
          </Button>
        </div>
      </div>

      <div className="pointer-events-auto absolute top-3 right-3 hidden w-56 rounded-lg border border-border bg-surface p-3 sm:top-5 sm:right-16 sm:block">
        <label
          htmlFor="detail"
          className="flex items-center justify-between text-xs text-muted"
        >
          <span className="inline-flex items-center gap-1.5">
            <Mountain className="size-3.5" aria-hidden />
            World detail
          </span>
          <span className="font-mono tabular-nums text-fg">
            {Math.round(detail * 100)}
          </span>
        </label>
        <input
          id="detail"
          type="range"
          min={0}
          max={100}
          value={Math.round(detail * 100)}
          onChange={(e) => setDetail(Number(e.target.value) / 100)}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-primary"
        />
        <p className="mt-1.5 text-[11px] leading-snug text-subtle">
          Planet skin is smooth. Voxels are local sky. Slide up for finer isles.
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-24 left-1/2 hidden -translate-x-1/2 sm:block">
        <div className="h-5 w-px bg-fg/40" />
      </div>
    </div>
  );
}

function fmt(n: number) {
  return Math.round(n).toString();
}

function normHead(deg: number) {
  const d = ((deg % 360) + 360) % 360;
  return Math.round(d);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function tzOffset(date: Date) {
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return `${sign}${pad2(Math.floor(abs / 60))}${pad2(abs % 60)}`;
}

function localStamp(date: Date) {
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  );
}

function stardateOf(date: Date) {
  const stardate = (date.getTime() - GAGARIN_MS) / 600000000;
  return stardate.toFixed(5);
}
