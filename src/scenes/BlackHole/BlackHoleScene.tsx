import { BlackHole } from "@/entities/BlackHole/BlackHole";
import { Endurance } from "@/entities/Endurance/Endurance";
import { PlayerShip } from "@/entities/PlayerShip/PlayerShip";
import { useAppStore } from "@/systems/state/store";
import { OrbitGuide } from "@/systems/environment/OrbitGuide";

/**
 * Black hole scene. The black hole sits at the origin and dominates the frame
 * via composition rather than UI clutter. The Endurance ship is placed at a
 * dramatic distance to provide scale.
 */
export function BlackHoleScene() {
  const orbitLines = useAppStore((s) => s.toggles.orbitLines);
  const cameraMode = useAppStore((s) => s.cameraMode);
  const showShip = cameraMode === "ship" || cameraMode === "cockpit";
  return (
    <>
      <ambientLight intensity={0.05} color="#406090" />
      <directionalLight
        position={[20, 5, 10]}
        intensity={0.6}
        color="#f5b46c"
      />

      <BlackHole />

      <Endurance position={[44, 6, -10]} scale={0.9} />

      {/* Optional pilotable craft — lets the user fly around the singularity */}
      {showShip && (
        <PlayerShip
          spawn={[60, 0, 30]}
          spawnRotation={[0, -Math.PI * 0.65, 0]}
          controllable
        />
      )}

      {orbitLines && <OrbitGuide radius={32} color="#f5b46c" />}
      {orbitLines && <OrbitGuide radius={80} color="#f5b46c" />}
    </>
  );
}
