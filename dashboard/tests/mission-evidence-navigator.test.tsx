import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { MissionEvidenceNavigator } from "../src/components/MissionEvidenceNavigator.tsx";
import {
  getJudgeTouchboardCard,
  type JudgeQuestionId,
} from "../src/demo/judgeTouchboardDeck.ts";
import {
  buildJudgeModeProjection,
  buildMissionEvidenceNavigatorView,
  MISSION_EVIDENCE_SURFACES,
} from "../src/demo/missionEvidenceNavigator.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import { buildMissionPhysicalProjection } from "../src/demo/missionPhysicalProjection.ts";
import type { MissionStageReadinessInput } from "../src/demo/missionStageReadiness.ts";
import { renderMarkup, runTests } from "./scenarioTestUtils.ts";

function readyInput(
  state: MissionPlaybackState
): Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId"> {
  return {
    activeStageId: state.currentStageId ?? "capture",
    foremanCue: {
      required: false,
      source: "d9.evidence.navigator",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d9.evidence.navigator.proof",
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

function runningProjection() {
  const idle = createInitialMissionPlaybackState("guided");
  const running = missionPlaybackReducer(idle, {
    nowMs: 0,
    readiness: readyInput(idle),
    type: "begin_mission",
  });

  return buildMissionPhysicalProjection({ playback_state: running });
}

await runTests([
  {
    name: "MissionEvidenceNavigator renders safe fallback state",
    run() {
      const view = buildMissionEvidenceNavigatorView(null);
      const markup = renderMarkup(<MissionEvidenceNavigator />);

      assert.equal(view.selected, false);
      assert.equal(view.dom_poking, false);
      assert.equal(view.imperative_clicks, false);
      assert.equal(view.mutation, false);
      assert.equal(markup.includes('data-mission-evidence-navigator="true"'), true);
      assert.equal(markup.includes('data-mission-evidence-navigator-selected="false"'), true);
      assert.equal(markup.includes('data-dom-poking="false"'), true);
      assert.equal(markup.includes('data-imperative-clicks="false"'), true);
      assert.equal(markup.includes('data-proof-mutation="false"'), true);
      assert.equal(markup.includes("No proof target selected"), true);
    },
  },
  {
    name: "Evidence Navigator renders selected proof targets",
    run() {
      const card = getJudgeTouchboardCard("authority_missing");
      const view = buildMissionEvidenceNavigatorView(card);
      const markup = renderMarkup(<MissionEvidenceNavigator card={card} />);

      assert.ok(card);
      assert.equal(view.selected, true);
      assert.equal(view.targets.length, card.proof_surface_targets.length);
      assert.equal(markup.includes('data-mission-evidence-navigator-selected="true"'), true);
      assert.equal(markup.includes('data-evidence-navigator-target="authority_handoff"'), true);
      assert.equal(markup.includes('data-evidence-navigator-target="garp_authority_panel"'), true);
      assert.equal(markup.includes("Authority Handoff Theater"), true);
      assert.equal(markup.includes("GARP authority panel"), true);
      for (const target of card.proof_surface_targets) {
        assert.equal(markup.includes(target.label), true, target.label);
        assert.equal(markup.includes(target.source_ref), true, target.source_ref);
      }
    },
  },
  {
    name: "Evidence Navigator maps all allowed target kinds to known proof surfaces",
    run() {
      const expectedKinds = [
        "foreman_avatar",
        "proof_spotlight",
        "absence_shadow_map",
        "authority_handoff",
        "hold_wall",
        "absence_lens",
        "audit_wall",
        "disclosure_preview",
        "garp_authority_panel",
        "mission_rail",
        "current_focal_card",
        "proof_tools",
        "public_boundary",
        "run_boundary",
      ] as const;

      assert.deepEqual(Object.keys(MISSION_EVIDENCE_SURFACES).sort(), [...expectedKinds].sort());
    },
  },
  {
    name: "Evidence Navigator preserves Proof Tools grouping",
    run() {
      const card = getJudgeTouchboardCard("foreman_llm_boundary");
      const markup = renderMarkup(<MissionEvidenceNavigator card={card} />);
      const view = buildMissionEvidenceNavigatorView(card);

      assert.ok(card);
      assert.equal(view.targets.some((target) => target.kind === "proof_tools"), true);
      assert.equal(markup.includes('data-proof-tools-grouping="preserve_collapsed"'), true);
      assert.equal(markup.includes("Proof Tools stay grouped"), true);
    },
  },
  {
    name: "buildJudgeModeProjection puts Foreman into challenged Judge state",
    run() {
      const card = getJudgeTouchboardCard("production_system");
      const base = runningProjection();
      const projected = buildJudgeModeProjection(base, card);

      assert.ok(card);
      assert.ok(projected);
      assert.equal(projected.foreman.embodied_state, "challenged");
      assert.equal(projected.foreman.paused, true);
      assert.equal(projected.foreman.current_line.includes(card.safe_claim), true);
      assert.equal(projected.judge_touchboard.active, true);
      assert.equal(projected.judge_touchboard.selected_question_id, card.question_id);
      assert.equal(projected.mode, base.mode);
      assert.equal(projected.active_stage_id, base.active_stage_id);
    },
  },
  {
    name: "navigator cards route every required question to proof targets",
    run() {
      const ids: JudgeQuestionId[] = [
        "production_system",
        "authority_missing",
        "audit_trail",
        "humans_missed",
        "public_view",
        "auth_second_device_failure",
        "foreman_llm_boundary",
        "remaining_holds",
        "autonomous_safe",
        "production_requirements",
      ];

      for (const id of ids) {
        const card = getJudgeTouchboardCard(id);
        const view = buildMissionEvidenceNavigatorView(card);

        assert.ok(card);
        assert.equal(view.selected, true, id);
        assert.equal(view.targets.length > 0, true, id);
        assert.equal(
          view.targets.every(
            (target) => target.source_ref.length > 0 && target.fallback_text.length > 0
          ),
          true,
          id
        );
      }
    },
  },
  {
    name: "Evidence Navigator source does not DOM-poke click scroll or mutate proof state",
    async run() {
      const source = (
        await Promise.all(
          [
            "src/components/MissionEvidenceNavigator.tsx",
            "src/demo/missionEvidenceNavigator.ts",
          ].map((file) => readFile(file, "utf8"))
        )
      ).join("\n");

      for (const forbidden of [
        "document.",
        "querySelector",
        "getElementById",
        ".click()",
        "dispatchEvent",
        "scrollIntoView",
        "useEffect",
        "createRef",
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
        ["step", "skins", "renders"].join("."),
        ["src", "skins"].join("/"),
        ["src", "skins"].join("\\"),
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
      ]) {
        assert.equal(source.includes(forbidden), false, forbidden);
      }
    },
  },
]);
