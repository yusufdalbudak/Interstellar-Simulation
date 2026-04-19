import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface NebulaProps {
  color: string;
  secondary: string;
  position: [number, number, number];
  scale?: number;
}

/**
 * A large, soft, additive nebula billboard. Uses a fragment-shader
 * pseudo-volumetric look (multi-octave value noise + radial falloff)
 * applied to a camera-facing plane. Cheap, deep, and visually rich.
 */
export function Nebula({ color, secondary, position, scale = 400 }: NebulaProps) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uSecondary: { value: new THREE.Color(secondary) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uSecondary;

        // Hash & noise
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0,0.0));
          float c = hash(i + vec2(0.0,1.0));
          float d = hash(i + vec2(1.0,1.0));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
        }
        float fbm(vec2 p){
          float v = 0.0;
          float a = 0.5;
          for(int i=0;i<5;i++){
            v += a * noise(p);
            p *= 2.07;
            a *= 0.5;
          }
          return v;
        }

        void main(){
          vec2 uv = vUv - 0.5;
          float d = length(uv);
          float falloff = smoothstep(0.55, 0.0, d);

          vec2 p = uv * 3.0 + vec2(uTime * 0.01, uTime * 0.005);
          float n = fbm(p);
          float n2 = fbm(p * 2.5 + n);
          float density = pow(n2, 1.8) * falloff;

          vec3 col = mix(uSecondary, uColor, n);
          // Slightly hot center
          col += uColor * 0.25 * pow(falloff, 4.0);

          gl_FragColor = vec4(col * density * 1.6, density * 0.85);
        }
      `,
    });
  }, [color, secondary]);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    if (ref.current) {
      // Always face camera
      ref.current.lookAt(0, 0, 0);
    }
  });

  return (
    <mesh ref={ref} position={position} material={material}>
      <planeGeometry args={[scale, scale]} />
    </mesh>
  );
}
