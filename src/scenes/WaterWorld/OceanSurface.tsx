import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useAppStore } from "@/systems/state/store";
import { getQualitySettings } from "@/systems/state/quality";

interface Props {
  size?: number;
}

/**
 * Shallow ocean shader. Animated normals via two-octave wave field, Fresnel-
 * weighted blend between deep-water and sky tint, soft specular hot-spot.
 *
 * Vertex displacement is intentionally subtle - the cinematic threat comes
 * from the wave walls, not the surface itself.
 */
export function OceanSurface({ size = 800 }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const quality = useAppStore((s) => s.quality);
  const settings = useMemo(() => getQualitySettings(quality), [quality]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uShallow: { value: new THREE.Color("#6c8aa3") },
        uDeep: { value: new THREE.Color("#1e2a36") },
        uSky: { value: new THREE.Color("#aebcd0") },
        uSun: { value: new THREE.Vector3(0.3, 0.65, 0.2).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        uniform float uTime;
        void main(){
          vUv = uv;
          vec3 p = position;
          // Two soft sine-wave octaves for visible motion
          float w = sin(p.x * 0.04 + uTime * 0.6) * 0.18
                  + cos(p.y * 0.06 - uTime * 0.45) * 0.12;
          p.z += w;
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3  uShallow;
        uniform vec3  uDeep;
        uniform vec3  uSky;
        uniform vec3  uSun;

        // Compute normal from analytic derivative of the wave field
        vec3 waveNormal(vec2 p){
          float dx = 0.04 * cos(p.x * 0.04 + uTime * 0.6) * 0.18;
          float dy = -0.06 * sin(p.y * 0.06 - uTime * 0.45) * 0.12;
          // Add high-frequency wavelets for sparkle
          dx += 0.15 * cos(p.x * 0.7 + uTime * 1.5) * 0.03;
          dy += 0.15 * cos(p.y * 0.6 - uTime * 1.2) * 0.03;
          vec3 n = normalize(vec3(-dx, 1.0, -dy));
          return n;
        }

        void main(){
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 n = waveNormal(vWorldPos.xz);

          float fres = pow(1.0 - max(dot(viewDir, n), 0.0), 4.0);

          // Diffuse-like deep/shallow blend
          float depth = smoothstep(0.0, 60.0, length(vWorldPos.xz));
          vec3 base = mix(uShallow, uDeep, depth);

          // Sky reflection
          vec3 reflected = reflect(-viewDir, n);
          float sky = max(0.0, reflected.y);
          vec3 skyTint = mix(uDeep * 0.6, uSky, sky);

          vec3 col = mix(base, skyTint, fres);

          // Specular sun hot-spot
          float spec = pow(max(dot(reflect(-uSun, n), viewDir), 0.0), 80.0);
          col += vec3(1.0, 0.95, 0.85) * spec * 0.9;

          // Distant horizon fog tint
          float distFade = smoothstep(80.0, 320.0, length(vWorldPos.xz));
          col = mix(col, uSky * 0.85, distFade);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  useFrame((_, delta) => (material.uniforms.uTime.value += delta));

  return (
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      material={material}
    >
      <planeGeometry args={[size, size, settings.waterSegments, settings.waterSegments]} />
    </mesh>
  );
}
