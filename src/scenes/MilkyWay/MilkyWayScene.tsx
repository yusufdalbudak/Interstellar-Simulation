import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useAppStore } from "@/systems/state/store";

/**
 * Milky Way · OVERVIEW scene.
 *
 * The macro / navigation representation of our galaxy. We render the disk
 * from an external, slightly elevated vantage so the user can read the
 * structure: bulge, bar, arms, dust lanes, halo, and the approximate
 * position of the Sun in the Orion Spur.
 *
 * This scene deliberately leans into "astronomical chart with cinematic
 * presentation" — it is the navigation layer.  The `MilkyWayInsideScene`
 * is the experiential, in-galaxy counterpart.
 *
 * Visual layers, drawn back to front:
 *
 *   1. Faint stellar halo (sphere shell)
 *   2. Thick galactic disk shader (4-arm grand-design w/ central bar +
 *      noise-driven dust mask)
 *   3. Two thin layers of disk stars (color-temperature varied) for grain
 *   4. Central bulge sprite (warm, soft)
 *   5. Sol position marker in the Orion Spur, with a label that doubles
 *      as a "Travel to Sol" action
 *
 * Performance: the disk is one quad with a single fragment shader. Stars
 * are two THREE.Points clouds with vertex colors. No textures.
 */
export function MilkyWayScene() {
  const setScene = useAppStore.getState().setScene;
  const beaconRef = useRef<THREE.Mesh>(null);
  const diskRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const diskMat = useMemo(() => buildDiskMaterial(), []);
  const haloMat = useMemo(() => buildHaloMaterial(), []);

  useFrame((_, delta) => {
    diskMat.uniforms.uTime.value += delta;
    haloMat.uniforms.uTime.value += delta;
    // Very slow rotation reads as galactic motion without nausea.
    if (diskRef.current) diskRef.current.rotation.z += delta * 0.008;
    if (beaconRef.current) {
      const m = beaconRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.55 + Math.sin(performance.now() * 0.003) * 0.35;
    }
  });

  // Disk lies completely flat in the XZ plane.  The cinematic camera sits
  // straight above so the spiral is presented face-on as a horizontal
  // composition (matching the look of a real face-on galaxy photograph).
  return (
    <group rotation={[0, 0, 0]}>
      <ambientLight intensity={0.04} color="#9bb6ff" />

      {/* Faint stellar halo shell */}
      <mesh ref={haloRef} material={haloMat}>
        <sphereGeometry args={[160, 32, 24]} />
      </mesh>

      {/* Galactic disk shader (the main structure) */}
      <mesh ref={diskRef} material={diskMat} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[220, 128]} />
      </mesh>

      {/* Disk stars: a "warm" inner population biased to the bulge + arms */}
      <DiskStars
        count={2200}
        inner={4}
        outer={150}
        thickness={3.5}
        seed={11}
        warmth={0.78}
        size={1.4}
        opacity={0.9}
      />
      {/* Disk stars: a "cool" outer population for the arm halos */}
      <DiskStars
        count={1600}
        inner={50}
        outer={210}
        thickness={6}
        seed={23}
        warmth={0.18}
        size={1.15}
        opacity={0.75}
      />

      {/* Central bulge: warm soft sphere */}
      <mesh>
        <sphereGeometry args={[14, 32, 24]} />
        <meshBasicMaterial
          color="#ffe2a8"
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Sol position marker — Orion Spur, ~26,000 ly out from center.
          Uses [Math.cos(SOL_ANGLE) * SOL_R, 0, Math.sin(SOL_ANGLE) * SOL_R]
          in disk-local (XZ) coords.  We pick an offset that lands the
          marker between two visible arms. */}
      <SolMarker beaconRef={beaconRef} onEnter={() => setScene("solarSystem")} />

      {/* Bright pinpoint foreground stars with diffraction spikes —
          these are "Milky Way foreground stars" between us and the
          target galaxy in real astrophotos.  Renders OUTSIDE the disk
          radius so it doesn't crowd the structure. */}
      <ForegroundStars count={90} radius={520} avoidRadius={200} />

      {/* Small companion / dwarf galaxy (NGC 6744-A analogue) — soft additive
          ellipse far off the main disk so it reads as a separate object */}
      <CompanionGalaxy position={[260, -18, 95]} scale={[34, 8, 11]} />
    </group>
  );
}

/* ---- Foreground "astrophoto" pinpoint stars with diffraction spikes -- */

function ForegroundStars({
  count,
  radius,
  avoidRadius,
}: {
  count: number;
  radius: number;
  /** Don't place stars within this distance from origin (keeps them off the disk) */
  avoidRadius: number;
}) {
  const geom = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const rand = mulberry32(7331);
    for (let i = 0; i < count; i++) {
      // Place isotropically on a sphere then push outside avoidRadius
      let x = 0,
        y = 0,
        z = 0;
      for (let attempt = 0; attempt < 8; attempt++) {
        const u = rand() * 2 - 1;
        const phi = rand() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const r = avoidRadius + Math.pow(rand(), 0.6) * (radius - avoidRadius);
        x = s * Math.cos(phi) * r;
        y = u * r * 0.6; // flatten a touch so stars cluster toward camera plane
        z = s * Math.sin(phi) * r;
        if (Math.hypot(x, z) > avoidRadius * 0.85) break;
      }
      pos[i * 3 + 0] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Brightness distribution heavily skewed (most faint, a few bright)
      const bright = Math.pow(rand(), 3.0);
      sz[i] = 3.5 + bright * 16.0;

      // Color temperature (real stars: blue O/B, white A/F, yellow G, orange K, red M)
      const c = new THREE.Color();
      const t = rand();
      if (t < 0.07) c.setHSL(0.6, 0.55, 0.85);
      else if (t < 0.22) c.setHSL(0.58, 0.2, 0.92);
      else if (t < 0.55) c.setHSL(0.13, 0.35, 0.88);
      else if (t < 0.85) c.setHSL(0.07, 0.55, 0.78);
      else c.setHSL(0.02, 0.7, 0.65);
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sz, 1));
    return g;
  }, [count, radius, avoidRadius]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexColors: true,
        vertexShader: /* glsl */ `
          attribute float size;
          varying vec3 vColor;
          varying float vSize;
          void main(){
            vColor = color;
            vSize = size;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            // Closer stars get larger, but capped so distant ones still show
            gl_PointSize = clamp(size * (260.0 / -mv.z), 2.0, 28.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying vec3 vColor;
          varying float vSize;
          void main(){
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            // Sharp bright core
            float core = exp(-r * r * 60.0);
            // Soft halo
            float halo = exp(-r * 11.0) * 0.45;
            // Four-point diffraction spikes (cross + thin)
            float ax = abs(uv.x);
            float ay = abs(uv.y);
            float spike = max(0.0, 1.0 - ay * 50.0) * smoothstep(0.5, 0.0, ax * 4.0)
                        + max(0.0, 1.0 - ax * 50.0) * smoothstep(0.5, 0.0, ay * 4.0);
            // Spike intensity scales with star brightness
            float spikeAmp = smoothstep(6.0, 18.0, vSize) * 0.85;
            spike *= spikeAmp * (1.0 - smoothstep(0.0, 0.5, r));
            float a = core + halo * 0.9 + spike * 0.6;
            if (a < 0.01) discard;
            vec3 col = vColor * (core * 1.7 + halo + spike * 1.2);
            gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
          }
        `,
      }),
    [],
  );

  useEffect(() => () => geom.dispose(), [geom]);

  return <points geometry={geom} material={mat} frustumCulled={false} />;
}

/* ---- Companion satellite galaxy ----------------------------------- */

function CompanionGalaxy({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: [number, number, number];
}) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
        uniforms: {},
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
          void main(){
            vec2 p = vUv - 0.5;
            // Elongated soft glow with subtle internal bands
            float r = length(vec2(p.x, p.y * 2.4));
            float core = exp(-r * r * 26.0);
            float halo = exp(-r * 5.5) * 0.4;
            float bands = 0.7 + 0.3 * sin((p.x) * 14.0 + vnoise(vUv * 6.0) * 3.0);
            float a = (core * 1.4 + halo * bands);
            vec3 col = mix(vec3(0.95, 0.85, 0.7), vec3(0.7, 0.75, 1.0), 0.4);
            gl_FragColor = vec4(col * a, a * 0.55);
          }
        `,
      }),
    [],
  );
  return (
    <mesh position={position} scale={scale} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

const SOL_DISK_RADIUS = 120; // overview-scaled "26,000 ly" position
const SOL_DISK_ANGLE = -0.55; // radians around bulge

function SolMarker({
  beaconRef,
  onEnter,
}: {
  beaconRef: React.RefObject<THREE.Mesh>;
  onEnter: () => void;
}) {
  const px = Math.cos(SOL_DISK_ANGLE) * SOL_DISK_RADIUS;
  const pz = Math.sin(SOL_DISK_ANGLE) * SOL_DISK_RADIUS;
  return (
    <group position={[px, 0, pz]}>
      {/* Soft halo sphere */}
      <mesh
        ref={beaconRef}
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "default")}
      >
        <sphereGeometry args={[1.5, 16, 12]} />
        <meshBasicMaterial
          color="#ffe6b0"
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      </mesh>
      {/* Crosshair-style ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.0, 3.4, 64]} />
        <meshBasicMaterial
          color="#ffae5a"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Outer guide ring, fainter and larger */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.2, 6.45, 64]} />
        <meshBasicMaterial
          color="#ffae5a"
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Label / action */}
      <group position={[0, 7, 0]}>
        <Html center distanceFactor={90} zIndexRange={[10, 0]}>
          <button
            className="body-label active mw-sol-label"
            onClick={(e) => {
              e.stopPropagation();
              onEnter();
            }}
          >
            Sol · Orion Spur → enter system
          </button>
        </Html>
      </group>
    </group>
  );
}

function DiskStars({
  count,
  inner,
  outer,
  thickness,
  seed,
  warmth,
  size,
  opacity,
}: {
  count: number;
  inner: number;
  outer: number;
  /** Half-thickness of the disk slab in scene units */
  thickness: number;
  /** Random seed (drives angular distribution) */
  seed: number;
  /** 0..1; higher = more warm yellow stars (bulge), lower = more blue (outer) */
  warmth: number;
  size: number;
  opacity: number;
}) {
  const meshRef = useRef<THREE.Points>(null);

  const geom = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    // Reproducible PRNG so the look stays stable across HMR.
    const rand = mulberry32(seed * 1009 + 7);

    for (let i = 0; i < count; i++) {
      // Bias radial distribution slightly inward (bulge concentration)
      const u = Math.pow(rand(), 0.7);
      const r = inner + u * (outer - inner);
      // Density bumps along arms via cosine modulation of azimuth
      const armCount = 4;
      const baseAngle = rand() * Math.PI * 2;
      const swirl = (r / outer) * 5.5;
      // Pull samples toward arm crests (cosine biased rejection-ish)
      let a = baseAngle + swirl;
      const armPhase = a * armCount;
      // Soft attractor: shift sample toward nearest arm peak
      a += Math.sin(armPhase) * 0.08;
      // Radial jitter so arms are not razor sharp
      const radial = r + (rand() - 0.5) * 12;
      const x = Math.cos(a) * radial;
      const z = Math.sin(a) * radial;
      // Disk thickness — falls off outward (outer disk is thinner)
      const tFall = 1 - r / outer;
      const localT = thickness * (0.4 + 0.6 * tFall);
      // Gaussian-ish thickness (sum of 3 uniforms ≈ Gaussian)
      const gy = ((rand() + rand() + rand()) / 3 - 0.5) * 2 * localT;
      pos[i * 3 + 0] = x;
      pos[i * 3 + 1] = gy;
      pos[i * 3 + 2] = z;

      // Color temperature: warmer near bulge, cooler in outer disk.
      const innerness = 1 - Math.min(1, r / outer);
      // Mix between O/B (cool blue), G (white-yellow), and K/M (warm)
      const wm = THREE.MathUtils.clamp(warmth + (innerness - 0.5) * 0.6, 0, 1);
      const blueT = rand();
      const c = new THREE.Color();
      if (blueT < 0.06) {
        // Hot blue O/B star
        c.setHSL(0.6, 0.45, 0.78);
      } else if (blueT < 0.18) {
        // White A/F star
        c.setHSL(0.58, 0.18, 0.85);
      } else if (blueT < 0.55) {
        // Yellow G (sun-like)
        c.setHSL(0.13, 0.45 + wm * 0.1, 0.7);
      } else {
        // Orange/red K/M dominant in bulge
        c.setHSL(0.06 - wm * 0.02, 0.55, 0.55 + wm * 0.15);
      }
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count, inner, outer, thickness, seed, warmth]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        map: makeStarSprite(),
        alphaTest: 0.01,
      }),
    [size, opacity],
  );

  useEffect(() => () => geom.dispose(), [geom]);

  return <points ref={meshRef} geometry={geom} material={mat} />;
}

/* ---- Materials ----------------------------------------------------- */

function buildDiskMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      void main(){
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vLocal;
      uniform float uTime;

      // ---------- noise ----------
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
        for (int i = 0; i < 4; i++){
          v += a * vnoise(p);
          p *= 2.07; a *= 0.5;
        }
        return v;
      }
      // Ridged noise for sharp dust filaments
      float ridged(vec2 p){
        return 1.0 - abs(2.0 * vnoise(p) - 1.0);
      }
      float ridgedFbm(vec2 p){
        float v = 0.0; float a = 0.55;
        for (int i = 0; i < 3; i++){
          v += a * ridged(p);
          p *= 2.13; a *= 0.5;
        }
        return v;
      }

      void main(){
        // Polar coords in the disk plane
        float r = length(vLocal.xy) / 300.0;     // 0..1 outward
        float angle = atan(vLocal.y, vLocal.x);

        // ---- Bulge + bar (Milky Way / NGC 6744 is SBbc) ----
        // Bar elongation along x-axis (in disk-local coords)
        vec2 barSpace = vec2(vLocal.x / 60.0, vLocal.y / 22.0);
        float barDist = length(barSpace);
        float bar = exp(-barDist * barDist * 1.5);

        // Bright golden bulge that fades faster than the bar
        float bulgeCore = exp(-r * r * 18.0) * 1.35;     // tight bright core
        float bulgeWide = exp(-r * r * 6.5)  * 0.85;     // soft warm halo
        float bulge = bulgeCore + bulgeWide;

        // ---- Spiral arms (4 grand-design arms + 2 minor flocculent arms) ----
        // Logarithmic spiral: angle - k*log(r) is constant on an arm
        float swirl = 2.4 * log(r * 8.0 + 1.0);
        float armPhase = 4.0 * (angle + swirl);
        // Slightly noisy arm phase so crests are not razor-clean (flocculent)
        float armJitter = (vnoise(vec2(angle * 3.0, r * 9.0)) - 0.5) * 0.55;
        float armPhaseJ = armPhase + armJitter;
        float armsMain = 0.5 + 0.5 * cos(armPhaseJ);
        armsMain = pow(armsMain, 2.6);

        // Secondary minor 6-arm spurs to break perfect symmetry
        float minorPhase = 6.0 * (angle + swirl * 1.1) + 1.7;
        float armsMinor = 0.5 + 0.5 * cos(minorPhase);
        armsMinor = pow(armsMinor, 4.5) * 0.4;

        float arms = armsMain + armsMinor;
        // Modulate arm strength over radius (peak in mid-disk)
        float armEnv = smoothstep(0.06, 0.22, r) * (1.0 - smoothstep(0.45, 0.95, r));
        arms *= armEnv;

        // Inter-arm star clouds for organic clumping
        float clouds = pow(fbm(vec2(angle * 1.6 + swirl * 0.7, r * 4.5)), 1.5);
        float armField = arms * 1.45 + clouds * 0.4 * armEnv;

        // ---- Dust lanes (silhouette inside arms + ring around bulge) ----
        float dustBase = ridgedFbm(vec2(angle * 2.6 + swirl * 1.25, r * 7.5));
        float dustArm  = pow(0.5 + 0.5 * cos(armPhaseJ + 0.7), 5.5);
        // Inner dust ring that wraps around the bulge (visible against bulge).
        // Cheap modulation via a single vnoise so we don't pay for an fbm.
        float dustRing = exp(-(r - 0.085) * (r - 0.085) * 1100.0) * 0.7;
        dustRing *= 0.6 + 0.4 * vnoise(vec2(angle * 5.0, r * 3.0));
        float dust = clamp(
          (dustBase * 0.5 + dustArm * 0.55) * smoothstep(0.04, 0.5, r) * (1.0 - smoothstep(0.45, 1.0, r))
          + dustRing,
          0.0, 1.0
        );

        // ---- HII regions: pink/red emission nebulae sprinkled along arms ----
        // (NGC 6744's signature feature — what gives it that sparkly pink look).
        // Single fbm + a high-frequency vnoise overlay keeps GPU cost low.
        float hiiClumps = fbm(vec2(angle * 7.5 + swirl * 3.0, r * 18.0));
        float hiiHF     = vnoise(vec2(angle * 22.0 + swirl * 7.0, r * 42.0));
        float hiiSpot = smoothstep(0.62, 0.86, hiiClumps)
                      + smoothstep(0.78, 0.95, hiiHF) * 0.5;
        // Strongly gated to arm crests
        float hiiGate = pow(0.5 + 0.5 * cos(armPhaseJ), 5.0);
        float hii = hiiSpot * hiiGate;
        // Live in the mid disk (not in the bulge, not in the outer halo)
        hii *= smoothstep(0.12, 0.22, r) * (1.0 - smoothstep(0.55, 0.85, r));
        hii = clamp(hii, 0.0, 1.0);

        // ---- Brightness assembly ----
        float intensity = bulge * 1.3 + bar * 0.55 + armField * 0.55;
        // Dust occlusion (multiplicative — never re-emits light)
        intensity *= 1.0 - dust * 0.82;
        // HII emission adds back light (independent of dust)
        intensity += hii * 0.7;
        // Outer fade
        intensity *= 1.0 - smoothstep(0.6, 1.0, r);
        // Inner clamp so the bulge does not blow out the alpha
        intensity = min(intensity, 1.05);

        // ---- Color: temperature gradient ----
        vec3 warm    = vec3(1.0, 0.78, 0.45);   // golden bulge (KM giants)
        vec3 sunlike = vec3(1.0, 0.95, 0.82);   // mid disk
        vec3 cool    = vec3(0.58, 0.74, 1.10);  // young blue arms
        vec3 col = mix(cool, sunlike, smoothstep(0.0, 0.55, 1.0 - r));
        col = mix(col, warm, smoothstep(0.22, 0.0, r));
        // Extra blue tint on arm crests (young massive stars)
        col = mix(col, cool, arms * 0.42);
        // Dust takes a faint warm interstellar-reddening tone
        col = mix(col, vec3(0.38, 0.18, 0.12), dust * 0.22);

        col *= intensity;

        // ---- Add HII pink emission on top (additive, color-rich) ----
        // Hα-dominated bright pink/red, slightly bluer in younger regions
        vec3 hiiPink = vec3(1.45, 0.42, 0.62);   // dominant Hα + some OIII
        vec3 hiiMagenta = vec3(1.25, 0.35, 0.85);
        vec3 hiiColor = mix(hiiPink, hiiMagenta, hiiHF * 0.4);
        col += hiiColor * hii * 0.95;

        gl_FragColor = vec4(col, clamp(intensity * 1.05, 0.0, 1.0));
      }
    `,
  });
}

function buildHaloMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 } },
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
      void main(){
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        // Bias halo toward galactic-equator regions (local Y is up here
        // because the parent disk is in XZ plane after rotation)
        float vert = abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
        float planeBias = pow(1.0 - vert, 2.5);
        float fres = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0);
        vec3 col = vec3(0.45, 0.55, 0.95) * fres * 0.07 + vec3(0.6, 0.55, 0.45) * planeBias * 0.04;
        gl_FragColor = vec4(col, fres * 0.10 + planeBias * 0.05);
      }
    `,
  });
}

/* ---- Utilities ----------------------------------------------------- */

let _starSprite: THREE.CanvasTexture | null = null;
function makeStarSprite() {
  if (_starSprite) return _starSprite;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, "rgba(255,255,255,1.0)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.12)");
  grad.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  _starSprite = tex;
  return tex;
}

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
