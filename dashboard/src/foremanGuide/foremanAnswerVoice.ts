import type { ForemanGuideMessage } from "./useForemanGuide.ts";
import type { ForemanLiveVoiceTransport } from "./liveVoiceTransport.ts";

export const FOREMAN_ANSWER_VOICE_DEMO_SAFE_GATE =
  "mission_narration_only" as const;

export interface SpeakLatestForemanAnswerInput {
  messages: readonly ForemanGuideMessage[];
  spokenMessageIds: Set<string>;
  transport?: ForemanLiveVoiceTransport | null;
}

export interface SpeakLatestForemanAnswerResult {
  messageId: string;
  skipped: typeof FOREMAN_ANSWER_VOICE_DEMO_SAFE_GATE;
  text: string;
}

export function speakLatestForemanAnswer({
  messages,
  spokenMessageIds,
  transport,
}: SpeakLatestForemanAnswerInput): SpeakLatestForemanAnswerResult | null {
  const latest = [...messages]
    .reverse()
    .find((message) => message.speaker === "foreman" && message.response);

  if (!latest || spokenMessageIds.has(latest.id)) {
    return null;
  }

  const text = latest.content.trim();

  if (!text) {
    spokenMessageIds.add(latest.id);
    return null;
  }

  spokenMessageIds.add(latest.id);

  return {
    messageId: latest.id,
    skipped: FOREMAN_ANSWER_VOICE_DEMO_SAFE_GATE,
    text,
  };
}
