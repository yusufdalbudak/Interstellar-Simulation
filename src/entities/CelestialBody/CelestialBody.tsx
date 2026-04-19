import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { BodyDef } from "@/scenes/SolarSystem/bodies";

interface Props {
  body: BodyDef;
  /** Override world position (e.g. when body sits at solar system origin) */
  position?: [number, number, number];
  /** Light direction in world space, used for shading */
  sunDirection?: THREE.Vector3;
  /** Optional scale override */
  scale?: number;
}

/**
 * Shader-driven celestial body. One shader handles all body types via type-
 * specific branches selected by a uniform — keeps GPU state changes minimal
 * while allowing distinct visual identities for rocky / gas / ice / star.
 *
 * Lighting is a custom diffuse + ambient with a soft terminator falloff.
 * Stars use a self-emissive treatment with a subtle limb-darkening + corona.
 */
export function CelestialBody({
  body,
  position = [0, 0, 0],
  sunDirection,
  scale = 1,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  const mat = useMemo(() => buildBodyMaterial(body), [body]);
  const ringMat = useMemo(
    () => (body.ring ? buildRingMaterial(body) : null),
    [body],
  );
  const coronaMat = useMemo(
    () => (body.type === "star" ? buildCoronaMaterial(body, 1.0) : null),
    [body],
  );
  const coronaOuterMat = useMemo(
    () => (body.type === "star" ? buildCoronaMaterial(body, 0.35) : null),
    [body],
  );

  useFrame((state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * body.spinSpeed;

    mat.uniforms.uTime.value += delta;
    if (sunDirection) {
      mat.uniforms.uSunDir.value.copy(sunDirection);
    } else if (body.type !== "star") {
      // For non-star bodies, default light direction: from world origin towards body
      const m = meshRef.current;
      if (m) {
        const wp = new THREE.Vector3();
        m.getWorldPosition(wp);
        mat.uniforms.uSunDir.value.copy(wp.normalize().multiplyScalar(-1));
      }
    }
    mat.uniforms.uCameraPos.value.copy(state.camera.position);

    if (ringMat) {
      ringMat.uniforms.uTime.value += delta;
      ringMat.uniforms.uSunDir.value.copy(mat.uniforms.uSunDir.value);
    }
    if (coronaMat) {
      coronaMat.uniforms.uTime.value += delta;
    }
    if (coronaOuterMat) {
      coronaOuterMat.uniforms.uTime.value += delta;
    }
  });

  // Apply axial tilt to the body + ring system. Real-world tilt vectors
  // are ~constant in the inertial frame, so we tilt the inner group (which
  // contains the body and its rings) once and let the body spin within it.
  const axialTilt = body.axialTilt ?? 0;
  return (
    <group position={position} scale={scale}>
      <group rotation={[axialTilt, 0, 0]}>
        <mesh ref={meshRef} material={mat}>
          <sphereGeometry args={[body.radius, 64, 48]} />
        </mesh>
        {body.atmosphere && body.type !== "star" && (
          <Atmosphere
            radius={body.radius * 1.04}
            color={body.atmosphere}
            sunDirRef={mat.uniforms.uSunDir}
          />
        )}
        {body.ring && ringMat && (
          <mesh ref={ringRef} material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[body.ring.inner, body.ring.outer, 96, 1]} />
          </mesh>
        )}
      </group>
      {body.type === "star" && coronaMat && coronaOuterMat && (
        <>
          {/* Inner tight corona — bright fresnel rim */}
          <mesh ref={coronaRef} material={coronaMat}>
            <sphereGeometry args={[body.radius * 1.22, 48, 32]} />
          </mesh>
          {/* Outer faint chromosphere — much dimmer, just a hint of color */}
          <mesh material={coronaOuterMat}>
            <sphereGeometry args={[body.radius * 1.55, 32, 24]} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Atmosphere({
  radius,
  color,
  sunDirRef,
}: {
  radius: number;
  color: string;
  sunDirRef: { value: THREE.Vector3 };
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uSunDir: { value: sunDirRef.value },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main(){
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        uniform vec3 uColor;
        uniform vec3 uSunDir;
        void main(){
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fres = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
          float lit = clamp(dot(vNormal, normalize(uSunDir)) * 0.6 + 0.5, 0.0, 1.0);
          vec3 col = uColor * fres * lit;
          gl_FragColor = vec4(col, fres * 0.9);
        }
      `,
    });
  }, [color, sunDirRef]);
  // Keep ref alive so React doesn't think it's unused (linter)
  void matRef;
  return (
    <mesh material={mat}>
      <sphereGeometry args={[radius * 1.06, 48, 32]} />
    </mesh>
  );
}

function buildBodyMaterial(body: BodyDef) {
  const TYPE_INDEX: Record<BodyDef["type"], number> = {
    star: 0,
    rocky: 1,
    gasGiant: 2,
    iceGiant: 3,
    ringed: 2, // ringed = gas-giant shading + ring geometry
  };
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uCameraPos: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Color(body.color) },
      uColor2: {
        value: new THREE.Color(body.secondary ?? body.color),
      },
      uColor3: {
        value: new THREE.Color(body.tertiary ?? body.color),
      },
      uType: { value: TYPE_INDEX[body.type] },
      uRadius: { value: body.radius },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;
      void main(){
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vLocalPos = position;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;
      uniform float uTime;
      uniform vec3  uSunDir;
      uniform vec3  uCameraPos;
      uniform vec3  uColor;
      uniform vec3  uColor2;
      uniform vec3  uColor3;
      uniform int   uType;
      uniform float uRadius;

      // 3D hash + value noise + fbm
      float hash3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float vnoise(vec3 p){
        vec3 i = floor(p); vec3 f = fract(p);
        f = f*f*(3.0 - 2.0*f);
        float n000 = hash3(i + vec3(0,0,0));
        float n100 = hash3(i + vec3(1,0,0));
        float n010 = hash3(i + vec3(0,1,0));
        float n110 = hash3(i + vec3(1,1,0));
        float n001 = hash3(i + vec3(0,0,1));
        float n101 = hash3(i + vec3(1,0,1));
        float n011 = hash3(i + vec3(0,1,1));
        float n111 = hash3(i + vec3(1,1,1));
        return mix(
          mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
          mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
          f.z
        );
      }
      float fbm(vec3 p){
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++){
          v += a * vnoise(p);
          p *= 2.05; a *= 0.5;
        }
        return v;
      }

      vec3 shadeStar(vec3 n){
        // Subtle limb darkening + animated turbulence
        float t = uTime * 0.05;
        float turb = fbm(n * 4.0 + t);
        float fres = pow(1.0 - max(dot(n, normalize(uCameraPos - vWorldPos)), 0.0), 1.5);
        vec3 hot  = mix(uColor3, uColor, 0.5);
        vec3 col  = mix(uColor2, hot, 0.5 + turb * 0.7);
        col += uColor * (1.0 - fres) * 0.45;
        // Limb darkening
        col *= mix(0.75, 1.4, 1.0 - fres);
        return col * 1.3;
      }

      vec3 shadeRocky(vec3 n, float lit){
        // Continents + ocean for an Earth-like, dust patches otherwise
        float land = fbm(n * 2.5);
        float micro = fbm(n * 8.0) * 0.4;
        vec3 dry = mix(uColor2, uColor, smoothstep(0.4, 0.7, land + micro));
        vec3 surf = mix(dry, uColor3, smoothstep(0.65, 0.85, land + micro * 0.5));
        // For Earth-like (uColor3 is bright = clouds), add cloud band
        float clouds = smoothstep(0.55, 0.9, fbm(n * 3.5 + uTime * 0.01));
        surf = mix(surf, uColor3, clouds * 0.35);
        // Ambient + diffuse with terminator softening
        float ambient = 0.18;
        float diffuse = max(lit, 0.0) * 1.15;
        // Subtle Fresnel highlight on day side
        float fres = pow(1.0 - max(dot(n, normalize(uCameraPos - vWorldPos)), 0.0), 4.0);
        return surf * (ambient + diffuse) + surf * fres * 0.2;
      }

      vec3 shadeGas(vec3 n, float lit){
        // Latitudinal banding, perturbed by noise (Jupiter-like)
        float lat = n.y;
        float bands = sin(lat * 18.0 + fbm(n * 3.0) * 2.5);
        float band2 = sin(lat * 28.0 + fbm(n * 5.0) * 4.0) * 0.4;
        float t = bands * 0.6 + band2;
        vec3 col = mix(uColor2, uColor, smoothstep(-0.3, 0.6, t));
        col = mix(col, uColor3, smoothstep(0.5, 1.2, t));
        // Storm spot (Great Red Spot) using a soft falloff at a fixed lat/long
        float spotLat = -0.25; float spotLon = 1.6;
        float lon = atan(n.z, n.x);
        float dlat = (lat - spotLat) * 6.0;
        float dlon = (lon - spotLon) * 2.5;
        float dist2 = dlat*dlat + dlon*dlon;
        float spot = exp(-dist2 * 0.6);
        col = mix(col, vec3(0.85, 0.35, 0.25), spot * 0.55);

        float ambient = 0.16;
        float diffuse = max(lit, 0.0) * 1.1;
        return col * (ambient + diffuse);
      }

      vec3 shadeIce(vec3 n, float lit){
        // Smooth methane sky, very gentle banding
        float lat = n.y;
        float bands = sin(lat * 6.0 + fbm(n * 1.6) * 1.2) * 0.25;
        vec3 col = mix(uColor2, uColor, 0.55 + bands);
        col = mix(col, uColor3, smoothstep(0.4, 0.85, fbm(n * 2.0)) * 0.3);
        float ambient = 0.2;
        float diffuse = max(lit, 0.0) * 1.1;
        return col * (ambient + diffuse);
      }

      void main(){
        vec3 n = normalize(vNormal);
        float lit = dot(n, normalize(uSunDir));
        // Soft terminator: light fades smoothly over a small angular range
        float litSoft = smoothstep(-0.05, 0.18, lit) * 0.95 + 0.05;
        vec3 col;
        if (uType == 0) {
          col = shadeStar(n);
        } else if (uType == 1) {
          col = shadeRocky(n, litSoft);
        } else if (uType == 2) {
          col = shadeGas(n, litSoft);
        } else {
          col = shadeIce(n, litSoft);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function buildRingMaterial(body: BodyDef) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(body.ring!.color) },
      uInner: { value: body.ring!.inner },
      uOuter: { value: body.ring!.outer },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec2 vUv;
      varying vec3 vLocalPos;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vLocalPos = position;
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;
      uniform float uTime;
      uniform vec3  uColor;
      uniform float uInner;
      uniform float uOuter;
      uniform vec3  uSunDir;

      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        // Radial distance from center in local plane
        float r = length(vLocalPos.xy);
        float t = (r - uInner) / (uOuter - uInner); // 0..1
        if (t < 0.0 || t > 1.0) discard;

        // Concentric ringlet density via sine + noise
        float bands =
          0.5 + 0.5 * sin(t * 220.0)
          + 0.4 * sin(t * 60.0 + 0.6)
          + 0.3 * sin(t * 18.0 + 1.7);
        bands /= 2.0;
        // Add a Cassini-like gap
        float gap = smoothstep(0.62, 0.66, t) - smoothstep(0.66, 0.70, t);
        bands *= 1.0 - gap * 0.85;
        // Edge fade
        float edge = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.93, 1.0, t));

        // Lighting: rings catch grazing light from the sun
        vec3 normalApprox = normalize(vec3(0.0, 0.0, 1.0)); // ring plane normal (local)
        // The ring is rotated PI/2 on X so its world normal is +Y
        // Use a simple lit approx: brighten where sun is grazing
        float sunGraze = clamp(dot(normalize(uSunDir), vec3(0.0, 1.0, 0.0)), -1.0, 1.0);
        float litFactor = 0.45 + 0.55 * (1.0 - abs(sunGraze));

        float a = bands * edge * litFactor;
        vec3 col = mix(uColor * 0.55, uColor, bands);
        gl_FragColor = vec4(col, a * 0.9);
      }
    `,
  });
}

function buildCoronaMaterial(body: BodyDef, intensity = 1.0) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(body.color) },
      uHot: {
        value: new THREE.Color(body.tertiary ?? body.color),
      },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main(){
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform float uTime;
      uniform vec3  uColor;
      uniform vec3  uHot;
      uniform float uIntensity;
      void main(){
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
        // Subtle pulse
        float pulse = 0.9 + 0.1 * sin(uTime * 0.6);
        vec3 col = mix(uColor, uHot, fres) * fres * pulse * uIntensity;
        gl_FragColor = vec4(col, fres * 0.85 * uIntensity);
      }
    `,
  });
}
