import { OutcomeBadge } from "./OutcomeBadge.tsx";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

export interface TimelinePanelProps {
  activeStepIndex: number;
  message?: string;
  onSelectStep: (index: number) => void;
  status: ControlRoomScenarioRecord["status"];
  timelineSteps: readonly ControlRoomTimelineStep[];
}

export function TimelinePanel({
  activeStepIndex,
  message,
  onSelectStep,
  status,
  timelineSteps,
}: TimelinePanelProps) {
  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-panel-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Timeline</p>
        <h2 id="timeline-panel-title">Cascade steps</h2>
      </div>

      {status !== "ready" || timelineSteps.length === 0 ? (
        <div className="empty-state">
          <p>{message ?? "No timeline steps are available for this snapshot."}</p>
        </div>
      ) : (
        <ol className="timeline-list">
          {timelineSteps.map((timelineStep) => {
            const isActive = timelineStep.index === activeStepIndex;

            return (
              <li key={timelineStep.stepId}>
                <button
                  type="button"
                  className={`timeline-step ${isActive ? "timeline-step--active" : ""}`}
                  data-step-id={timelineStep.stepId}
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => onSelectStep(timelineStep.index)}
                >
                  <div className="timeline-step__header">
                    <div>
                      <p className="timeline-step__eyebrow">{timelineStep.stepId}</p>
                      <strong className="timeline-step__action">
                        {timelineStep.action ?? "ACTION_UNSPECIFIED"}
                      </strong>
                    </div>
                    <OutcomeBadge decision={timelineStep.decision} />
                  </div>

                  <p className="timeline-step__summary">
                    {timelineStep.selectedClauseText ?? "No step clause text present in snapshot."}
                  </p>

                  <p className="timeline-step__meta">
                    {timelineStep.transition?.expectedFixtureStatus ?? timelineStep.step.status}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
