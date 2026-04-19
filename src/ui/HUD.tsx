import { isMilkyWayScene, useAppStore } from "@/systems/state/store";
import { TitleBlock } from "./TitleBlock";
import { SceneSwitcher } from "./SceneSwitcher";
import { ControlsCluster } from "./ControlsCluster";
import { Telemetry } from "./Telemetry";
import { HelpButton } from "./HelpButton";
import { HelpOverlay } from "./HelpOverlay";
import { SceneLabel } from "./SceneLabel";
import { ShipHud } from "./ShipHud";
import { DockingHud } from "./DockingHud";
import { NavigationPanel } from "./NavigationPanel";
import { WormholeTransitOverlay } from "./WormholeTransitOverlay";
import { MilkyWayModeSwitcher } from "./MilkyWayModeSwitcher";

export function HUD() {
  const scene = useAppStore((s) => s.scene);
  const cameraMode = useAppStore((s) => s.cameraMode);
  const helpOpen = useAppStore((s) => s.helpOpen);
  const labels = useAppStore((s) => s.toggles.labels);
  const transitActive = useAppStore((s) => s.wormholeTransit.active);

  const showShipHud =
    (cameraMode === "ship" || cameraMode === "cockpit") &&
    (scene === "deepSpace" || scene === "wormhole" || scene === "blackHole");
  const showDockingHud = showShipHud && scene === "deepSpace";
  const showNavigation = scene === "solarSystem";
  const showMwModes = isMilkyWayScene(scene);

  return (
    <div className="hud">
      <TitleBlock />
      <ControlsCluster />
      <SceneSwitcher />
      <Telemetry />
      <HelpButton />
      {labels && <SceneLabel />}
      {showShipHud && <ShipHud />}
      {showDockingHud && <DockingHud />}
      {showNavigation && <NavigationPanel />}
      {showMwModes && <MilkyWayModeSwitcher />}
      {transitActive && <WormholeTransitOverlay />}
      {helpOpen && <HelpOverlay />}
    </div>
  );
}
