import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface Props {
  position: [number, number, number];
  length: number;
  height: number;
  rotationY?: number;
}

/**
 * The "horizon wave" - a vast curved wall of water built from a displaced
 * plane. Animated subtly so it feels alive without feeling like a particle
 * effect, and tinted darker at the base for cinematic mass.
 */
export function WaveWall({ position, length, height, rotationY = 0 }: Props) {
  const ref = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTime: { value: 0 }, uHeight: { value: height } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vY;
        uniform float uTime;
        void main(){
          vUv = uv;
          vec3 p = position;
          // Ripple along the crest
          float ripple = sin(p.x * 0.04 + uTime * 0.6) * 1.2;
          p.y += ripple * smoothstep(0.0, 1.0, vUv.y);
          vY = p.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        varying float vY;
        uniform float uHeight;

        void main(){
          // Vertical gradient: dark base -> lighter, foamy crest
          float t = vUv.y;
          vec3 base = mix(vec3(0.10, 0.16, 0.22), vec3(0.55, 0.66, 0.76), t);
          // Crest foam
          float foam = smoothstep(0.85, 1.0, t);
          base = mix(base, vec3(0.95, 0.97, 0.98), foam * 0.85);
          // Distance fog by world Y proxy
          float alpha = mix(0.0, 1.0, smoothstep(0.0, 0.03, t));
          gl_FragColor = vec4(base, alpha);
        }
      `,
    });
  }, [height]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    if (ref.current) {
      // Slow forward drift - the wave is "approaching"
      ref.current.position.z = position[2] + Math.sin(performance.now() * 0.0001) * 6;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={[0, rotationY, 0]} material={material}>
      <planeGeometry args={[length, height, 60, 24]} />
    </mesh>
  );
}
