/**
 * Solar System body catalog.
 *
 * Distances and radii are NOT astronomically accurate — that would be
 * unwatchable in a browser-real-time simulation. Instead we use a
 * cinematically-compressed scale designed for visual readability:
 *
 *   - radii are in scene units (Sun is the largest by far, but not 109× Earth)
 *   - orbit radii are spaced for clarity, with gas giants further out
 *   - orbital periods are slowed but in correct relative order (Mercury fastest)
 *
 * The `description` strings power the educational data panel. Keep them
 * short and tonally calm.
 */

export type BodyType =
  | "star"
  | "rocky"
  | "gasGiant"
  | "iceGiant"
  | "ringed";

export interface BodyDef {
  id: string;
  name: string;
  type: BodyType;
  /** Scene radius */
  radius: number;
  /** Orbit radius around the sun in scene units (0 for the sun) */
  orbitRadius: number;
  /** Orbit angular speed in rad/sec */
  orbitSpeed: number;
  /** Self-rotation speed in rad/sec */
  spinSpeed: number;
  /** Initial orbit phase in radians */
  phase: number;
  /**
   * Orbital inclination relative to the ecliptic, in radians. Real solar
   * system inclinations are tiny (Mercury ~7° is the largest) but applying
   * even a few degrees gives the system a believable not-perfectly-flat
   * 3D feel rather than a paper diagram.
   */
  inclination?: number;
  /** Axial tilt in radians (Earth ~23.4°, Uranus ~98°, Venus ~177°) */
  axialTilt?: number;
  /** Base diffuse color */
  color: string;
  /** Secondary color for procedural shading */
  secondary?: string;
  /** Tertiary color for bands / detail */
  tertiary?: string;
  /** Color used for the UI swatch (defaults to color) */
  uiColor?: string;
  /** Atmospheric rim color */
  atmosphere?: string;
  /** Whether the body has a ring system (Saturn-like) */
  ring?: {
    inner: number;
    outer: number;
    color: string;
  };
  /** Short label text */
  description: string;
}

export const SOLAR_BODIES: BodyDef[] = [
  {
    id: "sun",
    name: "Sun",
    type: "star",
    radius: 7.0,
    orbitRadius: 0,
    orbitSpeed: 0,
    spinSpeed: 0.05,
    phase: 0,
    color: "#ffd884",
    secondary: "#ff8a3a",
    tertiary: "#fff4d8",
    uiColor: "#ffd884",
    atmosphere: "#ffaa55",
    description:
      "The G-type main-sequence star at the center of the system. Source of nearly all energy reaching the planets.",
  },
  {
    id: "mercury",
    name: "Mercury",
    type: "rocky",
    radius: 0.7,
    orbitRadius: 14,
    orbitSpeed: 0.55,
    spinSpeed: 0.05,
    phase: 0.6,
    inclination: 0.122, // ~7.0°
    axialTilt: 0.0006,
    color: "#9a8d7a",
    secondary: "#5a4f44",
    uiColor: "#b9ad96",
    description:
      "Smallest of the eight planets. Cratered and airless, swinging close to the Sun every 88 days.",
  },
  {
    id: "venus",
    name: "Venus",
    type: "rocky",
    radius: 1.05,
    orbitRadius: 18,
    orbitSpeed: 0.4,
    spinSpeed: -0.02,
    phase: 1.7,
    inclination: 0.059, // ~3.4°
    axialTilt: 3.096, // ~177° (retrograde)
    color: "#e7c89a",
    secondary: "#a5704a",
    tertiary: "#ffe6b4",
    uiColor: "#ecd1a8",
    atmosphere: "#ffd9a5",
    description:
      "Cloaked in dense sulfuric clouds. Surface temperatures hot enough to melt lead.",
  },
  {
    id: "earth",
    name: "Earth",
    type: "rocky",
    radius: 1.15,
    orbitRadius: 24,
    orbitSpeed: 0.32,
    spinSpeed: 0.6,
    phase: 2.4,
    inclination: 0.0,
    axialTilt: 0.4091, // ~23.44°
    color: "#3d7fb3",
    secondary: "#3a8c5b",
    tertiary: "#d8e0e8",
    uiColor: "#5da5d8",
    atmosphere: "#7eb6ff",
    description:
      "The pale blue dot. Liquid water, breathable atmosphere, the only known world hosting life.",
  },
  {
    id: "mars",
    name: "Mars",
    type: "rocky",
    radius: 0.9,
    orbitRadius: 30,
    orbitSpeed: 0.26,
    spinSpeed: 0.55,
    phase: 4.1,
    inclination: 0.032, // ~1.85°
    axialTilt: 0.4396, // ~25.19°
    color: "#b8593a",
    secondary: "#5a2218",
    tertiary: "#e5b894",
    uiColor: "#d57352",
    atmosphere: "#d68a6a",
    description:
      "The red planet. Polar ice caps, dust storms, and the largest known volcano in the system: Olympus Mons.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    type: "gasGiant",
    radius: 3.2,
    orbitRadius: 44,
    orbitSpeed: 0.13,
    spinSpeed: 0.85,
    phase: 0.9,
    inclination: 0.023, // ~1.30°
    axialTilt: 0.0546, // ~3.13°
    color: "#d8b08a",
    secondary: "#7c4830",
    tertiary: "#f0d8a8",
    uiColor: "#d8b08a",
    atmosphere: "#e8c8a0",
    description:
      "The largest planet. Banded ammonia clouds and a centuries-old anticyclone — the Great Red Spot.",
  },
  {
    id: "saturn",
    name: "Saturn",
    type: "ringed",
    radius: 2.7,
    orbitRadius: 56,
    orbitSpeed: 0.09,
    spinSpeed: 0.8,
    phase: 3.2,
    inclination: 0.043, // ~2.49°
    axialTilt: 0.4665, // ~26.73°
    color: "#e8d6a8",
    secondary: "#a07a48",
    tertiary: "#fff0c8",
    uiColor: "#e8d6a8",
    atmosphere: "#f0e0b0",
    ring: {
      inner: 3.4,
      outer: 6.2,
      color: "#d8c898",
    },
    description:
      "The jewel of the system. Iconic rings of ice and rock spanning hundreds of thousands of kilometers.",
  },
  {
    id: "uranus",
    name: "Uranus",
    type: "iceGiant",
    radius: 1.8,
    orbitRadius: 68,
    orbitSpeed: 0.06,
    spinSpeed: 0.5,
    phase: 5.3,
    inclination: 0.013, // ~0.77°
    axialTilt: 1.7064, // ~97.77° (tipped on its side!)
    color: "#a8e0e6",
    secondary: "#5a8a98",
    tertiary: "#d0f0f4",
    uiColor: "#a8e0e6",
    atmosphere: "#b8e6ee",
    description:
      "An ice giant tipped on its side. Methane in its atmosphere gives it a subtle cyan glow.",
  },
  {
    id: "neptune",
    name: "Neptune",
    type: "iceGiant",
    radius: 1.75,
    orbitRadius: 80,
    orbitSpeed: 0.045,
    spinSpeed: 0.6,
    phase: 1.2,
    inclination: 0.031, // ~1.77°
    axialTilt: 0.4943, // ~28.32°
    color: "#3a6abd",
    secondary: "#1a3878",
    tertiary: "#80b0e8",
    uiColor: "#5d8aaf",
    atmosphere: "#5d8aaf",
    description:
      "The outermost planet. Supersonic winds tear through a deep blue methane atmosphere.",
  },
];

export function getBody(id: string): BodyDef | undefined {
  return SOLAR_BODIES.find((b) => b.id === id);
}
