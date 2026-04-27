import { useCallback, useMemo, useRef, useState } from "react";
import {
  detectSpeechRecognitionSupport,
  detectSpeechSynthesisSupport,
  FOREMAN_SPEECH_INPUT_UNAVAILABLE,
  FOREMAN_SPEECH_OUTPUT_UNAVAILABLE,
  getSelectedSpeechText,
  speakForemanText,
  startForemanSpeechRecognition,
  stopForemanSpeech,
  type ForemanSpeechRecognitionLike,
  type ForemanSpeechResult,
  type ForemanSpeechSupport,
  type ForemanVoiceBrowserTarget,
} from "./voiceSupport.ts";

export type ForemanVoicePhase =
  | "holding"
  | "idle"
  | "listening"
  | "speaking";

export interface SubmitVoiceTranscriptResult {
  issue: string | null;
  ok: boolean;
  transcript: string | null;
}

export interface UseForemanVoiceInput {
  latestText: string | null;
  onTranscript: (transcript: string) => void;
  target?: ForemanVoiceBrowserTarget | null;
}

export interface UseForemanVoiceResult {
  inputIssue: string | null;
  inputPhase: ForemanVoicePhase;
  lastTranscript: string | null;
  recognitionSupport: ForemanSpeechSupport;
  speakLatest: (selectedText?: string | null) => ForemanSpeechResult;
  speechSupport: ForemanSpeechSupport;
  startInput: () => ForemanSpeechResult;
  stopSpeaking: () => ForemanSpeechResult;
}

export function submitVoiceTranscript(
  transcript: string,
  submitQuestion: (question: string) => void
): SubmitVoiceTranscriptResult {
  const trimmedTranscript = transcript.trim();

  if (!trimmedTranscript) {
    return {
      issue: "HOLD: browser speech input returned no transcript; type the question instead.",
      ok: false,
      transcript: null,
    };
  }

  submitQuestion(trimmedTranscript);

  return {
    issue: null,
    ok: true,
    transcript: trimmedTranscript,
  };
}

export function useForemanVoice({
  latestText,
  onTranscript,
  target,
}: UseForemanVoiceInput): UseForemanVoiceResult {
  const [inputIssue, setInputIssue] = useState<string | null>(null);
  const [inputPhase, setInputPhase] = useState<ForemanVoicePhase>("idle");
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const recognitionRef = useRef<ForemanSpeechRecognitionLike | null>(null);
  const speechSupport = useMemo(
    () => detectSpeechSynthesisSupport(target),
    [target]
  );
  const recognitionSupport = useMemo(
    () => detectSpeechRecognitionSupport(target),
    [target]
  );

  const speakLatest = useCallback(
    (selectedText: string | null = null) => {
      const text =
        selectedText?.trim() ||
        getSelectedSpeechText(target) ||
        latestText?.trim() ||
        "";
      const result = speakForemanText({
        onEnd: () => setInputPhase("idle"),
        onError: (message) => {
          setInputIssue(message);
          setInputPhase("holding");
        },
        target,
        text,
      });

      if (result.ok) {
        setInputIssue(null);
        setInputPhase("speaking");
      } else {
        setInputIssue(result.issue ?? FOREMAN_SPEECH_OUTPUT_UNAVAILABLE);
        setInputPhase("holding");
      }

      return result;
    },
    [latestText, target]
  );

  const stopSpeaking = useCallback(() => {
    const result = stopForemanSpeech(target);

    if (result.ok) {
      setInputIssue(null);
      setInputPhase("idle");
    } else {
      setInputIssue(result.issue ?? FOREMAN_SPEECH_OUTPUT_UNAVAILABLE);
      setInputPhase("holding");
    }

    return result;
  }, [target]);

  const startInput = useCallback(() => {
    const result = startForemanSpeechRecognition({
      onEnd: () => setInputPhase("idle"),
      onHold: (message) => {
        setInputIssue(message);
        setInputPhase("holding");
      },
      onTranscript: (transcript) => {
        const routed = submitVoiceTranscript(transcript, onTranscript);
        setLastTranscript(routed.transcript);
        setInputIssue(routed.issue);
        setInputPhase(routed.ok ? "idle" : "holding");
      },
      target,
    });

    if (result.ok) {
      recognitionRef.current = result.recognition;
      setInputIssue(null);
      setInputPhase("listening");
      return {
        issue: null,
        ok: true,
        text: null,
      };
    }

    setInputIssue(result.issue ?? FOREMAN_SPEECH_INPUT_UNAVAILABLE);
    setInputPhase("holding");

    return {
      issue: result.issue ?? FOREMAN_SPEECH_INPUT_UNAVAILABLE,
      ok: false,
      text: null,
    };
  }, [onTranscript, target]);

  return {
    inputIssue,
    inputPhase,
    lastTranscript,
    recognitionSupport,
    speakLatest,
    speechSupport,
    startInput,
    stopSpeaking,
  };
}
