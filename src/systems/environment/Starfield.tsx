import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface StarfieldProps {
  count?: number;
  /** Number of depth layers - each renders progressively closer + slower drift */
  layers?: number;
  radius?: number;
}

/**
 * Multi-layer procedural starfield. Stars are distributed inside a thick
 * spherical shell. Different layers drift at slightly different speeds so the
 * camera sees subtle parallax. Colors come from a "stellar temperature"
 * gradient (orange-white-blue), with a small chance of a brighter star.
 */
export function Starfield({
  count = 12000,
  layers = 4,
  radius = 1800,
}: StarfieldProps) {
  const groupRef = useRef<THREE.Group>(null);

  const layerData = useMemo(() => {
    const out: Array<{
      geometry: THREE.BufferGeometry;
      material: THREE.PointsMaterial;
      driftSpeed: number;
    }> = [];

    const perLayer = Math.max(200, Math.floor(count / layers));

    for (let li = 0; li < layers; li++) {
      const t = li / Math.max(1, layers - 1);
      const layerRadius = radius * (0.4 + t * 0.7);
      const positions = new Float32Array(perLayer * 3);
      const colors = new Float32Array(perLayer * 3);
      const sizes = new Float32Array(perLayer);

      for (let i = 0; i < perLayer; i++) {
        // Points on a thick spherical shell (uniform sphere distribution).
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = layerRadius * (0.85 + Math.random() * 0.3);

        positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        const stellar = stellarColor(Math.random());
        colors[i * 3 + 0] = stellar.r;
        colors[i * 3 + 1] = stellar.g;
        colors[i * 3 + 2] = stellar.b;

        // Most stars small; rare bright stars
        const bright = Math.random() < 0.02;
        sizes[i] = bright ? 2.6 + Math.random() * 1.2 : 0.6 + Math.random() * 0.9;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 1.2,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        map: makeStarTexture(),
      });

      out.push({
        geometry,
        material,
        driftSpeed: 0.002 + (1 - t) * 0.012,
      });
    }
    return out;
  }, [count, layers, radius]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const layer = layerData[i];
      if (!layer) return;
      child.rotation.y += delta * layer.driftSpeed;
    });
  });

  return (
    <group ref={groupRef}>
      {layerData.map((l, i) => (
        <points key={i} geometry={l.geometry} material={l.material} />
      ))}
    </group>
  );
}

function stellarColor(seed: number): THREE.Color {
  // Cooler -> warmer stellar palette (rough Planckian-locus inspired).
  const palette: [number, THREE.Color][] = [
    [0.0, new THREE.Color(0.62, 0.72, 1.0)], // hot blue
    [0.3, new THREE.Color(0.85, 0.92, 1.0)], // bluish white
    [0.55, new THREE.Color(1.0, 1.0, 0.95)], // white
    [0.78, new THREE.Color(1.0, 0.92, 0.78)], // warm
    [1.0, new THREE.Color(1.0, 0.78, 0.55)], // orange
  ];
  for (let i = 0; i < palette.length - 1; i++) {
    if (seed <= palette[i + 1][0]) {
      const t =
        (seed - palette[i][0]) / (palette[i + 1][0] - palette[i][0]);
      return new THREE.Color().lerpColors(palette[i][1], palette[i + 1][1], t);
    }
  }
  return palette[palette.length - 1][1];
}

let _starTexture: THREE.Texture | null = null;
function makeStarTexture(): THREE.Texture {
  if (_starTexture) return _starTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0.0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.15)");
  grad.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _starTexture = tex;
  return tex;
}
