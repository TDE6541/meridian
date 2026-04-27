import { useState, type FormEvent } from "react";
import type {
  ForemanGuideContextV1,
  ForemanGuideHold,
  ForemanGuideSourceRef,
} from "../foremanGuide/foremanGuideTypes.ts";
import type { ForemanGuideSignalV1 } from "../foremanGuide/foremanSignals.ts";
import { getForemanPanelLabel } from "../foremanGuide/panelRegistry.ts";
import {
  useForemanGuide,
  type ForemanQuickActionId,
} from "../foremanGuide/useForemanGuide.ts";

export interface ForemanGuidePanelProps {
  activePanelId?: string | null;
  context: ForemanGuideContextV1 | null;
  highlightedPanelId?: string | null;
  onPanelHighlightChange?: (panelId: string | null) => void;
  proactiveSignals?: readonly ForemanGuideSignalV1[];
}

function formatSourceRef(ref: ForemanGuideSourceRef): string {
  return [ref.source_kind, ref.path, ref.evidence_id].filter(Boolean).join(":");
}

function renderSourceRefs(refs: readonly ForemanGuideSourceRef[]) {
  if (refs.length === 0) {
    return null;
  }

  return (
    <div className="source-ref-list foreman-guide-panel__source-list">
      {refs.slice(0, 6).map((ref) => (
        <span key={ref.source_ref}>{formatSourceRef(ref)}</span>
      ))}
      {refs.length > 6 ? <span>{refs.length - 6} more refs</span> : null}
    </div>
  );
}

function renderHolds(holds: readonly ForemanGuideHold[]) {
  if (holds.length === 0) {
    return null;
  }

  return (
    <div className="signal-list">
      {holds.map((hold) => (
        <div className="signal-card signal-card--hold" key={hold.id}>
          <strong>{hold.severity}: {hold.id}</strong>
          <span>{hold.reason}</span>
        </div>
      ))}
    </div>
  );
}

function renderProactiveSignals(signals: readonly ForemanGuideSignalV1[]) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <div
      className="foreman-guide-panel__proactive-list"
      data-foreman-proactive-signals="true"
    >
      {signals.map((signal) => (
        <div className="signal-card" key={signal.signal_id}>
          <strong>{signal.title}</strong>
          <span>{signal.summary}</span>
          <span className="detail-copy">
            {signal.kind} / {signal.source_ref ?? "HOLD: source ref unavailable"}
          </span>
        </div>
      ))}
    </div>
  );
}

function getRoleSessionLabel(context: ForemanGuideContextV1 | null): string {
  const roleSession = context?.state.role_session;

  if (!roleSession) {
    return "Role session unavailable";
  }

  return `${roleSession.role} / ${roleSession.auth_status}`;
}

export function ForemanGuidePanel({
  activePanelId = null,
  context,
  highlightedPanelId = null,
  onPanelHighlightChange,
  proactiveSignals: incomingProactiveSignals = [],
}: ForemanGuidePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [question, setQuestion] = useState("");
  const {
    clearProactiveSignals,
    loading,
    messages,
    pauseProactiveNarration,
    proactivePaused,
    proactiveSignalCount,
    proactiveSignals,
    quickActions,
    resumeProactiveNarration,
    submitQuestion,
    submitQuickAction,
  } = useForemanGuide(context, {
    onPanelHighlightChange,
    proactiveSignals: incomingProactiveSignals,
  });
  const ready = context?.foreman_readiness.ready === true;
  const readinessLabel = ready ? "ready" : "holding";
  const lookingAtLabel = getForemanPanelLabel(highlightedPanelId ?? activePanelId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(question);
    setQuestion("");
  }

  return (
    <section
      className={`panel foreman-guide-panel${highlightedPanelId === "foreman-guide" ? " foreman-panel-highlight" : ""}`}
      data-foreman-mount="active"
      data-foreman-panel-id="foreman-guide"
      data-foreman-highlighted={highlightedPanelId === "foreman-guide" ? "true" : "false"}
      aria-labelledby="foreman-guide-title"
    >
      <div className="panel-heading foreman-guide-panel__heading">
        <div>
          <p className="panel-eyebrow">Dashboard-local offline guide</p>
          <h2 id="foreman-guide-title">The Foreman</h2>
        </div>
        <div className="foreman-guide-panel__heading-actions">
          <span className={`live-status-badge live-status-badge--${readinessLabel}`}>
            {readinessLabel}
          </span>
          <button
            className="control-button"
            type="button"
            onClick={
              proactivePaused ? resumeProactiveNarration : pauseProactiveNarration
            }
          >
            {proactivePaused ? "Resume proactive" : "Pause proactive"}
          </button>
          <button
            className="control-button"
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? "Open" : "Collapse"}
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <>
          <div className="fact-grid fact-grid--compact foreman-guide-panel__facts">
            <div>
              <span className="fact-label">Source mode</span>
              <strong>{context?.source_mode ?? "unknown"}</strong>
            </div>
            <div>
              <span className="fact-label">Readiness</span>
              <strong>{context?.foreman_readiness.reason ?? "HOLD: B1 context unavailable."}</strong>
            </div>
            <div>
              <span className="fact-label">Role session</span>
              <strong>{getRoleSessionLabel(context)}</strong>
            </div>
            <div>
              <span className="fact-label">Active proof</span>
              <strong>
                {context?.current.step_id ??
                  context?.current.event_id ??
                  "HOLD: no active proof anchor"}
              </strong>
            </div>
            <div>
              <span className="fact-label">Proactive narration</span>
              <strong>{proactivePaused ? "paused" : "on"}</strong>
            </div>
            <div>
              <span className="fact-label">Looking at</span>
              <strong>{lookingAtLabel ?? "Panel context unavailable"}</strong>
            </div>
          </div>

          {context ? renderHolds(context.holds) : renderHolds([
            {
              id: "missing_foreman_context",
              proof_needed: ["meridian.v2.foremanGuideContext.v1 context"],
              reason:
                "HOLD: B1 Foreman guide context is unavailable to the dashboard panel.",
              severity: "HOLD",
              source_ref: "foreman.context",
            },
          ])}

          <div className="foreman-guide-panel__proactive-row">
            <span className="detail-copy">
              {proactiveSignalCount} proactive signal{proactiveSignalCount === 1 ? "" : "s"} visible
            </span>
            <button
              className="control-button"
              disabled={proactiveSignalCount === 0}
              type="button"
              onClick={clearProactiveSignals}
            >
              Clear signals
            </button>
          </div>

          {renderProactiveSignals(proactiveSignals)}

          <div
            className="foreman-guide-panel__quick-actions"
            aria-label="Foreman quick actions"
          >
            {quickActions.map((action) => (
              <button
                className="foreman-guide-panel__chip"
                key={action.id}
                type="button"
                onClick={() => submitQuickAction(action.id as ForemanQuickActionId)}
              >
                {action.label}
              </button>
            ))}
          </div>

          <form className="foreman-guide-panel__form" onSubmit={handleSubmit}>
            <label htmlFor="foreman-guide-question">Ask from current proof</label>
            <div className="foreman-guide-panel__input-row">
              <input
                id="foreman-guide-question"
                name="foreman-guide-question"
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.currentTarget.value)}
                placeholder="Ask about proof, absence, authority, public view, or role session"
              />
              <button className="control-button control-button--primary" type="submit">
                Ask
              </button>
            </div>
          </form>

          <div className="foreman-guide-panel__history" aria-live="polite">
            {messages.length === 0 ? (
              <p className="empty-state">
                Foreman is idle. Answers stay offline and bounded to the current B1 context.
              </p>
            ) : (
              messages.map((message) => (
                <article
                  className={`foreman-guide-panel__message foreman-guide-panel__message--${message.speaker}`}
                  key={message.id}
                >
                  <p className="panel-eyebrow">
                    {message.speaker === "foreman" ? "The Foreman" : "Question"}
                  </p>
                  <p>{message.content}</p>
                  {message.response ? (
                    <>
                      <div className="foreman-guide-panel__response-meta">
                        <span>{message.response.version}</span>
                        <span>{message.response.mode}</span>
                        <span>{message.response.response_kind}</span>
                      </div>
                      {renderSourceRefs(message.response.source_refs)}
                      {renderHolds(message.response.holds)}
                    </>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
