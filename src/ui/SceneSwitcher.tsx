import {
  isMilkyWayScene,
  PRIMARY_SCENES,
  SCENES,
  useAppStore,
} from "@/systems/state/store";

export function SceneSwitcher() {
  const current = useAppStore((s) => s.scene);
  const setScene = useAppStore((s) => s.setScene);
  const experimental = useAppStore((s) => s.toggles.experimental);

  const ids = experimental
    ? [...PRIMARY_SCENES, "waterWorld" as const, "iceWorld" as const]
    : PRIMARY_SCENES;

  return (
    <div className="scene-switcher panel">
      {ids.map((id, i) => {
        const s = SCENES[id];
        // Milky Way main button represents the whole MW family — highlight
        // it whether the user is in Overview or Inside, and route clicks
        // through to the Inside scene by default (the cinematic "arrival"
        // experience). The sub-mode switcher then lets them flip to
        // Overview without leaving the section.
        const isMw = id === "milkyWay";
        const active = isMw ? isMilkyWayScene(current) : current === s.id;
        const target = isMw ? ("milkyWayInside" as const) : s.id;
        return (
          <button
            key={s.id}
            className={active ? "active" : ""}
            onClick={() => setScene(target)}
            title={`${s.name}${i < 5 ? ` (key ${i + 1})` : ""}`}
          >
            {s.short}
          </button>
        );
      })}
    </div>
  );
}
