import { useAppStore } from "@/systems/state/store";

export function HelpButton() {
  const setOpen = useAppStore((s) => s.setHelpOpen);
  const open = useAppStore((s) => s.helpOpen);
  return (
    <div className="help-button">
      <button onClick={() => setOpen(!open)} title="Controls (H)">
        ?
      </button>
    </div>
  );
}
