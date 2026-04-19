import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useDocking } from "@/systems/docking/useDocking";

interface Props {
  position?: [number, number, number];
  /** World-space orientation of the docking port (forward = +Z of station) */
  rotation?: [number, number, number];
  scale?: number;
  name?: string;
}

/**
 * Orbital docking station — a small rotating habitat ring with a forward-facing
 * docking arm. Exposes a docking port whose forward axis is +Z in local space.
 *
 * Used by the docking system: it reads the station's world position + a
 * derived "approach axis" to compute distance, alignment, and approach speed.
 */
export function DockingStation({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  name = "Orbital Station",
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);
  const portRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);

  // Plug into docking logic. The "port" mesh's world transform defines the
  // approach axis (its local +Z is the approach vector).
  useDocking({
    name,
    portRef,
  });

  const hullMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#bdc1c8",
        metalness: 0.85,
        roughness: 0.4,
      }),
    [],
  );
  const darkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2c3036",
        metalness: 0.6,
        roughness: 0.6,
      }),
    [],
  );
  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#86908a",
        metalness: 0.5,
        roughness: 0.55,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.06;
    if (beaconRef.current) {
      const m = beaconRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.6 + Math.sin(performance.now() * 0.005) * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* Central spine (along Y) */}
      <mesh material={hullMat} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 7, 24]} />
      </mesh>

      {/* Solar panel arrays */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, side * 3.2, 0]}>
          <mesh material={darkMat}>
            <boxGeometry args={[7.5, 0.05, 1.6]} />
          </mesh>
          {/* Panel cell pattern */}
          <mesh position={[0, 0.03, 0]}>
            <planeGeometry args={[7.4, 1.5]} />
            <meshStandardMaterial
              color="#1a3a6a"
              metalness={0.4}
              roughness={0.35}
              emissive="#0a1a3a"
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
      ))}

      {/* Habitat ring */}
      <group ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={hullMat}>
          <torusGeometry args={[3.2, 0.55, 16, 64]} />
        </mesh>
        {/* Spokes */}
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={i}
              material={accentMat}
              position={[Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0]}
              rotation={[0, 0, a]}
            >
              <boxGeometry args={[3.0, 0.1, 0.1]} />
            </mesh>
          );
        })}
        {/* Window strip */}
        <mesh>
          <torusGeometry args={[3.2, 0.18, 8, 96]} />
          <meshBasicMaterial color="#ffd49b" toneMapped={false} />
        </mesh>
      </group>

      {/* Docking arm pointing along +Z (the "front" of the station) */}
      <group position={[0, 0, 4.0]}>
        <mesh material={accentMat} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.55, 1.6, 16]} />
        </mesh>
        {/* Docking collar */}
        <mesh material={hullMat} position={[0, 0, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.4, 24, 1, true]} />
        </mesh>
        {/* Inner port marker — its world +Z is the approach vector */}
        <mesh
          ref={portRef}
          position={[0, 0, 1.2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.55, 0.7, 24]} />
          <meshBasicMaterial
            color="#ffae5a"
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {/* Approach guide lights */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.7, Math.sin(a) * 0.7, 1.25]}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color="#5cff8c" toneMapped={false} />
            </mesh>
          );
        })}
      </group>

      {/* Strobe beacon */}
      <mesh ref={beaconRef} position={[0, 0, -3.6]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshBasicMaterial
          color="#ff5c5c"
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
