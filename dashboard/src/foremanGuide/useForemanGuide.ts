import { useCallback, useState } from "react";
import type { ForemanGuideContextV1 } from "./foremanGuideTypes.ts";
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
    id: "hold-guess",
    label: "What is HOLD > GUESS?",
    prompt: "What is HOLD > GUESS?",
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

export function useForemanGuide(context: ForemanGuideContextV1 | null) {
  const [messages, setMessages] = useState<ForemanGuideMessage[]>([]);
  const [loading] = useState(false);

  const submitQuestion = useCallback(
    (question: string) => {
      setMessages((current) =>
        appendForemanGuideExchange(current, question, context)
      );
    },
    [context]
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

  return {
    loading,
    messages,
    quickActions: FOREMAN_QUICK_ACTIONS,
    submitQuestion,
    submitQuickAction,
  };
}
