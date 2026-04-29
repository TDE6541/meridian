import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { ForemanAvatarBay } from "../src/components/ForemanAvatarBay.tsx";
import { JudgeTouchboard } from "../src/components/JudgeTouchboard.tsx";
import {
  JUDGE_REMAINING_HOLDS,
  JUDGE_TOUCHBOARD_CARDS,
  JUDGE_TOUCHBOARD_CONTROLS,
  getJudgeTouchboardCard,
  type JudgeQuestionId,
} from "../src/demo/judgeTouchboardDeck.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  buildMissionPhysicalProjection,
  type MissionPhysicalProjectionV1,
} from "../src/demo/missionPhysicalProjection.ts";
import type { MissionStageReadinessInput } from "../src/demo/missionStageReadiness.ts";
import { buildJudgeModeProjection } from "../src/demo/missionEvidenceNavigator.ts";
import { renderMarkup, runTests } from "./scenarioTestUtils.ts";

function collectButtons(node: React.ReactNode): React.ReactElement[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const children = React.Children.toArray(
    (node.props as { children?: React.ReactNode }).children
  );
  const nested = children.flatMap((child) => collectButtons(child));

  return node.type === "button" ? [node, ...nested] : nested;
}

function getElementText(element: React.ReactElement): string {
  return React.Children.toArray(
    (element.props as { children?: React.ReactNode }).children
  ).join("");
}

function readyInput(
  state: MissionPlaybackState
): Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId"> {
  return {
    activeStageId: state.currentStageId ?? "capture",
    foremanCue: {
      required: false,
      source: "d9.judge.touchboard",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d9.judge.touchboard.proof",
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
  };
}

function beginGuidedMission(): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState("guided");

  return missionPlaybackReducer(idle, {
    nowMs: 0,
    readiness: readyInput(idle),
    type: "begin_mission",
  });
}

function eventCount(state: MissionPlaybackState, type: string): number {
  return state.events.filter((event) => event.type === type).length;
}

function challengedProjection(questionId: JudgeQuestionId): MissionPhysicalProjectionV1 {
  const card = getJudgeTouchboardCard(questionId);
  const running = beginGuidedMission();
  const paused = missionPlaybackReducer(running, {
    nowMs: 10,
    type: "pause",
  });
  const projection = buildMissionPhysicalProjection({ playback_state: paused });
  const judgeProjection = buildJudgeModeProjection(projection, card);

  assert.ok(judgeProjection);

  return judgeProjection;
}

await runTests([
  {
    name: "JudgeTouchboard renders safe fallback state",
    run() {
      const markup = renderMarkup(<JudgeTouchboard />);

      assert.equal(markup.includes('data-judge-touchboard="true"'), true);
      assert.equal(markup.includes('data-judge-touchboard-interrupt="idle"'), true);
      assert.equal(markup.includes('data-judge-answer-card="safe-fallback"'), true);
      assert.equal(markup.includes("No judge challenge selected"), true);
      assert.equal(markup.includes("<input"), false);
      assert.equal(markup.includes("<textarea"), false);
    },
  },
  {
    name: "all required physical controls render as semantic buttons",
    run() {
      const element = JudgeTouchboard({});
      const markup = renderMarkup(element);
      const buttons = collectButtons(element);
      const labels = buttons.map(getElementText);

      for (const control of JUDGE_TOUCHBOARD_CONTROLS) {
        assert.equal(markup.includes(`data-judge-control="${control.control_id}"`), true);
        assert.equal(labels.includes(control.label), true, control.label);
      }

      assert.equal((markup.match(/type="button"/g) ?? []).length, 9);
      assert.equal(markup.includes("Challenge Foreman"), true);
      assert.equal(markup.includes("Show Authority"), true);
      assert.equal(markup.includes("What Is Missing?"), true);
      assert.equal(markup.includes("Show Audit Trail"), true);
      assert.equal(markup.includes("Show Public View"), true);
      assert.equal(markup.includes("What Is Still HOLD?"), true);
      assert.equal(markup.includes("Is This Production?"), true);
      assert.equal(markup.includes("Reset For Next Judge"), true);
    },
  },
  {
    name: "judge controls are keyboard accessible buttons with labels",
    run() {
      const buttons = collectButtons(JudgeTouchboard({}));

      for (const button of buttons) {
        assert.equal(button.type, "button");
        assert.equal(button.props.type, "button");
        assert.equal(typeof button.props["aria-label"], "string");
        assert.equal(button.props.tabIndex, undefined);
      }
    },
  },
  {
    name: "selecting a judge control requests the deterministic card",
    run() {
      const selected: JudgeQuestionId[] = [];
      const element = JudgeTouchboard({
        onSelectQuestion: (id) => selected.push(id),
      });
      const authorityButton = collectButtons(element).find(
        (button) => getElementText(button) === "Show Authority"
      );

      assert.ok(authorityButton);
      authorityButton.props.onClick();
      assert.deepEqual(selected, ["authority_missing"]);
    },
  },
  {
    name: "selected judge card displays safe claim non-claims refs and recovery line",
    run() {
      const card = getJudgeTouchboardCard("production_system");
      const markup = renderMarkup(
        <JudgeTouchboard card={card} interruptStatus="paused" />
      );

      assert.ok(card);
      assert.equal(markup.includes(`data-judge-answer-card="${card.question_id}"`), true);
      assert.equal(markup.includes('data-judge-safe-claim="true"'), true);
      assert.equal(markup.includes(card.safe_claim), true);
      assert.equal(markup.includes('data-judge-recovery-line="true"'), true);
      assert.equal(markup.includes(card.recovery_line), true);
      for (const claim of card.not_claimed) {
        assert.equal(markup.includes(`data-judge-non-claim="${claim}"`), true, claim);
      }
      for (const ref of card.evidence_refs) {
        assert.equal(markup.includes(`data-judge-evidence-ref="${ref}"`), true, ref);
      }
    },
  },
  {
    name: "each judge card has safe claim non-claims evidence refs and recovery line",
    run() {
      assert.equal(JUDGE_TOUCHBOARD_CARDS.length >= 10, true);

      for (const card of JUDGE_TOUCHBOARD_CARDS) {
        assert.equal(card.safe_claim.length > 0, true, card.question_id);
        assert.equal(card.not_claimed.length > 0, true, card.question_id);
        assert.equal(card.evidence_refs.length > 0, true, card.question_id);
        assert.equal(card.proof_surface_targets.length > 0, true, card.question_id);
        assert.equal(card.recovery_line.length > 0, true, card.question_id);
      }
    },
  },
  {
    name: "production card explicitly says not production city system",
    run() {
      const card = getJudgeTouchboardCard("production_system");
      const markup = renderMarkup(<JudgeTouchboard card={card} />);

      assert.ok(card);
      assert.equal(card.safe_claim.includes("not a production city system"), true);
      assert.equal(card.not_claimed.includes("production city system"), true);
      assert.equal(markup.includes("not a production city system"), true);
    },
  },
  {
    name: "Foreman boundary card explicitly says no model/API-backed Foreman",
    run() {
      const card = getJudgeTouchboardCard("foreman_llm_boundary");
      const markup = renderMarkup(<JudgeTouchboard card={card} />);

      assert.ok(card);
      assert.equal(card.not_claimed.includes("model/API-backed Foreman"), true);
      assert.equal(markup.includes("model/API-backed Foreman"), true);
      assert.equal(markup.includes("live model Q&amp;A"), true);
    },
  },
  {
    name: "authority card preserves OpenFGA CIBA phone and notification non-claims",
    run() {
      const card = getJudgeTouchboardCard("authority_missing");
      const markup = renderMarkup(<JudgeTouchboard card={card} />);

      assert.ok(card);
      for (const text of [
        "live OpenFGA approval",
        "CIBA approval",
        "live phone approval",
        "delivered notification behavior",
      ]) {
        assert.equal(card.not_claimed.includes(text), true, text);
        assert.equal(markup.includes(text), true, text);
      }
    },
  },
  {
    name: "failure fallback card says delivered notifications are unshipped",
    run() {
      const card = getJudgeTouchboardCard("auth_second_device_failure");
      const markup = renderMarkup(<JudgeTouchboard card={card} />);

      assert.ok(card);
      assert.equal(markup.includes("delivered notifications"), true);
      assert.equal(
        card.safe_claim.includes("delivered-notification proof remains"),
        true
      );
    },
  },
  {
    name: "still-HOLD card carries manual proof gaps",
    run() {
      const card = getJudgeTouchboardCard("remaining_holds");
      const markup = renderMarkup(<JudgeTouchboard card={card} />);

      assert.ok(card);
      for (const hold of JUDGE_REMAINING_HOLDS) {
        assert.equal(card.not_claimed.includes(hold), true, hold);
        assert.equal(markup.includes(hold), true, hold);
      }
    },
  },
  {
    name: "mission interrupt pause resume and reset preserve stage mode and cue status",
    run() {
      const running = beginGuidedMission();
      const paused = missionPlaybackReducer(running, {
        nowMs: 10,
        type: "pause",
      });
      const resumed = missionPlaybackReducer(paused, {
        nowMs: 20,
        type: "resume",
      });
      const reset = missionPlaybackReducer(resumed, {
        cleanupOk: true,
        nowMs: 30,
        type: "reset_mission",
      });

      assert.equal(paused.status, "paused");
      assert.equal(paused.currentStageId, running.currentStageId);
      assert.equal(paused.mode, running.mode);
      assert.equal(resumed.currentStageId, running.currentStageId);
      assert.equal(resumed.mode, running.mode);
      assert.equal(eventCount(resumed, "stage_enter"), 1);
      assert.equal(eventCount(resumed, "mission_resume"), 1);
      assert.equal(reset.status, "idle");
      assert.equal(reset.currentStageId, null);
    },
  },
  {
    name: "Foreman Avatar Bay shows challenged Judge posture when card selected",
    run() {
      const card = getJudgeTouchboardCard("foreman_llm_boundary");
      const projection = challengedProjection("foreman_llm_boundary");
      const markup = renderMarkup(
        <ForemanAvatarBay judgeChallenge={card} projection={projection} />
      );

      assert.ok(card);
      assert.equal(markup.includes('data-foreman-avatar-state="challenged"'), true);
      assert.equal(markup.includes('data-foreman-avatar-card="judge-mode"'), true);
      assert.equal(markup.includes("Judge Mode"), true);
      assert.equal(markup.includes("preauthored cards"), true);
    },
  },
  {
    name: "D9 touchboard source has no external model key package or input behavior",
    async run() {
      const source = await readFile("src/components/JudgeTouchboard.tsx", "utf8");
      const deck = await readFile("src/demo/judgeTouchboardDeck.ts", "utf8");
      const combined = `${source}\n${deck}`;

      for (const forbidden of [
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "process.env",
        "import.meta.env",
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        "<input",
        "<textarea",
        ["step", "skins", "renders"].join("."),
        "appendForensicChain",
        "writeForensicChain",
      ]) {
        assert.equal(combined.includes(forbidden), false, forbidden);
      }
    },
  },
]);
