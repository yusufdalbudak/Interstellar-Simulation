import { useMemo } from "react";
import * as THREE from "three";

/** A simple gradient sky dome with low overcast clouds. */
export function SkyDome() {
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color("#5d6e84") },
        uBottom: { value: new THREE.Color("#9ca8b6") },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vWorldPos;
        uniform vec3 uTop;
        uniform vec3 uBottom;
        void main(){
          float h = clamp(normalize(vWorldPos).y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(uBottom, uTop, pow(h, 1.6));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);
  return (
    <mesh material={mat}>
      <sphereGeometry args={[800, 32, 16]} />
    </mesh>
  );
}
