import {
  SCENES,
  useAppStore,
  type CameraMode,
  type Quality,
} from "@/systems/state/store";

const MODE_LABELS: Record<CameraMode, string> = {
  freeFly: "Free Fly",
  orbit: "Orbit",
  thirdPerson: "Explorer",
  cinematic: "Cinematic",
  ship: "Pilot",
  cockpit: "Cockpit",
};

const QUALITIES: Quality[] = ["low", "medium", "high", "ultra"];

export function ControlsCluster() {
  const scene = useAppStore((s) => s.scene);
  const mode = useAppStore((s) => s.cameraMode);
  const setMode = useAppStore((s) => s.setCameraMode);
  const quality = useAppStore((s) => s.quality);
  const setQuality = useAppStore((s) => s.setQuality);
  const toggles = useAppStore((s) => s.toggles);
  const toggle = useAppStore((s) => s.toggle);

  const sceneModes = SCENES[scene].modes;

  return (
    <div className="controls-cluster">
      <div className="mode-row panel">
        {sceneModes.map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => setMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="mode-row panel">
        {QUALITIES.map((q) => (
          <button
            key={q}
            className={quality === q ? "active" : ""}
            onClick={() => setQuality(q)}
            title={`Quality: ${q}`}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="toggles panel">
        <button
          className={toggles.cinematicBars ? "on" : ""}
          onClick={() => toggle("cinematicBars")}
        >
          Bars
        </button>
        <button
          className={toggles.labels ? "on" : ""}
          onClick={() => toggle("labels")}
        >
          Labels
        </button>
        <button
          className={toggles.orbitLines ? "on" : ""}
          onClick={() => toggle("orbitLines")}
        >
          Orbits
        </button>
        <button
          className={toggles.postProcessing ? "on" : ""}
          onClick={() => toggle("postProcessing")}
        >
          Post FX
        </button>
        <button
          className={toggles.debug ? "on" : ""}
          onClick={() => toggle("debug")}
        >
          Debug
        </button>
      </div>

      {toggles.cinematicBars && <CinematicBars />}
    </div>
  );
}

function CinematicBars() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          height: "8.5vh",
          background: "#000",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: "8.5vh",
          background: "#000",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
    </>
  );
}
