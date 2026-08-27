import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { engineHandle } from "@/game/handle";
import { makeEarthTexture, worldToLatLon } from "@/game/planet";
import { useFlight } from "@/game/store";
import { BODIES } from "@/game/bodies";

export function PlanetGlobe() {
  const playing = useFlight((s) => s.playing);
  const open = useFlight((s) => s.globeOpen);
  const setOpen = useFlight((s) => s.setGlobeOpen);
  const seed = useFlight((s) => s.seed);
  const body = useFlight((s) => s.currentBody);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastTap = useRef<{ id: string; t: number }>({ id: "", t: 0 });

  useEffect(() => {
    if (!playing || !open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(196, 196, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
    camera.position.set(0, 0.6, 4.6);
    const tex = makeEarthTexture(512, 256, seed || 1, body);
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 48, 32),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    scene.add(new THREE.HemisphereLight(0xcfe8e4, 0x24322c, 1.1));
    const sun = new THREE.DirectionalLight(0xfff1d6, 0.9);
    sun.position.set(2, 2, 3);
    scene.add(sun);
    const pivot = new THREE.Group();
    scene.add(pivot);
    pivot.add(globe);

    const dots = new THREE.Group();
    pivot.add(dots);
    const dotGeo = new THREE.SphereGeometry(0.05, 8, 6);
    const mats = {
      self: new THREE.MeshBasicMaterial({ color: 0xe8e4dc }),
      player: new THREE.MeshBasicMaterial({ color: 0x3b82f6 }),
      sight: new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
    };
    const pool: THREE.Mesh[] = [];
    const tmp = new THREE.Vector3();

    let drag = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      drag = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      pivot.rotation.y += (e.clientX - lastX) * 0.01;
      pivot.rotation.x += (e.clientY - lastY) * 0.01;
      pivot.rotation.x = Math.max(-1.1, Math.min(1.1, pivot.rotation.x));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      drag = false;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onClick = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(dots.children, false);
      const hit = hits[0];
      if (!hit) return;
      const id = hit.object.userData.id as string;
      const now = performance.now();
      if (lastTap.current.id === id && now - lastTap.current.t < 420) {
        const t = hit.object.userData.target as { x: number; y: number; z: number };
        engineHandle.current?.superspeedTo(t.x, t.y + 18, t.z);
      }
      lastTap.current = { id, t: now };
    };
    canvas.addEventListener("pointerup", onClick);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      let n = 0;
      const addDot = (
        id: string,
        x: number,
        y: number,
        z: number,
        kind: keyof typeof mats,
        scale: number,
      ) => {
        const { lat, lon } = worldToLatLon(x, y, z);
        const la = (lat * Math.PI) / 180;
        const lo = (lon * Math.PI) / 180;
        tmp.set(
          Math.cos(la) * Math.cos(lo) * 1.45,
          Math.sin(la) * 1.45,
          Math.cos(la) * Math.sin(lo) * 1.45,
        );
        let m = pool[n];
        if (!m) {
          m = new THREE.Mesh(dotGeo, mats[kind]);
          pool[n] = m;
          dots.add(m);
        }
        m.material = mats[kind];
        m.scale.setScalar(scale);
        m.position.copy(tmp);
        m.userData = { id, target: { x, y, z } };
        m.visible = true;
        n++;
      };
      const engine = engineHandle.current;
      const self = engine?.pos;
      if (self) addDot("self", self.x, self.y, self.z, "self", 1.4);
      for (const p of useFlight.getState().remotes) {
        addDot(p.id, p.x, p.y, p.z, "player", 1.6);
      }
      for (const s of useFlight.getState().sights) {
        addDot(s.id, s.x, s.y, s.z, "sight", 2.1);
      }
      for (let i = n; i < pool.length; i++) pool[i]!.visible = false;
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerup", onClick);
      renderer.dispose();
      globe.geometry.dispose();
      (globe.material as THREE.Material).dispose();
      tex.dispose();
      dotGeo.dispose();
      mats.self.dispose();
      mats.player.dispose();
      mats.sight.dispose();
    };
  }, [playing, open, seed, body]);

  if (!playing) return null;

  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-10 w-[220px] rounded-xl border border-border bg-surface p-3 sm:bottom-5 sm:right-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-[0.12em] text-muted uppercase">{BODIES[body].name}</p>
        <Button
          variant="secondary"
          size="default"
          className="h-9 px-3 text-xs"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open ? (
        <>
          <canvas
            ref={canvasRef}
            width={196}
            height={196}
            className="mt-2 size-[196px] touch-none rounded-lg bg-bg"
            aria-label="Interactive planet"
          />
          <p className="mt-2 text-[11px] leading-snug text-subtle">
            Drag to spin. Blue: pilots. Red: sights. Double-tap a dot to superspeed there.
          </p>
        </>
      ) : null}
    </div>
  );
}
