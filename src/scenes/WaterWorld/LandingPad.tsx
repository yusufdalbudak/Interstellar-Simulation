import { useMemo } from "react";
import * as THREE from "three";

interface Props {
  position: [number, number, number];
  radius?: number;
}

/**
 * Lander/landing platform placeholder. Industrial wet-metal disc with three
 * landing struts and a faint emissive central marker. The astronaut spawns
 * on top of it.
 */
export function LandingPad({ position, radius = 6 }: Props) {
  const padMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#a3a8af", metalness: 0.7, roughness: 0.4 }),
    [],
  );
  const strutMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2c3138", metalness: 0.6, roughness: 0.55 }),
    [],
  );

  return (
    <group position={position}>
      {/* Disc */}
      <mesh position={[0, 0.4, 0]} material={padMat}>
        <cylinderGeometry args={[radius, radius * 0.95, 0.3, 48]} />
      </mesh>
      {/* Beveled top */}
      <mesh position={[0, 0.6, 0]} material={padMat}>
        <cylinderGeometry args={[radius * 0.92, radius, 0.2, 48]} />
      </mesh>
      {/* Center marker - small, restrained */}
      <mesh position={[0, 0.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.7, radius * 0.74, 64]} />
        <meshBasicMaterial color="#f5b46c" toneMapped={false} transparent opacity={0.55} />
      </mesh>
      {/* Three landing struts */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        const x = Math.cos(a) * radius * 0.85;
        const z = Math.sin(a) * radius * 0.85;
        return (
          <mesh key={i} position={[x, 0.1, z]} material={strutMat}>
            <cylinderGeometry args={[0.18, 0.25, 0.6, 10]} />
          </mesh>
        );
      })}
    </group>
  );
}
