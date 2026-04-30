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
import {
  buildMissionNarrationKey,
  estimateMissionNarrationFailsafeMs,
  estimateMissionTypedFallbackMs,
  getMissionActNarration,
  MISSION_ACT_NARRATION,
  MISSION_NARRATION_ABSENCE_SILENCE_MS,
  runForemanMissionNarration,
} from "../src/foremanGuide/missionNarration.ts";
import type {
  ForemanLiveVoiceResult,
  ForemanLiveVoiceState,
  ForemanLiveVoiceTransport,
} from "../src/foremanGuide/liveVoiceTransport.ts";
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

interface FakeTimer {
  active: boolean;
  callback: () => void;
  delayMs: number;
}

function createFakeTimers() {
  const timers: FakeTimer[] = [];

  return {
    clearTimer: (timer: ReturnType<typeof setTimeout>) => {
      (timer as unknown as FakeTimer).active = false;
    },
    fireNext: (delayMs?: number) => {
      const timer = timers.find(
        (entry) => entry.active && (delayMs === undefined || entry.delayMs === delayMs)
      );

      assert.ok(timer, `missing active timer for ${delayMs ?? "next"}`);
      timer.active = false;
      timer.callback();
    },
    setTimer: (callback: () => void, delayMs: number) => {
      const timer: FakeTimer = {
        active: true,
        callback,
        delayMs,
      };

      timers.push(timer);

      return timer as unknown as ReturnType<typeof setTimeout>;
    },
    timers,
  };
}

function createLiveVoiceTransport() {
  const requests: string[] = [];
  const states: ForemanLiveVoiceState[] = [];
  const pending: Array<{
    onState?: (state: ForemanLiveVoiceState) => void;
    resolve: (result: ForemanLiveVoiceResult) => void;
  }> = [];
  let cancelCount = 0;
  const transport: ForemanLiveVoiceTransport = {
    speak: ({ onState, text }) => {
      requests.push(text);
      onState?.("requesting");
      states.push("requesting");

      let settled = false;
      const finished = new Promise<ForemanLiveVoiceResult>((resolve) => {
        pending.push({ onState, resolve });
      });

      return {
        cancel: () => {
          if (settled) {
            return;
          }

          settled = true;
          cancelCount += 1;
          const entry = pending.shift();

          entry?.onState?.("idle");
          entry?.resolve({
            issue: "Voice playback cancelled.",
            ok: false,
            state: "idle",
          });
        },
        finished,
      };
    },
    stop: () => {
      cancelCount += 1;
    },
  };

  return {
    completeNext: (result: ForemanLiveVoiceResult) => {
      const entry = pending.shift();

      assert.ok(entry);
      if (result.ok) {
        entry.onState?.("playing");
      } else {
        entry.onState?.(result.state);
      }
      entry.resolve(result);
    },
    get cancelCount() {
      return cancelCount;
    },
    pending,
    requests,
    states,
    transport,
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
      assert.equal(markup.includes("Typed fallback remains primary"), true);
    },
  },
  {
    name: "mission narration pins all six act lines and stable run-stage keys",
    run: () => {
      const stages = Object.values(MISSION_ACT_NARRATION).sort(
        (left, right) => left.index - right.index
      );

      assert.deepEqual(
        stages.map((stage) => stage.stageId),
        ["capture", "authority", "governance", "absence", "chain", "public"]
      );
      assert.equal(stages[0]?.line.includes("Permit 4471"), true);
      assert.equal(stages[3]?.line.startsWith("This is the moat."), true);
      assert.equal(stages[4]?.line.includes("Every decision"), true);
      assert.equal(
        buildMissionNarrationKey({
          lineKey: stages[0]?.lineKey ?? "",
          runId: "mission-run-1",
          stageId: "capture",
        }),
        "mission-run-1:capture:act-1-capture-permit-4471"
      );
    },
  },
  {
    name: "mission narration speaks through existing Foreman voice support",
    run: () => {
      const timers = createFakeTimers();
      const { target, utterances } = createSpeechTarget();
      const narration = getMissionActNarration("capture");
      const phases: string[] = [];
      const completed: string[] = [];

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        onComplete: (reason) => completed.push(reason),
        onPhase: (phase) => phases.push(phase),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "capture",
        target,
      });

      assert.equal(utterances.length, 0);
      timers.fireNext(0);
      assert.equal(utterances.length, 1);
      assert.equal(utterances[0]?.text, narration.line);
      assert.equal(phases.includes("speaking"), true);
      utterances[0]?.onend?.({});
      assert.deepEqual(completed, ["speech_end"]);
    },
  },
  {
    name: "mission act sends existing act line to live voice client",
    run: () => {
      const timers = createFakeTimers();
      const liveVoice = createLiveVoiceTransport();
      const narration = getMissionActNarration("capture");

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        liveVoiceTransport: liveVoice.transport,
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "capture",
      });

      timers.fireNext(0);
      assert.deepEqual(liveVoice.requests, [narration.line]);
    },
  },
  {
    name: "mission narration unlocks after live voice success",
    run: async () => {
      const timers = createFakeTimers();
      const liveVoice = createLiveVoiceTransport();
      const narration = getMissionActNarration("authority");
      const completed: string[] = [];

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        liveVoiceTransport: liveVoice.transport,
        onComplete: (reason) => completed.push(reason),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "authority",
      });

      timers.fireNext(0);
      liveVoice.completeNext({
        issue: null,
        ok: true,
        state: "idle",
      });
      await Promise.resolve();

      assert.deepEqual(completed, ["speech_end"]);
    },
  },
  {
    name: "mission narration falls back and unlocks after live voice failure",
    run: async () => {
      const timers = createFakeTimers();
      const liveVoice = createLiveVoiceTransport();
      const narration = getMissionActNarration("governance");
      const phases: string[] = [];
      const visibleLines: Array<string | null> = [];
      const completed: string[] = [];

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        liveVoiceTransport: liveVoice.transport,
        onComplete: (reason) => completed.push(reason),
        onPhase: (phase) => phases.push(phase),
        onVisibleLine: (line) => visibleLines.push(line),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "governance",
        target: {},
      });

      timers.fireNext(0);
      liveVoice.completeNext({
        issue: "Voice unavailable - showing typed answer.",
        ok: false,
        state: "unavailable",
      });
      await Promise.resolve();

      assert.equal(phases.includes("fallback"), true);
      assert.equal(visibleLines.at(-1), narration.line);
      timers.fireNext(estimateMissionTypedFallbackMs(narration.line));
      assert.deepEqual(completed, ["fallback_complete"]);
    },
  },
  {
    name: "mission narration falls back visibly when speech is unavailable",
    run: () => {
      const timers = createFakeTimers();
      const narration = getMissionActNarration("authority");
      const visibleLines: Array<string | null> = [];
      const phases: string[] = [];
      const completed: string[] = [];

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        onComplete: (reason) => completed.push(reason),
        onPhase: (phase) => phases.push(phase),
        onVisibleLine: (line) => visibleLines.push(line),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "authority",
        target: {},
      });

      timers.fireNext(0);
      assert.equal(phases.includes("fallback"), true);
      assert.equal(visibleLines.at(-1), narration.line);
      timers.fireNext(estimateMissionTypedFallbackMs(narration.line));
      assert.deepEqual(completed, ["fallback_complete"]);
    },
  },
  {
    name: "mission narration falls back after speech output error",
    run: () => {
      const timers = createFakeTimers();
      const { target, utterances } = createSpeechTarget();
      const narration = getMissionActNarration("governance");
      const phases: string[] = [];
      const issues: Array<string | null> = [];
      const completed: string[] = [];

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        onComplete: (reason) => completed.push(reason),
        onIssue: (issue) => issues.push(issue),
        onPhase: (phase) => phases.push(phase),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "governance",
        target,
      });

      timers.fireNext(0);
      utterances[0]?.onerror?.({});
      assert.equal(phases.includes("fallback"), true);
      assert.equal(issues.some((issue) => issue?.startsWith("HOLD:")), true);
      timers.fireNext(estimateMissionTypedFallbackMs(narration.line));
      assert.deepEqual(completed, ["fallback_complete"]);
    },
  },
  {
    name: "mission narration failsafe completes a stuck speech utterance",
    run: () => {
      const timers = createFakeTimers();
      const { target, utterances } = createSpeechTarget();
      const narration = getMissionActNarration("chain");
      const completed: string[] = [];

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        onComplete: (reason) => completed.push(reason),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "chain",
        target,
      });

      timers.fireNext(0);
      assert.equal(utterances.length, 1);
      timers.fireNext(estimateMissionNarrationFailsafeMs(narration.line));
      assert.deepEqual(completed, ["failsafe"]);
    },
  },
  {
    name: "mission narration holds Act 4 silent for exactly 3000ms before speaking",
    run: () => {
      const timers = createFakeTimers();
      const { target, utterances } = createSpeechTarget();
      const narration = getMissionActNarration("absence");
      const visibleLines: Array<string | null> = [];
      const phases: string[] = [];

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        onPhase: (phase) => phases.push(phase),
        onVisibleLine: (line) => visibleLines.push(line),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "absence",
        target,
      });

      assert.deepEqual(phases, ["silence"]);
      assert.deepEqual(visibleLines, [null]);
      assert.equal(utterances.length, 0);
      timers.fireNext(MISSION_NARRATION_ABSENCE_SILENCE_MS);
      assert.equal(utterances.length, 1);
      assert.equal(utterances[0]?.text, narration.line);
      assert.equal(phases.includes("speaking"), true);
    },
  },
  {
    name: "mission narration holds Act 4 silent before live voice request",
    run: () => {
      const timers = createFakeTimers();
      const liveVoice = createLiveVoiceTransport();
      const narration = getMissionActNarration("absence");
      const phases: string[] = [];

      runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        liveVoiceTransport: liveVoice.transport,
        onPhase: (phase) => phases.push(phase),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "absence",
      });

      assert.deepEqual(phases, ["silence"]);
      assert.equal(liveVoice.requests.length, 0);
      timers.fireNext(MISSION_NARRATION_ABSENCE_SILENCE_MS);
      assert.deepEqual(liveVoice.requests, [narration.line]);
    },
  },
  {
    name: "mission narration cancel clears timers and stops speech",
    run: () => {
      const timers = createFakeTimers();
      const harness = createSpeechTarget();
      const narration = getMissionActNarration("public");
      const completed: string[] = [];
      const run = runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        onComplete: (reason) => completed.push(reason),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "public",
        target: harness.target,
      });

      run.cancel();
      assert.deepEqual(completed, ["cancelled"]);
      assert.equal(harness.cancelCount, 1);
      assert.equal(harness.utterances.length, 0);
      assert.equal(timers.timers.every((timer) => !timer.active), true);
    },
  },
  {
    name: "mission narration cancel clears live voice and timers",
    run: () => {
      const timers = createFakeTimers();
      const liveVoice = createLiveVoiceTransport();
      const narration = getMissionActNarration("chain");
      const completed: string[] = [];
      const run = runForemanMissionNarration({
        clearTimer: timers.clearTimer,
        line: narration.line,
        lineKey: narration.lineKey,
        liveVoiceTransport: liveVoice.transport,
        onComplete: (reason) => completed.push(reason),
        runId: "mission-run-1",
        setTimer: timers.setTimer,
        stageId: "chain",
      });

      timers.fireNext(0);
      assert.equal(liveVoice.requests.length, 1);
      run.cancel();

      assert.deepEqual(completed, ["cancelled"]);
      assert.equal(liveVoice.cancelCount, 1);
      assert.equal(timers.timers.every((timer) => !timer.active), true);
    },
  },
  {
    name: "B6 speech source avoids forbidden external capture and model behavior",
    run: async () => {
      const files = [
        "src/foremanGuide/missionNarration.ts",
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
