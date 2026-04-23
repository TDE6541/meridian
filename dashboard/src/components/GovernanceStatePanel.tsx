import { OutcomeBadge } from "./OutcomeBadge.tsx";
import { getStepReason } from "../state/controlRoomState.ts";
import type {
  ControlRoomScenarioRecord,
  ControlRoomTimelineStep,
} from "../state/controlRoomState.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function buildRuntimeExcerpt(step: ControlRoomTimelineStep): Record<string, unknown> | null {
  const civicSubset = step.step.governance.result.runtimeSubset?.civic;

  if (!isRecord(civicSubset)) {
    return null;
  }

  const excerpt: Record<string, unknown> = {};
  for (const key of [
    "confidence",
    "promise_status",
    "rationale",
    "authority_resolution",
    "revocation",
  ]) {
    if (civicSubset[key] !== undefined) {
      excerpt[key] = civicSubset[key];
    }
  }

  return Object.keys(excerpt).length > 0 ? excerpt : null;
}

export interface GovernanceStatePanelProps {
  currentStep: ControlRoomTimelineStep | null;
  message?: string;
  status: ControlRoomScenarioRecord["status"];
}

export function GovernanceStatePanel({
  currentStep,
  message,
  status,
}: GovernanceStatePanelProps) {
  if (status !== "ready" || !currentStep) {
    return (
      <section className="panel governance-panel" aria-labelledby="governance-panel-title">
        <div className="panel-heading">
          <p className="panel-eyebrow">Governance state</p>
          <h2 id="governance-panel-title">Active step truth</h2>
        </div>

        <div className="empty-state">
          <p>{message ?? "Governance state is unavailable for the selected scenario."}</p>
        </div>
      </section>
    );
  }

  const runtimeExcerpt = buildRuntimeExcerpt(currentStep);
  const reason = getStepReason(currentStep.step) ?? "No decision reason present in snapshot.";

  return (
    <section className="panel governance-panel" aria-labelledby="governance-panel-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Governance state</p>
        <h2 id="governance-panel-title">Active step truth</h2>
      </div>

      <div className="governance-panel__content">
        <div className="governance-panel__header">
          <div>
            <p className="governance-panel__eyebrow">
              {currentStep.stepId} · {currentStep.action ?? "ACTION_UNSPECIFIED"}
            </p>
            <p className="governance-panel__reason">{reason}</p>
          </div>
          <OutcomeBadge decision={currentStep.decision} />
        </div>

        <dl className="governance-panel__facts">
          <div className="fact-card">
            <dt>scenario step contract</dt>
            <dd>{currentStep.step.contractVersion}</dd>
          </div>
          <div className="fact-card">
            <dt>selected clause</dt>
            <dd>{currentStep.selectedClauseText ?? "Not present in snapshot."}</dd>
          </div>
          <div className="fact-card">
            <dt>expected decision</dt>
            <dd>{currentStep.step.governance.expectedDecision ?? "Not present in snapshot."}</dd>
          </div>
          <div className="fact-card">
            <dt>matched expectation</dt>
            <dd>{currentStep.step.governance.matchedExpectedDecision === true ? "true" : "false"}</dd>
          </div>
        </dl>

        {runtimeExcerpt ? (
          <pre className="runtime-excerpt">
            <code>{JSON.stringify(runtimeExcerpt, null, 2)}</code>
          </pre>
        ) : (
          <div className="empty-state">
            <p>No runtime subset excerpt is present on this step.</p>
          </div>
        )}
      </div>
    </section>
  );
}
