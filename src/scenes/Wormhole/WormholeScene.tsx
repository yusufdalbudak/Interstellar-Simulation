import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Wormhole } from "@/entities/Wormhole/Wormhole";
import { Endurance } from "@/entities/Endurance/Endurance";
import { PlayerShip } from "@/entities/PlayerShip/PlayerShip";
import { useAppStore } from "@/systems/state/store";
import { shipState } from "@/entities/PlayerShip/ShipContext";

/**
 * Wormhole scene.
 *
 * Two modes:
 *
 *   1. Approach: the wormhole sits ahead of the player ship. The player can
 *      pilot toward it freely. Crossing a threshold radius automatically
 *      triggers the transit sequence.
 *
 *   2. Transit: a scripted, cinematic camera dive into and through the
 *      wormhole, with the throat warping around the camera and a soft
 *      progress bar in the HUD. On completion, the app transitions to the
 *      Milky Way scene.
 */
export function WormholeScene() {
  return (
    <>
      <ambientLight intensity={0.12} color="#5b6f99" />
      <directionalLight
        position={[12, 6, 18]}
        intensity={0.9}
        color="#cdd9f0"
      />

      {/* The wormhole anchors at origin */}
      <Wormhole position={[0, 0, 0]} radius={6} />

      {/* The Endurance hangs in the periphery as a scale reference */}
      <Endurance position={[24, -3, 18]} scale={0.7} rotationSpeed={0.1} />

      {/* The player ship — spawns far back so they can fly toward the throat */}
      <PlayerShip spawn={[0, 0, 70]} spawnRotation={[0, Math.PI, 0]} controllable />

      {/* Drives the transit sequence */}
      <WormholeTraversal />
    </>
  );
}

const TRIGGER_RADIUS = 8.5;
const TRANSIT_DURATION = 4.5;

function WormholeTraversal() {
  const { camera } = useThree();
  const transit = useAppStore((s) => s.wormholeTransit);
  const begin = useAppStore.getState().beginWormholeTransit;
  const setProgress = useAppStore.getState().setWormholeProgress;
  const end = useAppStore.getState().endWormholeTransit;
  const setScene = useAppStore.getState().setScene;
  const setMode = useAppStore.getState().setCameraMode;

  const startCam = useRef(new THREE.Vector3());
  const startQuat = useRef(new THREE.Quaternion());
  const tmpDir = useMemo(() => new THREE.Vector3(), []);

  // Auto-trigger when ship enters trigger radius (only if pilot mode active)
  useFrame((_, delta) => {
    const state = useAppStore.getState();
    if (!shipState.group) return;
    if (!state.wormholeTransit.active) {
      const distance = shipState.position.length();
      if (
        distance < TRIGGER_RADIUS &&
        (state.cameraMode === "ship" || state.cameraMode === "cockpit")
      ) {
        startCam.current.copy(camera.position);
        startQuat.current.copy(camera.quaternion);
        // Force cinematic so the transit driver owns the camera
        setMode("cinematic");
        begin();
      }
      return;
    }

    // Active transit — advance progress and animate camera dive
    const next = Math.min(
      1,
      state.wormholeTransit.progress + delta / TRANSIT_DURATION,
    );
    setProgress(next);

    // Camera path: dive INTO the wormhole, then pull out the other side.
    // We use a parametric curve from the start position through origin and
    // out to a "destination" point, with rotation drift to suggest tunneling.
    const t = next;
    const eased = easeInOut(t);
    const enter = new THREE.Vector3(0, 0, 0);
    const exit = new THREE.Vector3(0, 0, -28);

    if (eased < 0.5) {
      // Approach -> enter
      const k = eased / 0.5;
      tmpDir
        .copy(startCam.current)
        .lerp(enter, k);
      camera.position.copy(tmpDir);
    } else {
      // Inside throat -> emerge on far side
      const k = (eased - 0.5) / 0.5;
      tmpDir.copy(enter).lerp(exit, k);
      camera.position.copy(tmpDir);
    }
    // Add a small swirl so the user feels rotational warping
    const swirl = next * Math.PI * 1.5;
    camera.up.set(Math.sin(swirl) * 0.3, Math.cos(swirl), 0).normalize();
    camera.lookAt(0, 0, -8);

    if (next >= 1) {
      end();
      // Arrive INSIDE the Milky Way — the most cinematic landing.
      // The user can then pull out to the Overview from the sub-mode
      // switcher, or descend straight into the Solar System.
      setScene("milkyWayInside");
    }
  });

  // Don't render anything visual — purely a driver
  void transit;
  return null;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
