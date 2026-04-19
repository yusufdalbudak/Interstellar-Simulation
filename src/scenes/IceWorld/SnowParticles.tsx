import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface Props {
  count?: number;
  radius?: number;
}

/** Slow drifting snow particles within a cylindrical volume around origin. */
export function SnowParticles({ count = 1500, radius = 100 }: Props) {
  const ref = useRef<THREE.Points>(null);

  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * radius * 2;
      positions[i * 3 + 1] = Math.random() * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
      velocities[i * 3 + 1] = -0.3 - Math.random() * 0.6;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, velocities };
  }, [count, radius]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const pos = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] += velocities[i * 3 + 0] * delta;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta;
      // Wrap when below ground
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 0] = (Math.random() - 0.5) * radius * 2;
        pos[i * 3 + 1] = 30 + Math.random() * 5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
      }
    }
    (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#ffffff"
        size={0.18}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
