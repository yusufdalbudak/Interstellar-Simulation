import { useAppStore } from "@/systems/state/store";

export function ShipHud() {
  const speed = useAppStore((s) => s.ship.speed);
  const throttle = useAppStore((s) => s.ship.throttle);
  const cameraMode = useAppStore((s) => s.cameraMode);
  const setMode = useAppStore((s) => s.setCameraMode);

  return (
    <div className="ship-hud panel">
      <div className="row">
        <span className="label">SPD</span>
        <span className="value">{speed.toFixed(1)} u/s</span>
      </div>
      <div className="row">
        <span className="label">THR</span>
        <span className="value">
          {throttle > 0 ? "+" : ""}
          {throttle.toFixed(2)}
        </span>
      </div>
      <div className="throttle-bar">
        <div
          className="throttle-fill"
          style={{
            width: `${Math.abs(throttle) * 100}%`,
            background:
              throttle >= 0 ? "var(--accent)" : "rgba(255, 116, 116, 0.7)",
          }}
        />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button
          className={`mini ${cameraMode === "ship" ? "on" : ""}`}
          onClick={() => setMode("ship")}
        >
          Chase
        </button>
        <button
          className={`mini ${cameraMode === "cockpit" ? "on" : ""}`}
          onClick={() => setMode("cockpit")}
        >
          Cockpit
        </button>
      </div>
    </div>
  );
}
