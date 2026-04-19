import { useMemo } from "react";
import { Astronaut } from "@/entities/Astronaut/Astronaut";
import { useAppStore } from "@/systems/state/store";
import { IceTerrain, sampleIceHeight } from "./IceTerrain";
import { Beacon } from "./Beacon";
import { SnowParticles } from "./SnowParticles";
import { getQualitySettings } from "@/systems/state/quality";

export function IceWorldScene() {
  const cameraMode = useAppStore((s) => s.cameraMode);
  const inputEnabled = cameraMode === "thirdPerson";
  const settings = useMemo(
    () => getQualitySettings(useAppStore.getState().quality),
    [],
  );

  const groundY = useMemo(() => (x: number, z: number) => sampleIceHeight(x, z), []);

  return (
    <>
      <fog attach="fog" args={["#9bb4cd", 50, 240]} />
      <color attach="background" args={["#7d94aa"]} />

      <ambientLight intensity={0.55} color="#bcd2e6" />
      <directionalLight
        position={[60, 70, 30]}
        intensity={1.4}
        color="#eef3f9"
      />
      <hemisphereLight args={["#dde9f5", "#3a4654", 0.55]} />

      <IceTerrain size={500} />

      {/* Skeletal research outpost - just a beacon and pod */}
      <Beacon position={[10, sampleIceHeight(10, -8), -8]} />

      {settings.particles && <SnowParticles count={1200} radius={120} />}

      <Astronaut
        mode="surface"
        position={[0, sampleIceHeight(0, 4) + 0.05, 4]}
        groundY={groundY}
        bounds={140}
        inputEnabled={inputEnabled}
      />
    </>
  );
}
