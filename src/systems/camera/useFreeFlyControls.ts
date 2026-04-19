import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Six-DOF free-fly controls. WASD strafes, Q/E rolls, Space/Ctrl raises/lowers,
 * Shift boosts, and right-mouse drag pitches/yaws the camera. The camera has
 * gentle inertia so motion feels weighty in space.
 */
export function useFreeFlyControls() {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const angularVel = useRef(new THREE.Vector2()); // pitch, yaw
  const dragging = useRef(false);
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useEffect(() => {
    euler.current.setFromQuaternion(camera.quaternion);
    const dom = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        dragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        dom.requestPointerLock?.();
      }
    };
    const onMouseUp = () => {
      dragging.current = false;
      lastMouse.current = null;
      if (document.pointerLockElement === dom) document.exitPointerLock();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      angularVel.current.x += dy * 0.0018;
      angularVel.current.y += dx * 0.0018;
    };
    const onContext = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    dom.addEventListener("contextmenu", onContext);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      dom.removeEventListener("contextmenu", onContext);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const k = keys.current;
    const speed = (k["ShiftLeft"] || k["ShiftRight"] ? 38 : 12) * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const up = camera.up;

    if (k["KeyW"]) velocity.current.addScaledVector(forward, speed);
    if (k["KeyS"]) velocity.current.addScaledVector(forward, -speed);
    if (k["KeyA"]) velocity.current.addScaledVector(right, -speed);
    if (k["KeyD"]) velocity.current.addScaledVector(right, speed);
    if (k["Space"]) velocity.current.addScaledVector(up, speed * 0.6);
    if (k["ControlLeft"] || k["ControlRight"]) velocity.current.addScaledVector(up, -speed * 0.6);

    // Inertia decay
    const damping = Math.pow(0.06, delta);
    velocity.current.multiplyScalar(damping);
    camera.position.addScaledVector(velocity.current, delta);

    // Apply angular velocity with damping
    euler.current.x -= angularVel.current.x;
    euler.current.y -= angularVel.current.y;
    angularVel.current.multiplyScalar(Math.pow(0.0008, delta));
    euler.current.x = THREE.MathUtils.clamp(euler.current.x, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);

    // Roll with Q/E
    if (k["KeyQ"]) euler.current.z += delta * 0.8;
    if (k["KeyE"]) euler.current.z -= delta * 0.8;
    euler.current.z *= Math.pow(0.2, delta);

    camera.quaternion.setFromEuler(euler.current);
  });
}
