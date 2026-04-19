import { useMemo } from "react";
import * as THREE from "three";

interface Props {
  radius: number;
  color?: string;
  segments?: number;
  /**
   * Orbital inclination in radians. The orbit ring is tilted about the X
   * axis to match the actual planet's orbital plane (matches the
   * inclination math in `SolarSystemScene`).
   */
  inclination?: number;
}

/** A subtle ring used as a visual orbit guide / scale reference. */
export function OrbitGuide({
  radius,
  color = "#6cc3ff",
  segments = 128,
  inclination = 0,
}: Props) {
  const lineObj = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const sinI = Math.sin(inclination);
    const cosI = Math.cos(inclination);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const cx = Math.cos(a) * radius;
      const sz = Math.sin(a) * radius;
      points.push(new THREE.Vector3(cx, sz * sinI, sz * cosI));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18,
    });
    return new THREE.LineLoop(geo, mat);
  }, [radius, segments, color, inclination]);

  return <primitive object={lineObj} />;
}
