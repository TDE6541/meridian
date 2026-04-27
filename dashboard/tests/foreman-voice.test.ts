import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { ForemanGuidePanel } from "../src/components/ForemanGuidePanel.tsx";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import {
  detectSpeechRecognitionSupport,
  detectSpeechSynthesisSupport,
  getSelectedSpeechText,
  speakForemanText,
  startForemanSpeechRecognition,
  stopForemanSpeech,
  type ForemanSpeechRecognitionCtor,
  type ForemanSpeechRecognitionLike,
  type ForemanSpeechSynthesisUtteranceLike,
  type ForemanVoiceBrowserTarget,
} from "../src/foremanGuide/voiceSupport.ts";
import { submitVoiceTranscript } from "../src/foremanGuide/useForemanVoice.ts";
import { createTestLiveProjection, renderMarkup, runTests } from "./scenarioTestUtils.ts";

class MockUtterance implements ForemanSpeechSynthesisUtteranceLike {
  onend: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(public text: string) {}
}

function createSpeechTarget({
  selectedText = "",
  throwOnCancel = false,
  throwOnSpeak = false,
}: {
  selectedText?: string;
  throwOnCancel?: boolean;
  throwOnSpeak?: boolean;
} = {}) {
  const utterances: ForemanSpeechSynthesisUtteranceLike[] = [];
  let cancelCount = 0;
  const target: ForemanVoiceBrowserTarget = {
    SpeechSynthesisUtterance: MockUtterance,
    getSelection: () => ({ toString: () => selectedText }),
    speechSynthesis: {
      cancel: () => {
        cancelCount += 1;
        if (throwOnCancel) {
          throw new Error("cancel failed");
        }
      },
      speak: (utterance) => {
        if (throwOnSpeak) {
          throw new Error("speak failed");
        }
        utterances.push(utterance);
      },
    },
  };

  return {
    target,
    get cancelCount() {
      return cancelCount;
    },
    utterances,
  };
}

function createRecognitionTarget({
  throwOnStart = false,
}: {
  throwOnStart?: boolean;
} = {}) {
  let instance: ForemanSpeechRecognitionLike | null = null;

  class MockRecognition implements ForemanSpeechRecognitionLike {
    continuous = true;
    interimResults = true;
    lang = "";
    onend: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onresult: ForemanSpeechRecognitionLike["onresult"] = null;

    constructor() {
      instance = this;
    }

    start() {
      if (throwOnStart) {
        throw new Error("start failed");
      }
    }
  }

  return {
    get instance() {
      assert.ok(instance);
      return instance;
    },
    target: {
      SpeechRecognition: MockRecognition as ForemanSpeechRecognitionCtor,
    } satisfies ForemanVoiceBrowserTarget,
  };
}

function createPanelContext() {
  return buildForemanGuideContext({
    liveProjection: createTestLiveProjection(),
    snapshot: {
      activePanel: "control-room",
      activeSkin: "operations",
      scenarioId: "scenario-b6",
      sessionId: "snapshot:b6",
      sourceRefs: [
        {
          evidence_id: "scenario-b6",
          label: "B6 test source",
          path: "dashboard/tests/foreman-voice.test.ts",
          source_kind: "test.source",
          source_ref: "test.source:dashboard/tests/foreman-voice.test.ts",
        },
      ],
    },
  });
}

const tests = [
  {
    name: "speech synthesis supported detection",
    run: () => {
      const { target } = createSpeechTarget();
      const support = detectSpeechSynthesisSupport(target);

      assert.equal(support.supported, true);
      assert.equal(support.reason, "supported");
    },
  },
  {
    name: "speech synthesis unsupported fallback",
    run: () => {
      const support = detectSpeechSynthesisSupport({});
      const result = speakForemanText({ target: {}, text: "Explain this." });

      assert.equal(support.supported, false);
      assert.equal(result.ok, false);
      assert.equal(result.issue?.startsWith("HOLD:"), true);
    },
  },
  {
    name: "speak creates an utterance with answer text when supported",
    run: () => {
      const { target, utterances } = createSpeechTarget();
      const result = speakForemanText({ target, text: "Walk the proof." });

      assert.equal(result.ok, true);
      assert.equal(utterances.length, 1);
      assert.equal(utterances[0]?.text, "Walk the proof.");
    },
  },
  {
    name: "stop cancels speech synthesis",
    run: () => {
      const harness = createSpeechTarget();
      const result = stopForemanSpeech(harness.target);

      assert.equal(result.ok, true);
      assert.equal(harness.cancelCount, 1);
    },
  },
  {
    name: "speech failure returns HOLD result without throwing",
    run: () => {
      const { target } = createSpeechTarget({ throwOnSpeak: true });
      const result = speakForemanText({ target, text: "Failure path." });

      assert.equal(result.ok, false);
      assert.equal(result.issue?.startsWith("HOLD:"), true);
    },
  },
  {
    name: "selected text can override latest answer text",
    run: () => {
      const { target } = createSpeechTarget({ selectedText: "Selected answer." });

      assert.equal(getSelectedSpeechText(target), "Selected answer.");
    },
  },
  {
    name: "speech recognition supported detection",
    run: () => {
      const { target } = createRecognitionTarget();
      const support = detectSpeechRecognitionSupport(target);

      assert.equal(support.supported, true);
      assert.equal(support.reason, "supported");
    },
  },
  {
    name: "speech recognition unsupported fallback",
    run: () => {
      const support = detectSpeechRecognitionSupport({});
      const result = startForemanSpeechRecognition({
        onTranscript: () => {
          throw new Error("should not route transcript");
        },
        target: {},
      });

      assert.equal(support.supported, false);
      assert.equal(result.ok, false);
      assert.equal(result.issue?.startsWith("HOLD:"), true);
    },
  },
  {
    name: "speech input transcript routes into existing question path",
    run: () => {
      const routed: string[] = [];
      const result = submitVoiceTranscript(" Explain authority ", (question) => {
        routed.push(question);
      });

      assert.equal(result.ok, true);
      assert.deepEqual(routed, ["Explain authority"]);
    },
  },
  {
    name: "speech input failure produces nonbreaking HOLD state",
    run: () => {
      const { target } = createRecognitionTarget();
      const holds: string[] = [];
      const result = startForemanSpeechRecognition({
        onHold: (message) => holds.push(message),
        onTranscript: () => {
          throw new Error("should not route transcript");
        },
        target,
      });

      assert.equal(result.ok, true);
      result.recognition?.onerror?.({});
      assert.equal(holds.length, 1);
      assert.equal(holds[0]?.startsWith("HOLD:"), true);
    },
  },
  {
    name: "browser recognition transcript routes through callback",
    run: () => {
      const harness = createRecognitionTarget();
      const transcripts: string[] = [];
      const result = startForemanSpeechRecognition({
        onTranscript: (transcript) => transcripts.push(transcript),
        target: harness.target,
      });

      assert.equal(result.ok, true);
      harness.instance.onresult?.({ results: [[{ transcript: " Challenge this " }]] });
      assert.deepEqual(transcripts, ["Challenge this"]);
    },
  },
  {
    name: "panel renders speech controls and typed fallback label",
    run: () => {
      const markup = renderMarkup(
        React.createElement(ForemanGuidePanel, { context: createPanelContext() })
      );

      assert.equal(markup.includes("Speech output"), true);
      assert.equal(markup.includes("Speak latest response"), true);
      assert.equal(markup.includes("Dictation unavailable"), true);
      assert.equal(markup.includes("typed fallback remains primary"), true);
    },
  },
  {
    name: "B6 speech source avoids forbidden external capture and model behavior",
    run: async () => {
      const files = [
        "src/foremanGuide/voiceSupport.ts",
        "src/foremanGuide/useForemanVoice.ts",
        "src/components/ForemanGuidePanel.tsx",
      ];
      const forbidden = [
        "VITE_" + "ANTH" + "ROPIC" + "_API_KEY",
        "anth" + "ropic",
        "op" + "enai",
        "." + "env" + ".local",
        "fet" + "ch(",
        "Media" + "Recorder",
        "Wh" + "isper",
        "navigator" + ".mediaDevices",
        "get" + "UserMedia",
      ];

      for (const file of files) {
        const content = await readFile(path.resolve(process.cwd(), file), "utf8");
        for (const token of forbidden) {
          assert.equal(
            content.toLowerCase().includes(token.toLowerCase()),
            false,
            `${file} contains ${token}`
          );
        }
      }
    },
  },
];

await runTests(tests);
