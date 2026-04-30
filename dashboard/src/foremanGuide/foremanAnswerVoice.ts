import type { ForemanGuideMessage } from "./useForemanGuide.ts";
import type {
  ForemanLiveVoicePlayback,
  ForemanLiveVoiceTransport,
} from "./liveVoiceTransport.ts";

export interface SpeakLatestForemanAnswerInput {
  messages: readonly ForemanGuideMessage[];
  spokenMessageIds: Set<string>;
  transport: ForemanLiveVoiceTransport;
}

export interface SpeakLatestForemanAnswerResult {
  messageId: string;
  playback: ForemanLiveVoicePlayback;
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
    return null;
  }

  spokenMessageIds.add(latest.id);

  return {
    messageId: latest.id,
    playback: transport.speak({ text }),
    text,
  };
}
