import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { shipState, useShipMeta } from "./ShipContext";
import { useShipController } from "@/systems/flight/useShipController";
import { useAppStore } from "@/systems/state/store";

interface Props {
  /** Initial spawn position */
  spawn?: [number, number, number];
  /** Initial orientation as Euler XYZ */
  spawnRotation?: [number, number, number];
  /** Whether flight controls are active (otherwise ship is inert) */
  controllable?: boolean;
  /** Visual scale */
  scale?: number;
}

/**
 * Player-pilotable Ranger-inspired exploration craft.
 *
 * Built procedurally so it loads instantly and stays cohesive with the rest of
 * the simulation. Architecture is intentionally compact and engineered:
 *
 *   - swept fuselage with a forward cockpit canopy
 *   - twin nacelle pods on stub wings
 *   - rear thrust block with a glowing main thruster
 *   - dorsal RCS strip & nav lights for scale
 *
 * The mesh is registered with the global ship state so the camera rig and
 * docking system can read the live transform without prop drilling.
 */
export function PlayerShip({
  spawn = [0, 0, 0],
  spawnRotation = [0, 0, 0],
  controllable = true,
  scale = 1,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const thrusterRef = useRef<THREE.Mesh>(null);
  const navLightRef = useRef<THREE.Mesh>(null);
  const setHasShip = useShipMeta((s) => s.setHasShip);
  const cameraMode = useAppStore((s) => s.cameraMode);

  // Run the flight controller — it will only consume input when controllable
  // and a ship/cockpit camera is active.
  useShipController({
    enabled:
      controllable && (cameraMode === "ship" || cameraMode === "cockpit"),
  });

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(...spawn);
    groupRef.current.rotation.set(...spawnRotation);
    shipState.setGroup(groupRef.current);
    shipState.position.copy(groupRef.current.position);
    shipState.quaternion.copy(groupRef.current.quaternion);
    shipState.velocity.set(0, 0, 0);
    setHasShip(true);
    return () => {
      shipState.setGroup(null);
      setHasShip(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    // Sync shared ship state every frame (controller may have moved us)
    if (groupRef.current) {
      shipState.position.copy(groupRef.current.position);
      shipState.quaternion.copy(groupRef.current.quaternion);
      shipState.forward
        .set(0, 0, -1)
        .applyQuaternion(groupRef.current.quaternion);
    }

    // Animate thruster glow with throttle
    const throttle = useAppStore.getState().ship.throttle;
    if (thrusterRef.current) {
      const m = thrusterRef.current.material as THREE.MeshBasicMaterial;
      const target = 0.25 + Math.max(0, throttle) * 1.4;
      m.opacity = THREE.MathUtils.lerp(
        m.opacity,
        target,
        1 - Math.pow(0.001, delta),
      );
      const baseScale = 1 + Math.max(0, throttle) * 1.6;
      thrusterRef.current.scale.set(baseScale, baseScale, baseScale * 1.6);
    }

    if (navLightRef.current) {
      const m = navLightRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.55 + Math.sin(performance.now() * 0.004) * 0.35;
    }
  });

  // Materials shared across the ship for visual cohesion
  const hullMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c4c8cf",
        metalness: 0.85,
        roughness: 0.32,
      }),
    [],
  );
  const darkHullMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5a5e66",
        metalness: 0.7,
        roughness: 0.5,
      }),
    [],
  );
  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1d22",
        metalness: 0.8,
        roughness: 0.45,
      }),
    [],
  );
  const canopyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0e1622",
        metalness: 0.4,
        roughness: 0.08,
        transmission: 0.25,
        thickness: 0.4,
        ior: 1.45,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        emissive: "#0a1a30",
        emissiveIntensity: 0.4,
      }),
    [],
  );

  return (
    <group ref={groupRef} scale={scale}>
      {/* === Main fuselage === */}
      <mesh material={hullMat} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.55, 2.2, 8, 16]} />
      </mesh>

      {/* Nose cone */}
      <mesh material={hullMat} position={[0, 0, -1.85]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 0.9, 16]} />
      </mesh>

      {/* Cockpit canopy */}
      <mesh material={canopyMat} position={[0, 0.32, -0.85]} rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Canopy frame */}
      <mesh material={accentMat} position={[0, 0.32, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.025, 8, 24]} />
      </mesh>

      {/* === Wings (stub delta) === */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.62, -0.05, 0.2]}>
          {/* Wing body */}
          <mesh material={darkHullMat} rotation={[0, 0, side * 0.18]}>
            <boxGeometry args={[1.2, 0.08, 1.4]} />
          </mesh>
          {/* Leading edge accent */}
          <mesh
            material={accentMat}
            position={[side * 0.55, 0, -0.7]}
            rotation={[0, 0, side * 0.18]}
          >
            <boxGeometry args={[0.15, 0.1, 0.05]} />
          </mesh>
          {/* Wingtip nav light */}
          <mesh position={[side * 1.1, 0, -0.55]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial
              color={side > 0 ? "#ff5c5c" : "#5cff8c"}
              toneMapped={false}
            />
          </mesh>
          {/* Engine nacelle pod */}
          <mesh
            material={hullMat}
            position={[side * 0.85, -0.05, 0.55]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <capsuleGeometry args={[0.18, 0.7, 6, 12]} />
          </mesh>
          {/* Nacelle thrust glow */}
          <mesh
            position={[side * 0.85, -0.05, 1.0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.12, 0.32, 12]} />
            <meshBasicMaterial
              color="#7eb6ff"
              transparent
              opacity={0.65}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* === Rear thrust block === */}
      <mesh material={darkHullMat} position={[0, 0, 1.25]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.7, 16]} />
      </mesh>
      {/* Main thruster nozzle */}
      <mesh material={accentMat} position={[0, 0, 1.65]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.42, 0.28, 16, 1, true]} />
      </mesh>
      {/* Main thrust glow (animated by throttle) */}
      <mesh
        ref={thrusterRef}
        position={[0, 0, 1.95]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[0.32, 1.6, 18, 1, true]} />
        <meshBasicMaterial
          color="#aed6ff"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dorsal antenna / sensor mast */}
      <mesh material={accentMat} position={[0, 0.55, 0.4]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
      </mesh>
      <mesh position={[0, 0.85, 0.4]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#ffd28a" toneMapped={false} />
      </mesh>

      {/* Belly nav strobe */}
      <mesh ref={navLightRef} position={[0, -0.5, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial
          color="#ffeacc"
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Hull paneling - subtle dark stripe along the spine */}
      <mesh material={accentMat} position={[0, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.16, 0.005, 1.6]} />
      </mesh>
    </group>
  );
}
