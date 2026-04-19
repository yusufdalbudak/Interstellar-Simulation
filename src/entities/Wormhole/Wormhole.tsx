import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface Props {
  position?: [number, number, number];
  radius?: number;
}

/**
 * Wormhole as a "spherical spacetime distortion" - not a flat portal.
 *
 * Two layered spheres:
 *   - Inner sphere with a refraction-style shader that warps a procedural
 *     starfield, so looking into it you see a different patch of universe
 *     curved by the throat geometry.
 *   - Outer halo shell adding a faint Einstein-ring rim and chromatic
 *     dispersion to suggest gravitational lensing.
 */
export function Wormhole({ position = [0, 0, 0], radius = 6 }: Props) {
  const innerRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const innerMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: {
        uTime: { value: 0 },
        uCameraPos: { value: new THREE.Vector3() },
        uRadius: { value: radius },
        uThroat: { value: 0.6 }, // throat radius relative to outer radius
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        uniform float uTime;
        uniform vec3  uCameraPos;
        uniform float uRadius;
        uniform float uThroat;

        // -- Procedural deep-space "destination universe" --
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float starfield(vec3 dir){
          float u = atan(dir.z, dir.x) / 6.2831853 + 0.5;
          float v = asin(clamp(dir.y, -1.0, 1.0)) / 3.1415926 + 0.5;
          vec2 uv = vec2(u, v) * 540.0;
          vec2 i = floor(uv);
          vec2 f = fract(uv);
          float h = hash(i);
          // More density than the surrounding space
          float bright = step(0.972, h);
          vec2 d = f - vec2(0.5);
          float radial = exp(-dot(d,d) * 80.0);
          return bright * radial * (0.9 + h * 2.0);
        }

        vec3 farSky(vec3 dir){
          // A different "destination universe": warmer dust + nebula
          float a = dir.y * 0.5 + 0.5;
          vec3 base = mix(vec3(0.06, 0.04, 0.03), vec3(0.10, 0.05, 0.08), a);
          float n = abs(sin(dir.x * 6.0 + uTime * 0.05) * cos(dir.y * 5.0) * sin(dir.z * 4.0));
          base += vec3(0.55, 0.28, 0.16) * pow(n, 4.0) * 0.9;
          float n2 = abs(sin(dir.x * 2.0) * cos(dir.z * 2.5));
          base += vec3(0.30, 0.18, 0.55) * pow(n2, 6.0) * 0.7;
          base += vec3(0.18, 0.10, 0.30) * pow(1.0 - abs(dir.y), 6.0) * 0.5;
          base += vec3(1.0) * starfield(dir);
          return base;
        }

        void main(){
          vec3 ro = uCameraPos;
          vec3 rd = normalize(vWorldPos - ro);

          // Local sphere coordinates
          vec3 c = vec3(0.0); // local-frame center is sphere center in world
          // Use the world-space surface normal as the deformed view direction.
          // Bend the ray more strongly toward the center the closer we look
          // to the throat (giving a "fish-eye through a sphere" feel).
          float fres = 1.0 - max(dot(-rd, vNormal), 0.0);
          float warp = smoothstep(0.0, 1.0, fres) * 1.4;

          vec3 toCenter = normalize(c - vWorldPos);
          vec3 bent = normalize(mix(rd, toCenter, warp * uThroat));

          // Add a slow swirl (frame-dragging-style)
          float ang = uTime * 0.05;
          float ca = cos(ang), sa = sin(ang);
          vec3 swirled = vec3(bent.x * ca - bent.z * sa, bent.y, bent.x * sa + bent.z * ca);

          vec3 col = farSky(swirled);

          // Subtle chromatic dispersion
          col.r *= 1.05;
          col.b *= 0.95;

          // Einstein-ring style brightness near the silhouette
          col += vec3(0.7, 0.85, 1.0) * pow(fres, 8.0) * 0.6;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [radius]);

  const haloMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        uniform float uTime;
        void main(){
          float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0,0.0,1.0))), 5.0);
          vec3 col = mix(vec3(0.6, 0.8, 1.2), vec3(1.0, 0.9, 1.1), 0.5);
          gl_FragColor = vec4(col * rim, rim * 0.85);
        }
      `,
    });
  }, []);

  useFrame((state, delta) => {
    innerMat.uniforms.uTime.value += delta;
    haloMat.uniforms.uTime.value += delta;
    innerMat.uniforms.uCameraPos.value.copy(state.camera.position);

    if (innerRef.current) innerRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group position={position}>
      <mesh ref={innerRef} material={innerMat}>
        <sphereGeometry args={[radius, 96, 64]} />
      </mesh>
      <mesh ref={haloRef} material={haloMat}>
        <sphereGeometry args={[radius * 1.18, 64, 48]} />
      </mesh>
    </group>
  );
}
