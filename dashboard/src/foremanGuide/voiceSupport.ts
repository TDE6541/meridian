export const FOREMAN_VOICE_SUPPORT_VERSION =
  "meridian.v2.foremanVoiceSupport.v1" as const;

export const FOREMAN_SPEECH_OUTPUT_UNAVAILABLE =
  "HOLD: browser speech synthesis is unavailable; typed Foreman text remains primary." as const;
export const FOREMAN_SPEECH_INPUT_UNAVAILABLE =
  "HOLD: browser speech recognition is unavailable; type the question instead." as const;
export const FOREMAN_SPEECH_OUTPUT_FAILURE =
  "HOLD: browser speech output failed; typed Foreman text remains visible." as const;
export const FOREMAN_SPEECH_INPUT_FAILURE =
  "HOLD: browser speech input failed; type the question instead." as const;

export type ForemanSpeechSupportReason =
  | "browser_target_unavailable"
  | "speech_synthesis_unavailable"
  | "speech_utterance_unavailable"
  | "speech_recognition_unavailable"
  | "supported";

export interface ForemanSpeechSupport {
  reason: ForemanSpeechSupportReason;
  supported: boolean;
  version: typeof FOREMAN_VOICE_SUPPORT_VERSION;
}

export interface ForemanSpeechSynthesisUtteranceLike {
  onend: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  text: string;
}

export interface ForemanSpeechSynthesisLike {
  cancel: () => void;
  speak: (utterance: ForemanSpeechSynthesisUtteranceLike) => void;
}

export type ForemanSpeechSynthesisUtteranceCtor = new (
  text: string
) => ForemanSpeechSynthesisUtteranceLike;

export interface ForemanSpeechRecognitionEventLike {
  results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
}

export interface ForemanSpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: ForemanSpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop?: () => void;
}

export type ForemanSpeechRecognitionCtor =
  new () => ForemanSpeechRecognitionLike;

export interface ForemanVoiceBrowserTarget {
  SpeechRecognition?: ForemanSpeechRecognitionCtor;
  SpeechSynthesisUtterance?: ForemanSpeechSynthesisUtteranceCtor;
  getSelection?: () => { toString: () => string } | null;
  speechSynthesis?: ForemanSpeechSynthesisLike;
  webkitSpeechRecognition?: ForemanSpeechRecognitionCtor;
}

export interface ForemanSpeechResult {
  issue: string | null;
  ok: boolean;
  text: string | null;
}

export interface StartForemanRecognitionInput {
  lang?: string;
  onEnd?: () => void;
  onHold?: (message: string) => void;
  onTranscript: (transcript: string) => void;
  target?: ForemanVoiceBrowserTarget | null;
}

export interface StartForemanRecognitionResult {
  issue: string | null;
  ok: boolean;
  recognition: ForemanSpeechRecognitionLike | null;
}

function getBrowserVoiceTarget(): ForemanVoiceBrowserTarget | null {
  return typeof window === "undefined"
    ? null
    : (window as unknown as ForemanVoiceBrowserTarget);
}

function resolveTarget(
  target?: ForemanVoiceBrowserTarget | null
): ForemanVoiceBrowserTarget | null {
  return target === undefined ? getBrowserVoiceTarget() : target;
}

function support(
  supported: boolean,
  reason: ForemanSpeechSupportReason
): ForemanSpeechSupport {
  return {
    reason,
    supported,
    version: FOREMAN_VOICE_SUPPORT_VERSION,
  };
}

export function detectSpeechSynthesisSupport(
  target?: ForemanVoiceBrowserTarget | null
): ForemanSpeechSupport {
  const resolved = resolveTarget(target);

  if (!resolved) {
    return support(false, "browser_target_unavailable");
  }

  if (!resolved.speechSynthesis) {
    return support(false, "speech_synthesis_unavailable");
  }

  if (!resolved.SpeechSynthesisUtterance) {
    return support(false, "speech_utterance_unavailable");
  }

  return support(true, "supported");
}

export function detectSpeechRecognitionSupport(
  target?: ForemanVoiceBrowserTarget | null
): ForemanSpeechSupport {
  const resolved = resolveTarget(target);

  if (!resolved) {
    return support(false, "browser_target_unavailable");
  }

  if (!getSpeechRecognitionCtor(resolved)) {
    return support(false, "speech_recognition_unavailable");
  }

  return support(true, "supported");
}

export function getSpeechRecognitionCtor(
  target?: ForemanVoiceBrowserTarget | null
): ForemanSpeechRecognitionCtor | null {
  const resolved = resolveTarget(target);

  return (
    resolved?.SpeechRecognition ??
    resolved?.webkitSpeechRecognition ??
    null
  );
}

export function getSelectedSpeechText(
  target?: ForemanVoiceBrowserTarget | null
): string | null {
  const selected = resolveTarget(target)?.getSelection?.()?.toString().trim();

  return selected && selected.length > 0 ? selected : null;
}

export function readSpeechRecognitionTranscript(
  event: ForemanSpeechRecognitionEventLike
): string | null {
  const transcript = event.results?.[0]?.[0]?.transcript?.trim();

  return transcript && transcript.length > 0 ? transcript : null;
}

export function speakForemanText({
  onEnd,
  onError,
  target,
  text,
}: {
  onEnd?: () => void;
  onError?: (message: string) => void;
  target?: ForemanVoiceBrowserTarget | null;
  text: string;
}): ForemanSpeechResult {
  const trimmedText = text.trim();
  const resolved = resolveTarget(target);
  const synthesisSupport = detectSpeechSynthesisSupport(resolved);

  if (!trimmedText) {
    return {
      issue: "HOLD: no Foreman answer text is available to speak.",
      ok: false,
      text: null,
    };
  }

  if (!synthesisSupport.supported || !resolved?.speechSynthesis || !resolved.SpeechSynthesisUtterance) {
    return {
      issue: FOREMAN_SPEECH_OUTPUT_UNAVAILABLE,
      ok: false,
      text: trimmedText,
    };
  }

  try {
    const utterance = new resolved.SpeechSynthesisUtterance(trimmedText);

    utterance.onend = () => {
      onEnd?.();
    };
    utterance.onerror = () => {
      onError?.(FOREMAN_SPEECH_OUTPUT_FAILURE);
    };
    resolved.speechSynthesis.speak(utterance);

    return {
      issue: null,
      ok: true,
      text: trimmedText,
    };
  } catch {
    return {
      issue: FOREMAN_SPEECH_OUTPUT_FAILURE,
      ok: false,
      text: trimmedText,
    };
  }
}

export function stopForemanSpeech(
  target?: ForemanVoiceBrowserTarget | null
): ForemanSpeechResult {
  const resolved = resolveTarget(target);

  if (!resolved?.speechSynthesis) {
    return {
      issue: FOREMAN_SPEECH_OUTPUT_UNAVAILABLE,
      ok: false,
      text: null,
    };
  }

  try {
    resolved.speechSynthesis.cancel();

    return {
      issue: null,
      ok: true,
      text: null,
    };
  } catch {
    return {
      issue: FOREMAN_SPEECH_OUTPUT_FAILURE,
      ok: false,
      text: null,
    };
  }
}

export function startForemanSpeechRecognition({
  lang = "en-US",
  onEnd,
  onHold,
  onTranscript,
  target,
}: StartForemanRecognitionInput): StartForemanRecognitionResult {
  const resolved = resolveTarget(target);
  const RecognitionCtor = getSpeechRecognitionCtor(resolved);

  if (!RecognitionCtor) {
    return {
      issue: FOREMAN_SPEECH_INPUT_UNAVAILABLE,
      ok: false,
      recognition: null,
    };
  }

  try {
    const recognition = new RecognitionCtor();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang;
    recognition.onend = () => {
      onEnd?.();
    };
    recognition.onerror = () => {
      onHold?.(FOREMAN_SPEECH_INPUT_FAILURE);
    };
    recognition.onresult = (event) => {
      const transcript = readSpeechRecognitionTranscript(event);

      if (transcript) {
        onTranscript(transcript);
        return;
      }

      onHold?.("HOLD: browser speech input returned no transcript; type the question instead.");
    };
    recognition.start();

    return {
      issue: null,
      ok: true,
      recognition,
    };
  } catch {
    return {
      issue: FOREMAN_SPEECH_INPUT_FAILURE,
      ok: false,
      recognition: null,
    };
  }
}
