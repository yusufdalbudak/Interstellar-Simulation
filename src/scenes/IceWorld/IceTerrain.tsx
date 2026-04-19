import { useMemo } from "react";
import * as THREE from "three";
import { useAppStore } from "@/systems/state/store";
import { getQualitySettings } from "@/systems/state/quality";

interface Props {
  size?: number;
}

/**
 * Public terrain height sampler so other systems (astronaut, beacon) can
 * stay locked to the surface without re-rolling the procedural recipe.
 */
export function sampleIceHeight(x: number, z: number): number {
  // Big, low-frequency rolling plateau plus mid-frequency cracks.
  const macro = Math.sin(x * 0.04) * Math.cos(z * 0.045) * 5.5;
  const meso = Math.sin(x * 0.13 + z * 0.11) * 1.4;
  const micro = Math.sin(x * 0.45) * 0.18 + Math.cos(z * 0.5) * 0.18;
  // Shallow basin at origin so the spawn area is roughly flat
  const flatten = Math.exp(-(x * x + z * z) * 0.005) * 4.0;
  return macro + meso + micro - flatten - 1.5;
}

export function IceTerrain({ size = 500 }: Props) {
  const quality = useAppStore((s) => s.quality);
  const settings = useMemo(() => getQualitySettings(quality), [quality]);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, settings.terrainSegments, settings.terrainSegments);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // The plane is XY before rotation - apply procedural Y as Z-displacement.
      const h = sampleIceHeight(x, y);
      pos.setZ(i, h);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [size, settings.terrainSegments]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uIce: { value: new THREE.Color("#cfdce8") },
        uShadow: { value: new THREE.Color("#5d7286") },
        uCrack: { value: new THREE.Color("#7088a0") },
        uSun: { value: new THREE.Vector3(0.6, 0.8, 0.3).normalize() },
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
        precision highp float;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        uniform vec3 uIce;
        uniform vec3 uShadow;
        uniform vec3 uCrack;
        uniform vec3 uSun;

        // Hash + noise for surface detail
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0,0.0));
          float c = hash(i + vec2(0.0,1.0));
          float d = hash(i + vec2(1.0,1.0));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
        }

        void main(){
          vec3 n = normalize(vNormal);
          float ndl = clamp(dot(n, normalize(uSun)), 0.0, 1.0);

          // Slope-based blend (cliffs are cooler & cracked, flats are bright)
          float slope = 1.0 - clamp(n.y, 0.0, 1.0);
          float crack = noise(vWorldPos.xz * 0.3) * 0.7
                      + noise(vWorldPos.xz * 0.9) * 0.3;
          crack = smoothstep(0.55, 0.78, crack);

          vec3 col = mix(uIce, uShadow, slope);
          col = mix(col, uCrack, crack * 0.35);

          // Lambertian + slight ambient
          col *= 0.35 + 0.85 * ndl;

          // Fresnel sheen on glancing angles - icy specular feel
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fres = pow(1.0 - max(dot(viewDir, n), 0.0), 5.0);
          col += vec3(0.55, 0.7, 0.9) * fres * 0.35;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    />
  );
}
