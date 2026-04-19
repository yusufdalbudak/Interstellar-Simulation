import { useAppStore } from "@/systems/state/store";
import { SOLAR_BODIES } from "@/scenes/SolarSystem/bodies";

export function NavigationPanel() {
  const selected = useAppStore((s) => s.navigation.selectedBody);
  const setSelected = useAppStore((s) => s.setSelectedBody);
  const setTravel = useAppStore((s) => s.setTravelTarget);

  const body = selected ? SOLAR_BODIES.find((b) => b.id === selected) : null;

  return (
    <div className="nav-panel panel">
      <div className="nav-header">
        <span className="nav-eyebrow">SOL · NAVIGATION</span>
      </div>
      <div className="nav-bodies">
        {SOLAR_BODIES.map((b) => (
          <button
            key={b.id}
            className={`nav-body ${selected === b.id ? "active" : ""}`}
            onClick={() => setSelected(b.id)}
          >
            <span
              className="nav-swatch"
              style={{ background: b.uiColor ?? b.color }}
            />
            <span className="nav-body-name">{b.name}</span>
          </button>
        ))}
      </div>
      {body && (
        <div className="nav-detail">
          <div className="nav-detail-name">{body.name}</div>
          <div className="nav-detail-type">{body.type}</div>
          <div className="nav-detail-desc">{body.description}</div>
          <button
            className="nav-travel"
            onClick={() => setTravel(body.id)}
          >
            Travel to {body.name}
          </button>
        </div>
      )}
    </div>
  );
}
