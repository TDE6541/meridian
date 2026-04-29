import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  runForemanAutonomousConductor,
  type ForemanConductorReadinessInput,
} from "../src/demo/foremanAutonomousConductor.ts";
import {
  ABSENCE_SHADOW_SLOTS,
} from "../src/demo/absenceShadowSlots.ts";
import {
  AUTHORITY_HANDOFF_BEATS,
} from "../src/demo/authorityHandoffBeats.ts";
import { CIVIC_TWIN_DIORAMA } from "../src/demo/civicTwinDiorama.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  getForemanModeForMissionStage,
  MISSION_STAGE_IDS,
  type MissionStageId,
} from "../src/demo/missionPlaybackPlan.ts";
import type { MissionStageReadinessInput } from "../src/demo/missionStageReadiness.ts";
import {
  buildMissionPhysicalProjection,
  mapMissionForemanEmbodiedState,
  MISSION_PHYSICAL_PROJECTION_VERSION,
  type MissionForemanEmbodiedState,
} from "../src/demo/missionPhysicalProjection.ts";
import {
  getProofSpotlightStageCoverage,
  PROOF_SPOTLIGHT_TARGETS,
} from "../src/demo/proofSpotlightTargets.ts";
import { runTests } from "./scenarioTestUtils.ts";

const D4_SOURCE_FILES = [
  "src/demo/missionPhysicalProjection.ts",
  "src/demo/proofSpotlightTargets.ts",
  "src/demo/absenceShadowSlots.ts",
  "src/demo/authorityHandoffBeats.ts",
  "src/demo/civicTwinDiorama.ts",
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
      required: true,
      source: "d4.foreman.cue",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d4.proof.cue",
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

function beginGuidedCapture(): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState("guided");

  return missionPlaybackReducer(idle, {
    nowMs: 0,
    readiness: readyInput({ ...idle, currentStageId: "capture" }),
    type: "begin_mission",
  });
}

function runningStage(
  stageId: MissionStageId,
  mode: MissionPlaybackState["mode"] = "guided"
): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState(mode);

  return {
    ...idle,
    activeForemanMode: getForemanModeForMissionStage(stageId),
    currentStageId: stageId,
    stageEnteredAtMs: 0,
    startedAtMs: 0,
    status: "running",
  };
}

async function readD4Source(): Promise<string> {
  return (await Promise.all(D4_SOURCE_FILES.map((file) => readFile(file, "utf8")))).join(
    "\n"
  );
}

await runTests([
  {
    name: "physical projection exposes the D4 contract version",
    run() {
      const projection = buildMissionPhysicalProjection({
        playback_state: createInitialMissionPlaybackState("guided"),
      });

      assert.equal(projection.version, MISSION_PHYSICAL_PROJECTION_VERSION);
      assert.equal(projection.version, "meridian.v2d.missionPhysicalProjection.v1");
      assert.equal(projection.physical_mode, "projection_only");
    },
  },
  {
    name: "projection builds from idle lobby playback state",
    run() {
      const idle = createInitialMissionPlaybackState("guided");
      const projection = buildMissionPhysicalProjection({
        playback_state: idle,
      });

      assert.equal(projection.run_id, idle.runId);
      assert.equal(projection.mode, "guided");
      assert.equal(projection.active_stage_id, null);
      assert.equal(projection.playback_status, "idle");
      assert.equal(projection.foreman.embodied_state, "ready");
      assert.equal(projection.foreman.attention_target_id, "proof-target-capture-source-card");
      assert.equal(projection.motion.reduced_motion_safe, true);
    },
  },
  {
    name: "projection builds from Guided running capture stage",
    run() {
      const running = beginGuidedCapture();
      const projection = buildMissionPhysicalProjection({
        playback_state: running,
      });

      assert.equal(projection.mode, "guided");
      assert.equal(projection.active_stage_id, "capture");
      assert.equal(projection.foreman.embodied_state, "conducting");
      assert.equal(projection.foreman.mode, "walk");
      assert.equal(projection.spotlight.active_targets[0]?.stage_id, "capture");
    },
  },
  {
    name: "projection builds from Foreman Autonomous running capture stage",
    run() {
      const output = runForemanAutonomousConductor({
        nowMs: 0,
        playbackState: createInitialMissionPlaybackState("foreman_autonomous"),
        readiness: conductorReadyInput(),
      });
      const projection = buildMissionPhysicalProjection({
        conductor_output: output,
        playback_state: output.controllerState,
      });

      assert.equal(projection.mode, "foreman_autonomous");
      assert.equal(projection.active_stage_id, "capture");
      assert.equal(projection.foreman.current_line, output.cueEvent?.line);
      assert.equal(projection.foreman.voice_status, output.cueEvent?.voiceStatus);
      assert.equal(projection.foreman.embodied_state, "conducting");
    },
  },
  {
    name: "projection maps each mission stage to a Foreman embodied state",
    run() {
      const expected: Record<MissionStageId, MissionForemanEmbodiedState> = {
        absence: "explaining",
        authority: "authority_wait",
        capture: "conducting",
        chain: "proofing",
        governance: "proofing",
        public: "public_boundary",
      };

      for (const stageId of MISSION_STAGE_IDS) {
        assert.equal(
          mapMissionForemanEmbodiedState(runningStage(stageId)),
          expected[stageId],
          stageId
        );
      }
    },
  },
  {
    name: "holding paused completed and reset statuses map without avatar behavior",
    run() {
      const capture = runningStage("capture");
      const paused: MissionPlaybackState = { ...capture, status: "paused" };
      const held = missionPlaybackReducer(capture, {
        nowMs: 10,
        reason: "d4_test_hold",
        type: "hold",
      });
      const completed: MissionPlaybackState = {
        ...capture,
        completedStageIds: MISSION_STAGE_IDS,
        currentStageId: null,
        status: "completed",
      };
      const resetting: MissionPlaybackState = { ...capture, status: "resetting" };

      assert.equal(buildMissionPhysicalProjection({ playback_state: paused }).foreman.paused, true);
      assert.equal(mapMissionForemanEmbodiedState(paused), "conducting");
      assert.equal(mapMissionForemanEmbodiedState(held), "holding");
      assert.equal(mapMissionForemanEmbodiedState(completed), "complete");
      assert.equal(mapMissionForemanEmbodiedState(resetting), "resetting");
    },
  },
  {
    name: "each mission stage has at least one proof spotlight target",
    run() {
      const coverage = getProofSpotlightStageCoverage();

      for (const stageId of MISSION_STAGE_IDS) {
        assert.equal(coverage[stageId] > 0, true, stageId);
      }
    },
  },
  {
    name: "proof spotlight target ids are unique",
    run() {
      const targetIds = PROOF_SPOTLIGHT_TARGETS.map((target) => target.target_id);

      assert.equal(new Set(targetIds).size, targetIds.length);
    },
  },
  {
    name: "proof spotlight targets include required fallback text",
    run() {
      for (const target of PROOF_SPOTLIGHT_TARGETS) {
        assert.equal(target.fallback_text.trim().length > 0, true, target.target_id);
        assert.equal(target.source_ref.trim().length > 0, true, target.target_id);
      }
    },
  },
  {
    name: "absence shadow slots include all six required stage slots",
    run() {
      const labels = new Set(ABSENCE_SHADOW_SLOTS.map((slot) => slot.expected_label));

      assert.equal(labels.has("Source evidence for Permit #4471"), true);
      assert.equal(labels.has("Valid role session or local authority proof"), true);
      assert.equal(labels.has("Governed refusal or HOLD rationale"), true);
      assert.equal(labels.has("Explicit missing-evidence explanation"), true);
      assert.equal(labels.has("Receipt or audit event reference"), true);
      assert.equal(labels.has("Disclosure boundary and redaction posture"), true);

      for (const stageId of MISSION_STAGE_IDS) {
        assert.equal(
          ABSENCE_SHADOW_SLOTS.some((slot) => slot.stage_id === stageId),
          true,
          stageId
        );
      }
    },
  },
  {
    name: "absence shadow slots do not resolve carried manual proof gaps",
    run() {
      const manualProofSlots = ABSENCE_SHADOW_SLOTS.filter(
        (slot) => slot.expected_kind === "manual_proof"
      );

      assert.equal(manualProofSlots.length > 0, true);
      for (const slot of manualProofSlots) {
        assert.equal(slot.presence_status, "carried_hold", slot.slot_id);
        assert.equal(slot.source_ref, null, slot.slot_id);
        assert.equal(typeof slot.hold_ref, "string", slot.slot_id);
      }
    },
  },
  {
    name: "authority handoff beats exist for authority governance and public stages",
    run() {
      assert.deepEqual(
        AUTHORITY_HANDOFF_BEATS.map((beat) => beat.stage_id),
        ["authority", "governance", "public"]
      );
    },
  },
  {
    name: "authority handoff beats include non-claims",
    run() {
      for (const beat of AUTHORITY_HANDOFF_BEATS) {
        assert.equal(beat.non_claims.includes("no_live_phone_claim"), true);
        assert.equal(beat.non_claims.includes("no_openfga_claim"), true);
        assert.equal(beat.non_claims.includes("no_ciba_claim"), true);
        assert.equal(beat.non_claims.includes("no_production_auth_claim"), true);
        assert.equal(beat.non_claims.includes("no_delivered_notification_claim"), true);
      }
    },
  },
  {
    name: "civic twin diorama uses Permit #4471 and demo or snapshot source labels",
    run() {
      assert.equal(CIVIC_TWIN_DIORAMA.permit_id, "Permit #4471");
      assert.equal(CIVIC_TWIN_DIORAMA.source_label, "committed_demo_scenario");
      assert.equal(
        CIVIC_TWIN_DIORAMA.nodes.some((node) => node.label === "Permit #4471"),
        true
      );
      for (const node of CIVIC_TWIN_DIORAMA.nodes) {
        assert.equal(
          node.source_label === "committed_demo_scenario" ||
            node.source_label === "snapshot_payload",
          true,
          node.node_id
        );
      }
    },
  },
  {
    name: "civic twin diorama includes public and restricted visibility",
    run() {
      const nodeVisibility = new Set(CIVIC_TWIN_DIORAMA.nodes.map((node) => node.visibility));
      const edgeVisibility = new Set(CIVIC_TWIN_DIORAMA.edges.map((edge) => edge.visibility));

      assert.equal(nodeVisibility.has("public"), true);
      assert.equal(nodeVisibility.has("restricted"), true);
      assert.equal(edgeVisibility.has("public"), true);
      assert.equal(edgeVisibility.has("restricted"), true);
    },
  },
  {
    name: "receipt ribbon summary defaults to null and zero",
    run() {
      const projection = buildMissionPhysicalProjection({
        playback_state: beginGuidedCapture(),
      });

      assert.equal(projection.receipt_ribbon.latest_ticket_id, null);
      assert.equal(projection.receipt_ribbon.ticket_count, 0);
    },
  },
  {
    name: "judge touchboard summary defaults inactive and unselected",
    run() {
      const projection = buildMissionPhysicalProjection({
        playback_state: beginGuidedCapture(),
      });

      assert.equal(projection.judge_touchboard.active, false);
      assert.equal(projection.judge_touchboard.selected_question_id, null);
    },
  },
  {
    name: "boundary flags preserve D4 non-claims",
    run() {
      const projection = buildMissionPhysicalProjection({
        playback_state: beginGuidedCapture(),
      });

      assert.equal(projection.boundary.demo_only, true);
      assert.equal(projection.boundary.dashboard_local_only, true);
      assert.equal(projection.boundary.no_production_city_claim, true);
      assert.equal(projection.boundary.no_legal_sufficiency_claim, true);
      assert.equal(projection.boundary.no_live_fort_worth_claim, true);
      assert.equal(projection.boundary.no_official_workflow_claim, true);
      assert.equal(projection.boundary.no_openfga_claim, true);
      assert.equal(projection.boundary.no_ciba_claim, true);
      assert.equal(projection.boundary.no_delivered_notification_claim, true);
      assert.equal(projection.boundary.no_model_api_foreman_claim, true);
      assert.equal(projection.boundary.no_root_forensic_chain_write_claim, true);
    },
  },
  {
    name: "projection keeps manual proof HOLDs visible",
    run() {
      const projection = buildMissionPhysicalProjection({
        playback_state: beginGuidedCapture(),
      });

      assert.equal(
        projection.holds.some((hold) => hold.hold_id === "absence-slot-authority-manual-proof"),
        true
      );
      assert.equal(
        projection.holds.every((hold) => hold.status !== "carried_hold" || hold.source_ref),
        true
      );
    },
  },
  {
    name: "D4 projection source has no model API key strings",
    async run() {
      const source = await readD4Source();
      const forbidden = [
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        ["https:", "", "api.openai.com"].join("/"),
        ["https:", "", "api.anthropic.com"].join("/"),
        ["browser", "exposed", "key"].join("-"),
        "model/API",
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "D4 projection source has no stale skin render field",
    async run() {
      const source = await readD4Source();

      assert.equal(source.includes(["step", "skins", "renders"].join(".")), false);
    },
  },
  {
    name: "D4 projection source does not import root skins",
    async run() {
      const source = await readD4Source();

      assert.equal(source.includes(["src", "skins"].join("/")), false);
      assert.equal(source.includes(["src", "skins"].join("\\")), false);
    },
  },
  {
    name: "D4 projection source avoids production legal and live-city overclaims",
    async run() {
      const source = await readD4Source();
      const forbidden = [
        ["production", "city"].join(" "),
        ["legal", "sufficiency"].join(" "),
        ["live", "city"].join("-"),
        ["live", "Fort Worth", "data"].join(" "),
        ["official", "Fort Worth", "workflow"].join(" "),
        ["public", "portal", "behavior"].join(" "),
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "D4 projection source does not write forensic chain truth",
    async run() {
      const source = await readD4Source();

      assert.equal(source.includes("ForensicChain"), false);
      assert.equal(source.includes("appendForensicChain"), false);
      assert.equal(source.includes(["root", "ForensicChain", "write"].join(" ")), false);
    },
  },
  {
    name: "D4 projection source does not touch package config auth or deploy surfaces",
    async run() {
      const source = await readD4Source();
      const forbidden = [
        "package.json",
        "vite.config",
        "vercel",
        "process.env",
        "Auth0",
        "authority-requests.js",
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "skin payload adapter continues to use canonical skin outputs",
    async run() {
      const source = await readFile("src/adapters/skinPayloadAdapter.ts", "utf8");

      assert.equal(source.includes(["step", "skins", "outputs"].join(".")), true);
      assert.equal(source.includes(["step", "skins", "renders"].join(".")), false);
    },
  },
]);
