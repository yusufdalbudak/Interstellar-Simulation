import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useAppStore } from "@/systems/state/store";
import { getQualitySettings } from "@/systems/state/quality";

/**
 * Milky Way · IMMERSIVE / IN-GALAXY scene.
 *
 * Goal: feel like you are floating in our local interstellar
 * neighborhood, looking out at the galaxy from the inside.
 *
 * The "sky" is built as a stack of nested view-locked layers, in order:
 *
 *   1. Deep background — a faint isotropic field of very distant stars
 *      (sphere of points) to fill empty patches.
 *   2. Galactic plane shell — a large BackSide sphere whose shader
 *      paints:
 *        - a soft luminous band along the galactic equator
 *        - a brightness gradient that peaks toward the galactic
 *          center direction (Sagittarius)
 *        - dark dust-lane silhouettes (the Great Rift) cutting through
 *          the band
 *        - faint emission-nebula patches in selective regions
 *   3. Disk-biased star field — a dense layer of points concentrated
 *      near the galactic plane, with realistic stellar color variation
 *      (blue O/B, white A/F, yellow G, orange/red K/M).
 *   4. Bright nearby stars — a sparse layer of large, colorful sprites
 *      to provide foreground anchor points and a sense of depth.
 *   5. Soft nebula sprites — a few low-opacity additive billboards
 *      placed at celestial-meaningful directions (galactic center, an
 *      Orion-ish anti-center, etc).
 *   6. Sol indicator — a faint local marker + label that doubles as
 *      a "Travel to Sol" action.
 *
 * Conventions:
 *   - The galactic plane is the world XZ plane (Y is "galactic north").
 *   - The galactic-center direction is +X by convention here.
 *   - Distances are scene units; everything is large and view-locked
 *     so the camera essentially rotates within a fixed sky.
 */
export function MilkyWayInsideScene() {
  const setScene = useAppStore.getState().setScene;
  const quality = useAppStore((s) => s.quality);
  const settings = useMemo(() => getQualitySettings(quality), [quality]);

  // Quality-scaled population sizes
  const diskStarCount = Math.round(settings.starCount * 1.6);
  const farStarCount = Math.round(settings.starCount * 0.6);
  const nearStarCount = 220;

  const skyMat = useMemo(() => buildSkyMaterial(), []);

  useFrame((_, delta) => {
    skyMat.uniforms.uTime.value += delta;
  });

  return (
    <>
      <ambientLight intensity={0.05} color="#8aa0c8" />

      {/* 1. Deep isotropic background */}
      <FarStars count={farStarCount} radius={1900} />

      {/* 2. Galactic plane shell — the iconic "Milky Way band across the sky" */}
      <mesh material={skyMat}>
        <sphereGeometry args={[1700, 64, 48]} />
      </mesh>

      {/* 3. Disk-biased star population (the dense plane stars) */}
      <DiskBiasedStars count={diskStarCount} radius={1500} thickness={0.18} />

      {/* 4. Bright nearby stars (foreground anchors) */}
      <NearbyStars count={nearStarCount} />

      {/* 5. Tasteful nebula billboards along directions of interest */}
      <NebulaCloud direction={[1, 0.04, 0.1]} color="#ffb079" size={520} opacity={0.18} />
      <NebulaCloud direction={[-0.8, 0.06, -0.5]} color="#7faaff" size={420} opacity={0.12} />
      <NebulaCloud direction={[0.2, 0.0, -1]} color="#c98aff" size={380} opacity={0.10} />

      {/* 6. Sol marker — sits at origin (we are AT Sol's neighborhood). */}
      <SolNeighborhood onEnter={() => setScene("solarSystem")} />
    </>
  );
}

/* =================================================================
 * Sol neighborhood marker
 * ================================================================= */

function SolNeighborhood({ onEnter }: { onEnter: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.04;
  });
  // The Sun sits AT the camera origin in scene space, with a tiny disc
  // visualization a few units in front of "the local up" direction.
  // We render a faint glyph and a label; the label drives navigation.
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh>
        <sphereGeometry args={[0.4, 12, 8]} />
        <meshBasicMaterial color="#ffe6b0" toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.18, 48]} />
        <meshBasicMaterial
          color="#ffae5a"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <group position={[0, 1.6, 0]}>
        <Html center distanceFactor={6} zIndexRange={[10, 0]}>
          <button
            className="body-label active mw-sol-label"
            onClick={(e) => {
              e.stopPropagation();
              onEnter();
            }}
          >
            Sol → enter system
          </button>
        </Html>
      </group>
    </group>
  );
}

/* =================================================================
 * Far isotropic star field
 * ================================================================= */

function FarStars({ count, radius }: { count: number; radius: number }) {
  const geom = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const rand = mulberry32(99173);
    for (let i = 0; i < count; i++) {
      // Uniform on sphere
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const x = s * Math.cos(phi) * radius;
      const y = u * radius;
      const z = s * Math.sin(phi) * radius;
      pos[i * 3 + 0] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      // Mostly cool, faint
      const c = new THREE.Color();
      const t = rand();
      if (t < 0.05) c.setHSL(0.6, 0.4, 0.55);
      else if (t < 0.2) c.setHSL(0.58, 0.18, 0.55);
      else c.setHSL(0.07 + rand() * 0.05, 0.3, 0.42 + rand() * 0.15);
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count, radius]);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 1.6,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => geom.dispose(), [geom]);
  return <points geometry={geom} material={mat} frustumCulled={false} />;
}

/* =================================================================
 * Disk-biased star field — the dense plane stars
 * ================================================================= */

function DiskBiasedStars({
  count,
  radius,
  thickness,
}: {
  count: number;
  radius: number;
  /** 0..1 — RMS scale-height as fraction of radius */
  thickness: number;
}) {
  const geom = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const rand = mulberry32(31337);

    for (let i = 0; i < count; i++) {
      // Pick an azimuth, with rejection sampling biased toward the
      // galactic-center direction (+X, phi=0). We reroll a few times
      // so the outer / anti-center direction is still populated but
      // less densely.
      let phi = rand() * Math.PI * 2;
      for (let attempt = 0; attempt < 3; attempt++) {
        // Map to [-1, 1] where +1 = pointing at galactic center
        const facing = Math.cos(phi);
        // Acceptance probability ramps from 0.35 (anti-center) to 1 (center)
        const accept = 0.35 + 0.65 * (facing * 0.5 + 0.5);
        if (rand() < accept) break;
        phi = rand() * Math.PI * 2;
      }

      // Disk-plane Y bias (narrow Gaussian via sum of uniforms)
      const gy = ((rand() + rand() + rand() + rand()) / 4 - 0.5) * 2;
      const y = gy * thickness * radius * 0.55;

      // Radial distance: heavy bias toward "near" so we get parallax pop
      const u = Math.pow(rand(), 1.8);
      const rad = 80 + u * (radius - 80);
      const x = Math.cos(phi) * rad;
      const z = Math.sin(phi) * rad;
      pos[i * 3 + 0] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Color temperature distribution
      const c = new THREE.Color();
      const t = rand();
      if (t < 0.04) {
        c.setHSL(0.6, 0.5, 0.78);
        sz[i] = 2.6;
      } else if (t < 0.14) {
        c.setHSL(0.58, 0.25, 0.78);
        sz[i] = 2.0;
      } else if (t < 0.5) {
        c.setHSL(0.13, 0.4, 0.7);
        sz[i] = 1.5;
      } else if (t < 0.85) {
        c.setHSL(0.07, 0.5, 0.55);
        sz[i] = 1.2;
      } else {
        c.setHSL(0.02, 0.6, 0.45);
        sz[i] = 1.0;
      }
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sz, 1));
    return g;
  }, [count, radius, thickness]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uPxScale: { value: 1.0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader: /* glsl */ `
          attribute float size;
          varying vec3 vColor;
          void main(){
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (180.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying vec3 vColor;
          void main(){
            // Soft round disc with diffraction halo
            vec2 uv = gl_PointCoord - 0.5;
            float r2 = dot(uv, uv);
            float core = exp(-r2 * 28.0);
            float halo = exp(-r2 * 6.0) * 0.35;
            float a = core + halo;
            if (a < 0.01) discard;
            vec3 col = vColor * (core * 1.4 + halo * 0.9);
            gl_FragColor = vec4(col, a);
          }
        `,
        vertexColors: true,
      }),
    [],
  );

  useEffect(() => () => geom.dispose(), [geom]);
  return <points geometry={geom} material={mat} frustumCulled={false} />;
}

/* =================================================================
 * Nearby bright stars — sparse, large, colorful "anchor" points
 * ================================================================= */

function NearbyStars({ count }: { count: number }) {
  const geom = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const rand = mulberry32(54321);
    for (let i = 0; i < count; i++) {
      // Closer than disk stars; bias slightly to plane but allow some
      // out-of-plane stars too (we have neighbors above + below)
      const phi = rand() * Math.PI * 2;
      const planeMix = rand() * rand(); // 0..1, bias toward 0
      const polarBias = (1 - planeMix) * 0.85; // 0..0.85
      const cosTheta = (rand() * 2 - 1) * (1 - polarBias);
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      const radius = 30 + rand() * 70;
      pos[i * 3 + 0] = sinTheta * Math.cos(phi) * radius;
      pos[i * 3 + 1] = cosTheta * radius;
      pos[i * 3 + 2] = sinTheta * Math.sin(phi) * radius;

      const c = new THREE.Color();
      const t = rand();
      if (t < 0.08) {
        c.setHSL(0.6, 0.55, 0.82);
        sz[i] = 4.5;
      } else if (t < 0.22) {
        c.setHSL(0.58, 0.25, 0.85);
        sz[i] = 3.6;
      } else if (t < 0.55) {
        c.setHSL(0.13, 0.45, 0.78);
        sz[i] = 3.2;
      } else if (t < 0.85) {
        c.setHSL(0.07, 0.6, 0.62);
        sz[i] = 2.8;
      } else {
        c.setHSL(0.02, 0.7, 0.5);
        sz[i] = 2.4;
      }
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sz, 1));
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader: /* glsl */ `
          attribute float size;
          varying vec3 vColor;
          void main(){
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (260.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying vec3 vColor;
          void main(){
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            // Bright core + cross diffraction spikes
            float core = exp(-r * r * 32.0);
            float halo = exp(-r * 10.0) * 0.45;
            // Subtle 4-spike diffraction
            float spike = max(0.0, 1.0 - abs(uv.x) * 30.0)
                        + max(0.0, 1.0 - abs(uv.y) * 30.0);
            spike *= (1.0 - smoothstep(0.0, 0.5, r)) * 0.35;
            float a = core + halo * 0.8 + spike * 0.5;
            if (a < 0.01) discard;
            vec3 col = vColor * (core * 1.6 + halo + spike);
            gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
          }
        `,
        vertexColors: true,
      }),
    [],
  );

  useEffect(() => () => geom.dispose(), [geom]);
  return <points geometry={geom} material={mat} frustumCulled={false} />;
}

/* =================================================================
 * Nebula billboard — a faint additive cloud sprite at a direction
 * ================================================================= */

function NebulaCloud({
  direction,
  color,
  size,
  opacity,
}: {
  direction: [number, number, number];
  color: string;
  size: number;
  opacity: number;
}) {
  const dir = useMemo(
    () => new THREE.Vector3(...direction).normalize(),
    [direction],
  );
  // Place the billboard at distance 1100 along the direction
  const pos = useMemo(() => dir.clone().multiplyScalar(1100), [dir]);
  // Build a soft radial shader
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
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
          uniform vec3 uColor;
          uniform float uOpacity;

          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vnoise(vec2 p){
            vec2 i = floor(p); vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f*f*(3.0 - 2.0*f);
            return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
          }
          float fbm(vec2 p){
            float v = 0.0; float a = 0.55;
            for (int i = 0; i < 5; i++){
              v += a * vnoise(p);
              p *= 2.07; a *= 0.5;
            }
            return v;
          }
          void main(){
            vec2 c = vUv - 0.5;
            float r = length(c);
            // Soft radial falloff
            float radial = 1.0 - smoothstep(0.05, 0.5, r);
            // Add wispy structure
            float n = fbm(vUv * 4.0);
            float n2 = fbm(vUv * 11.0 + 13.0);
            float wisp = pow(n * 0.6 + n2 * 0.4, 1.6);
            float a = radial * wisp;
            vec3 col = uColor * a;
            gl_FragColor = vec4(col, a * uOpacity);
          }
        `,
      }),
    [color, opacity],
  );
  // Orient billboard to face origin (camera neighborhood)
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (ref.current) ref.current.lookAt(0, 0, 0);
  }, [pos]);
  return (
    <mesh ref={ref} position={pos} material={mat}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

/* =================================================================
 * Galactic plane shell shader — the "Milky Way band across the sky"
 * ================================================================= */

function buildSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        // World direction from origin to vertex
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = normalize(wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vDir;
      uniform float uTime;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0 - 2.0*f);
        return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.55;
        for (int i = 0; i < 6; i++){
          v += a * vnoise(p);
          p *= 2.07; a *= 0.5;
        }
        return v;
      }
      // Ridged for sharp dust filaments
      float ridged(vec2 p){
        return 1.0 - abs(2.0 * vnoise(p) - 1.0);
      }
      float ridgedFbm(vec2 p){
        float v = 0.0; float a = 0.55;
        for (int i = 0; i < 5; i++){
          v += a * ridged(p);
          p *= 2.13; a *= 0.5;
        }
        return v;
      }

      void main(){
        // Spherical / galactic coords:
        //   - "latitude" = angle from galactic equator (XZ plane)
        //   - "longitude" = azimuth in XZ plane (0 = +X = galactic center)
        float lat = asin(clamp(vDir.y, -1.0, 1.0));            // -PI/2..PI/2
        float lon = atan(vDir.z, vDir.x);                      // -PI..PI

        // Project to a 2D coord system that "wraps" the band. We give
        // longitude high weight so noise looks long & thin along the band.
        vec2 bandUv = vec2(lon * 1.7, lat * 4.5);

        // ----- Galactic-plane luminous band -----
        // Gaussian in latitude (band is narrow near the equator). We
        // overlay a wider gentle band on top so the off-equator wings
        // still glow softly, the way real Milky Way photographs do.
        float bandTight = exp(-lat * lat * 32.0);
        float bandWide  = exp(-lat * lat * 7.0) * 0.45;
        float bandY = bandTight + bandWide;

        // Brightness gradient toward the galactic center direction (lon=0).
        // Real Milky Way: Sagittarius is dramatically brighter than
        // anti-center (Auriga/Taurus side).
        float lonGrad = exp(-lon * lon * 0.55) * 1.05 + 0.18;

        // Inner-disk bulge — broad bright lobe centred on Sagittarius.
        float bulge = exp(-(lon * lon * 0.9 + lat * lat * 10.0) * 1.0) * 1.25;

        // Cloud structure inside the band (Sgr / Cyg / Carina star clouds)
        float clouds = pow(fbm(bandUv * 0.85), 1.35);
        // Bias clouds strongly to the band but allow some wings
        clouds *= bandTight + bandWide * 0.5;
        // Boost large clumps near galactic center
        clouds *= 0.45 + lonGrad * 0.9;

        // ----- Dark dust lanes (Great Rift, Coalsack-like patches) -----
        // The Great Rift runs slightly off the galactic equator, with
        // wispy filaments cutting through the band. We layer two
        // ridged-noise dust bands at slightly different latitudes plus
        // a low-frequency mask for broader dark regions.
        float riftYTop = exp(-(lat - 0.02) * (lat - 0.02) * 480.0) * 0.65;
        float riftYBot = exp(-(lat + 0.045) * (lat + 0.045) * 260.0) * 0.45;
        float dustRidge = ridgedFbm(bandUv * 1.35 + vec2(7.0, 13.0));
        float dustA = clamp((riftYTop + riftYBot) * (0.55 + 0.55 * dustRidge), 0.0, 1.0);
        // Broader dark patches, where star light is dimmed by molecular clouds
        float broadDust = exp(-lat * lat * 90.0)
                        * smoothstep(0.5, 0.85, fbm(bandUv * 0.5 + 4.0));
        // Discrete dark blobs (Coalsack-style)
        float darkBlob = smoothstep(0.78, 0.95, fbm(bandUv * 2.6 + vec2(19.0, 5.0)));
        darkBlob *= exp(-lat * lat * 60.0);
        // Strongest dust occurs near galactic center where most molecular
        // clouds are; weakens toward anti-center.
        float dustGrad = 0.45 + lonGrad * 0.8;
        float dust = clamp(max(dustA, max(broadDust * 0.85, darkBlob * 0.95)) * dustGrad, 0.0, 1.0);

        // ----- Faint nebula tints in selective regions -----
        // Soft Hα-like reddish glow patches near the band.  Two
        // independent nebula fields at different scales, with a hue
        // shift so we get reddish AND bluish patches.
        float nebMask  = smoothstep(0.45, 0.90, fbm(bandUv * 1.7 + vec2(31.0, 17.0)));
        float nebMask2 = smoothstep(0.55, 0.92, fbm(bandUv * 3.1 + vec2(53.0, 91.0)));
        float neb = (nebMask * 0.85 + nebMask2 * 0.6) * (bandTight + bandWide * 0.4);
        // Patch hue varies along longitude so we get red, magenta, blue
        float patchHue = sin(lon * 2.3 + nebMask * 6.0);
        vec3 nebRed   = vec3(1.2, 0.38, 0.42);   // Hα emission
        vec3 nebBlue  = vec3(0.55, 0.75, 1.15);  // reflection nebula
        vec3 nebGold  = vec3(1.0, 0.7, 0.4);
        vec3 nebTint  = mix(nebRed,
                            mix(nebGold, nebBlue, smoothstep(-0.3, 0.7, patchHue)),
                            smoothstep(-0.2, 0.7, patchHue * 0.6));

        // ----- Sharp HII region emission (pink starburst spots) -----
        // Bright pinpoint Hα-emitting spots concentrated near the plane
        // and in the inner galaxy direction (Sagittarius arm star-forming).
        // Tightly gated so it reads as discrete pink patches rather than
        // a wash over the whole band.
        float hiiNoise = fbm(bandUv * 7.0 + vec2(101.0, 47.0));
        float hiiNoise2 = fbm(bandUv * 14.0 + vec2(7.0, 233.0));
        float hiiSpots = smoothstep(0.72, 0.92, hiiNoise)
                       + smoothstep(0.78, 0.96, hiiNoise2) * 0.6;
        // Concentrate strictly near the plane and dim outside the inner galaxy
        float hiiBand = exp(-lat * lat * 220.0);
        float hii = hiiSpots * hiiBand * (0.2 + lonGrad * 0.7);
        // Dust occludes HII regions like everything else
        hii *= 1.0 - dust * 0.6;
        hii = clamp(hii, 0.0, 1.0);
        vec3 hiiPink = vec3(1.55, 0.45, 0.62);

        // ----- Brightness assembly -----
        float intensity = (bandY * lonGrad * 0.85)
                        + bulge * 0.95
                        + clouds * 0.7;
        // Dust blocks emitted light (multiplicative occlusion)
        intensity *= 1.0 - dust * 0.92;
        // Subtle off-band haze so the sky is not pure black between stars
        float haze = exp(-lat * lat * 3.5) * 0.05;
        intensity = max(intensity, haze * lonGrad);
        intensity = clamp(intensity, 0.0, 1.05);

        // ----- Color temperature -----
        // Inner band: warm K/M giants; outer band: cool young O/B
        vec3 warm    = vec3(1.0, 0.84, 0.62);    // bulge / Sagittarius
        vec3 mid     = vec3(1.0, 0.95, 0.85);    // mid disk
        vec3 cool    = vec3(0.62, 0.78, 1.08);   // young blue arms
        vec3 col = mix(cool, mid, smoothstep(-0.2, 0.6, lonGrad - 0.25));
        col = mix(col, warm, smoothstep(0.0, 0.9, bulge));
        // Add nebula tint where nebulae live
        col = mix(col, nebTint, neb * 0.55);
        // Dust scatters slightly red (interstellar reddening signature)
        col = mix(col, vec3(0.48, 0.22, 0.14), dust * 0.22);

        col *= intensity;

        // Add pink HII region emission additively on top
        col += hiiPink * hii * 0.45;

        gl_FragColor = vec4(col, clamp(intensity * 1.05, 0.0, 1.0));
      }
    `,
  });
}

/* ---- Utilities ----------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
