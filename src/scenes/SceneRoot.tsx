import { useMemo } from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { useAppStore } from "@/systems/state/store";
import { getQualitySettings } from "@/systems/state/quality";
import { Starfield } from "@/systems/environment/Starfield";
import { DeepSpaceScene } from "./DeepSpace/DeepSpaceScene";
import { BlackHoleScene } from "./BlackHole/BlackHoleScene";
import { WormholeScene } from "./Wormhole/WormholeScene";
import { MilkyWayScene } from "./MilkyWay/MilkyWayScene";
import { MilkyWayInsideScene } from "./MilkyWay/MilkyWayInsideScene";
import { SolarSystemScene } from "./SolarSystem/SolarSystemScene";
import { WaterWorldScene } from "./WaterWorld/WaterWorldScene";
import { IceWorldScene } from "./IceWorld/IceWorldScene";
import { CameraRig } from "@/systems/camera/CameraRig";
import { TelemetryReporter } from "@/systems/state/TelemetryReporter";

export function SceneRoot() {
  const scene = useAppStore((s) => s.scene);
  const quality = useAppStore((s) => s.quality);
  const postOn = useAppStore((s) => s.toggles.postProcessing);
  const settings = useMemo(() => getQualitySettings(quality), [quality]);

  // Universal starfield: enabled for all space scenes. The Milky Way
  // overview brings its own halo and stars; the immersive in-galaxy scene
  // brings its own dense layered stars + sky shell, so neither uses the
  // global starfield.
  const showBackgroundStars =
    scene === "deepSpace" ||
    scene === "blackHole" ||
    scene === "wormhole" ||
    scene === "solarSystem";
  const milkyWayBackdrop = scene === "milkyWay";

  return (
    <>
      {showBackgroundStars && (
        <Starfield
          count={settings.starCount}
          layers={settings.starLayers}
          radius={1800}
        />
      )}
      {milkyWayBackdrop && (
        <Starfield
          count={Math.round(settings.starCount * 0.5)}
          layers={2}
          radius={2400}
        />
      )}

      {scene === "deepSpace" && <DeepSpaceScene />}
      {scene === "blackHole" && <BlackHoleScene />}
      {scene === "wormhole" && <WormholeScene />}
      {scene === "milkyWay" && <MilkyWayScene />}
      {scene === "milkyWayInside" && <MilkyWayInsideScene />}
      {scene === "solarSystem" && <SolarSystemScene />}
      {scene === "waterWorld" && <WaterWorldScene />}
      {scene === "iceWorld" && <IceWorldScene />}

      <CameraRig />
      <TelemetryReporter />

      {/* Bloom is intentionally disabled for the Milky Way Overview: the
          additive disk shader covers a huge screen area at high HDR values
          which makes the mipmap-blur bloom pass dominate the frame and can
          even trigger WebGL context loss on some GPUs. The Overview scene
          renders cleaner without bloom; the bulge already looks bright via
          its own additive sphere. */}
      {postOn && settings.bloom && scene !== "milkyWay" && (
        <EffectComposer
          multisampling={0}
          enableNormalPass={false}
          frameBufferType={THREE.HalfFloatType}
          stencilBuffer={false}
          depthBuffer={true}
        >
          <Bloom
            intensity={
              scene === "blackHole"
                ? 1.1
                : scene === "milkyWayInside"
                  ? 0.32
                  : scene === "solarSystem"
                    ? 0.55
                    : 0.55
            }
            luminanceThreshold={
              scene === "blackHole"
                ? 0.15
                : scene === "milkyWayInside"
                  ? 0.6
                  : 0.55
            }
            luminanceSmoothing={0.18}
            mipmapBlur
          />
          {settings.cinematicPost ? (
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.0006, 0.0006)}
              radialModulation={true}
              modulationOffset={0.6}
            />
          ) : (
            <></>
          )}
          {settings.cinematicPost ? (
            <Vignette eskil={false} offset={0.25} darkness={0.85} />
          ) : (
            <></>
          )}
        </EffectComposer>
      )}
    </>
  );
}
