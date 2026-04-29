import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { ProofSpotlight } from "../src/components/ProofSpotlight.tsx";
import {
  createInitialMissionPlaybackState,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  getForemanModeForMissionStage,
  type MissionStageId,
} from "../src/demo/missionPlaybackPlan.ts";
import {
  buildMissionPhysicalProjection,
  type MissionPhysicalProjectionV1,
} from "../src/demo/missionPhysicalProjection.ts";
import type { ProofSpotlightTarget } from "../src/demo/proofSpotlightTargets.ts";
import { deriveProofSpotlightView } from "../src/demo/proofSpotlightView.ts";
import { loadAllScenarioRecords, renderMarkup, runTests } from "./scenarioTestUtils.ts";

function runningStage(stageId: MissionStageId): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState("guided");

  return {
    ...idle,
    activeForemanMode: getForemanModeForMissionStage(stageId),
    currentStageId: stageId,
    stageEnteredAtMs: 0,
    startedAtMs: 0,
    status: "running",
  };
}

function projectionFor(stageId: MissionStageId): MissionPhysicalProjectionV1 {
  return buildMissionPhysicalProjection({
    playback_state: runningStage(stageId),
  });
}

function withSpotlightTargets(
  projection: MissionPhysicalProjectionV1,
  activeTargets: readonly ProofSpotlightTarget[],
  attentionTargetId = activeTargets[0]?.target_id ?? null
): MissionPhysicalProjectionV1 {
  return {
    ...projection,
    foreman: {
      ...projection.foreman,
      attention_target_id: attentionTargetId,
    },
    spotlight: {
      ...projection.spotlight,
      active_targets: activeTargets,
    },
  };
}

async function readD6Source(): Promise<string> {
  return (
    await Promise.all(
      [
        "src/components/ProofSpotlight.tsx",
        "src/demo/proofSpotlightView.ts",
      ].map((file) => readFile(file, "utf8"))
    )
  ).join("\n");
}

const tests = [
  {
    name: "ProofSpotlight renders safe lobby fallback state",
    run() {
      const projection = buildMissionPhysicalProjection({
        playback_state: createInitialMissionPlaybackState("guided"),
      });
      const markup = renderMarkup(<ProofSpotlight projection={projection} />);

      assert.equal(markup.includes('data-proof-spotlight-status="ready"'), true);
      assert.equal(markup.includes("Lobby / no active stage"), true);
      assert.equal(markup.includes("Safe lobby spotlight"), true);
      assert.equal(
        markup.includes(
          "Mission is in lobby; spotlight is ready and waiting for a D4 stage target."
        ),
        true
      );
    },
  },
  {
    name: "ProofSpotlight renders active D4 projection target fields",
    run() {
      const projection = projectionFor("capture");
      const target = projection.spotlight.active_targets[0];
      const markup = renderMarkup(<ProofSpotlight projection={projection} />);

      assert.ok(target);
      assert.equal(markup.includes('data-proof-spotlight-status="ready"'), true);
      assert.equal(markup.includes("Capture (capture)"), true);
      assert.equal(markup.includes(target.label), true);
      assert.equal(markup.includes(target.target_kind), true);
      assert.equal(markup.includes(target.summary), true);
      assert.equal(markup.includes(target.source_ref), true);
      assert.equal(markup.includes("Required target ready"), true);
      assert.equal(markup.includes(target.fallback_text), true);
      assert.equal(markup.includes(target.target_id), true);
    },
  },
  {
    name: "ProofSpotlight renders optional target ready posture",
    run() {
      const projection = projectionFor("capture");
      const optionalTarget = projection.spotlight.active_targets.find(
        (target) => !target.required
      );

      assert.ok(optionalTarget);
      const optionalProjection = withSpotlightTargets(
        projection,
        [optionalTarget],
        optionalTarget.target_id
      );
      const markup = renderMarkup(<ProofSpotlight projection={optionalProjection} />);

      assert.equal(markup.includes("Optional target ready"), true);
      assert.equal(markup.includes(optionalTarget.label), true);
    },
  },
  {
    name: "missing required target creates HOLD posture",
    run() {
      const projection = withSpotlightTargets(projectionFor("authority"), []);
      const view = deriveProofSpotlightView(projection);
      const markup = renderMarkup(<ProofSpotlight projection={projection} />);

      assert.equal(view.status, "holding");
      assert.equal(markup.includes('data-proof-spotlight-status="holding"'), true);
      assert.equal(markup.includes("Required target missing"), true);
      assert.equal(
        markup.includes(
          "HOLD: no D4 proof spotlight target is active for this valid mission stage."
        ),
        true
      );
    },
  },
  {
    name: "missing optional target creates warning posture",
    run() {
      const projection = projectionFor("capture");
      const optionalTarget = projection.spotlight.active_targets.find(
        (target) => !target.required
      );

      assert.ok(optionalTarget);
      const incompleteOptionalTarget: ProofSpotlightTarget = {
        ...optionalTarget,
        fallback_text: "",
        label: "",
      };
      const optionalProjection = withSpotlightTargets(
        projection,
        [incompleteOptionalTarget],
        incompleteOptionalTarget.target_id
      );
      const view = deriveProofSpotlightView(optionalProjection);
      const markup = renderMarkup(<ProofSpotlight projection={optionalProjection} />);

      assert.equal(view.status, "warning");
      assert.equal(markup.includes('data-proof-spotlight-status="warning"'), true);
      assert.equal(markup.includes("Optional target warning"), true);
      assert.equal(markup.includes("Warning: optional target label unavailable"), true);
      assert.equal(markup.includes("Warning: optional proof target is incomplete."), true);
    },
  },
  {
    name: "incomplete required target creates HOLD posture and fallback text",
    run() {
      const projection = projectionFor("governance");
      const requiredTarget = projection.spotlight.active_targets.find(
        (target) => target.required
      );

      assert.ok(requiredTarget);
      const incompleteRequiredTarget: ProofSpotlightTarget = {
        ...requiredTarget,
        fallback_text: "",
        label: "",
      };
      const requiredProjection = withSpotlightTargets(
        projection,
        [incompleteRequiredTarget],
        incompleteRequiredTarget.target_id
      );
      const markup = renderMarkup(<ProofSpotlight projection={requiredProjection} />);

      assert.equal(markup.includes('data-proof-spotlight-status="holding"'), true);
      assert.equal(markup.includes("Required target HOLD"), true);
      assert.equal(markup.includes("HOLD: target label unavailable"), true);
      assert.equal(markup.includes("HOLD: required proof target is incomplete."), true);
    },
  },
  {
    name: "unavailable projection renders unavailable target status",
    run() {
      const markup = renderMarkup(<ProofSpotlight projection={null} />);

      assert.equal(markup.includes('data-proof-spotlight-status="unavailable"'), true);
      assert.equal(markup.includes("Projection unavailable"), true);
      assert.equal(markup.includes("Safe fallback"), true);
    },
  },
  {
    name: "beam tether and reduced-motion safe labels render without animation dependency",
    run() {
      const projection = projectionFor("public");
      const markup = renderMarkup(<ProofSpotlight projection={projection} />);

      assert.equal(markup.includes('data-proof-spotlight-beam="semantic"'), true);
      assert.equal(markup.includes("Foreman"), true);
      assert.equal(markup.includes("Public (public)"), true);
      assert.equal(markup.includes("Reduced motion safe"), true);
      assert.equal(markup.includes('data-proof-spotlight-motion="visible"'), true);
      assert.equal(markup.includes("Demo proof target; source-bounded"), true);
    },
  },
  {
    name: "ProofSpotlight source has no DOM selector truth or imperative click choreography",
    run: async () => {
      const source = await readD6Source();

      for (const forbidden of [
        "document.",
        "querySelector",
        "getElementById",
        ".click()",
        "scrollIntoView",
        "dispatchEvent",
        "useEffect",
      ]) {
        assert.equal(source.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "Presenter Cockpit includes Proof Spotlight and preserves D5 hierarchy",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes("Presenter Cockpit"), true);
      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes("Evidence Beam"), true);
      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes("Foreman Avatar Bay"), true);
      assert.equal(markup.includes("Permit #4471"), true);
      assert.equal(markup.includes('data-current-decision-card="true"'), true);
      assert.equal(markup.includes("Current decision / HOLD"), true);
      assert.equal(markup.includes('data-mission-rail="true"'), true);
      for (const label of ["Capture", "Authority", "Governance", "Absence", "Chain", "Public"]) {
        assert.equal(markup.includes(`data-mission-stage-label="${label}"`), true, label);
      }
    },
  },
  {
    name: "Proof Tools remain grouped and collapsed by default",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes("<summary>Proof Tools</summary>"), true);
      assert.equal(/<details[^>]*class="mission-proof-tools"[^>]* open/.test(markup), false);
      assert.equal(markup.includes("Proof Tools remain grouped"), true);
    },
  },
  {
    name: "D6 source keeps snapshot skin outputs canonical and avoids stale render seam",
    run: async () => {
      const d6Source = await readD6Source();
      const adapterSource = await readFile("src/adapters/skinPayloadAdapter.ts", "utf8");

      assert.equal(d6Source.includes("step.skins.renders"), false);
      assert.equal(adapterSource.includes("step.skins.outputs"), true);
      assert.equal(adapterSource.includes("step.skins.renders"), false);
    },
  },
  {
    name: "D6 source avoids model key package root skin and ForensicChain write behavior",
    run: async () => {
      const source = await readD6Source();

      for (const forbidden of [
        "apiKey",
        "OpenAI",
        "model call",
        "browser-exposed",
        "package.json",
        "../src/skins",
        "../../src/skins",
        "src/skins",
        "ForensicChain",
        "appendForensicChain",
        "writeForensicChain",
      ]) {
        assert.equal(source.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "ProofSpotlight copy avoids production legal and live-city overclaims",
    run() {
      const markup = renderMarkup(<ProofSpotlight projection={projectionFor("chain")} />);
      const lowerMarkup = markup.toLowerCase();

      for (const forbidden of [
        "production city",
        "official fort worth",
        "legal audit",
        "tpia",
        "traiga",
        "public portal",
        "delivered notification",
        "openfga",
        "ciba",
        "live city",
      ]) {
        assert.equal(lowerMarkup.includes(forbidden), false, forbidden);
      }
    },
  },
];

async function main() {
  await runTests(tests);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
