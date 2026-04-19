import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CelestialBody } from "@/entities/CelestialBody/CelestialBody";
import { OrbitGuide } from "@/systems/environment/OrbitGuide";
import { SOLAR_BODIES } from "./bodies";
import { useAppStore } from "@/systems/state/store";

/**
 * Solar System scene.
 *
 * Each body is placed in a circular orbit around the origin (the Sun). A
 * shared time uniform drives orbital position so the whole system animates
 * coherently. Selecting a body in the navigation panel highlights it and
 * issuing "Travel to X" eases the camera to a flattering inspection distance.
 */
export function SolarSystemScene() {
  const showOrbits = useAppStore((s) => s.toggles.orbitLines);
  const labels = useAppStore((s) => s.toggles.labels);
  const selected = useAppStore((s) => s.navigation.selectedBody);
  const setSelected = useAppStore((s) => s.setSelectedBody);
  const travelTarget = useAppStore((s) => s.navigation.travelTarget);
  const setTravelTarget = useAppStore((s) => s.setTravelTarget);
  const cameraMode = useAppStore((s) => s.cameraMode);

  // Refs to each body's group so we can read their live world position
  const bodyRefs = useRef<Map<string, THREE.Group>>(new Map());

  // Sun direction is the unit vector from a body towards the origin (sun)
  const tmpDir = useMemo(() => new THREE.Vector3(), []);

  return (
    <>
      <ambientLight intensity={0.05} color="#5b6f99" />
      {/* Strong directional from origin to give the sense the sun is the only light */}
      <pointLight position={[0, 0, 0]} intensity={2.4} distance={400} color="#fff0d0" />

      {/* Orbit rings — subtle, tilted by each body's inclination */}
      {showOrbits &&
        SOLAR_BODIES.filter((b) => b.orbitRadius > 0).map((b) => (
          <OrbitGuide
            key={b.id}
            radius={b.orbitRadius}
            inclination={b.inclination ?? 0}
          />
        ))}

      {/* The Sun sits at origin */}
      {SOLAR_BODIES.map((body) => (
        <OrbitingBody
          key={body.id}
          bodyId={body.id}
          register={(g) => {
            if (g) bodyRefs.current.set(body.id, g);
            else bodyRefs.current.delete(body.id);
          }}
          tmpDir={tmpDir}
          showLabel={labels && cameraMode !== "ship"}
          onClickLabel={() => setSelected(body.id)}
          isSelected={selected === body.id}
        />
      ))}

      {/* Asteroid belt impression between Mars and Jupiter */}
      <AsteroidBelt count={420} inner={35} outer={40} />

      {/* Travel autopilot — eases the camera to the selected body when triggered */}
      <TravelDriver
        targetId={travelTarget}
        bodyRefs={bodyRefs.current}
        onArrive={() => setTravelTarget(null)}
      />
    </>
  );
}

interface OrbitingBodyProps {
  bodyId: string;
  register: (g: THREE.Group | null) => void;
  tmpDir: THREE.Vector3;
  showLabel: boolean;
  onClickLabel: () => void;
  isSelected: boolean;
}

function OrbitingBody({
  bodyId,
  register,
  tmpDir,
  showLabel,
  onClickLabel,
  isSelected,
}: OrbitingBodyProps) {
  const body = useMemo(() => SOLAR_BODIES.find((b) => b.id === bodyId)!, [bodyId]);
  const groupRef = useRef<THREE.Group>(null);
  const sunDir = useRef(new THREE.Vector3(1, 0, 0));

  useEffect(() => {
    register(groupRef.current);
    return () => register(null);
  }, [register]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    if (body.orbitRadius > 0) {
      const angle = body.phase + t * body.orbitSpeed * 0.12;
      // Apply inclination as a tilt about the orbital line of nodes (X axis):
      // the in-plane (cos,sin) trajectory is rotated about the X axis by the
      // inclination angle, giving a small Y component. Real solar-system
      // inclinations are tiny but readable here.
      const inc = body.inclination ?? 0;
      const cx = Math.cos(angle) * body.orbitRadius;
      const sz = Math.sin(angle) * body.orbitRadius;
      groupRef.current.position.set(
        cx,
        sz * Math.sin(inc),
        sz * Math.cos(inc),
      );
      // Sun direction = from body to origin
      tmpDir
        .copy(groupRef.current.position)
        .multiplyScalar(-1)
        .normalize();
      sunDir.current.copy(tmpDir);
    } else {
      groupRef.current.position.set(0, 0, 0);
    }
  });

  return (
    <group ref={groupRef}>
      <CelestialBody body={body} sunDirection={sunDir.current} />
      {showLabel && (
        <Html
          position={[0, body.radius * 1.6 + 0.6, 0]}
          center
          style={{ pointerEvents: "auto" }}
        >
          <button
            className={`body-label ${isSelected ? "active" : ""}`}
            onClick={onClickLabel}
          >
            {body.name}
          </button>
        </Html>
      )}
    </group>
  );
}

function AsteroidBelt({
  count,
  inner,
  outer,
}: {
  count: number;
  inner: number;
  outer: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    const arr: { r: number; phase: number; y: number; size: number; speed: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        r: inner + Math.random() * (outer - inner),
        phase: Math.random() * Math.PI * 2,
        y: (Math.random() - 0.5) * 0.6,
        size: 0.04 + Math.random() * 0.1,
        speed: 0.04 + Math.random() * 0.05,
      });
    }
    return arr;
  }, [count, inner, outer]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const angle = p.phase + t * p.speed;
      dummy.position.set(Math.cos(angle) * p.r, p.y, Math.sin(angle) * p.r);
      dummy.scale.setScalar(p.size);
      dummy.rotation.set(t * p.speed, t * p.speed * 0.3, 0);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#7a6f5a" roughness={0.9} metalness={0.1} />
    </instancedMesh>
  );
}

/**
 * Smoothly eases the active camera to a flattering inspection distance from
 * the selected body. Only active when the user explicitly issues a "Travel"
 * command — otherwise the chosen camera mode controls the view.
 */
function TravelDriver({
  targetId,
  bodyRefs,
  onArrive,
}: {
  targetId: string | null;
  bodyRefs: Map<string, THREE.Group>;
  onArrive: () => void;
}) {
  const { camera } = useThree();
  const setMode = useAppStore.getState().setCameraMode;
  const t = useRef(0);
  const start = useRef(new THREE.Vector3());
  const startLook = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    if (targetId) {
      // Lock to cinematic during transit, then freelook on arrival
      setMode("cinematic");
      t.current = 0;
      start.current.copy(camera.position);
      const look = new THREE.Vector3();
      camera.getWorldDirection(look);
      startLook.current.copy(camera.position).add(look.multiplyScalar(20));
    }
  }, [targetId, camera, setMode]);

  useFrame((state, delta) => {
    if (!targetId) return;
    const group = bodyRefs.get(targetId);
    if (!group) return;
    const body = SOLAR_BODIES.find((b) => b.id === targetId);
    if (!body) return;

    t.current = Math.min(1, t.current + delta * 0.45);
    const k = easeInOut(t.current);

    // Inspection distance scales with body radius; sun gets more clearance
    const dist = body.radius * (body.type === "star" ? 4.0 : 5.5);
    // Inspection offset relative to body position
    targetPos.current
      .copy(group.position)
      .add(new THREE.Vector3(dist * 0.7, dist * 0.4, dist));

    tmp.current.copy(start.current).lerp(targetPos.current, k);
    camera.position.copy(tmp.current);
    camera.lookAt(group.position);

    if (t.current >= 1) {
      // Arrival — pop into orbit mode targeted at the body
      setMode("orbit");
      // Note: the orbit camera derives target from getSceneTarget(scene), so
      // we instead let the user enjoy the cinematic position; the arrival
      // simply ends.
      onArrive();
    }
    // Avoid unused warning for state
    void state;
  });

  return null;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
