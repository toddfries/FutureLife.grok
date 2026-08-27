import { useEffect, useRef } from "react";
import { engineHandle } from "@/game/handle";
import { useFlight } from "@/game/store";

export function TouchPad() {
  const playing = useFlight((s) => s.playing);
  const detail = useFlight((s) => s.detail);
  const setDetail = useFlight((s) => s.setDetail);
  if (!playing) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 sm:hidden">
      <div className="mb-2 pointer-events-auto rounded-lg border border-border bg-surface px-3 py-2">
        <label htmlFor="detail-m" className="flex justify-between text-xs text-muted">
          <span>World detail</span>
          <span className="font-mono tabular-nums text-fg">
            {Math.round(detail * 100)}
          </span>
        </label>
        <input
          id="detail-m"
          type="range"
          min={0}
          max={100}
          value={Math.round(detail * 100)}
          onChange={(e) => setDetail(Number(e.target.value) / 100)}
          className="mt-1 h-2 w-full appearance-none rounded-full bg-surface-2 accent-primary"
        />
      </div>
      <div className="flex items-end justify-between gap-3">
        <Stick
          label="Move"
          onVec={(x, y) => engineHandle.current?.setTouch({ x, y })}
        />
        <div className="pointer-events-auto flex flex-col gap-2">
          <PadButton label="Fly" onHold={(v) => engineHandle.current?.setTouch({ fwd: v ? 1 : 0 })} />
          <PadButton label="Back" onHold={(v) => engineHandle.current?.setTouch({ back: v ? 1 : 0 })} />
          <PadButton
            label="Stop"
            onHold={(v) => {
              if (v) engineHandle.current?.input && (engineHandle.current.input.stopLatched = true);
            }}
          />
        </div>
        <Stick
          label="Look"
          onVec={(x, y) => engineHandle.current?.setTouch({ lookX: x, lookY: y })}
        />
      </div>
    </div>
  );
}

function PadButton({
  label,
  onHold,
}: {
  label: string;
  onHold: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="min-h-11 min-w-16 rounded-md border border-border bg-surface px-3 text-sm text-fg"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  );
}

function Stick({
  label,
  onVec,
}: {
  label: string;
  onVec: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);

  useEffect(() => () => onVec(0, 0), [onVec]);

  const read = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const m = Math.hypot(x, y);
    const s = m < 0.12 ? 0 : Math.min(1, (m - 0.12) / 0.88) / (m || 1);
    onVec(x * s, y * s);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1">
      <div
        ref={ref}
        className="size-28 rounded-full border border-border bg-surface-2"
        onPointerDown={(e) => {
          id.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          read(e);
        }}
        onPointerMove={(e) => {
          if (id.current === e.pointerId) read(e);
        }}
        onPointerUp={() => {
          id.current = null;
          onVec(0, 0);
        }}
        onPointerCancel={() => {
          id.current = null;
          onVec(0, 0);
        }}
      />
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}
