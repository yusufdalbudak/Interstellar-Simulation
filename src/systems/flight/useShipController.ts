import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { shipState } from "@/entities/PlayerShip/ShipContext";
import { useAppStore } from "@/systems/state/store";

interface Options {
  enabled: boolean;
  /** Max thruster acceleration in units/sec^2 */
  maxThrust?: number;
  /** Boost multiplier */
  boostFactor?: number;
  /** Damping coefficient when "auto-stabilize" is on (Space) */
  stabilizeDamping?: number;
  /** Pitch/yaw/roll rates in rad/sec */
  rotationRate?: { pitch: number; yaw: number; roll: number };
}

/**
 * Six-DOF ship flight controller.
 *
 * Controls (when enabled):
 *   W / S       — forward / reverse thrust
 *   A / D       — yaw left / right
 *   Q / E       — roll left / right
 *   R / F       — translate up / down (vertical strafe)
 *   Mouse drag  — pitch / yaw (additional)
 *   Shift       — boost
 *   Space       — autostabilize (linear + angular damping)
 *   X           — hard brake (zero linear velocity smoothly)
 *
 * Flight feel: inertia-aware. Linear velocity persists with a tiny passive
 * drag. Angular velocity damps so the ship is always controllable.
 */
export function useShipController({
  enabled,
  maxThrust = 22,
  boostFactor = 3.5,
  stabilizeDamping = 0.06,
  rotationRate = { pitch: 1.4, yaw: 1.4, roll: 1.8 },
}: Options) {
  const { gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const angularInput = useRef({ pitch: 0, yaw: 0 });
  const dragging = useRef(false);
  const setShip = useAppStore.getState().setShipTelemetry;

  useEffect(() => {
    if (!enabled) {
      keys.current = {};
      angularInput.current = { pitch: 0, yaw: 0 };
      return;
    }
    const dom = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      keys.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        dragging.current = true;
        dom.requestPointerLock?.();
      }
    };
    const onMouseUp = () => {
      dragging.current = false;
      if (document.pointerLockElement === dom) document.exitPointerLock();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      angularInput.current.yaw += (e.movementX || 0) * 0.0022;
      angularInput.current.pitch += (e.movementY || 0) * 0.0022;
    };
    const onContext = (e: MouseEvent) => e.preventDefault();
    const onBlur = () => {
      keys.current = {};
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    dom.addEventListener("contextmenu", onContext);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      dom.removeEventListener("contextmenu", onContext);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled, gl]);

  const tmpForward = useRef(new THREE.Vector3());
  const tmpRight = useRef(new THREE.Vector3());
  const tmpUp = useRef(new THREE.Vector3());
  const tmpQ = useRef(new THREE.Quaternion());

  useFrame((_, delta) => {
    const group = shipState.group;
    if (!group) return;

    const k = keys.current;
    const boost = k["ShiftLeft"] || k["ShiftRight"] ? boostFactor : 1;

    // === Orientation ===
    // Compose pitch/yaw/roll from key + mouse input as local quaternions
    const pitchKeys =
      (k["KeyI"] ? -1 : 0) +
      (k["KeyK"] ? 1 : 0); // keyboard pitch (optional fallback)
    const yawKeys = (k["KeyA"] ? 1 : 0) + (k["KeyD"] ? -1 : 0);
    const rollKeys = (k["KeyQ"] ? 1 : 0) + (k["KeyE"] ? -1 : 0);

    const pitch =
      angularInput.current.pitch + pitchKeys * rotationRate.pitch * delta;
    const yaw =
      angularInput.current.yaw + yawKeys * rotationRate.yaw * delta;
    const roll = rollKeys * rotationRate.roll * delta;

    // Reset accumulated mouse input - it's been consumed
    angularInput.current.pitch *= Math.pow(0.0001, delta);
    angularInput.current.yaw *= Math.pow(0.0001, delta);

    if (enabled) {
      const qPitch = tmpQ.current.setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -pitch,
      );
      group.quaternion.multiply(qPitch);
      const qYaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -yaw,
      );
      group.quaternion.multiply(qYaw);
      const qRoll = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        roll,
      );
      group.quaternion.multiply(qRoll);
      group.quaternion.normalize();
    }

    // === Translation ===
    tmpForward.current
      .set(0, 0, -1)
      .applyQuaternion(group.quaternion);
    tmpRight.current.set(1, 0, 0).applyQuaternion(group.quaternion);
    tmpUp.current.set(0, 1, 0).applyQuaternion(group.quaternion);

    let throttleAxis = 0;
    if (enabled) {
      if (k["KeyW"]) throttleAxis += 1;
      if (k["KeyS"]) throttleAxis -= 1;
    }

    const accel = maxThrust * boost;
    if (throttleAxis !== 0) {
      shipState.velocity.addScaledVector(
        tmpForward.current,
        throttleAxis * accel * delta,
      );
    }

    // Vertical strafe
    if (enabled) {
      if (k["KeyR"])
        shipState.velocity.addScaledVector(tmpUp.current, accel * 0.6 * delta);
      if (k["KeyF"])
        shipState.velocity.addScaledVector(tmpUp.current, -accel * 0.6 * delta);
    }

    // Auto-stabilize / brake
    if (enabled && (k["Space"] || k["KeyX"])) {
      const dampStrength = k["KeyX"] ? 0.35 : stabilizeDamping;
      const damp = Math.pow(dampStrength, delta);
      shipState.velocity.multiplyScalar(damp);
    } else {
      // Tiny passive drag so velocity decays very slowly even without
      // stabilization — keeps the experience playable without true Newtonian
      // inertia.
      shipState.velocity.multiplyScalar(Math.pow(0.65, delta));
    }

    // Cap top speed (cinematic compression — keeps things readable)
    const maxSpeed = 320 * boost;
    if (shipState.velocity.lengthSq() > maxSpeed * maxSpeed) {
      shipState.velocity.setLength(maxSpeed);
    }

    // Apply translation
    group.position.addScaledVector(shipState.velocity, delta);

    // Telemetry
    const speed = shipState.velocity.length();
    setShip({
      speed,
      throttle: throttleAxis,
      position: [group.position.x, group.position.y, group.position.z],
    });
  });
}
