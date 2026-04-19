import * as THREE from "three";

/**
 * Gravitational-lensing shell.
 *
 * Approach (real-time approximation, NOT a true geodesic ray-tracer):
 *   - Render a sphere centered on the black hole with side: BackSide so we see
 *     its "interior" surface from outside.
 *   - For each fragment, compute the impact parameter `b` (perpendicular
 *     distance of the camera-pixel ray to the singularity).
 *   - Bend the view direction toward the singularity by a deflection angle
 *     ~ 4GM/(b c^2) → in our normalized units, alpha ≈ k * Rs / b. Below the
 *     photon sphere we render fully black (light is captured).
 *   - Sample a procedural multi-octave starfield in the bent direction so
 *     the starfield visibly warps around the silhouette without needing a
 *     cube-map render-target.
 *
 * This produces the iconic "stars curving around the hole" look at constant
 * cost - no extra RTT and no CPU readback. The strength is tunable per quality.
 */
export function lensingShader(
  shellRadius: number,
  horizonRadius: number,
  qualitySteps: number,
) {
  const samples = Math.max(0, qualitySteps);
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uShellRadius: { value: shellRadius },
      uRs: { value: horizonRadius }, // Schwarzschild-like radius proxy
      uCameraPos: { value: new THREE.Vector3() },
      uLensStrength: { value: 1.4 },
      uPhotonSphereScale: { value: 1.55 },
    },
    defines: {
      LENS_SAMPLES: String(samples),
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
      precision highp float;
      varying vec3 vWorldPos;

      uniform float uTime;
      uniform float uShellRadius;
      uniform float uRs;
      uniform vec3  uCameraPos;
      uniform float uLensStrength;
      uniform float uPhotonSphereScale;

      // -- Procedural deep-space sky (so we don't need a cubemap) --
      float hash3(vec3 p){
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }
      // Starfield: cellular grid, rare bright dots
      float starfield(vec3 dir){
        // Spherical to a 2D grid
        float u = atan(dir.z, dir.x) / 6.2831853 + 0.5;
        float v = asin(clamp(dir.y, -1.0, 1.0)) / 3.1415926 + 0.5;
        vec2 uv = vec2(u, v) * 380.0;
        vec2 i = floor(uv);
        vec2 f = fract(uv);
        float h = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
        // sparsity
        float thresh = 0.985;
        float bright = step(thresh, h);
        // distance to cell center
        vec2 d = f - vec2(0.5);
        float radial = exp(-dot(d,d) * 90.0);
        return bright * radial * (0.6 + h * 1.4);
      }

      vec3 skyColor(vec3 dir){
        // Cool deep-space gradient + faint nebula
        float a = dir.y * 0.5 + 0.5;
        vec3 base = mix(vec3(0.012, 0.018, 0.034), vec3(0.020, 0.012, 0.030), a);

        // Faint procedural nebula tint
        float n = 0.0;
        vec3 q = dir * 4.0 + vec3(uTime * 0.01);
        n += abs(sin(q.x) * cos(q.y * 1.3) * sin(q.z * 0.7));
        base += vec3(0.18, 0.10, 0.22) * pow(n, 4.0) * 0.4;
        base += vec3(0.10, 0.18, 0.30) * pow(1.0 - abs(dir.y), 6.0) * 0.25;

        // Stars (additive)
        float s = starfield(dir);
        base += vec3(1.0) * s;
        // Add chromatic flicker on bright ones
        base += vec3(0.9, 1.0, 1.2) * pow(s, 4.0);
        return base;
      }

      void main(){
        vec3 ro = uCameraPos;
        vec3 rd = normalize(vWorldPos - ro);

        // Closest approach to the black hole (origin)
        float t = -dot(ro, rd);
        vec3  closest = ro + rd * t;
        float b = length(closest); // impact parameter

        // Photon sphere capture: anything closer than uRs * factor → swallowed
        float photonRadius = uRs * uPhotonSphereScale;
        if (b < photonRadius) {
          // Smooth transition near the silhouette
          float k = smoothstep(photonRadius, photonRadius * 1.04, b);
          if (k <= 0.001) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
        }

        // Deflection magnitude (small-angle approximation, scaled for visuals)
        float alpha = uLensStrength * uRs / max(b, 0.0001);
        // Cap to avoid singularity and keep it stable
        alpha = clamp(alpha, 0.0, 1.6);

        // Build a "toward singularity" tangent component perpendicular to rd
        vec3 toCenter = -closest; // points to the BH from closest-approach
        float toLen = length(toCenter);
        vec3 perp = (toLen > 1e-5) ? toCenter / toLen : vec3(0.0);
        // Bend rd toward the center by alpha radians (planar small rotation)
        vec3 bent = normalize(rd * cos(alpha) + perp * sin(alpha));

        vec3 col = skyColor(bent);

        // Brightening near the photon sphere (Einstein-ring-ish glow)
        float ring = smoothstep(photonRadius * 1.18, photonRadius * 1.0, b);
        col += vec3(1.0, 0.78, 0.55) * ring * 0.55;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
