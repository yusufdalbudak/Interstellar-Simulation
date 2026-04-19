import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

interface Props {
  position: [number, number, number];
  radius?: number;
  color?: string;
  ring?: boolean;
}

/** A non-interactive distant planet with subtle terminator shading and an optional ring. */
export function DistantPlanet({
  position,
  radius = 14,
  color = "#7a8aa0",
  ring = false,
}: Props) {
  const ref = useRef<THREE.Mesh>(null);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uSun: { value: new THREE.Vector3(0.6, 0.4, 0.7).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        uniform vec3 uColor;
        uniform vec3 uSun;
        void main(){
          float l = max(dot(normalize(vNormal), normalize(uSun)), 0.0);
          // Soft terminator
          l = smoothstep(0.0, 0.4, l) * 0.85 + 0.05;
          vec3 col = uColor * l;
          // Faint atmospheric rim
          float rim = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0,0.0,1.0)), 0.0), 2.0);
          col += uColor * rim * 0.35;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [color]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <group position={position}>
      <mesh ref={ref} material={mat}>
        <sphereGeometry args={[radius, 32, 24]} />
      </mesh>
      {ring && (
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <ringGeometry args={[radius * 1.4, radius * 2.1, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
