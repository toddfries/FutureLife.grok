import { useEffect, useRef } from "react";
import { engineHandle } from "@/game/handle";
import { useFlight } from "@/game/store";

export function WorldStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let unsub: (() => void) | undefined;

    void import("@/game/engine").then(({ Engine }) => {
      if (disposed || !canvasRef.current) return;
      const engine = new Engine(
        canvasRef.current,
        (p) => useFlight.getState().patch(p),
        useFlight.getState().detail,
      );
      engine.start();
      engineHandle.current = engine;
      const now = useFlight.getState();
      if (now.spawnIdx >= 0) engine.applySpawn(now.spawnIdx);
      if (now.callsign) engine.setCallsign(now.callsign);
      engine.setHullColor(now.hullColor);
      let prev = now;
      unsub = useFlight.subscribe((s) => {
        if (s.playing !== prev.playing) engine.setPlaying(s.playing);
        if (s.detail !== prev.detail) engine.setDetail(s.detail);
        if (s.spawnIdx >= 0 && prev.spawnIdx < 0) engine.applySpawn(s.spawnIdx);
        if (s.callsign && s.callsign !== prev.callsign) engine.setCallsign(s.callsign);
        if (s.hullColor !== prev.hullColor) engine.setHullColor(s.hullColor);
        prev = s;
      });
    });

    return () => {
      disposed = true;
      unsub?.();
      engineHandle.current?.dispose();
      engineHandle.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      className="absolute inset-0 size-full touch-none"
      data-theater="starship-v4"
      aria-label="FutureLife sky"
    />
  );
}
