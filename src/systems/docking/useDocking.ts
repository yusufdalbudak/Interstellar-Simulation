import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { shipState } from "@/entities/PlayerShip/ShipContext";
import { useAppStore, type DockingState } from "@/systems/state/store";

interface Options {
  name: string;
  portRef: React.RefObject<THREE.Mesh | null>;
  /** Distance at which docking is "in range" */
  approachRange?: number;
  /** Distance at which alignment is checked seriously */
  alignRange?: number;
  /** Distance at which docking auto-locks if alignment is good */
  dockRange?: number;
  /** Approach speed cap for a successful dock */
  maxDockSpeed?: number;
}

/**
 * Docking logic: every frame, computes the relationship between the player
 * ship and the given docking port, then updates the global docking telemetry
 * the HUD reads from.
 *
 * Heuristics (intentionally forgiving — this is a cinematic sim, not a hard
 * spaceflight game):
 *
 *   - distance       — straight line from ship to port
 *   - alignment      — dot product of ship.forward and (port -> ship).normalized
 *                      (i.e. how well the ship is pointed AT the port from the
 *                      port's approach side)
 *   - approachSpeed  — component of ship velocity along (port -> ship)
 *   - state machine  — outOfRange -> approaching -> aligning -> dockable -> docked
 */
export function useDocking({
  name,
  portRef,
  approachRange = 60,
  alignRange = 18,
  dockRange = 4,
  maxDockSpeed = 6,
}: Options) {
  const setDocking = useAppStore.getState().setDocking;
  const portWorldPos = useRef(new THREE.Vector3());
  const portForward = useRef(new THREE.Vector3());
  const toShip = useRef(new THREE.Vector3());
  const dockedRef = useRef(false);

  useEffect(() => {
    return () => {
      // Reset docking telemetry when this station unmounts (scene change)
      useAppStore.getState().setDocking({
        state: "outOfRange",
        distance: Infinity,
        alignment: 0,
        approachSpeed: 0,
        targetName: "—",
      });
    };
  }, []);

  useFrame(() => {
    if (!portRef.current || !shipState.group) return;

    portRef.current.getWorldPosition(portWorldPos.current);
    // The port mesh uses rotation [PI/2, 0, 0] so its local +Z faces the
    // station's +Z in world space. We derive a stable approach-axis using the
    // station group's orientation: +Z of the parent group is the docking
    // approach side. We approximate by reading the port's world matrix Y axis
    // (since we rotated it by PI/2 on X, world +Z corresponds to local +Y).
    const m = portRef.current.matrixWorld;
    portForward.current
      .set(m.elements[4], m.elements[5], m.elements[6]) // matrix Y axis
      .normalize();

    toShip.current.subVectors(shipState.position, portWorldPos.current);
    const distance = toShip.current.length();
    const dirToShip =
      distance > 0.0001 ? toShip.current.clone().multiplyScalar(1 / distance) : portForward.current;

    // Alignment: are we approaching from the correct side AND pointed roughly
    // at the port? Combine two cosines for a single 0..1 score.
    const sideAlignment = Math.max(0, dirToShip.dot(portForward.current));
    const aimAlignment = Math.max(
      0,
      shipState.forward.clone().multiplyScalar(-1).dot(dirToShip),
    );
    const alignment = sideAlignment * 0.5 + aimAlignment * 0.5;

    // Approach speed = how fast we're closing the distance (positive = closing)
    const approachSpeed = -shipState.velocity.dot(dirToShip);

    // State machine
    let state: DockingState = "outOfRange";
    if (dockedRef.current) {
      state = "docked";
    } else if (distance > approachRange) {
      state = "outOfRange";
    } else if (distance > alignRange) {
      state = "approaching";
    } else if (alignment < 0.6) {
      state = "aligning";
    } else if (
      distance > dockRange ||
      Math.abs(approachSpeed) > maxDockSpeed
    ) {
      state = "dockable";
    } else {
      state = "docked";
      dockedRef.current = true;
      // Snap velocity to zero on dock
      shipState.velocity.set(0, 0, 0);
    }

    // If the player breaks away after docking, allow re-dock
    if (dockedRef.current && distance > dockRange * 2) {
      dockedRef.current = false;
    }

    setDocking({
      state,
      distance,
      alignment,
      approachSpeed,
      targetName: name,
    });
  });
}
