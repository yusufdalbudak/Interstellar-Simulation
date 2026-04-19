import { useMemo } from "react";
import * as THREE from "three";
import { Astronaut } from "@/entities/Astronaut/Astronaut";
import { useAppStore } from "@/systems/state/store";
import { OceanSurface } from "./OceanSurface";
import { WaveWall } from "./WaveWall";
import { SkyDome } from "./SkyDome";
import { LandingPad } from "./LandingPad";

/**
 * Miller's Planet inspired scene. A reflective shallow ocean stretches to a
 * hazy horizon, where an immense wave wall slowly approaches. The astronaut
 * stands on a small landing pad - safe from the swell, for the moment.
 */
export function WaterWorldScene() {
  const cameraMode = useAppStore((s) => s.cameraMode);
  const inputEnabled = cameraMode === "thirdPerson";

  // Surface ground sampler: flat with a tiny ripple under the astronaut so
  // the boots aren't perfectly geometric.
  const groundY = useMemo(() => {
    return (x: number, z: number) =>
      0.45 + Math.sin(x * 0.4 + z * 0.31) * 0.04 + Math.cos(z * 0.27) * 0.03;
  }, []);

  return (
    <>
      <fog attach="fog" args={["#7a8da3", 60, 320]} />
      <color attach="background" args={["#5a6b7a"]} />
      <ambientLight intensity={0.45} color="#9fb1c5" />
      <directionalLight
        position={[60, 80, 30]}
        intensity={1.7}
        color="#e8eef5"
      />
      <hemisphereLight args={["#cfd9e4", "#3b4a5a", 0.5]} />

      <SkyDome />

      <OceanSurface size={900} />

      {/* Towering wall-waves on the horizon (the iconic threat). */}
      <WaveWall position={[0, 0, -260]} length={520} height={70} />
      <WaveWall position={[260, 0, -120]} length={400} height={55} rotationY={Math.PI / 2.4} />

      <LandingPad position={[0, 0, 0]} radius={6} />

      <Astronaut
        mode="surface"
        position={[0, 0.45, 4]}
        groundY={groundY}
        bounds={120}
        inputEnabled={inputEnabled}
      />
    </>
  );
}
