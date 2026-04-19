import { useAppStore } from "@/systems/state/store";

/**
 * Sub-mode switcher shown only while the user is inside the Milky Way
 * experience. Lets them flip between the two galactic representations
 * without leaving the section, and provides a clear "Enter Solar System"
 * action so the spatial progression reads as connected rather than as
 * a menu teleport.
 */
export function MilkyWayModeSwitcher() {
  const scene = useAppStore((s) => s.scene);
  const setScene = useAppStore((s) => s.setScene);

  const isInside = scene === "milkyWayInside";
  const isOverview = scene === "milkyWay";

  return (
    <div className="mw-modes" role="group" aria-label="Milky Way modes">
      <div className="mw-modes-title">Milky Way</div>
      <div className="mw-modes-row">
        <button
          className={isInside ? "active" : ""}
          onClick={() => setScene("milkyWayInside")}
          title="Stand at our local stellar neighborhood and look out at the galaxy."
        >
          Inside
        </button>
        <button
          className={isOverview ? "active" : ""}
          onClick={() => setScene("milkyWay")}
          title="Pull out to a macro view of the whole galaxy."
        >
          Overview
        </button>
      </div>
      <button
        className="mw-modes-enter"
        onClick={() => setScene("solarSystem")}
        title="Travel from the Milky Way scale down into the Solar System scale."
      >
        Enter Solar System →
      </button>
    </div>
  );
}
