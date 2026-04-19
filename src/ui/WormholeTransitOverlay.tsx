import { useAppStore } from "@/systems/state/store";

/**
 * Subtle UI overlay shown during wormhole traversal: a thin status banner and
 * a progress bar. The actual visual warping happens in-scene via the wormhole
 * shader and a scripted camera path.
 */
export function WormholeTransitOverlay() {
  const progress = useAppStore((s) => s.wormholeTransit.progress);
  const pct = Math.round(progress * 100);

  return (
    <div className="transit-overlay">
      <div className="transit-vignette" />
      <div className="transit-banner panel">
        <div className="transit-eyebrow">TRAVERSAL · SPACETIME ANOMALY</div>
        <div className="transit-bar">
          <div
            className="transit-bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="transit-status">
          {pct < 30
            ? "ENTERING THROAT"
            : pct < 70
              ? "TRANSITING"
              : pct < 95
                ? "EMERGING"
                : "ARRIVING"}
        </div>
      </div>
    </div>
  );
}
