import { Endurance } from "@/entities/Endurance/Endurance";
import { Astronaut } from "@/entities/Astronaut/Astronaut";
import { PlayerShip } from "@/entities/PlayerShip/PlayerShip";
import { DockingStation } from "@/entities/DockingStation/DockingStation";
import { Nebula } from "@/systems/environment/Nebula";
import { DistantPlanet } from "@/systems/environment/DistantPlanet";
import { OrbitGuide } from "@/systems/environment/OrbitGuide";
import { useAppStore } from "@/systems/state/store";

/**
 * Deep Space Hub.
 *
 * Premium starting environment. The Endurance hangs front-and-center as the
 * iconic anchor. A small orbital station sits ~off-axis as the docking target
 * for the new piloted-ship mode. Distant planets, nebula slabs, and a soft
 * directional sun give the whole scene depth and scale.
 */
export function DeepSpaceScene() {
  const orbitLines = useAppStore((s) => s.toggles.orbitLines);
  const cameraMode = useAppStore((s) => s.cameraMode);
  const showAstronaut = cameraMode === "thirdPerson";
  const showShip =
    cameraMode === "ship" ||
    cameraMode === "cockpit" ||
    cameraMode === "freeFly" ||
    cameraMode === "cinematic" ||
    cameraMode === "orbit";

  return (
    <>
      <ambientLight intensity={0.18} color="#7a90b0" />
      <directionalLight
        position={[40, 25, 30]}
        intensity={1.4}
        color="#fff5e6"
      />
      <hemisphereLight args={["#0a1830", "#06070a", 0.25]} />

      <Nebula
        color="#3a5aa0"
        secondary="#a06030"
        position={[-200, 30, -500]}
        scale={520}
      />
      <Nebula
        color="#6030a0"
        secondary="#1a3060"
        position={[300, -80, -700]}
        scale={680}
      />

      <DistantPlanet
        position={[-180, -20, -260]}
        radius={28}
        color="#a07050"
        ring
      />
      <DistantPlanet
        position={[210, 60, -340]}
        radius={18}
        color="#5d8aaf"
      />

      {/* Hero spacecraft — the Endurance anchors the scene */}
      <Endurance position={[0, 0, 0]} scale={1} />

      {/* Orbital docking station — the player can fly here and dock */}
      <DockingStation
        position={[35, 4, -10]}
        rotation={[0, -Math.PI / 2.4, 0]}
        scale={1}
        name="Cygnus Orbital"
      />

      {orbitLines && <OrbitGuide radius={26} />}
      {orbitLines && <OrbitGuide radius={48} />}

      {/* Player-controllable spacecraft. Spawns near the Endurance, off to
          the right, pointing toward the docking station to make the docking
          loop self-evident. */}
      {showShip && (
        <PlayerShip
          spawn={[14, 0, 12]}
          spawnRotation={[0, -Math.PI / 4, 0]}
          controllable={cameraMode === "ship" || cameraMode === "cockpit"}
        />
      )}

      {/* Astronaut on EVA, only when explorer is selected */}
      {showAstronaut && (
        <Astronaut
          mode="eva"
          position={[8, 1.5, 6]}
          inputEnabled
          scale={1}
        />
      )}
    </>
  );
}
