import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneId } from "@/systems/state/store";

interface Props {
  scene: SceneId;
}

/**
 * Scripted cinematic cameras. Each scene has a hand-tuned curve so the user
 * always opens with a strong establishing shot. Switching to free-fly or orbit
 * snaps to the live camera state, so cinematic acts as a "pause-and-look"
 * experience rather than a hard cut.
 */
export function CinematicCamera({ scene }: Props) {
  const { camera } = useThree();
  const t = useRef(0);
  const lookTmp = useRef(new THREE.Vector3());
  const posTmp = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    t.current += delta;
    const time = t.current;
    const path = PATHS[scene];
    if (!path) return;

    path.position(time, posTmp.current);
    path.lookAt(time, lookTmp.current);

    // Smoothly approach the target so transitions in/out look organic
    const lerp = 1 - Math.pow(0.001, delta);
    camera.position.lerp(posTmp.current, lerp);
    camera.lookAt(lookTmp.current);
  });

  return null;
}

interface CamPath {
  position: (t: number, out: THREE.Vector3) => void;
  lookAt: (t: number, out: THREE.Vector3) => void;
}

const PATHS: Record<SceneId, CamPath> = {
  deepSpace: {
    position: (t, out) => {
      const a = t * 0.04;
      out.set(Math.sin(a) * 28, 6 + Math.sin(t * 0.1) * 2, Math.cos(a) * 28);
    },
    lookAt: (_t, out) => out.set(0, 0, 0),
  },
  blackHole: {
    position: (t, out) => {
      const a = t * 0.025;
      const r = 42 + Math.sin(t * 0.07) * 6;
      out.set(Math.sin(a) * r, 8 + Math.sin(t * 0.05) * 3, Math.cos(a) * r);
    },
    lookAt: (_t, out) => out.set(0, 0, 0),
  },
  wormhole: {
    position: (t, out) => {
      const a = t * 0.06;
      out.set(Math.sin(a) * 22, 3 + Math.sin(t * 0.2) * 1.5, 18 + Math.cos(a) * 8);
    },
    lookAt: (_t, out) => out.set(0, 0, 0),
  },
  milkyWay: {
    // External overview: cinematic camera sits high above the plane and
    // looks straight down so the spiral disk reads as a horizontal,
    // face-on composition (matching the framing of NGC 6744-style
    // reference photography). A tiny lazy circle keeps the shot alive
    // without rolling the disk into an oblique tilt.
    position: (t, out) => {
      const a = t * 0.012;
      out.set(
        Math.sin(a) * 18,
        480 + Math.sin(t * 0.045) * 14,
        Math.cos(a) * 18,
      );
    },
    lookAt: (_t, out) => out.set(0, 0, 0),
  },
  milkyWayInside: {
    // Inside the galaxy: the camera sits at the solar neighborhood
    // (origin) and slowly pans across the sky — never translating
    // significantly, just rotating to sweep from anti-center, across
    // the galactic plane, toward Sagittarius (galactic center +X),
    // and gently bobbing in latitude.
    position: (_t, out) => out.set(0, 0, 0),
    lookAt: (t, out) => {
      // Pan azimuth slowly, with a small latitude bob.
      const a = -1.6 + Math.sin(t * 0.03) * 1.4;
      const lat = Math.sin(t * 0.05) * 0.18;
      out.set(
        Math.cos(a) * Math.cos(lat),
        Math.sin(lat),
        Math.sin(a) * Math.cos(lat),
      );
    },
  },
  solarSystem: {
    // Cinematic camera sits high above the orbital plane and looks
    // straight down so every orbit reads as a clean horizontal ring
    // (no oblique foreshortening). A small lazy circle keeps the
    // shot alive without tipping the system into a vertical/diagonal
    // composition.
    position: (t, out) => {
      const a = t * 0.02;
      const r = 18 + Math.sin(t * 0.05) * 4;
      out.set(Math.sin(a) * r, 200 + Math.sin(t * 0.07) * 8, Math.cos(a) * r);
    },
    lookAt: (_t, out) => out.set(0, 0, 0),
  },
  waterWorld: {
    position: (t, out) => {
      out.set(Math.sin(t * 0.05) * 24, 6 + Math.sin(t * 0.1) * 1.2, 18 + Math.cos(t * 0.05) * 6);
    },
    lookAt: (_t, out) => out.set(0, 1, 0),
  },
  iceWorld: {
    position: (t, out) => {
      out.set(Math.sin(t * 0.04) * 22, 8 + Math.sin(t * 0.08) * 1.5, 16 + Math.cos(t * 0.04) * 8);
    },
    lookAt: (_t, out) => out.set(0, 1, 0),
  },
};
