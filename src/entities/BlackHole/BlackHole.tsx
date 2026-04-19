import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useAppStore } from "@/systems/state/store";
import { getQualitySettings } from "@/systems/state/quality";
import { accretionDiskShader } from "./shaders/accretionDisk";
import { eventHorizonShader } from "./shaders/eventHorizon";
import { lensingShader } from "./shaders/lensing";

/**
 * Hero black hole. Built as four layered passes, each in its own mesh so
 * adjustments are isolated and inexpensive to swap:
 *
 *   1. Background lensing shell - a sphere rendered just outside the visible
 *      black hole that bends the camera-space direction toward the center,
 *      producing the iconic "stars warped behind the hole" silhouette.
 *      This is a screen-space approximation, not a true geodesic ray-trace,
 *      but it captures the visual essence at real-time cost.
 *   2. Accretion disk - a flat radial mesh with a procedural shader that
 *      animates a bright orange-white ring of plasma. Its opposite half is
 *      visually wrapped by the lens layer, evoking the famous "vertical bar
 *      over the disk" Interstellar look.
 *   3. Event horizon - a pure black sphere with a faint photon-ring rim.
 *   4. Outer halo - additive sprite to anchor it as a luminous hero element.
 */
export function BlackHole() {
  const quality = useAppStore((s) => s.quality);
  const settings = useMemo(() => getQualitySettings(quality), [quality]);

  const horizonRadius = 4.0;
  const diskInner = horizonRadius * 1.25;
  const diskOuter = horizonRadius * 4.2;
  const lensRadius = horizonRadius * 12.0;

  const diskRef = useRef<THREE.Mesh>(null);
  const horizonRef = useRef<THREE.Mesh>(null);
  const lensRef = useRef<THREE.Mesh>(null);

  const diskMat = useMemo(() => accretionDiskShader(diskInner, diskOuter), [diskInner, diskOuter]);
  const horizonMat = useMemo(() => eventHorizonShader(horizonRadius), [horizonRadius]);
  const lensMat = useMemo(
    () => lensingShader(lensRadius, horizonRadius, settings.lensSteps),
    [lensRadius, horizonRadius, settings.lensSteps],
  );

  useFrame((state, delta) => {
    diskMat.uniforms.uTime.value += delta;
    horizonMat.uniforms.uTime.value += delta;
    lensMat.uniforms.uTime.value += delta;
    lensMat.uniforms.uCameraPos.value.copy(state.camera.position);
    // Slow accretion swirl rotation
    if (diskRef.current) diskRef.current.rotation.z += delta * 0.06;
  });

  return (
    <group>
      {/* 1. Lensing background shell (rendered first so disk + horizon overlay) */}
      <mesh ref={lensRef} material={lensMat} renderOrder={0}>
        <sphereGeometry args={[lensRadius, 64, 48]} />
      </mesh>

      {/* 2. Accretion disk - tilted slightly off the equator for a dramatic angle */}
      <mesh
        ref={diskRef}
        material={diskMat}
        rotation={[Math.PI / 2 - 0.18, 0, 0]}
        renderOrder={1}
      >
        <ringGeometry args={[diskInner, diskOuter, settings.diskSamples, 1]} />
      </mesh>

      {/* Doubled disk plane for thickness illusion (additive) */}
      <mesh
        material={diskMat}
        rotation={[Math.PI / 2 - 0.18, 0, 0]}
        position={[0, 0, 0.05]}
        renderOrder={2}
      >
        <ringGeometry args={[diskInner * 1.02, diskOuter * 0.98, settings.diskSamples / 2, 1]} />
      </mesh>

      {/* 3. Event horizon */}
      <mesh ref={horizonRef} material={horizonMat} renderOrder={3}>
        <sphereGeometry args={[horizonRadius, 48, 32]} />
      </mesh>

      {/* 4. Outer photon-ring glow */}
      <PhotonRing radius={horizonRadius * 1.06} />
    </group>
  );
}

function PhotonRing({ radius }: { radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        uniform float uTime;
        void main(){
          float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0,0.0,1.0))), 6.0);
          vec3 col = mix(vec3(1.0, 0.78, 0.45), vec3(1.0, 1.0, 1.0), rim);
          gl_FragColor = vec4(col * rim, rim);
        }
      `,
    });
  }, []);
  useFrame((_, delta) => (mat.uniforms.uTime.value += delta));
  return (
    <mesh ref={ref} material={mat} renderOrder={4}>
      <sphereGeometry args={[radius, 48, 32]} />
    </mesh>
  );
}
