import type { MissionPhysicalProjectionV1 } from "../demo/missionPhysicalProjection.ts";
import { deriveAuthorityHandoffTheaterView } from "../demo/authorityHandoffView.ts";

export interface AuthorityHandoffTheaterProps {
  projection?: MissionPhysicalProjectionV1 | null;
}

export function AuthorityHandoffTheater({
  projection = null,
}: AuthorityHandoffTheaterProps) {
  const view = deriveAuthorityHandoffTheaterView(projection);

  return (
    <section
      aria-labelledby="authority-handoff-theater-title"
      className={`authority-handoff-theater authority-handoff-theater--${view.status}`}
      data-authority-handoff-compact={view.compact ? "true" : "false"}
      data-authority-handoff-source-mode={view.source_mode}
      data-authority-handoff-status={view.status}
      data-authority-handoff-theater="true"
      data-authority-token-state={view.token_state}
    >
      <div className="authority-handoff-theater__header">
        <div>
          <p className="authority-handoff-theater__eyebrow">
            Authority Handoff Theater
          </p>
          <h2 id="authority-handoff-theater-title">Permission Transfer</h2>
          <p className="authority-handoff-theater__boundary">
            {view.boundary_copy}
          </p>
        </div>
        <div className="authority-handoff-theater__status">
          <span>Stage / beat</span>
          <strong>{view.active_stage_label}</strong>
          <em>{view.beat_id ?? view.status_label}</em>
        </div>
      </div>

      <div
        aria-label={`Authority token state: ${view.token_state_label}`}
        className="authority-handoff-token"
        data-authority-token-state-label={view.token_state}
      >
        <span>Authority token</span>
        <strong>{view.token_state_label}</strong>
        <em>{view.token_state_description}</em>
      </div>

      <div className="authority-handoff-theater__transfer">
        <span>Transfer path</span>
        <strong>{view.transfer_label}</strong>
        <em>{view.status_label}</em>
      </div>

      <div className="authority-handoff-theater__roles">
        {view.role_cards.length > 0 ? (
          view.role_cards.map((role) => (
            <article
              className={`authority-role-card authority-role-card--${role.side}`}
              data-authority-role-card={role.role_id}
              data-authority-role-side={role.side}
              key={`${role.side}:${role.role_id}`}
            >
              <span>{role.side}</span>
              <strong>{role.role_label}</strong>
              <dl>
                <div>
                  <dt>Posture</dt>
                  <dd>{role.current_posture}</dd>
                </div>
                <div>
                  <dt>Capability</dt>
                  <dd>{role.capability_label}</dd>
                </div>
                <div>
                  <dt>Can request</dt>
                  <dd>{role.can_request ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Can approve</dt>
                  <dd>{role.can_approve ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Can deny</dt>
                  <dd>{role.can_deny ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Can view</dt>
                  <dd>{role.can_view ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Source note</dt>
                  <dd>{role.source_note}</dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <article
            className="authority-role-card authority-role-card--fallback"
            data-authority-role-card="safe-fallback"
            data-authority-role-side="observer"
          >
            <span>observer</span>
            <strong>HOLD: role cards unavailable</strong>
            <p>
              No D4 authority handoff beat is active for this stage; no authority
              role is invented.
            </p>
          </article>
        )}
      </div>

      <dl className="authority-handoff-theater__facts">
        <div>
          <dt>Visible claim</dt>
          <dd>{view.visible_claim}</dd>
        </div>
        <div>
          <dt>Source ref</dt>
          <dd>{view.source_ref}</dd>
        </div>
        <div>
          <dt>Local proof posture</dt>
          <dd>{view.local_proof_copy}</dd>
        </div>
        <div>
          <dt>Live integration boundary</dt>
          <dd>{view.live_boundary_copy}</dd>
        </div>
      </dl>

      <div className="authority-handoff-theater__non-claims">
        {view.non_claims.map((nonClaim) => (
          <span
            data-authority-non-claim={nonClaim.claim_id}
            key={nonClaim.claim_id}
          >
            {nonClaim.label}: {nonClaim.posture}
          </span>
        ))}
      </div>

      <div className="authority-handoff-theater__legend">
        {view.token_states.map((state) => (
          <span data-authority-token-visible-label={state.state} key={state.state}>
            {state.label}
          </span>
        ))}
      </div>

      <div className="authority-handoff-theater__footer">
        <span>{view.motion_label}</span>
        <span>{view.fallback_copy}</span>
      </div>
    </section>
  );
}
