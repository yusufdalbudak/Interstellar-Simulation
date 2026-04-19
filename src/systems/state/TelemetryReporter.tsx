import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "./store";
import { getSceneTarget } from "@/systems/camera/sceneTargets";

/**
 * Updates the HUD telemetry (distance, speed, target) at ~10Hz.
 * Lives inside the Canvas so it can sample camera state.
 */
export function TelemetryReporter() {
  const { camera } = useThree();
  const lastPos = useRef(new THREE.Vector3().copy(camera.position));
  const accum = useRef(0);
  const setTelemetry = useAppStore((s) => s.setTelemetry);
  const scene = useAppStore((s) => s.scene);

  useEffect(() => {
    setTelemetry({ target: getSceneTarget(scene).label });
  }, [scene, setTelemetry]);

  useFrame((_, delta) => {
    accum.current += delta;
    if (accum.current < 0.1) return;
    const dt = accum.current;
    accum.current = 0;

    const target = getSceneTarget(scene);
    const targetPos = new THREE.Vector3(...target.position);
    const distance = camera.position.distanceTo(targetPos);
    const speed = camera.position.distanceTo(lastPos.current) / dt;
    lastPos.current.copy(camera.position);

    setTelemetry({ distance, speed });
  });

  return null;
}
