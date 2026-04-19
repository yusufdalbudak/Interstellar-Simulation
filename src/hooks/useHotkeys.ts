import { useEffect } from "react";
import {
  PRIMARY_SCENES,
  SCENES,
  useAppStore,
  type CameraMode,
} from "@/systems/state/store";

/**
 * Global hotkeys (numbers switch scenes, F/O/T/V switch camera modes,
 * H toggles help, B/L/P/G/D toggle visual options).
 * Movement keys are handled by the active controller.
 */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const k = e.key.toLowerCase();
      const store = useAppStore.getState();

      // Scene quick-jump: 1..5 maps to primary scenes. The Milky Way
      // primary slot routes to the immersive in-galaxy arrival; users
      // can flip to the overview from the sub-mode switcher.
      if (/^[1-5]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < PRIMARY_SCENES.length) {
          const target = PRIMARY_SCENES[idx];
          if (target === "milkyWay") {
            store.setScene("milkyWayInside");
          } else {
            store.setScene(target);
          }
        }
        return;
      }

      switch (k) {
        case "h":
          store.setHelpOpen(!store.helpOpen);
          break;
        case "f":
          tryMode("freeFly");
          break;
        case "o":
          tryMode("orbit");
          break;
        case "t":
          tryMode("thirdPerson");
          break;
        case "v":
          tryMode("cinematic");
          break;
        case "j":
          tryMode("ship");
          break;
        case "k":
          tryMode("cockpit");
          break;
        case "b":
          store.toggle("cinematicBars");
          break;
        case "l":
          store.toggle("labels");
          break;
        case "p":
          store.toggle("postProcessing");
          break;
        case "g":
          store.toggle("orbitLines");
          break;
        case "?":
          store.setHelpOpen(true);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function tryMode(mode: CameraMode) {
  const store = useAppStore.getState();
  if (SCENES[store.scene].modes.includes(mode)) {
    store.setCameraMode(mode);
  }
}
