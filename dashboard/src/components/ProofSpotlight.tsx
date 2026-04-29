import type { MissionPhysicalProjectionV1 } from "../demo/missionPhysicalProjection.ts";
import { deriveProofSpotlightView } from "../demo/proofSpotlightView.ts";

export interface ProofSpotlightProps {
  projection?: MissionPhysicalProjectionV1 | null;
}

export function ProofSpotlight({ projection = null }: ProofSpotlightProps) {
  const view = deriveProofSpotlightView(projection);

  return (
    <section
      aria-labelledby="proof-spotlight-title"
      className={`proof-spotlight proof-spotlight--${view.status}`}
      data-proof-spotlight="true"
      data-proof-spotlight-source-mode={view.sourceMode}
      data-proof-spotlight-status={view.status}
      data-proof-target-id={view.targetId ?? "safe-fallback"}
      data-proof-target-required={view.target?.required ?? false}
    >
      <div className="proof-spotlight__header">
        <div>
          <p className="proof-spotlight__eyebrow">Proof Spotlight</p>
          <h2 id="proof-spotlight-title">Evidence Beam</h2>
          <p className="proof-spotlight__boundary">
            Spotlight shows where the current proof lives. It does not create new truth.
          </p>
        </div>
        <div
          className="proof-spotlight__status"
          data-proof-spotlight-posture={view.postureLabel}
        >
          <span>Status</span>
          <strong>{view.statusLabel}</strong>
          <em>{view.postureLabel}</em>
        </div>
      </div>

      <div
        aria-label={view.beamLabel}
        className="proof-spotlight__beam"
        data-proof-spotlight-beam="semantic"
      >
        <span>Foreman</span>
        <i aria-hidden="true" />
        <span>{view.activeStageLabel}</span>
        <i aria-hidden="true" />
        <span>{view.targetLabel}</span>
      </div>

      <dl className="proof-spotlight__facts">
        <div>
          <dt>Active stage</dt>
          <dd>{view.activeStageLabel}</dd>
        </div>
        <div>
          <dt>Target label</dt>
          <dd>{view.targetLabel}</dd>
        </div>
        <div>
          <dt>Target kind</dt>
          <dd>{view.targetKind}</dd>
        </div>
        <div>
          <dt>Target summary</dt>
          <dd>{view.summary}</dd>
        </div>
        <div>
          <dt>Source ref</dt>
          <dd>{view.sourceRef}</dd>
        </div>
        <div>
          <dt>Required / optional</dt>
          <dd>{view.postureLabel}</dd>
        </div>
        <div>
          <dt>Fallback text</dt>
          <dd>{view.fallbackText}</dd>
        </div>
        <div>
          <dt>Foreman attention</dt>
          <dd>
            {view.foremanAttentionLabel}
            {view.foremanAttentionTargetId
              ? ` (${view.foremanAttentionTargetId})`
              : ""}
          </dd>
        </div>
      </dl>

      <div className="proof-spotlight__motion" data-proof-spotlight-motion="visible">
        <span>{view.motionLabel}</span>
        <span>Demo proof target; source-bounded; Proof Tools remain grouped.</span>
      </div>
    </section>
  );
}
