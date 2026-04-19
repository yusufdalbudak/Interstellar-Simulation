import { SCENES, useAppStore } from "@/systems/state/store";

export function Telemetry() {
  const tel = useAppStore((s) => s.telemetry);
  const scene = useAppStore((s) => s.scene);
  const mode = useAppStore((s) => s.cameraMode);

  return (
    <div className="telemetry panel">
      <div className="row">
        <span className="label">Scene</span>
        <span className="value">{SCENES[scene].name}</span>
      </div>
      <div className="row">
        <span className="label">Mode</span>
        <span className="value">{mode}</span>
      </div>
      <div className="row">
        <span className="label">Target</span>
        <span className="value">{tel.target}</span>
      </div>
      <div className="row">
        <span className="label">Distance</span>
        <span className="value">{formatNum(tel.distance)} u</span>
      </div>
      <div className="row">
        <span className="label">Speed</span>
        <span className="value">{formatNum(tel.speed)} u/s</span>
      </div>
    </div>
  );
}

function formatNum(n: number) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  return n.toFixed(2);
}
