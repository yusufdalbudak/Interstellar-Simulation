import { useAppStore, type DockingState } from "@/systems/state/store";

const STATE_LABEL: Record<DockingState, string> = {
  outOfRange: "OUT OF RANGE",
  approaching: "APPROACHING",
  aligning: "ALIGN",
  dockable: "DOCK READY",
  docked: "DOCKED",
};

const STATE_COLOR: Record<DockingState, string> = {
  outOfRange: "var(--text-dim)",
  approaching: "var(--accent-cool)",
  aligning: "var(--accent)",
  dockable: "#5cff8c",
  docked: "#5cff8c",
};

export function DockingHud() {
  const state = useAppStore((s) => s.docking.state);
  const distance = useAppStore((s) => s.docking.distance);
  const alignment = useAppStore((s) => s.docking.alignment);
  const approach = useAppStore((s) => s.docking.approachSpeed);
  const target = useAppStore((s) => s.docking.targetName);

  if (!Number.isFinite(distance)) return null;

  return (
    <div className="docking-hud panel">
      <div className="dock-header">
        <span className="dock-label">DOCKING</span>
        <span
          className="dock-state"
          style={{ color: STATE_COLOR[state] }}
        >
          {STATE_LABEL[state]}
        </span>
      </div>
      <div className="dock-target">{target}</div>
      <div className="dock-row">
        <span className="dock-key">DST</span>
        <span className="dock-val">{distance.toFixed(1)} u</span>
      </div>
      <div className="dock-row">
        <span className="dock-key">ALN</span>
        <div className="bar">
          <div
            className="bar-fill"
            style={{
              width: `${Math.max(0, Math.min(1, alignment)) * 100}%`,
              background:
                alignment > 0.6 ? "#5cff8c" : "var(--accent)",
            }}
          />
        </div>
      </div>
      <div className="dock-row">
        <span className="dock-key">APR</span>
        <span className="dock-val">
          {approach >= 0 ? "+" : ""}
          {approach.toFixed(2)} u/s
        </span>
      </div>
      {/* Crosshair / reticle indicator */}
      <Reticle alignment={alignment} state={state} />
    </div>
  );
}

function Reticle({
  alignment,
  state,
}: {
  alignment: number;
  state: DockingState;
}) {
  const r = 28;
  const color = STATE_COLOR[state];
  // size shrinks as alignment improves
  const size = r * (1.4 - Math.max(0, Math.min(1, alignment)));
  return (
    <svg
      className="dock-reticle"
      viewBox={`-40 -40 80 80`}
      width={70}
      height={70}
      aria-hidden
    >
      <circle
        cx={0}
        cy={0}
        r={r}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={0.6}
        fill="none"
      />
      <circle
        cx={0}
        cy={0}
        r={size}
        stroke={color}
        strokeWidth={0.9}
        fill="none"
      />
      <line x1={-4} y1={0} x2={4} y2={0} stroke={color} strokeWidth={0.7} />
      <line x1={0} y1={-4} x2={0} y2={4} stroke={color} strokeWidth={0.7} />
    </svg>
  );
}
