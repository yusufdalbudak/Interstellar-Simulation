import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useAstronautRegistration } from "./AstronautContext";

export interface AstronautProps {
  /** Surface mode = walking under gravity, EVA = floating zero-G */
  mode: "surface" | "eva";
  /** Initial position */
  position?: [number, number, number];
  /** Surface mode: ground sampler */
  groundY?: (x: number, z: number) => number;
  /** Surface mode: clamp the explorer inside this radius */
  bounds?: number;
  /** Visual scale */
  scale?: number;
  /** Disable input (for cinematic / orbit modes) */
  inputEnabled?: boolean;
}

/**
 * Stylized Cooper-like astronaut. Built from primitives for a clean readable
 * silhouette: helmet with golden visor, suit body, life-support pack, limbs.
 *
 * Locomotion:
 *   - surface: WASD relative to camera, jump on Space, gravity, rough ground
 *   - eva: 6-DOF drift; Space ascends, Ctrl descends; momentum decays slowly
 *
 * Animation is faked with transform-based limb sway proportional to speed,
 * which reads convincingly without a skeletal rig.
 */
export function Astronaut({
  mode,
  position = [0, 0, 0],
  groundY,
  bounds = 60,
  scale = 1,
  inputEnabled = true,
}: AstronautProps) {
  const group = useRef<THREE.Group>(null!);
  const limbState = useRef({ swing: 0 });
  const velocity = useRef(new THREE.Vector3());
  const yawRef = useRef(0);
  const grounded = useRef(true);
  const keys = useRef<Record<string, boolean>>({});
  const { camera } = useThree();
  const { setGroup, setYaw } = useAstronautRegistration();

  // References to limbs we animate
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  useEffect(() => {
    setGroup(group.current);
    return () => setGroup(null);
  }, [setGroup]);

  useEffect(() => {
    if (!inputEnabled) return;
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [inputEnabled]);

  // Mouse drag yaws the astronaut (third-person feel)
  useEffect(() => {
    if (!inputEnabled) return;
    let dragging = false;
    const down = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) dragging = true;
    };
    const up = () => (dragging = false);
    const move = (e: MouseEvent) => {
      if (!dragging) return;
      yawRef.current -= e.movementX * 0.0028;
    };
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
    };
  }, [inputEnabled]);

  useFrame((_, delta) => {
    if (!group.current) return;

    const k = keys.current;
    const yaw = yawRef.current;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

    if (mode === "surface") {
      const speed = (k["ShiftLeft"] || k["ShiftRight"] ? 9.0 : 4.2);
      const move = new THREE.Vector3();
      if (inputEnabled) {
        if (k["KeyW"]) move.add(forward);
        if (k["KeyS"]) move.sub(forward);
        if (k["KeyD"]) move.add(right);
        if (k["KeyA"]) move.sub(right);
      }
      if (move.lengthSq() > 0) move.normalize();

      velocity.current.x = THREE.MathUtils.damp(velocity.current.x, move.x * speed, 8, delta);
      velocity.current.z = THREE.MathUtils.damp(velocity.current.z, move.z * speed, 8, delta);

      // Gravity + jump
      velocity.current.y -= 18 * delta;
      if (k["Space"] && grounded.current && inputEnabled) {
        velocity.current.y = 7;
        grounded.current = false;
      }

      group.current.position.addScaledVector(velocity.current, delta);

      const gy = groundY ? groundY(group.current.position.x, group.current.position.z) : 0;
      if (group.current.position.y <= gy) {
        group.current.position.y = gy;
        velocity.current.y = 0;
        grounded.current = true;
      }

      // Bounds clamp
      const r = Math.hypot(group.current.position.x, group.current.position.z);
      if (r > bounds) {
        const s = bounds / r;
        group.current.position.x *= s;
        group.current.position.z *= s;
      }

      // Limb swing scaled by ground speed
      const planarSpeed = Math.hypot(velocity.current.x, velocity.current.z);
      limbState.current.swing += planarSpeed * delta * 1.3;
      const swing = limbState.current.swing;
      const amp = THREE.MathUtils.clamp(planarSpeed / 8, 0, 1) * 0.7;

      if (armL.current) armL.current.rotation.x = Math.sin(swing * 4) * amp;
      if (armR.current) armR.current.rotation.x = -Math.sin(swing * 4) * amp;
      if (legL.current) legL.current.rotation.x = -Math.sin(swing * 4) * amp;
      if (legR.current) legR.current.rotation.x = Math.sin(swing * 4) * amp;

      // Body bob
      group.current.position.y += Math.sin(swing * 8) * amp * 0.05;
    } else {
      // EVA drift
      const speed = (k["ShiftLeft"] || k["ShiftRight"] ? 7 : 3) * delta;
      if (inputEnabled) {
        if (k["KeyW"]) velocity.current.addScaledVector(forward, speed);
        if (k["KeyS"]) velocity.current.addScaledVector(forward, -speed);
        if (k["KeyA"]) velocity.current.addScaledVector(right, -speed);
        if (k["KeyD"]) velocity.current.addScaledVector(right, speed);
        if (k["Space"]) velocity.current.y += speed;
        if (k["ControlLeft"] || k["ControlRight"]) velocity.current.y -= speed;
      }
      // Slow drift damping (zero-G)
      velocity.current.multiplyScalar(Math.pow(0.6, delta));
      group.current.position.addScaledVector(velocity.current, delta);

      // Faint floating limb sway
      const t = performance.now() * 0.001;
      if (armL.current) armL.current.rotation.x = Math.sin(t * 0.7) * 0.18;
      if (armR.current) armR.current.rotation.x = Math.cos(t * 0.5) * 0.18;
      if (legL.current) legL.current.rotation.x = Math.sin(t * 0.4) * 0.12;
      if (legR.current) legR.current.rotation.x = Math.cos(t * 0.6) * 0.12;
    }

    // Apply yaw
    group.current.rotation.y = yawRef.current;
    setYaw(yawRef.current);

    // Cap velocity
    velocity.current.x = THREE.MathUtils.clamp(velocity.current.x, -30, 30);
    velocity.current.z = THREE.MathUtils.clamp(velocity.current.z, -30, 30);
  });

  // Suit materials
  const suitMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e2e6ec", roughness: 0.5, metalness: 0.06 }),
    [],
  );
  const accentMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#9ca0a8", roughness: 0.55, metalness: 0.18 }),
    [],
  );
  const helmetMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ebeef2",
        roughness: 0.32,
        metalness: 0.25,
      }),
    [],
  );
  // Iconic Cooper-style golden reflective visor.
  const visorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a2607",
        roughness: 0.12,
        metalness: 1.0,
        emissive: new THREE.Color("#8a5a16"),
        emissiveIntensity: 0.55,
      }),
    [],
  );

  // Subtle breathing-style emissive on chest panel
  const chestRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!chestRef.current) return;
    const m = chestRef.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.45 + Math.sin(performance.now() * 0.003) * 0.1;
    camera; // referenced for potential future first-person logic
  });

  return (
    <group ref={group} position={position} scale={scale}>
      {/* Torso */}
      <mesh position={[0, 1.05, 0]} material={suitMat}>
        <capsuleGeometry args={[0.28, 0.55, 6, 14]} />
      </mesh>

      {/* Chest control panel - small, restrained, slight emissive */}
      <mesh ref={chestRef} position={[0, 1.18, 0.29]}>
        <planeGeometry args={[0.18, 0.10]} />
        <meshStandardMaterial
          color="#11151b"
          emissive="#3d6c95"
          emissiveIntensity={0.4}
          roughness={0.45}
        />
      </mesh>
      {/* Suit collar/seam under helmet */}
      <mesh position={[0, 1.42, 0]} material={accentMat}>
        <torusGeometry args={[0.27, 0.04, 8, 24]} />
      </mesh>

      {/* Backpack life-support pack */}
      <mesh position={[0, 1.05, -0.30]} material={accentMat}>
        <boxGeometry args={[0.5, 0.65, 0.22]} />
      </mesh>
      <mesh position={[-0.18, 1.05, -0.46]} material={accentMat}>
        <cylinderGeometry args={[0.06, 0.06, 0.55, 10]} />
      </mesh>
      <mesh position={[0.18, 1.05, -0.46]} material={accentMat}>
        <cylinderGeometry args={[0.06, 0.06, 0.55, 10]} />
      </mesh>

      {/* Helmet (slightly oblong like a real EVA helmet) */}
      <mesh position={[0, 1.7, 0]} material={helmetMat} scale={[1, 1.05, 1.05]}>
        <sphereGeometry args={[0.30, 28, 22]} />
      </mesh>
      {/* Visor - golden curved band across the helmet front */}
      <mesh position={[0, 1.71, 0.02]} material={visorMat} scale={[1, 0.7, 1.06]}>
        <sphereGeometry
          args={[0.28, 28, 18, -Math.PI / 2, Math.PI, Math.PI / 4, Math.PI / 2.2]}
        />
      </mesh>
      {/* Helmet bands (top + side) */}
      <mesh position={[0, 1.95, 0]} material={accentMat}>
        <torusGeometry args={[0.16, 0.03, 8, 18]} />
      </mesh>

      {/* Arms - tucked closer to body */}
      <group ref={armL} position={[-0.32, 1.25, 0]}>
        <mesh material={suitMat} position={[0, -0.35, 0]}>
          <capsuleGeometry args={[0.09, 0.5, 4, 10]} />
        </mesh>
        <mesh material={accentMat} position={[0, -0.65, 0]}>
          <sphereGeometry args={[0.10, 10, 8]} />
        </mesh>
      </group>
      <group ref={armR} position={[0.32, 1.25, 0]}>
        <mesh material={suitMat} position={[0, -0.35, 0]}>
          <capsuleGeometry args={[0.09, 0.5, 4, 10]} />
        </mesh>
        <mesh material={accentMat} position={[0, -0.65, 0]}>
          <sphereGeometry args={[0.10, 10, 8]} />
        </mesh>
      </group>

      {/* Legs */}
      <group ref={legL} position={[-0.14, 0.55, 0]}>
        <mesh material={suitMat} position={[0, -0.4, 0]}>
          <capsuleGeometry args={[0.12, 0.6, 4, 10]} />
        </mesh>
        <mesh position={[0, -0.85, 0.05]} material={accentMat}>
          <boxGeometry args={[0.24, 0.13, 0.34]} />
        </mesh>
      </group>
      <group ref={legR} position={[0.14, 0.55, 0]}>
        <mesh material={suitMat} position={[0, -0.4, 0]}>
          <capsuleGeometry args={[0.12, 0.6, 4, 10]} />
        </mesh>
        <mesh position={[0, -0.85, 0.05]} material={accentMat}>
          <boxGeometry args={[0.24, 0.13, 0.34]} />
        </mesh>
      </group>
    </group>
  );
}
