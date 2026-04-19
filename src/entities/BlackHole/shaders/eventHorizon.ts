import * as THREE from "three";

/**
 * The "core" of the black hole: a non-emissive black sphere with an extremely
 * subtle photon-ring shimmer at the silhouette. We do not let it become a
 * pure black void because we want a faint cinematic shimmer that conveys
 * gravitationally trapped photons orbiting the horizon.
 */
export function eventHorizonShader(_radius: number) {
  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      uniform float uTime;
      void main(){
        float fresnel = 1.0 - max(dot(vNormal, vView), 0.0);
        float ring = pow(fresnel, 14.0);
        // Faint warm shimmer
        vec3 col = vec3(0.0) + vec3(1.0, 0.55, 0.25) * ring * 0.65;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
