import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { ForemanAvatarBay } from "../src/components/ForemanAvatarBay.tsx";
import { getJudgeTouchboardCard } from "../src/demo/judgeTouchboardDeck.ts";
import {
  runForemanAutonomousConductor,
  type ForemanConductorReadinessInput,
} from "../src/demo/foremanAutonomousConductor.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  buildMissionPhysicalProjection,
  type MissionPhysicalProjectionV1,
} from "../src/demo/missionPhysicalProjection.ts";
import { buildJudgeModeProjection } from "../src/demo/missionEvidenceNavigator.ts";
import type { MissionStageReadinessInput } from "../src/demo/missionStageReadiness.ts";
import { renderMarkup, runTests } from "./scenarioTestUtils.ts";

const D5_SOURCE_FILES = [
  "src/components/ForemanAvatarBay.tsx",
  "src/foremanGuide/foremanEmbodiedState.ts",
  "src/components/MissionPresentationShell.tsx",
  "src/components/ControlRoomShell.tsx",
] as const;

function readyInput(
  state: MissionPlaybackState,
  overrides: Partial<
    Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId">
  > = {}
): Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId"> {
  return {
    activeStageId: state.currentStageId,
    foremanCue: {
      required: false,
      source: "d5.foreman.avatar",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d5.proof.avatar",
      status: "ready",
    },
    requiredHolds: [],
    resetCleanupOk: true,
    scenarioAvailable: true,
    substrate: {
      absence_lens: true,
      authority_panel: true,
      capture_snapshot: true,
      forensic_chain: true,
      governance_panel: true,
      public_disclosure: true,
    },
    ...overrides,
  };
}

function conductorReadyInput(
  overrides: Partial<ForemanConductorReadinessInput> = {}
): ForemanConductorReadinessInput {
  return {
    modeConsistent: true,
    presenterCockpitReady: true,
    requiredHolds: [],
    resetCleanupOk: true,
    scenarioAvailable: true,
    substrate: {
      absence_lens: true,
      authority_panel: true,
      capture_snapshot: true,
      forensic_chain: true,
      governance_panel: true,
      public_disclosure: true,
    },
    ...overrides,
  };
}

function guidedCaptureProjection(): MissionPhysicalProjectionV1 {
  const idle = createInitialMissionPlaybackState("guided");
  const running = missionPlaybackReducer(idle, {
    nowMs: 0,
    readiness: readyInput({ ...idle, currentStageId: "capture" }),
    type: "begin_mission",
  });

  return buildMissionPhysicalProjection({ playback_state: running });
}

function autonomousCaptureProjection(): MissionPhysicalProjectionV1 {
  const output = runForemanAutonomousConductor({
    nowMs: 0,
    playbackState: createInitialMissionPlaybackState("foreman_autonomous"),
    readiness: conductorReadyInput(),
  });

  return buildMissionPhysicalProjection({
    conductor_output: output,
    playback_state: output.controllerState,
  });
}

async function readD5Source(): Promise<string> {
  return (await Promise.all(D5_SOURCE_FILES.map((file) => readFile(file, "utf8")))).join(
    "\n"
  );
}

await runTests([
  {
    name: "ForemanAvatarBay renders safe fallback projection",
    run() {
      const markup = renderMarkup(<ForemanAvatarBay />);

      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes('data-foreman-avatar-state="ready"'), true);
      assert.equal(markup.includes("Guided Mission"), true);
      assert.equal(markup.includes("No active mission"), true);
      assert.equal(markup.includes("Mission physical projection is ready."), true);
    },
  },
  {
    name: "Avatar Bay renders D4 projection state mode stage guide and embodied label",
    run() {
      const projection = guidedCaptureProjection();
      const markup = renderMarkup(<ForemanAvatarBay projection={projection} />);

      assert.equal(markup.includes('data-foreman-avatar-state="conducting"'), true);
      assert.equal(markup.includes("Guided Mission"), true);
      assert.equal(markup.includes("Capture (capture)"), true);
      assert.equal(markup.includes("Walk"), true);
      assert.equal(markup.includes("Conducting"), true);
      assert.equal(markup.includes(projection.foreman.current_line), true);
    },
  },
  {
    name: "Avatar Bay shows typed fallback when voice is unavailable blocked or not started",
    run() {
      const base = guidedCaptureProjection();
      const unavailable = renderMarkup(
        <ForemanAvatarBay
          projection={{
            ...base,
            foreman: { ...base.foreman, voice_status: "unavailable" },
          }}
        />
      );
      const blocked = renderMarkup(
        <ForemanAvatarBay
          projection={{
            ...base,
            foreman: { ...base.foreman, voice_status: "blocked" },
          }}
        />
      );
      const notStarted = renderMarkup(<ForemanAvatarBay projection={base} />);

      assert.equal(unavailable.includes("Typed fallback"), true);
      assert.equal(blocked.includes("Blocked"), true);
      assert.equal(notStarted.includes("Not started"), true);
      assert.equal(unavailable.includes("Typed fallback visible"), true);
      assert.equal(blocked.includes("Typed fallback visible"), true);
      assert.equal(notStarted.includes("Typed fallback visible"), true);
    },
  },
  {
    name: "Avatar Bay shows Foreman is conducting in autonomous mode",
    run() {
      const markup = renderMarkup(
        <ForemanAvatarBay projection={autonomousCaptureProjection()} />
      );

      assert.equal(markup.includes("Foreman Autonomous"), true);
      assert.equal(markup.includes("Foreman is conducting"), true);
    },
  },
  {
    name: "Avatar Bay shows Operator-guided in guided mode",
    run() {
      const markup = renderMarkup(<ForemanAvatarBay projection={guidedCaptureProjection()} />);

      assert.equal(markup.includes("Operator-guided"), true);
    },
  },
  {
    name: "Ask Foreman opens deterministic current-state card",
    run() {
      const projection = guidedCaptureProjection();
      const markup = renderMarkup(
        <ForemanAvatarBay initialCard="ask" projection={projection} />
      );

      assert.equal(markup.includes('data-foreman-avatar-card="ask"'), true);
      assert.equal(markup.includes("Ask Foreman"), true);
      assert.equal(markup.includes(projection.foreman.current_line), true);
      assert.equal(
        markup.includes(
          "Foreman conducts the scripted proof sequence. It does not create governance truth."
        ),
        true
      );
    },
  },
  {
    name: "Challenge Foreman opens deterministic boundary and non-claim card",
    run() {
      const markup = renderMarkup(
        <ForemanAvatarBay initialCard="challenge" projection={guidedCaptureProjection()} />
      );

      assert.equal(markup.includes('data-foreman-avatar-card="challenge"'), true);
      assert.equal(markup.includes("Boundary challenge is deterministic"), true);
      assert.equal(markup.includes("does not create governance truth"), true);
      assert.equal(markup.includes("authority truth"), true);
      assert.equal(markup.includes("absence truth"), true);
      assert.equal(markup.includes("legal audit records"), true);
      assert.equal(markup.includes("not model/API-backed"), true);
    },
  },
  {
    name: "Show Proof opens deterministic proof-target summary",
    run() {
      const markup = renderMarkup(
        <ForemanAvatarBay initialCard="proof" projection={guidedCaptureProjection()} />
      );

      assert.equal(markup.includes('data-foreman-avatar-card="proof"'), true);
      assert.equal(markup.includes("Permit #4471 source card"), true);
      assert.equal(markup.includes("dashboard/src/demo/fictionalPermitAnchor.ts"), true);
      assert.equal(markup.includes("Proof Tools remain grouped"), true);
    },
  },
  {
    name: "Avatar Bay shows Judge Mode challenged card from selected judge question",
    run() {
      const card = getJudgeTouchboardCard("autonomous_safe");
      const projection = buildJudgeModeProjection(guidedCaptureProjection(), card);
      const markup = renderMarkup(
        <ForemanAvatarBay judgeChallenge={card} projection={projection} />
      );

      assert.ok(card);
      assert.equal(markup.includes('data-foreman-avatar-state="challenged"'), true);
      assert.equal(markup.includes('data-foreman-avatar-card="judge-mode"'), true);
      assert.equal(markup.includes('data-foreman-judge-question="autonomous_safe"'), true);
      assert.equal(markup.includes("Judge Mode"), true);
      assert.equal(markup.includes(card.safe_claim), true);
    },
  },
  {
    name: "Avatar Bay controls are buttons keyboard accessible and no open text input exists",
    run() {
      const markup = renderMarkup(<ForemanAvatarBay projection={guidedCaptureProjection()} />);

      assert.equal((markup.match(/data-foreman-avatar-control=/g) ?? []).length, 3);
      assert.equal((markup.match(/type="button"/g) ?? []).length, 3);
      assert.equal((markup.match(/aria-expanded="false"/g) ?? []).length, 3);
      assert.equal(markup.includes('aria-controls="foreman-avatar-card"'), true);
      assert.equal(markup.includes("<input"), false);
      assert.equal(markup.includes("<textarea"), false);
    },
  },
  {
    name: "Avatar graphic is inline SVG with no external avatar or image dependency",
    async run() {
      const markup = renderMarkup(<ForemanAvatarBay projection={guidedCaptureProjection()} />);
      const source = await readFile("src/components/ForemanAvatarBay.tsx", "utf8");

      assert.equal(markup.includes("<svg"), true);
      assert.equal(markup.includes("<img"), false);
      assert.equal(source.includes("<img"), false);
      assert.equal(source.includes("http://"), false);
      assert.equal(source.includes("https://"), false);
      assert.equal(source.includes("url("), false);
    },
  },
  {
    name: "reduced-motion copy and state remain visible without animation",
    async run() {
      const markup = renderMarkup(<ForemanAvatarBay projection={guidedCaptureProjection()} />);
      const source = await readFile("src/components/ForemanAvatarBay.tsx", "utf8");

      assert.equal(markup.includes("Reduced motion safe"), true);
      assert.equal(markup.includes("Conducting"), true);
      assert.equal(source.includes("animate"), false);
    },
  },
  {
    name: "Avatar Bay source has no model network key voice upload or package behavior",
    async run() {
      const source = await readD5Source();
      const forbidden = [
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "process.env",
        "import.meta.env",
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        "MediaRecorder",
        "getUserMedia",
        "Whisper",
        "package.json",
        "vite.config",
        "vercel",
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "Avatar Bay source has no stale skin render field and keeps outputs canonical",
    async run() {
      const source = await readD5Source();
      const adapter = await readFile("src/adapters/skinPayloadAdapter.ts", "utf8");

      assert.equal(source.includes(["step", "skins", "renders"].join(".")), false);
      assert.equal(adapter.includes(["step", "skins", "outputs"].join(".")), true);
      assert.equal(adapter.includes(["step", "skins", "renders"].join(".")), false);
    },
  },
  {
    name: "Avatar Bay source does not import root skins or write root forensic chain",
    async run() {
      const source = await readD5Source();
      const forbidden = [
        ["src", "skins"].join("/"),
        ["src", "skins"].join("\\"),
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "Avatar Bay preserves explicit demo non-claims",
    run() {
      const markup = renderMarkup(
        <ForemanAvatarBay initialCard="challenge" projection={guidedCaptureProjection()} />
      );

      for (const text of [
        "does not claim production",
        "live-city",
        "official workflow",
        "public portal",
        "delivered notification",
        "CIBA",
        "OpenFGA",
      ]) {
        assert.equal(markup.includes(text), true, text);
      }
    },
  },
]);
