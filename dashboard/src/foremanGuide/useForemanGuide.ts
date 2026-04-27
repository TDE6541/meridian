import { useCallback, useEffect, useRef, useState } from "react";
import type { ForemanGuideContextV1 } from "./foremanGuideTypes.ts";
import {
  createProactiveForemanResponse,
  dedupeForemanGuideSignals,
  type ForemanGuideSignalV1,
} from "./foremanSignals.ts";
import {
  answerForemanGuideOffline,
  type ForemanGuideResponseV1,
} from "./offlineNarration.ts";

export const FOREMAN_QUICK_ACTIONS = [
  {
    id: "walk-proof",
    label: "Walk the proof",
    prompt: "Walk the proof",
  },
  {
    id: "role-capabilities",
    label: "What can my role do?",
    prompt: "What can my role do?",
  },
  {
    id: "show-absence",
    label: "Show me an absence",
    prompt: "Show me an absence",
  },
  {
    id: "explain-authority",
    label: "Explain authority",
    prompt: "Explain authority",
  },
  {
    id: "public-view",
    label: "Public view",
    prompt: "Public view",
  },
  {
    id: "challenge-this",
    label: "Challenge this",
    prompt: "Challenge this",
  },
] as const;

export type ForemanQuickActionId = (typeof FOREMAN_QUICK_ACTIONS)[number]["id"];

export interface ForemanGuideMessage {
  content: string;
  id: string;
  response?: ForemanGuideResponseV1;
  speaker: "foreman" | "user";
}

export interface UseForemanGuideOptions {
  onPanelHighlightChange?: (panelId: string | null) => void;
  proactiveSignals?: readonly ForemanGuideSignalV1[];
}

export interface AppendProactiveForemanSignalsInput {
  context: ForemanGuideContextV1 | null;
  messages: readonly ForemanGuideMessage[];
  paused: boolean;
  seenDedupeKeys?: ReadonlySet<string>;
  signals: readonly ForemanGuideSignalV1[];
}

export interface AppendProactiveForemanSignalsResult {
  highlightedPanelId: string | null;
  messages: ForemanGuideMessage[];
  processedSignals: ForemanGuideSignalV1[];
  seenDedupeKeys: Set<string>;
}

const MAX_VISIBLE_PROACTIVE_SIGNALS = 6;
const MAX_PROACTIVE_MESSAGES_PER_BATCH = 3;

function nextMessageId(
  messages: readonly ForemanGuideMessage[],
  suffix: string
): string {
  return `foreman-guide-${messages.length + 1}-${suffix}`;
}

export function appendForemanGuideExchange(
  messages: readonly ForemanGuideMessage[],
  question: string,
  context: ForemanGuideContextV1 | null
): ForemanGuideMessage[] {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    return [...messages];
  }

  const response = answerForemanGuideOffline(trimmedQuestion, context);

  return [
    ...messages,
    {
      content: trimmedQuestion,
      id: nextMessageId(messages, "user"),
      speaker: "user",
    },
    {
      content: response.answer,
      id: nextMessageId(messages, "foreman"),
      response,
      speaker: "foreman",
    },
  ];
}

export function appendProactiveForemanSignals({
  context,
  messages,
  paused,
  seenDedupeKeys = new Set(),
  signals,
}: AppendProactiveForemanSignalsInput): AppendProactiveForemanSignalsResult {
  const newSignals = dedupeForemanGuideSignals(signals, seenDedupeKeys);
  const nextSeen = new Set(seenDedupeKeys);
  let nextMessages = [...messages];

  newSignals.forEach((signal) => {
    nextSeen.add(signal.dedupe_key);
  });

  if (!paused) {
    newSignals
      .filter((signal) => signal.eligible_for_proactive_narration)
      .slice(0, MAX_PROACTIVE_MESSAGES_PER_BATCH)
      .forEach((signal) => {
        const response = createProactiveForemanResponse(signal, context);

        nextMessages = [
          ...nextMessages,
          {
            content: response.answer,
            id: nextMessageId(nextMessages, "proactive"),
            response,
            speaker: "foreman",
          },
        ];
      });
  }

  return {
    highlightedPanelId:
      newSignals.find((signal) => signal.panel_id !== null)?.panel_id ?? null,
    messages: nextMessages,
    processedSignals: newSignals,
    seenDedupeKeys: nextSeen,
  };
}

function mergeVisibleProactiveSignals(
  current: readonly ForemanGuideSignalV1[],
  incoming: readonly ForemanGuideSignalV1[]
): ForemanGuideSignalV1[] {
  const byKey = new Map<string, ForemanGuideSignalV1>();

  [...incoming, ...current].forEach((signal) => {
    byKey.set(signal.dedupe_key, signal);
  });

  return [...byKey.values()].slice(0, MAX_VISIBLE_PROACTIVE_SIGNALS);
}

export function useForemanGuide(
  context: ForemanGuideContextV1 | null,
  options: UseForemanGuideOptions = {}
) {
  const [messages, setMessages] = useState<ForemanGuideMessage[]>([]);
  const [loading] = useState(false);
  const [proactivePaused, setProactivePaused] = useState(false);
  const [visibleProactiveSignals, setVisibleProactiveSignals] = useState<
    ForemanGuideSignalV1[]
  >(() =>
    (options.proactiveSignals ?? []).slice(0, MAX_VISIBLE_PROACTIVE_SIGNALS)
  );
  const seenProactiveDedupeKeysRef = useRef(new Set<string>());
  const proactiveSignalKey = (options.proactiveSignals ?? [])
    .map((signal) => signal.dedupe_key)
    .join("|");

  const submitQuestion = useCallback(
    (question: string) => {
      options.onPanelHighlightChange?.(null);
      setMessages((current) =>
        appendForemanGuideExchange(current, question, context)
      );
    },
    [context, options.onPanelHighlightChange]
  );

  const submitQuickAction = useCallback(
    (actionId: ForemanQuickActionId) => {
      const action = FOREMAN_QUICK_ACTIONS.find((entry) => entry.id === actionId);

      if (action) {
        submitQuestion(action.prompt);
      }
    },
    [submitQuestion]
  );

  const pauseProactiveNarration = useCallback(() => {
    setProactivePaused(true);
  }, []);

  const resumeProactiveNarration = useCallback(() => {
    setProactivePaused(false);
  }, []);

  const clearProactiveSignals = useCallback(() => {
    setVisibleProactiveSignals([]);
    options.onPanelHighlightChange?.(null);
  }, [options.onPanelHighlightChange]);

  useEffect(() => {
    const proactiveSignals = options.proactiveSignals ?? [];

    if (proactiveSignals.length === 0) {
      return;
    }

    const result = appendProactiveForemanSignals({
      context,
      messages,
      paused: proactivePaused,
      seenDedupeKeys: seenProactiveDedupeKeysRef.current,
      signals: proactiveSignals,
    });

    if (result.processedSignals.length === 0) {
      return;
    }

    seenProactiveDedupeKeysRef.current = result.seenDedupeKeys;
    setVisibleProactiveSignals((current) =>
      mergeVisibleProactiveSignals(current, result.processedSignals)
    );

    if (result.messages.length !== messages.length) {
      setMessages(result.messages);
    }

    if (result.highlightedPanelId) {
      options.onPanelHighlightChange?.(result.highlightedPanelId);
    }
  }, [
    context,
    messages,
    options,
    proactivePaused,
    proactiveSignalKey,
  ]);

  return {
    clearProactiveSignals,
    loading,
    messages,
    pauseProactiveNarration,
    proactivePaused,
    proactiveSignalCount: visibleProactiveSignals.length,
    proactiveSignals: visibleProactiveSignals,
    quickActions: FOREMAN_QUICK_ACTIONS,
    resumeProactiveNarration,
    submitQuestion,
    submitQuickAction,
  };
}
