import { useState, type FormEvent } from "react";
import type {
  ForemanGuideContextV1,
  ForemanGuideHold,
  ForemanGuideSourceRef,
} from "../foremanGuide/foremanGuideTypes.ts";
import type { ForemanGuideSignalV1 } from "../foremanGuide/foremanSignals.ts";
import type { ForemanGuideResponseV1 } from "../foremanGuide/offlineNarration.ts";
import { getForemanPanelLabel } from "../foremanGuide/panelRegistry.ts";
import {
  useForemanGuide,
  type ForemanGuideModeId,
  type ForemanQuickActionId,
} from "../foremanGuide/useForemanGuide.ts";

type ForemanPresenceState =
  | "idle"
  | "explaining"
  | "holding"
  | "warning"
  | "blocked"
  | "live"
  | "public-boundary";

interface ForemanPresenceBadge {
  reason: string;
  state: ForemanPresenceState;
}

interface PanelSpeechRecognitionEvent {
  results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
}

interface PanelSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: PanelSpeechRecognitionEvent) => void) | null;
  start: () => void;
}

type PanelSpeechRecognitionCtor = new () => PanelSpeechRecognition;

type PanelSpeechWindow = Window & {
  SpeechRecognition?: PanelSpeechRecognitionCtor;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  webkitSpeechRecognition?: PanelSpeechRecognitionCtor;
};

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

function getPanelSpeechWindow(): PanelSpeechWindow | null {
  return typeof window === "undefined" ? null : (window as PanelSpeechWindow);
}

function hasPanelSpeechOutput(): boolean {
  const target = getPanelSpeechWindow();

  return Boolean(target?.speechSynthesis && target.SpeechSynthesisUtterance);
}

function getPanelSpeechRecognitionCtor(): PanelSpeechRecognitionCtor | null {
  const target = getPanelSpeechWindow();

  return target?.SpeechRecognition ?? target?.webkitSpeechRecognition ?? null;
}

function selectedSpeechText(): string | null {
  const selected = getPanelSpeechWindow()?.getSelection?.()?.toString().trim();

  return selected && selected.length > 0 ? selected : null;
}

function transcriptFromSpeechEvent(
  event: PanelSpeechRecognitionEvent
): string | null {
  const transcript = event.results?.[0]?.[0]?.transcript?.trim();

  return transcript && transcript.length > 0 ? transcript : null;
}

function hasHoldResponse(response: ForemanGuideResponseV1 | null): boolean {
  return Boolean(
    response?.response_kind === "hold" ||
      response?.holds.some((hold) => hold.severity === "HOLD")
  );
}

function derivePresenceBadge({
  context,
  latestResponse,
  latestSignal,
  selectedModeId,
}: {
  context: ForemanGuideContextV1 | null;
  latestResponse: ForemanGuideResponseV1 | null;
  latestSignal: ForemanGuideSignalV1 | null;
  selectedModeId: ForemanGuideModeId;
}): ForemanPresenceBadge {
  if (
    latestResponse?.holds.some((hold) => hold.severity === "BLOCK") ||
    context?.holds.some((hold) => hold.severity === "BLOCK") ||
    latestSignal?.kind === "endpoint.hold"
  ) {
    return {
      reason: "A blocked or endpoint HOLD context is visible.",
      state: "blocked",
    };
  }

  if (hasHoldResponse(latestResponse) || context?.holds.some((hold) => hold.severity === "HOLD")) {
    return {
      reason: "Foreman has a HOLD to keep visible.",
      state: "holding",
    };
  }

  if (
    selectedModeId === "public" ||
    latestResponse?.response_kind === "public_boundary" ||
    latestResponse?.response_kind === "public_mode" ||
    latestResponse?.response_kind === "disclosure_boundary" ||
    latestSignal?.kind === "public.view.selected" ||
    latestSignal?.kind === "disclosure.boundary.observed"
  ) {
    return {
      reason: "Public or disclosure boundary context is active.",
      state: "public-boundary",
    };
  }

  if (latestSignal?.priority === "high") {
    return {
      reason: "A high-priority source-bounded signal is active.",
      state: "warning",
    };
  }

  if (context?.source_mode === "live" || latestSignal?.kind === "live.event.observed") {
    return {
      reason: "Dashboard-supplied live context is active.",
      state: "live",
    };
  }

  if (latestResponse) {
    return {
      reason: "Foreman has produced an offline explanation.",
      state: "explaining",
    };
  }

  return {
    reason: "Waiting for typed input, a mode action, or a source-bounded signal.",
    state: "idle",
  };
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
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const {
    clearProactiveSignals,
    loading,
    messages,
    modes,
    pauseProactiveNarration,
    proactivePaused,
    proactiveSignalCount,
    proactiveSignals,
    quickActions,
    resumeProactiveNarration,
    selectedMode,
    selectedModeId,
    selectMode,
    submitMode,
    submitQuestion,
    submitQuickAction,
  } = useForemanGuide(context, {
    onPanelHighlightChange,
    proactiveSignals: incomingProactiveSignals,
  });
  const ready = context?.foreman_readiness.ready === true;
  const readinessLabel = ready ? "ready" : "holding";
  const lookingAtLabel = getForemanPanelLabel(highlightedPanelId ?? activePanelId);
  const latestForemanMessage =
    [...messages].reverse().find((message) => message.speaker === "foreman") ??
    null;
  const latestForemanText = latestForemanMessage?.content ?? "";
  const latestSignal = proactiveSignals[0] ?? incomingProactiveSignals[0] ?? null;
  const speechOutputSupported = hasPanelSpeechOutput();
  const speechInputSupported = Boolean(getPanelSpeechRecognitionCtor());
  const presenceBadge = derivePresenceBadge({
    context,
    latestResponse: latestForemanMessage?.response ?? null,
    latestSignal,
    selectedModeId,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(question);
    setQuestion("");
  }

  function handleSpeakLatest() {
    const target = getPanelSpeechWindow();
    const text = selectedSpeechText() ?? latestForemanText;

    if (!target?.speechSynthesis || !target.SpeechSynthesisUtterance) {
      setSpeechStatus(
        "HOLD: browser speech synthesis is unavailable; typed response remains primary."
      );
      return;
    }

    if (!text.trim()) {
      setSpeechStatus("HOLD: no Foreman answer is available to speak yet.");
      return;
    }

    try {
      const utterance = new target.SpeechSynthesisUtterance(text.trim());

      utterance.onerror = () => {
        setSpeechStatus(
          "HOLD: browser speech output failed; typed response remains visible."
        );
      };
      utterance.onend = () => {
        setSpeechStatus("Speech output finished.");
      };
      target.speechSynthesis.speak(utterance);
      setSpeechStatus("Speaking latest Foreman response.");
    } catch {
      setSpeechStatus(
        "HOLD: browser speech output failed; typed response remains visible."
      );
    }
  }

  function handleStopSpeech() {
    const target = getPanelSpeechWindow();

    if (!target?.speechSynthesis) {
      setSpeechStatus(
        "HOLD: browser speech synthesis is unavailable; typed response remains primary."
      );
      return;
    }

    try {
      target.speechSynthesis.cancel();
      setSpeechStatus("Speech output stopped.");
    } catch {
      setSpeechStatus(
        "HOLD: browser speech output failed; typed response remains visible."
      );
    }
  }

  function handleStartDictation() {
    const RecognitionCtor = getPanelSpeechRecognitionCtor();

    if (!RecognitionCtor) {
      setSpeechStatus(
        "HOLD: browser speech recognition is unavailable; type the question instead."
      );
      return;
    }

    try {
      const recognition = new RecognitionCtor();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onerror = () => {
        setSpeechStatus(
          "HOLD: browser speech input failed; type the question instead."
        );
      };
      recognition.onresult = (event) => {
        const transcript = transcriptFromSpeechEvent(event);

        if (!transcript) {
          setSpeechStatus(
            "HOLD: browser speech input returned no transcript; type the question instead."
          );
          return;
        }

        submitQuestion(transcript);
        setQuestion("");
        setSpeechStatus("Dictation routed through the typed question path.");
      };
      recognition.start();
      setSpeechStatus("Listening for dictation.");
    } catch {
      setSpeechStatus(
        "HOLD: browser speech input failed; type the question instead."
      );
    }
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
            aria-label={
              proactivePaused
                ? "Resume Foreman proactive narration"
                : "Pause Foreman proactive narration"
            }
            onClick={
              proactivePaused ? resumeProactiveNarration : pauseProactiveNarration
            }
          >
            {proactivePaused ? "Resume proactive" : "Pause proactive"}
          </button>
          <button
            className="control-button"
            type="button"
            aria-label={collapsed ? "Open Foreman panel" : "Collapse Foreman panel"}
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

          <div
            className="foreman-guide-panel__presence-row"
            data-foreman-presence-state={presenceBadge.state}
          >
            <div className="foreman-guide-panel__presence-badge">
              <span className="fact-label">Foreman state</span>
              <strong>{presenceBadge.state}</strong>
              <span className="detail-copy">{presenceBadge.reason}</span>
            </div>
            <div
              className="foreman-guide-panel__speech-controls"
              aria-label="Foreman speech controls"
            >
              <span className="fact-label">Speech output</span>
              <button
                className="control-button"
                disabled={!speechOutputSupported || !latestForemanText}
                type="button"
                aria-label="Speak the latest Foreman response"
                onClick={handleSpeakLatest}
              >
                Speak latest response
              </button>
              <button
                className="control-button"
                disabled={!speechOutputSupported}
                type="button"
                aria-label="Stop Foreman speech output"
                onClick={handleStopSpeech}
              >
                Stop speaking
              </button>
              <button
                className="control-button"
                disabled={!speechInputSupported}
                type="button"
                aria-label="Start Foreman dictation input"
                onClick={handleStartDictation}
              >
                {speechInputSupported ? "Start dictation" : "Dictation unavailable"}
              </button>
              <span className="detail-copy">
                {speechStatus ??
                  (speechOutputSupported
                    ? "Typed fallback remains primary."
                    : "HOLD: browser speech synthesis unavailable; typed fallback remains primary.")}
              </span>
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
              aria-label="Clear visible Foreman proactive signals"
              onClick={clearProactiveSignals}
            >
              Clear signals
            </button>
          </div>

          {renderProactiveSignals(proactiveSignals)}

          <div
            className="foreman-guide-panel__mode-controls"
            aria-label="Foreman Gold modes"
          >
            <div className="foreman-guide-panel__mode-status">
              <span className="fact-label">Active mode</span>
              <strong>{selectedMode.label} Mode</strong>
              <span className="detail-copy">
                {selectedMode.disabled_reason ?? selectedMode.summary}
              </span>
            </div>
            <div className="foreman-guide-panel__mode-buttons">
              {modes.map((mode) => (
                <button
                  aria-disabled={mode.eligible ? "false" : "true"}
                  aria-label={`Select Foreman ${mode.label} mode`}
                  aria-pressed={mode.mode_id === selectedModeId}
                  className={`foreman-guide-panel__mode-button${mode.mode_id === selectedModeId ? " foreman-guide-panel__mode-button--active" : ""}`}
                  data-foreman-mode-id={mode.mode_id}
                  data-foreman-mode-eligible={mode.eligible ? "true" : "false"}
                  key={mode.mode_id}
                  title={mode.disabled_reason ?? mode.summary}
                  type="button"
                  onClick={() => selectMode(mode.mode_id as ForemanGuideModeId)}
                >
                  {mode.label}
                </button>
              ))}
              <button
                className="control-button control-button--primary"
                type="button"
                aria-label={`Run Foreman ${selectedMode.label} mode`}
                onClick={() => submitMode(selectedModeId)}
              >
                Run mode
              </button>
            </div>
          </div>

          <div
            className="foreman-guide-panel__quick-actions"
            aria-label="Foreman quick actions"
          >
            {quickActions.map((action) => (
              <button
                className="foreman-guide-panel__chip"
                key={action.id}
                type="button"
                aria-label={`Ask Foreman to ${action.label.toLowerCase()}`}
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
