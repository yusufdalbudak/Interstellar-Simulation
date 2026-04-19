import { useEffect, useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useAppStore } from "@/systems/state/store";
import { useFreeFlyControls } from "./useFreeFlyControls";
import { CinematicCamera } from "./CinematicCamera";
import { useAstronaut } from "@/entities/Astronaut/AstronautContext";
import { getSceneTarget } from "./sceneTargets";
import { shipState } from "@/entities/PlayerShip/ShipContext";

/**
 * Picks the right camera controller for the current scene + camera mode.
 *  - freeFly:      WASD + mouse-look free flight
 *  - orbit:        drei OrbitControls around the scene's natural target
 *  - thirdPerson:  follow camera behind the astronaut
 *  - cinematic:    scripted camera path
 *  - ship:         third-person chase behind the player ship
 *  - cockpit:      first-person view from the ship cockpit
 */
export function CameraRig() {
  const scene = useAppStore((s) => s.scene);
  const mode = useAppStore((s) => s.cameraMode);

  return (
    <>
      {mode === "orbit" && <OrbitMode />}
      {mode === "freeFly" && <FreeFlyMode />}
      {mode === "thirdPerson" && <ThirdPersonMode />}
      {mode === "cinematic" && <CinematicCamera scene={scene} />}
      {mode === "ship" && <ShipChaseMode />}
      {mode === "cockpit" && <ShipCockpitMode />}
    </>
  );
}

function OrbitMode() {
  const scene = useAppStore((s) => s.scene);
  const target = useMemo(() => getSceneTarget(scene), [scene]);
  const { camera } = useThree();

  useEffect(() => {
    const offset = new THREE.Vector3(
      target.distance * 0.7,
      target.distance * 0.4,
      target.distance,
    );
    camera.position.copy(new THREE.Vector3(...target.position).add(offset));
    camera.lookAt(...target.position);
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.06}
      target={target.position}
      minDistance={target.minDistance}
      maxDistance={target.maxDistance}
      rotateSpeed={0.5}
      zoomSpeed={0.7}
    />
  );
}

function FreeFlyMode() {
  useFreeFlyControls();
  return null;
}

function ThirdPersonMode() {
  const { camera } = useThree();
  const astro = useAstronaut();
  const desired = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!astro?.group) return;
    const yaw = astro.yaw;
    const back = 5.5;
    const up = 2.2;
    const offset = new THREE.Vector3(
      Math.sin(yaw) * back,
      up,
      Math.cos(yaw) * back,
    );
    desired.current.copy(astro.group.position).add(offset);
    const lerp = 1 - Math.pow(0.0008, delta);
    camera.position.lerp(desired.current, lerp);
    lookAt.current
      .copy(astro.group.position)
      .add(new THREE.Vector3(0, 1.4, 0));
    camera.lookAt(lookAt.current);
  });

  return null;
}

const _shipChaseDesired = new THREE.Vector3();
const _shipChaseTarget = new THREE.Vector3();
const _shipChaseUp = new THREE.Vector3(0, 1, 0);
const _shipChaseOffset = new THREE.Vector3();

function ShipChaseMode() {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!shipState.group) return;
    const speedFactor = THREE.MathUtils.clamp(
      shipState.velocity.length() / 60,
      0,
      1,
    );

    // Chase behind and slightly above. Pull back further as speed increases for
    // a sense of motion.
    _shipChaseOffset
      .set(0, 1.4 + speedFactor * 0.4, 5.5 + speedFactor * 2.4)
      .applyQuaternion(shipState.quaternion);

    _shipChaseDesired.copy(shipState.position).add(_shipChaseOffset);

    const lerp = 1 - Math.pow(0.0006, delta);
    camera.position.lerp(_shipChaseDesired, lerp);

    // Look slightly ahead of the ship along its forward vector so the user
    // sees where they're going.
    _shipChaseTarget
      .copy(shipState.forward)
      .multiplyScalar(8)
      .add(shipState.position);
    camera.lookAt(_shipChaseTarget);

    // Keep camera up vector aligned with ship roll for a proper chase feel
    _shipChaseUp.set(0, 1, 0).applyQuaternion(shipState.quaternion);
    camera.up.lerp(_shipChaseUp, 1 - Math.pow(0.01, delta));
  });

  return null;
}

const _cockpitOffset = new THREE.Vector3();
const _cockpitTarget = new THREE.Vector3();
const _cockpitUp = new THREE.Vector3();

function ShipCockpitMode() {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!shipState.group) return;
    // Slight forward + slightly above ship origin = cockpit eye position.
    _cockpitOffset.set(0, 0.32, -0.25).applyQuaternion(shipState.quaternion);
    camera.position.copy(shipState.position).add(_cockpitOffset);

    _cockpitTarget
      .copy(shipState.forward)
      .multiplyScalar(50)
      .add(shipState.position);
    camera.lookAt(_cockpitTarget);

    _cockpitUp.set(0, 1, 0).applyQuaternion(shipState.quaternion);
    camera.up.lerp(_cockpitUp, 1 - Math.pow(0.0001, delta));
  });

  return null;
}
