import type { Quality } from "./store";

export interface QualitySettings {
  /** Renderer pixel ratio cap */
  dpr: [number, number];
  /** Star count for the deep-space starfield */
  starCount: number;
  /** Star layer count */
  starLayers: number;
  /** Black hole accretion disk radial samples */
  diskSamples: number;
  /** Whether to enable Bloom postprocessing */
  bloom: boolean;
  /** Whether to enable Vignette / ChromaticAberration */
  cinematicPost: boolean;
  /** Background distortion ray steps for the black hole shader */
  lensSteps: number;
  /** Wormhole noise samples */
  wormholeSamples: number;
  /** Use HDR-style tonemapping */
  hdr: boolean;
  /** Shadow mapping enabled where applicable */
  shadows: boolean;
  /** Wave segment count for water world */
  waterSegments: number;
  /** Ice terrain segment count */
  terrainSegments: number;
  /** Enable particle systems */
  particles: boolean;
}

const PRESETS: Record<Quality, QualitySettings> = {
  low: {
    dpr: [1, 1],
    starCount: 4500,
    starLayers: 2,
    diskSamples: 96,
    bloom: false,
    cinematicPost: false,
    lensSteps: 0,
    wormholeSamples: 12,
    hdr: false,
    shadows: false,
    waterSegments: 96,
    terrainSegments: 96,
    particles: false,
  },
  medium: {
    dpr: [1, 1.25],
    starCount: 8000,
    starLayers: 3,
    diskSamples: 160,
    bloom: true,
    cinematicPost: true,
    lensSteps: 18,
    wormholeSamples: 20,
    hdr: true,
    shadows: false,
    waterSegments: 144,
    terrainSegments: 144,
    particles: true,
  },
  high: {
    dpr: [1, 1.5],
    starCount: 14000,
    starLayers: 4,
    diskSamples: 220,
    bloom: true,
    cinematicPost: true,
    lensSteps: 28,
    wormholeSamples: 28,
    hdr: true,
    shadows: false,
    waterSegments: 200,
    terrainSegments: 200,
    particles: true,
  },
  ultra: {
    dpr: [1, 2],
    starCount: 22000,
    starLayers: 5,
    diskSamples: 320,
    bloom: true,
    cinematicPost: true,
    lensSteps: 40,
    wormholeSamples: 36,
    hdr: true,
    shadows: false,
    waterSegments: 280,
    terrainSegments: 280,
    particles: true,
  },
};

export function getQualitySettings(q: Quality): QualitySettings {
  return PRESETS[q];
}
