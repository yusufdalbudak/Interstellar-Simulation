import * as THREE from "three";

/**
 * Procedural accretion-disk shader. Produces:
 *  - Hot inner edge (white-blue) cooling toward outer edge (orange-red)
 *  - Doppler-style asymmetric brightness on one side (approaching motion)
 *  - Rotating turbulence using fbm noise advected with angular velocity
 *  - Soft inner/outer falloff so it blends with the photon ring & background
 */
export function accretionDiskShader(innerRadius: number, outerRadius: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: innerRadius },
      uOuter: { value: outerRadius },
      uSpeed: { value: 0.55 },
      uIntensity: { value: 1.4 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vLocal;
      void main(){
        vUv = uv;
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vLocal;
      uniform float uTime;
      uniform float uInner;
      uniform float uOuter;
      uniform float uSpeed;
      uniform float uIntensity;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0,0.0));
        float c = hash(i + vec2(0.0,1.0));
        float d = hash(i + vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.5;
        for(int i=0;i<5;i++){ v += a * noise(p); p *= 2.07; a *= 0.5; }
        return v;
      }

      void main(){
        float r = length(vLocal.xy);
        if (r < uInner || r > uOuter) discard;

        float t = (r - uInner) / (uOuter - uInner); // 0 inside, 1 outside
        float angle = atan(vLocal.y, vLocal.x);

        // Differential rotation: faster nearer the hole
        float omega = mix(2.6, 0.6, t);
        float adv = angle + uTime * uSpeed * omega;

        // Polar -> warped uvs for noise
        vec2 polar = vec2(adv * 1.5, t * 4.0 - uTime * 0.05);
        float n = fbm(polar);
        float n2 = fbm(polar * 2.5 + n);
        float density = pow(0.5 + 0.5 * sin(adv * 6.0 + n2 * 6.0), 1.6) * (1.0 - t);
        density = density * 0.6 + n2 * 0.5;

        // Soft inner/outer edge falloff
        float inner = smoothstep(uInner, uInner * 1.15, r);
        float outer = smoothstep(uOuter, uOuter * 0.7, r);
        float edge = inner * outer;

        // Color gradient: hot inner -> warm outer
        vec3 hot   = vec3(1.0, 0.96, 0.85);
        vec3 mid   = vec3(1.0, 0.65, 0.30);
        vec3 cool  = vec3(0.85, 0.30, 0.10);
        vec3 col = mix(hot, mid, smoothstep(0.0, 0.4, t));
        col = mix(col, cool, smoothstep(0.4, 1.0, t));

        // Doppler-style asymmetric brightening (one side appears brighter)
        float doppler = 0.55 + 0.85 * smoothstep(-0.3, 1.0, sin(angle));

        float brightness = density * edge * doppler * uIntensity;
        gl_FragColor = vec4(col * brightness, brightness * 0.95);
      }
    `,
  });
}
