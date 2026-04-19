import type { SceneId } from "@/systems/state/store";

export interface SceneTarget {
  position: [number, number, number];
  distance: number;
  minDistance: number;
  maxDistance: number;
  /** Friendly label for HUD telemetry */
  label: string;
}

const TARGETS: Record<SceneId, SceneTarget> = {
  deepSpace: {
    position: [0, 0, 0],
    distance: 30,
    minDistance: 8,
    maxDistance: 320,
    label: "Endurance",
  },
  blackHole: {
    position: [0, 0, 0],
    distance: 36,
    minDistance: 14,
    maxDistance: 260,
    label: "Gargantua",
  },
  wormhole: {
    position: [0, 0, 0],
    distance: 22,
    minDistance: 9,
    maxDistance: 180,
    label: "Wormhole",
  },
  milkyWay: {
    position: [0, 0, 0],
    distance: 250,
    minDistance: 60,
    maxDistance: 800,
    label: "Milky Way · Overview",
  },
  milkyWayInside: {
    // Camera always sits at our local neighborhood, looking out
    position: [0, 0, 0],
    distance: 0.001,
    minDistance: 0.001,
    maxDistance: 60,
    label: "Solar Neighborhood",
  },
  solarSystem: {
    position: [0, 0, 0],
    distance: 60,
    minDistance: 12,
    maxDistance: 600,
    label: "Sol",
  },
  waterWorld: {
    position: [0, 0, 0],
    distance: 18,
    minDistance: 4,
    maxDistance: 120,
    label: "Cooper",
  },
  iceWorld: {
    position: [0, 0, 0],
    distance: 18,
    minDistance: 4,
    maxDistance: 120,
    label: "Cooper",
  },
};

export function getSceneTarget(id: SceneId): SceneTarget {
  return TARGETS[id];
}
