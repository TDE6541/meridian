import { useEffect, useMemo, useRef, useState } from "react";
import type { ForemanGuideContextV1 } from "./foremanGuideTypes.ts";
import {
  buildForemanGuideSignals,
  createForemanSignalState,
  type ForemanGuideSignalV1,
  type ForemanSignalState,
  type ForemanSignalStateInput,
} from "./foremanSignals.ts";

export interface UseForemanEventBindingInput
  extends ForemanSignalStateInput {
  createdAt?: string;
  enabled?: boolean;
  guideContext?: ForemanGuideContextV1 | null;
}

export interface UseForemanEventBindingResult {
  currentState: ForemanSignalState;
  signals: readonly ForemanGuideSignalV1[];
}

function stateKey(state: ForemanSignalState): string {
  return JSON.stringify({
    absence_refs: state.absence_refs,
    active_panel_id: state.active_panel_id,
    active_scenario_id: state.active_scenario_id,
    active_skin: state.active_skin,
    active_step_id: state.active_step_id,
    authority_events: state.authority_events,
    authority_requests: state.authority_requests,
    disclosure_key: state.disclosure_key,
    endpoint_hold: state.endpoint_hold?.code ?? null,
    endpoint_status: state.endpoint_status,
    live_events: state.live_events.map((event) => event.event_id),
    role_session_key: state.role_session_key,
  });
}

export function useForemanEventBinding({
  createdAt = "dashboard-local",
  enabled = true,
  guideContext = null,
  ...input
}: UseForemanEventBindingInput): UseForemanEventBindingResult {
  const currentState = useMemo(
    () =>
      createForemanSignalState({
        ...input,
        context: input.context ?? guideContext,
      }),
    [
      input.activePanelId,
      input.activeScenarioId,
      input.activeSkin,
      input.activeStepId,
      input.context,
      input.disclosurePreviewReport,
      input.liveEvents,
      input.roleSession,
      input.sharedAuthority,
      guideContext,
    ]
  );
  const currentStateKey = stateKey(currentState);
  const previousStateRef = useRef<ForemanSignalState | null>(null);
  const [signals, setSignals] = useState<ForemanGuideSignalV1[]>([]);

  useEffect(() => {
    if (!enabled) {
      previousStateRef.current = currentState;
      setSignals([]);
      return;
    }

    const nextSignals = buildForemanGuideSignals({
      createdAt,
      current: currentState,
      previous: previousStateRef.current,
    });

    previousStateRef.current = currentState;
    setSignals(nextSignals);
  }, [createdAt, currentState, currentStateKey, enabled]);

  return {
    currentState,
    signals,
  };
}
