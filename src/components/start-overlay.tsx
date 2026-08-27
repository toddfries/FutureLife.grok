import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { engineHandle } from "@/game/handle";
import { useFlight } from "@/game/store";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const MOVE = [
  ["h / l", "strafe left / right"],
  ["k / j", "rise / descend"],
  ["Space", "fly forward"],
  ["Shift+Space", "fly back"],
  ["s", "stop — 2s coast if cruising"],
];

const LOOK = [
  ["u / a", "tilt left (turn + bank)"],
  ["o / d", "tilt right"],
  ["i", "tilt forward (nose down)"],
  [",", "tilt back (nose up)"],
  ["z / Z", "zoom in / out"],
];

export function StartOverlay() {
  const playing = useFlight((s) => s.playing);
  const helpOpen = useFlight((s) => s.helpOpen);
  const generating = useFlight((s) => s.generating);
  const callsign = useFlight((s) => s.callsign);
  const setPlaying = useFlight((s) => s.setPlaying);
  const setHelpOpen = useFlight((s) => s.setHelpOpen);
  const { isPending } = useCurrentUserState();

  if (playing && !helpOpen) return null;

  const enter = () => {
    engineHandle.current?.unlockAudio();
    setPlaying(true);
    setHelpOpen(false);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center p-4 sm:items-center sm:p-8">
      <div className="absolute inset-0 bg-bg/55" />
      <section
        className="relative w-full max-w-xl rounded-xl border border-border bg-surface p-5 shadow-overlay sm:p-8"
        role="dialog"
        aria-labelledby="futurelife-title"
      >
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          Floating archipelago
        </p>
        <h1
          id="futurelife-title"
          className="mt-2 font-display text-4xl font-medium tracking-display text-fg sm:text-5xl"
        >
          FutureLife
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-normal text-muted">
          A spherical gulf world. Fly a compressed-air roadster, then board the
          Superheavy stack at Starbase Louisiana and ride a Starship to the
          eight planets and the Moon. After stage sep a tanker docks for a
          five-second propellant fill, then you burn out. Approach takes
          twenty seconds — a spark growing to atmosphere. Remote towers get a
          pad-clear so you never land on a stacked ship. Time compresses so a
          90-day Mars trip is a short watch. Guests are numbered in join
          order; sign in with X to stamp your @handle on the plates. Paint the
          hull — everyone sees it.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-fg">
            {callsign
              ? `You are ${callsign}`
              : isPending
                ? "Checking X sign-in…"
                : "Claiming a guest number…"}
          </p>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Button
              variant="secondary"
              onClick={() => {
                const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");
                if (x) void signIn(x.providerId, { callbackURL: "/" });
              }}
            >
              Sign in with X
            </Button>
          </SignedOut>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <KeyTable title="Move" rows={MOVE} />
          <KeyTable title="Tilt and look" rows={LOOK} />
        </div>
        <p className="mt-4 text-xs leading-snug text-subtle">
          Single tap nudges. Double tap holds a cruise. Triple tap is the fast
          cruise. Space is the exception: double-tap Space for fast flight.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button size="lg" onClick={enter} className="w-full sm:w-auto">
            <Compass className="size-4" aria-hidden />
            {playing ? "Resume flight" : "Start flight"}
          </Button>
          {playing ? (
            <Button
              variant="secondary"
              onClick={() => {
                engineHandle.current?.newWorld();
                setHelpOpen(false);
              }}
            >
              New world
            </Button>
          ) : null}
        </div>
        <p className="mt-3 font-mono text-xs text-subtle">
          {generating ? "Weaving nearby isles…" : "Terrain ready"} · slash opens
          this card
        </p>
      </section>
    </div>
  );
}

function KeyTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div>
      <h2 className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
        {title}
      </h2>
      <ul className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-baseline justify-between gap-3 text-sm">
            <kbd className="rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg">
              {k}
            </kbd>
            <span className="text-right text-muted">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
