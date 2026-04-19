import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface EnduranceProps {
  position?: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
}

/**
 * Procedurally constructed Endurance-inspired spacecraft.
 *
 * Architecture:
 *  - 12 modules arranged radially around a central spine (Endurance's iconic
 *    ring layout). Three module types: command, hab, lab. The ring rotates
 *    slowly to evoke artificial gravity.
 *  - A central docking spine with the command pod facing forward.
 *  - Subtle emissive running lights and small thruster hints.
 *
 * This is structured so a real GLB asset can later be dropped in alongside it
 * and the procedural geometry replaced with `<primitive object={gltf.scene} />`.
 */
export function Endurance({
  position = [0, 0, 0],
  scale = 1,
  rotationSpeed = 0.18,
}: EnduranceProps) {
  const ringRef = useRef<THREE.Group>(null);
  const lightsRef = useRef<THREE.Mesh>(null);

  const moduleData = useMemo(() => {
    const count = 12;
    const data: { type: "command" | "hab" | "lab"; angle: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const t: "command" | "hab" | "lab" =
        i === 0 ? "command" : i % 3 === 0 ? "lab" : "hab";
      data.push({ type: t, angle });
    }
    return data;
  }, []);

  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * rotationSpeed;
    if (lightsRef.current) {
      const m = lightsRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.7 + Math.sin(performance.now() * 0.002) * 0.15;
    }
  });

  const ringRadius = 5.5;

  return (
    <group position={position} scale={scale}>
      {/* Central spine */}
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.32, 8.5, 24]} />
        <meshStandardMaterial
          color="#c9ccd3"
          metalness={0.85}
          roughness={0.35}
        />
      </mesh>

      {/* Command pod (front of spine) */}
      <group position={[0, 4.6, 0]}>
        <mesh>
          <sphereGeometry args={[0.7, 24, 16]} />
          <meshStandardMaterial color="#dadde2" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <coneGeometry args={[0.4, 1.0, 16]} />
          <meshStandardMaterial color="#bfc3ca" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Cockpit emissive */}
        <mesh position={[0, 0.05, 0.7]}>
          <sphereGeometry args={[0.25, 12, 10]} />
          <meshBasicMaterial color="#9cc9ff" toneMapped={false} />
        </mesh>
      </group>

      {/* Aft engine block */}
      <group position={[0, -4.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.55, 0.4, 1.4, 16]} />
          <meshStandardMaterial color="#a6aab1" metalness={0.85} roughness={0.32} />
        </mesh>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 0.5, -0.6, Math.sin(a) * 0.5]}>
              <mesh>
                <cylinderGeometry args={[0.2, 0.14, 0.55, 12]} />
                <meshStandardMaterial color="#787c84" metalness={0.7} roughness={0.45} />
              </mesh>
              <mesh position={[0, -0.4, 0]}>
                <sphereGeometry args={[0.13, 10, 8]} />
                <meshBasicMaterial color="#7eb6ff" toneMapped={false} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Rotating ring of modules - the iconic habitat ring */}
      <group ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        {/* Connection truss ring */}
        <mesh>
          <torusGeometry args={[ringRadius, 0.05, 8, 96]} />
          <meshStandardMaterial color="#7d8086" metalness={0.6} roughness={0.5} />
        </mesh>
        {moduleData.map((m, i) => (
          <Module key={i} angle={m.angle} radius={ringRadius} type={m.type} />
        ))}
      </group>

      {/* Faint nav lights */}
      <mesh ref={lightsRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial
          color="#ffb070"
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

interface ModuleProps {
  angle: number;
  radius: number;
  type: "command" | "hab" | "lab";
}

function Module({ angle, radius, type }: ModuleProps) {
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  // Modules face outward from the ring center (their long axis = radial)
  // Normalize using look-at via group rotation:
  const rotZ = angle - Math.PI / 2;

  const config = {
    command: {
      length: 1.6,
      width: 0.7,
      color: "#d8dce2",
      windowColor: "#9bd4ff",
    },
    hab: {
      length: 1.4,
      width: 0.6,
      color: "#c2c5cb",
      windowColor: "#ffd49b",
    },
    lab: {
      length: 1.5,
      width: 0.55,
      color: "#a8acb2",
      windowColor: "#cfffd8",
    },
  }[type];

  return (
    <group position={[x, y, 0]} rotation={[0, 0, rotZ]}>
      {/* Connecting strut */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
        <meshStandardMaterial color="#7c8087" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.2, 0]}>
        <capsuleGeometry args={[config.width / 2, config.length, 6, 12]} />
        <meshStandardMaterial
          color={config.color}
          metalness={0.7}
          roughness={0.45}
        />
      </mesh>

      {/* Windows - small emissive strip */}
      <mesh position={[0, 0.2, config.width / 2 + 0.01]}>
        <planeGeometry args={[config.length * 0.6, 0.08]} />
        <meshBasicMaterial color={config.windowColor} toneMapped={false} />
      </mesh>
    </group>
  );
}
