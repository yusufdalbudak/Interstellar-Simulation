import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "@/systems/state/store";
import { getQualitySettings } from "@/systems/state/quality";
import { SceneRoot } from "@/scenes/SceneRoot";
import { HUD } from "@/ui/HUD";
import { LoadingOverlay } from "@/ui/LoadingOverlay";
import { TransitionOverlay } from "@/ui/TransitionOverlay";
import { useHotkeys } from "@/hooks/useHotkeys";

export function App() {
  const quality = useAppStore((s) => s.quality);
  const setLoaded = useAppStore((s) => s.setLoaded);
  const settings = getQualitySettings(quality);

  useHotkeys();

  useEffect(() => {
    // Brief boot delay so the loading screen reads as intentional, not a flash.
    const id = window.setTimeout(() => setLoaded(true), 900);
    return () => window.clearTimeout(id);
  }, [setLoaded]);

  return (
    <>
      <Canvas
        dpr={settings.dpr}
        gl={{
          // SMAA in the post chain handles AA; built-in MSAA conflicts
          // with EffectComposer's framebuffer copy on some GPUs.
          antialias: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          alpha: false,
        }}
        camera={{ position: [0, 4, 18], fov: 55, near: 0.05, far: 20000 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color("#04060b"), 1);
          gl.toneMapping = settings.hdr
            ? THREE.ACESFilmicToneMapping
            : THREE.LinearToneMapping;
          gl.toneMappingExposure = 1.05;
          scene.fog = null;
        }}
      >
        <Suspense fallback={null}>
          <SceneRoot />
        </Suspense>
      </Canvas>

      <HUD />
      <TransitionOverlay />
      <LoadingOverlay />
    </>
  );
}
