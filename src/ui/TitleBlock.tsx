import { SCENES, useAppStore } from "@/systems/state/store";

export function TitleBlock() {
  const scene = useAppStore((s) => s.scene);
  const desc = SCENES[scene];
  return (
    <div className="title-block">
      <span className="eyebrow">Interstellar · Simulation</span>
      <h1>An Interactive Voyage</h1>
      <span className="scene-name">{desc.name}</span>
    </div>
  );
}
