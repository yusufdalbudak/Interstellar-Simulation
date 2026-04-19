import { useAppStore } from "@/systems/state/store";

export function HelpOverlay() {
  const setOpen = useAppStore((s) => s.setHelpOpen);
  return (
    <div className="help-overlay" onClick={() => setOpen(false)}>
      <div className="help-card panel" onClick={(e) => e.stopPropagation()}>
        <h2>Controls</h2>

        <div>
          <h3>Scenes</h3>
          {[
            ["1", "Deep Space Hub"],
            ["2", "Gargantua (Black Hole)"],
            ["3", "Wormhole"],
            ["4", "Milky Way"],
            ["5", "Sol System"],
          ].map(([k, label]) => (
            <div key={k} className="help-row">
              <span className="key">{k}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div>
          <h3>Camera Modes</h3>
          {[
            ["V", "Cinematic preset"],
            ["O", "Orbit inspect (mouse to rotate, scroll to zoom)"],
            ["F", "Free fly (WASD, Space/Ctrl up/down, Shift boost)"],
            ["J", "Pilot (chase camera behind ship)"],
            ["K", "Pilot (cockpit forward view)"],
            ["T", "Third-person explorer (where applicable)"],
          ].map(([k, label]) => (
            <div key={k} className="help-row">
              <span className="key">{k}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div>
          <h3>Spacecraft Pilot Mode</h3>
          <div className="help-row"><span className="key">W / S</span><span>Forward / reverse thrust</span></div>
          <div className="help-row"><span className="key">A / D</span><span>Yaw left / right</span></div>
          <div className="help-row"><span className="key">Q / E</span><span>Roll left / right</span></div>
          <div className="help-row"><span className="key">R / F</span><span>Translate up / down</span></div>
          <div className="help-row"><span className="key">Mouse drag</span><span>Pitch / yaw look</span></div>
          <div className="help-row"><span className="key">Shift</span><span>Boost</span></div>
          <div className="help-row"><span className="key">Space</span><span>Auto-stabilize</span></div>
          <div className="help-row"><span className="key">X</span><span>Hard brake</span></div>
        </div>

        <div>
          <h3>Wormhole &amp; Docking</h3>
          <div className="help-row"><span className="key">—</span><span>Fly the ship inside the wormhole throat to begin transit</span></div>
          <div className="help-row"><span className="key">—</span><span>Approach Cygnus Orbital and align reticle to dock</span></div>
        </div>

        <div>
          <h3>Display</h3>
          <div className="help-row"><span className="key">B</span><span>Cinematic letterbox</span></div>
          <div className="help-row"><span className="key">L</span><span>Scene labels &amp; quotes</span></div>
          <div className="help-row"><span className="key">G</span><span>Orbit guide lines</span></div>
          <div className="help-row"><span className="key">P</span><span>Post-processing</span></div>
          <div className="help-row"><span className="key">H</span><span>This help panel</span></div>
        </div>

        <button className="close" onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  );
}
