import { useAppStore } from "@/systems/state/store";

export function TransitionOverlay() {
  const active = useAppStore((s) => s.isTransitioning);
  return <div className={`transition-overlay ${active ? "active" : ""}`} />;
}
