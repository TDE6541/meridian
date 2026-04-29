import type { MissionPhysicalProjectionV1 } from "../demo/missionPhysicalProjection.ts";
import {
  ABSENCE_SHADOW_STATUS_ORDER,
  deriveAbsenceShadowMapView,
} from "../demo/absenceShadowView.ts";

export interface AbsenceShadowMapProps {
  projection?: MissionPhysicalProjectionV1 | null;
}

export function AbsenceShadowMap({ projection = null }: AbsenceShadowMapProps) {
  const view = deriveAbsenceShadowMapView(projection);

  return (
    <section
      aria-labelledby="absence-shadow-map-title"
      className={`absence-shadow-map absence-shadow-map--${view.status}`}
      data-absence-shadow-map="true"
      data-absence-shadow-motion="reduced-motion-safe"
      data-absence-shadow-source-mode={view.source_mode}
      data-absence-shadow-status={view.status}
      data-no-new-absence-truth="true"
    >
      <div className="absence-shadow-map__header">
        <div>
          <p className="absence-shadow-map__eyebrow">Absence Shadow Map</p>
          <h2 id="absence-shadow-map-title">Expected Evidence Slots</h2>
          <p className="absence-shadow-map__boundary">{view.boundary_copy}</p>
        </div>
        <div className="absence-shadow-map__status">
          <span>Status</span>
          <strong>{view.status_label}</strong>
          <em>{view.source_mode}</em>
        </div>
      </div>

      <div className="absence-shadow-map__legend" aria-label="Presence status legend">
        {ABSENCE_SHADOW_STATUS_ORDER.map((status) => {
          const display = view.status_displays[status];

          return (
            <div
              className={`absence-shadow-map__legend-item absence-shadow-map__legend-item--${status}`}
              data-absence-shadow-legend-status={status}
              key={status}
            >
              <span>{display.label}</span>
              <strong>{display.shadow_label}</strong>
              <em>{display.description}</em>
            </div>
          );
        })}
      </div>

      <div className="absence-shadow-map__stages">
        {view.groups.map((group) => (
          <section
            aria-label={`${group.label} absence shadow slots`}
            className={`absence-shadow-stage absence-shadow-stage--${group.status}`}
            data-absence-shadow-stage={group.stage_id}
            data-absence-shadow-stage-label={group.label}
            data-absence-shadow-stage-status={group.status}
            key={group.stage_id}
          >
            <div className="absence-shadow-stage__header">
              <span>{group.label}</span>
              <strong>{group.required_label}</strong>
              <em>
                {group.status === "holding"
                  ? "HOLD posture"
                  : "Required slot visible"}
              </em>
            </div>

            <div className="absence-shadow-stage__slots">
              {group.slots.map((slot) => (
                <article
                  className={`absence-shadow-slot absence-shadow-slot--${slot.presence_status}`}
                  data-absence-shadow-slot-id={slot.slot_id}
                  data-absence-shadow-target-id={slot.target_id}
                  data-absence-shadow-target-label={slot.target_label}
                  data-expected-kind={slot.expected_kind}
                  data-presence-status={slot.presence_status}
                  id={slot.slot_id}
                  key={slot.slot_id}
                >
                  <span className="absence-shadow-slot__shadow">
                    {slot.shadow_label}
                  </span>
                  <div className="absence-shadow-slot__headline">
                    <span>{slot.status_label}</span>
                    <strong>{slot.expected_label}</strong>
                    <em>{slot.status_description}</em>
                  </div>
                  <dl className="absence-shadow-slot__facts">
                    <div>
                      <dt>Expected kind</dt>
                      <dd>{slot.expected_kind}</dd>
                    </div>
                    <div>
                      <dt>Presence status</dt>
                      <dd>{slot.presence_status}</dd>
                    </div>
                    {slot.source_ref || slot.presence_status === "present" ? (
                      <div>
                        <dt>Source ref</dt>
                        <dd>{slot.source_ref ?? "HOLD: source ref unavailable"}</dd>
                      </div>
                    ) : null}
                    {slot.hold_ref ||
                    slot.presence_status === "carried_hold" ||
                    slot.presence_status === "blocked" ? (
                      <div>
                        <dt>Hold ref</dt>
                        <dd>{slot.hold_ref ?? "HOLD: hold ref unavailable"}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Closure hint</dt>
                      <dd>{slot.closure_hint}</dd>
                    </div>
                    <div>
                      <dt>Target label</dt>
                      <dd>{slot.target_label}</dd>
                    </div>
                    <div>
                      <dt>Reduced motion label</dt>
                      <dd>{slot.reduced_motion_label}</dd>
                    </div>
                  </dl>
                </article>
              ))}

              {group.missing_required_labels.map((label) => (
                <article
                  className="absence-shadow-slot absence-shadow-slot--blocked absence-shadow-slot--missing-required"
                  data-absence-shadow-required-missing="true"
                  data-presence-status="blocked"
                  key={`${group.stage_id}:${label}`}
                >
                  <span className="absence-shadow-slot__shadow">
                    Missing evidence shadow
                  </span>
                  <div className="absence-shadow-slot__headline">
                    <span>Blocking HOLD</span>
                    <strong>HOLD: required stage slot missing</strong>
                    <em>{label}</em>
                  </div>
                  <dl className="absence-shadow-slot__facts">
                    <div>
                      <dt>Expected kind</dt>
                      <dd>required_stage_slot</dd>
                    </div>
                    <div>
                      <dt>Presence status</dt>
                      <dd>blocked</dd>
                    </div>
                    <div>
                      <dt>Hold ref</dt>
                      <dd>D4 absence_shadow_slots registry</dd>
                    </div>
                    <div>
                      <dt>Closure hint</dt>
                      <dd>
                        Restore the required D4 slot upstream; D7 only maps the
                        existing projection.
                      </dd>
                    </div>
                    <div>
                      <dt>Reduced motion label</dt>
                      <dd>Reduced motion safe: missing required slot remains visible.</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="absence-shadow-map__footer">
        <span>{view.motion_label}</span>
        <span>Carried manual proof gaps remain unresolved.</span>
        <span>{view.carried_manual_hold_count} carried manual proof HOLD slots</span>
      </div>
    </section>
  );
}
