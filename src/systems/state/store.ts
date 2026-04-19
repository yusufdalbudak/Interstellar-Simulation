import { create } from "zustand";

export type SceneId =
  | "deepSpace"
  | "blackHole"
  | "wormhole"
  | "milkyWay"
  | "milkyWayInside"
  | "solarSystem"
  // Hidden / experimental:
  | "waterWorld"
  | "iceWorld";

export type CameraMode =
  | "freeFly"
  | "orbit"
  | "thirdPerson"
  | "cinematic"
  | "ship"
  | "cockpit";

export type Quality = "low" | "medium" | "high" | "ultra";

export type DockingState =
  | "outOfRange"
  | "approaching"
  | "aligning"
  | "dockable"
  | "docked";

export interface SceneDescriptor {
  id: SceneId;
  name: string;
  short: string;
  quote?: string;
  /** Camera modes that make sense in this scene */
  modes: CameraMode[];
  /** Default mode when entering */
  defaultMode: CameraMode;
  /** True if this scene should appear in the primary HUD navigation */
  primary: boolean;
}

export const SCENES: Record<SceneId, SceneDescriptor> = {
  deepSpace: {
    id: "deepSpace",
    name: "Deep Space Hub",
    short: "Hub",
    quote: "We used to look up at the sky and wonder at our place in the stars.",
    modes: ["cinematic", "ship", "freeFly", "orbit"],
    defaultMode: "cinematic",
    primary: true,
  },
  blackHole: {
    id: "blackHole",
    name: "Gargantua",
    short: "Black Hole",
    quote: "A literal heart of darkness.",
    modes: ["cinematic", "ship", "freeFly", "orbit"],
    defaultMode: "orbit",
    primary: true,
  },
  wormhole: {
    id: "wormhole",
    name: "Wormhole",
    short: "Wormhole",
    quote: "It's not a hole in our universe; it's a sphere.",
    modes: ["cinematic", "ship", "freeFly"],
    defaultMode: "ship",
    primary: true,
  },
  milkyWay: {
    id: "milkyWay",
    name: "Milky Way · Overview",
    short: "Milky Way",
    quote: "Home — seen from far enough away to remember its shape.",
    modes: ["cinematic", "freeFly", "orbit"],
    defaultMode: "cinematic",
    primary: true,
  },
  milkyWayInside: {
    id: "milkyWayInside",
    name: "Milky Way · Inside",
    short: "MW · Inside",
    quote: "From in here, our galaxy is a luminous river across the sky.",
    modes: ["cinematic", "freeFly"],
    defaultMode: "cinematic",
    // Not in primary nav — surfaced via the Milky Way sub-mode switcher
    primary: false,
  },
  solarSystem: {
    id: "solarSystem",
    name: "Sol System",
    short: "Solar",
    quote: "The eight worlds we have always called neighbors.",
    modes: ["cinematic", "freeFly", "orbit"],
    defaultMode: "cinematic",
    primary: true,
  },
  // Experimental — kept available via deep link / ?experimental=1, but
  // intentionally not surfaced in primary navigation.
  waterWorld: {
    id: "waterWorld",
    name: "Miller's Planet",
    short: "Ocean",
    quote: "Those aren't mountains. They're waves.",
    modes: ["thirdPerson", "freeFly", "cinematic"],
    defaultMode: "thirdPerson",
    primary: false,
  },
  iceWorld: {
    id: "iceWorld",
    name: "Mann's Planet",
    short: "Ice",
    quote: "This world's cold. Bitter cold.",
    modes: ["thirdPerson", "freeFly", "cinematic"],
    defaultMode: "thirdPerson",
    primary: false,
  },
};

export const SCENE_ORDER: SceneId[] = [
  "deepSpace",
  "blackHole",
  "wormhole",
  "milkyWay",
  "milkyWayInside",
  "solarSystem",
];

/** Scenes that all belong to the "Milky Way" experience family. */
export const MILKY_WAY_SCENES: SceneId[] = ["milkyWay", "milkyWayInside"];

export function isMilkyWayScene(s: SceneId): boolean {
  return s === "milkyWay" || s === "milkyWayInside";
}

export const PRIMARY_SCENES: SceneId[] = SCENE_ORDER.filter(
  (id) => SCENES[id].primary,
);

export interface Toggles {
  cinematicBars: boolean;
  labels: boolean;
  orbitLines: boolean;
  postProcessing: boolean;
  debug: boolean;
  experimental: boolean;
}

export interface ShipTelemetry {
  speed: number;
  throttle: number; // -1..1
  /** Current world position (kept here so HUD/docking can read without a frame hook) */
  position: [number, number, number];
}

export interface DockingTelemetry {
  state: DockingState;
  distance: number;
  alignment: number; // 0..1, 1 = perfectly aligned
  approachSpeed: number;
  targetName: string;
}

export interface NavigationState {
  /** Currently selected celestial body in solar system or other navigable scene */
  selectedBody: string | null;
  /** Last issued travel command target */
  travelTarget: string | null;
}

export interface AppState {
  scene: SceneId;
  cameraMode: CameraMode;
  quality: Quality;
  loaded: boolean;
  isTransitioning: boolean;
  /** Special wormhole transit overlay state - drives the camera + visual sequence */
  wormholeTransit: {
    active: boolean;
    /** 0..1 progress through the transit */
    progress: number;
  };
  helpOpen: boolean;
  toggles: Toggles;
  /** Live telemetry, updated each frame */
  telemetry: {
    distance: number;
    speed: number;
    target: string;
  };
  ship: ShipTelemetry;
  docking: DockingTelemetry;
  navigation: NavigationState;

  setScene: (id: SceneId, opts?: { instant?: boolean }) => void;
  setCameraMode: (m: CameraMode) => void;
  setQuality: (q: Quality) => void;
  setLoaded: (b: boolean) => void;
  toggle: (k: keyof Toggles) => void;
  setHelpOpen: (b: boolean) => void;
  setTelemetry: (t: Partial<AppState["telemetry"]>) => void;
  setShipTelemetry: (t: Partial<ShipTelemetry>) => void;
  setDocking: (t: Partial<DockingTelemetry>) => void;
  setSelectedBody: (id: string | null) => void;
  setTravelTarget: (id: string | null) => void;
  beginWormholeTransit: () => void;
  setWormholeProgress: (p: number) => void;
  endWormholeTransit: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  scene: "deepSpace",
  cameraMode: SCENES.deepSpace.defaultMode,
  quality: detectInitialQuality(),
  loaded: false,
  isTransitioning: false,
  wormholeTransit: { active: false, progress: 0 },
  helpOpen: false,
  toggles: {
    cinematicBars: false,
    labels: true,
    orbitLines: false,
    postProcessing: true,
    debug: false,
    experimental: detectExperimentalFlag(),
  },
  telemetry: {
    distance: 0,
    speed: 0,
    target: "—",
  },
  ship: {
    speed: 0,
    throttle: 0,
    position: [0, 0, 0],
  },
  docking: {
    state: "outOfRange",
    distance: Infinity,
    alignment: 0,
    approachSpeed: 0,
    targetName: "—",
  },
  navigation: {
    selectedBody: null,
    travelTarget: null,
  },

  setScene: (id, opts) => {
    if (get().scene === id) return;
    if (opts?.instant) {
      const desc = SCENES[id];
      set({
        scene: id,
        cameraMode: desc.defaultMode,
        isTransitioning: false,
      });
      return;
    }
    set({ isTransitioning: true });
    window.setTimeout(() => {
      const desc = SCENES[id];
      set({
        scene: id,
        cameraMode: desc.defaultMode,
      });
      window.setTimeout(() => set({ isTransitioning: false }), 350);
    }, 320);
  },
  setCameraMode: (m) => set({ cameraMode: m }),
  setQuality: (q) => set({ quality: q }),
  setLoaded: (b) => set({ loaded: b }),
  toggle: (k) =>
    set((s) => ({ toggles: { ...s.toggles, [k]: !s.toggles[k] } })),
  setHelpOpen: (b) => set({ helpOpen: b }),
  setTelemetry: (t) => set((s) => ({ telemetry: { ...s.telemetry, ...t } })),
  setShipTelemetry: (t) => set((s) => ({ ship: { ...s.ship, ...t } })),
  setDocking: (t) => set((s) => ({ docking: { ...s.docking, ...t } })),
  setSelectedBody: (id) =>
    set((s) => ({ navigation: { ...s.navigation, selectedBody: id } })),
  setTravelTarget: (id) =>
    set((s) => ({ navigation: { ...s.navigation, travelTarget: id } })),

  beginWormholeTransit: () =>
    set({ wormholeTransit: { active: true, progress: 0 } }),
  setWormholeProgress: (p) =>
    set((s) => ({
      wormholeTransit: { ...s.wormholeTransit, progress: p },
    })),
  endWormholeTransit: () =>
    set({ wormholeTransit: { active: false, progress: 0 } }),
}));

function detectInitialQuality(): Quality {
  if (typeof window === "undefined") return "high";
  const cores = (navigator as Navigator & { hardwareConcurrency?: number })
    .hardwareConcurrency ?? 4;
  if (cores >= 8) return "high";
  return "high";
}

function detectExperimentalFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("experimental");
  } catch {
    return false;
  }
}
