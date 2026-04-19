import { useEffect, useState } from "react";
import { SCENES, useAppStore } from "@/systems/state/store";

export function SceneLabel() {
  const scene = useAppStore((s) => s.scene);
  const desc = SCENES[scene];
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setShown(true);
    const id = window.setTimeout(() => setShown(false), 5200);
    return () => window.clearTimeout(id);
  }, [scene]);

  return (
    <div className={`scene-label ${shown ? "show" : ""}`}>
      {desc.name}
      {desc.quote && <span className="quote">"{desc.quote}"</span>}
    </div>
  );
}
