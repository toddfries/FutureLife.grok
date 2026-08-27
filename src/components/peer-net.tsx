import { useCallback, useEffect, useRef, useState } from "react";
import { engineHandle } from "@/game/handle";
import { useP2PRoom } from "@/lib/multiplayer/use-p2p-room";
import { useFlight, type RemotePilot } from "@/game/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatPilotName } from "@/lib/pilot-name";

type Pose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  name: string;
  color?: number;
  lift?: string | null;
};

export function PeerNet() {
  const { user, isPending } = useCurrentUserState();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!isPending) return;
    const t = window.setTimeout(() => setWaited(true), 1200);
    return () => window.clearTimeout(t);
  }, [isPending]);

  const ready = !isPending || waited;
  const requested = ready ? formatPilotName(user) : "";
  const live = useRef(new Set<string>());

  const onSelf = useCallback((you: { name: string; spawn: number }) => {
    const first = useFlight.getState().spawnIdx < 0;
    useFlight.getState().patch({ callsign: you.name, spawnIdx: you.spawn });
    if (first) engineHandle.current?.applySpawn(you.spawn);
    engineHandle.current?.setCallsign(you.name);
  }, []);

  const p2p = useP2PRoom({
    name: requested,
    enabled: ready,
    onSelf,
  });

  useEffect(() => {
    useFlight.getState().patch({ selfId: p2p.selfId });
  }, [p2p.selfId]);

  useEffect(() => {
    live.current = new Set(p2p.peers.map((p) => p.id));
    const eng = engineHandle.current;
    if (eng && typeof eng.pruneRemotes === "function") eng.pruneRemotes(live.current);
    const remotes = useFlight.getState().remotes.filter((r) => live.current.has(r.id));
    useFlight.getState().patch({ remotes });
  }, [p2p.peers]);

  useEffect(
    () =>
      p2p.onMessage((from, data, channel) => {
        if (channel !== "state" || !data || typeof data !== "object") return;
        const d = data as Pose;
        if (![d.x, d.y, d.z, d.yaw].every((n) => typeof n === "number")) return;
        const tag = d.name || from;
        engineHandle.current?.setRemote(from, tag, d);
        if (d.lift) engineHandle.current?.observeLift();
        const next: RemotePilot = {
          id: from,
          kind: "player",
          name: tag,
          x: d.x,
          y: d.y,
          z: d.z,
          yaw: d.yaw,
          pitch: d.pitch,
          roll: d.roll,
          color: "color" in d && typeof d.color === "number" ? d.color : undefined,
        };
        const cur = useFlight.getState().remotes;
        const i = cur.findIndex((r) => r.id === from);
        const remotes = i >= 0 ? cur.map((r, k) => (k === i ? next : r)) : [...cur, next];
        useFlight.getState().patch({ remotes });
      }),
    [p2p.onMessage],
  );

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 50) return;
      last = now;
      const eng = engineHandle.current;
      if (!eng) return;
      const s = eng.snapshot();
      const name = useFlight.getState().callsign || "Guest";
      const color = useFlight.getState().hullColor;
      p2p.broadcast({ ...s, name, color } satisfies Pose);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [p2p.broadcast]);

  return null;
}
