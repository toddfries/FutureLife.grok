import { createFileRoute } from "@tanstack/react-router";
import { Hud } from "@/components/hud";
import { LaunchHud } from "@/components/launch-hud";
import { PeerNet } from "@/components/peer-net";
import { PlanetGlobe } from "@/components/planet-globe";
import { StartOverlay } from "@/components/start-overlay";
import { TouchPad } from "@/components/touch-pad";
import { WorldStage } from "@/components/world-stage";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="relative h-dvh overflow-hidden bg-bg text-fg">
      <h1 className="sr-only">FutureLife — fly the floating isles</h1>
      <WorldStage />
      <PeerNet />
      <Hud />
      <LaunchHud />
      <PlanetGlobe />
      <TouchPad />
      <StartOverlay />
    </main>
  );
}
