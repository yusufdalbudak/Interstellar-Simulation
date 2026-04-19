import { create } from "zustand";
import { Vector3, Quaternion, type Group } from "three";

/**
 * Global, lightweight handle to the active player ship.
 *
 * The ship controller mutates these vectors directly each frame for performance.
 * UI code reads scalar telemetry from useAppStore, while in-scene systems
 * (camera, docking) can read the full transform/velocity from here.
 */
interface ShipState {
  group: Group | null;
  position: Vector3;
  velocity: Vector3;
  quaternion: Quaternion;
  /** Forward unit vector in world space, refreshed each frame */
  forward: Vector3;
  setGroup: (g: Group | null) => void;
}

export const shipState: ShipState = {
  group: null,
  position: new Vector3(),
  velocity: new Vector3(),
  quaternion: new Quaternion(),
  forward: new Vector3(0, 0, -1),
  setGroup: (g) => {
    shipState.group = g;
  },
};

interface ShipMetaStore {
  hasShip: boolean;
  setHasShip: (b: boolean) => void;
}

export const useShipMeta = create<ShipMetaStore>((set) => ({
  hasShip: false,
  setHasShip: (b) => set({ hasShip: b }),
}));
