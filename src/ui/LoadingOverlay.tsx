import { useAppStore } from "@/systems/state/store";

export function LoadingOverlay() {
  const loaded = useAppStore((s) => s.loaded);
  return (
    <div className={`loading-overlay ${loaded ? "fade-out" : ""}`}>
      <div className="ring" />
      <div className="label">Calibrating instruments…</div>
    </div>
  );
}
