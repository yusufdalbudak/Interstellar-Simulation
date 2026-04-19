import { create } from "zustand";
import type { Group } from "three";

/**
 * Lightweight global handle to the astronaut entity, so the camera rig and
 * other systems can reference it without prop drilling. The entity itself
 * registers/unregisters on mount.
 */
interface AstronautState {
  group: Group | null;
  yaw: number;
  setGroup: (g: Group | null) => void;
  setYaw: (y: number) => void;
}

const useAstroStore = create<AstronautState>((set) => ({
  group: null,
  yaw: 0,
  setGroup: (g) => set({ group: g }),
  setYaw: (y) => set({ yaw: y }),
}));

export function useAstronaut() {
  return useAstroStore((s) => ({ group: s.group, yaw: s.yaw }));
}

export function useAstronautRegistration() {
  return {
    setGroup: useAstroStore.getState().setGroup,
    setYaw: useAstroStore.getState().setYaw,
  };
}
