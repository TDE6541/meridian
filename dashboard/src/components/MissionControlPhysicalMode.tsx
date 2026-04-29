import {
  buildMissionPhysicalModeView,
  type MissionPhysicalModeView,
} from "../demo/missionPhysicalModeView.ts";

export interface MissionControlPhysicalModeProps {
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  view?: MissionPhysicalModeView;
}

function noop() {
  return undefined;
}

export function MissionControlPhysicalMode({
  enabled = false,
  onEnabledChange = noop,
  view = buildMissionPhysicalModeView({ physicalMode: enabled }),
}: MissionControlPhysicalModeProps) {
  return (
    <section
      className={`mission-control-physical-mode${
        enabled ? " mission-control-physical-mode--enabled" : ""
      }`}
      data-control-scale={view.control_scale}
      data-layout-density={view.layout_density}
      data-mission-control-physical-mode={enabled ? "on" : "off"}
      data-proof-tools-grouping={view.proof_tools_grouping}
      data-reduced-motion-safe={view.reduced_motion_safe ? "true" : "false"}
    >
      <div className="mission-control-physical-mode__header">
        <div>
          <p className="mission-control-physical-mode__eyebrow">
            Mission Control Physical Mode
          </p>
          <h2>Mission Control Physical Mode</h2>
          <p>
            Stage-facing layout for projector/touchscreen demos.
          </p>
        </div>
        <button
          aria-label={
            enabled
              ? "Disable Mission Control Physical Mode"
              : "Enable Mission Control Physical Mode"
          }
          aria-pressed={enabled}
          className="mission-control-physical-mode__toggle"
          data-mission-physical-toggle="true"
          onClick={() => onEnabledChange(!enabled)}
          type="button"
        >
          {enabled ? "On" : "Off"}
        </button>
      </div>

      <p className="mission-control-physical-mode__safe-copy">
        Physical Mode enlarges the demo controls for a room. It does not prove
        mobile/judge-device smoke or production deployment.
      </p>

      <div className="mission-control-physical-mode__facts">
        <span>Layout density: {view.layout_density}</span>
        <span>Control scale: {view.control_scale}</span>
        <span>Reduced-motion-safe labels visible</span>
      </div>

      <div className="mission-control-physical-mode__surfaces">
        {view.surface_priority.map((entry) => (
          <span
            data-physical-mode-promoted-surface={entry.surface}
            key={entry.surface}
          >
            {entry.priority}. {entry.surface}
          </span>
        ))}
      </div>

      <div className="mission-control-physical-mode__boundary">
        {view.boundary.map((flag) => (
          <span data-physical-mode-boundary={flag} key={flag}>
            {flag}
          </span>
        ))}
      </div>

      <p className="mission-control-physical-mode__reset">
        Reset may leave Physical Mode on, while selected judge cards and proof targets
        clear with mission state.
      </p>
    </section>
  );
}
