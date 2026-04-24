import assert from "node:assert/strict";
import React from "react";
import { adaptAbsenceSignals } from "../src/adapters/absenceSignalAdapter.ts";
import { adaptForensicChain } from "../src/adapters/forensicAdapter.ts";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
  type DashboardSkinKey,
} from "../src/adapters/skinPayloadAdapter.ts";
import { AbsenceLensOverlay } from "../src/components/director/AbsenceLensOverlay.tsx";
import { AbsenceSignalRail } from "../src/components/director/AbsenceSignalRail.tsx";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import type { ScenarioKey } from "../src/types/scenario.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

async function buildAbsenceLens(
  scenarioKey: ScenarioKey,
  stepIndex: number,
  activeSkinKey: DashboardSkinKey
) {
  const record = await loadScenarioRecord(scenarioKey);
  const timelineSteps = buildTimelineSteps(record.scenario);
  const currentStep = timelineSteps[stepIndex];
  assert.ok(currentStep);

  const skinViews = adaptStepSkinPayloads(currentStep.step);
  const activeSkinView = getDashboardSkinView(skinViews, activeSkinKey) ?? null;

  return adaptAbsenceSignals({
    activeSkinView,
    currentStep,
    forensicChain: adaptForensicChain(timelineSteps, stepIndex),
    skinViews,
  });
}

const tests = [
  {
    name: "supported absence signals render only when the contested revoke step actually carries them",
    run: async () => {
      const lens = await buildAbsenceLens("contested", 3, "public");
      const families = lens.signals.map((signal) => signal.family);

      assert.equal(families.includes("AUTHORITY_REVOKED"), true);
      assert.equal(families.includes("PUBLIC_REDACTION"), true);
      assert.equal(families.includes("UNMATCHED_GOVERNANCE_ITEM"), true);
      assert.equal(families.includes("FORENSIC_ACCUMULATION"), true);
      assert.equal(families.includes("SKIN_DIVERGENCE"), true);
      assert.equal(families.includes("AMBIGUOUS_MATCH"), false);

      const markup = renderMarkup(
        <AbsenceSignalRail familyStates={lens.familyStates} signals={lens.signals} />
      );

      assert.equal(markup.includes("Authority revoked before state change"), true);
      assert.equal(
        markup.includes("step.governance.result.runtimeSubset.civic.revocation.reason"),
        true
      );
    },
  },
  {
    name: "unsupported absence families are omitted rather than fabricated",
    run: async () => {
      const lens = await buildAbsenceLens("routine", 0, "public");
      const markup = renderMarkup(
        <AbsenceSignalRail familyStates={lens.familyStates} signals={lens.signals} />
      );

      assert.equal(lens.signals.some((signal) => signal.family === "PROPOSED_CREATION"), false);
      assert.equal(lens.signals.some((signal) => signal.family === "AMBIGUOUS_MATCH"), false);
      assert.equal(lens.signals.some((signal) => signal.family === "AUTHORITY_REVOKED"), false);
      assert.equal(markup.includes("Proposed creation only"), false);
      assert.equal(markup.includes("Ambiguous match remains unresolved"), false);
      assert.equal(markup.includes("Authority revoked before state change"), false);
      assert.equal(markup.includes("Ambiguous match"), true);
    },
  },
  {
    name: "skin overlays synchronize with the selected skin instead of fabricating a public cue on other tabs",
    run: async () => {
      const publicLens = await buildAbsenceLens("contested", 3, "public");
      const permittingLens = await buildAbsenceLens("contested", 3, "permitting");

      const publicOverlayMarkup = renderMarkup(
        <AbsenceLensOverlay active={true} highlights={publicLens.highlights} panel="skin">
          <div>skin panel</div>
        </AbsenceLensOverlay>
      );
      const permittingOverlayMarkup = renderMarkup(
        <AbsenceLensOverlay active={true} highlights={permittingLens.highlights} panel="skin">
          <div>skin panel</div>
        </AbsenceLensOverlay>
      );

      assert.equal(publicOverlayMarkup.includes("Public redaction"), true);
      assert.equal(permittingOverlayMarkup.includes("Public redaction"), false);
      assert.equal(permittingOverlayMarkup.includes("Skin divergence"), true);
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
