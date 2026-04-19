import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface Props {
  position: [number, number, number];
}

/** Abandoned research beacon: tripod, antenna, and a pulsing red light. */
export function Beacon({ position }: Props) {
  const lightRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!lightRef.current) return;
    const m = lightRef.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.4 + (Math.sin(performance.now() * 0.004) * 0.5 + 0.5) * 0.6;
  });

  return (
    <group position={position}>
      {/* Tripod base */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.4, 0.6, Math.sin(a) * 0.4]}
            rotation={[0, a, Math.PI / 9]}
          >
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshStandardMaterial color="#3a3f47" metalness={0.6} roughness={0.5} />
          </mesh>
        );
      })}

      {/* Vertical mast */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2, 8]} />
        <meshStandardMaterial color="#5a6068" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Antenna dish */}
      <mesh position={[0, 2.5, 0]} rotation={[Math.PI / 6, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.4, 0.1, 24]} />
        <meshStandardMaterial color="#bcc1c8" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Pulsing red light */}
      <mesh ref={lightRef} position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshBasicMaterial color="#ff5050" transparent opacity={1} toneMapped={false} />
      </mesh>
    </group>
  );
}
