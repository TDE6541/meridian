import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import { adaptAbsenceSignals } from "../src/adapters/absenceSignalAdapter.ts";
import { adaptForensicChain } from "../src/adapters/forensicAdapter.ts";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
  type DashboardSkinKey,
} from "../src/adapters/skinPayloadAdapter.ts";
import { DirectorCueCard } from "../src/components/director/DirectorCueCard.tsx";
import { JudgeCuePanel } from "../src/components/director/JudgeCuePanel.tsx";
import { PreventedActionCard } from "../src/components/director/PreventedActionCard.tsx";
import { resolveDirectorBookmarks } from "../src/director/directorBookmarks.ts";
import { buildDirectorScene } from "../src/director/directorScript.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import type { ScenarioKey } from "../src/types/scenario.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

async function buildDirectorMarkup(
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
  const lens = adaptAbsenceSignals({
    activeSkinView,
    currentStep,
    forensicChain: adaptForensicChain(timelineSteps, stepIndex),
    skinViews,
  });
  const scene = buildDirectorScene({
    bookmarks: resolveDirectorBookmarks(scenarioKey, timelineSteps),
    currentStep,
    signals: lens.signals,
  });

  return renderMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(DirectorCueCard, { cue: scene.cueCard }),
      React.createElement(JudgeCuePanel, { panel: scene.judgePanel }),
      React.createElement(PreventedActionCard, { card: scene.preventedAction })
    )
  );
}

const tests = [
  {
    name: "judge-safe cue text avoids speculative or legal overclaim language",
    run: async () => {
      const markup = (await buildDirectorMarkup("contested", 3, "public")).toLowerCase();

      assert.equal(markup.includes("lawsuit"), false);
      assert.equal(markup.includes("compliance"), false);
      assert.equal(markup.includes("catastrophe"), false);
      assert.equal(markup.includes("prove"), false);
      assert.equal(markup.includes("would have"), false);
      assert.equal(markup.includes("legal sufficiency"), false);
    },
  },
  {
    name: "director cues do not invent revoked or blocked consequences when those signals are absent",
    run: async () => {
      const markup = await buildDirectorMarkup("routine", 0, "public");
      const lowerMarkup = markup.toLowerCase();

      assert.equal(lowerMarkup.includes("authority was revoked"), false);
      assert.equal(lowerMarkup.includes("stayed blocked in this lane"), false);
      assert.equal(lowerMarkup.includes("proposed creation signal"), false);
      assert.equal(lowerMarkup.includes("no prevented-action signal is active on this step"), true);
    },
  },
  {
    name: "rendered director surfaces include source citation paths for active signals",
    run: async () => {
      const markup = await buildDirectorMarkup("contested", 3, "public");

      assert.equal(
        markup.includes("step.governance.result.runtimeSubset.civic.revocation.reason"),
        true
      );
      assert.equal(
        markup.includes(
          "runtimeSubset.civic:step.governance.result.runtimeSubset.civic.revocation.reason"
        ),
        true
      );
    },
  },
  {
    name: "live components render projection fields without root runtime imports",
    run: async () => {
      const files = [
        "src/components/LiveCapturePanel.tsx",
        "src/components/LiveEventRail.tsx",
        "src/components/LiveConnectionBanner.tsx",
        "src/foremanGuide/ForemanMountPoint.tsx",
      ];
      const source = (
        await Promise.all(
          files.map((file) => readFile(path.resolve(process.cwd(), file), "utf8"))
        )
      ).join("\n");
      const rootLiveImport = ["../..", "src", "live"].join("/");
      const rootSkinsImport = ["../..", "src", "skins"].join("/");

      assert.equal(source.includes(rootLiveImport), false);
      assert.equal(source.includes(rootSkinsImport), false);
      assert.equal(source.includes("evaluateGovernanceRequest"), false);
      assert.equal(source.includes("evaluateLiveAbsence"), false);
      assert.equal(source.includes("createLiveGovernanceGateway"), false);
      assert.equal(source.includes("createDashboardLiveProjectionV1"), false);
    },
  },
  {
    name: "authority cockpit stays dashboard-local without root runtime imports or token generation",
    run: async () => {
      const files = [
        "src/authority/authorityDashboardTypes.ts",
        "src/authority/disclosurePreviewActions.ts",
        "src/authority/authorityStateAdapter.ts",
        "src/authority/authorityTimeline.ts",
        "src/authority/disclosurePreviewReport.ts",
        "src/authority/garpHandoffContext.ts",
        "src/components/AuthorityNotificationDemo.tsx",
        "src/components/AuthorityResolutionPanel.tsx",
        "src/components/AuthorityTimeline.tsx",
        "src/components/DisclosurePreviewPanel.tsx",
        "src/components/GARPStatusIndicator.tsx",
        "src/components/ControlRoomShell.tsx",
      ];
      const source = (
        await Promise.all(
          files.map((file) => readFile(path.resolve(process.cwd(), file), "utf8"))
        )
      ).join("\n");

      assert.equal(source.includes("../../src/live/authority"), false);
      assert.equal(source.includes("../../src/live"), false);
      assert.equal(source.includes("buildAuthorityNotificationPayload"), false);
      assert.equal(source.includes("createAuthorityActionToken"), false);
      assert.equal(source.includes("resolveAuthorityRequestAction"), false);
      assert.equal(source.includes("serviceWorker"), false);
      assert.equal(source.includes("PushManager"), false);
      assert.equal(source.includes("Date.now"), false);
      assert.equal(source.includes("fetch("), false);
    },
  },
  {
    name: "authority cockpit avoids forbidden claim labels",
    run: async () => {
      const files = [
        "src/authority/authorityDashboardTypes.ts",
        "src/authority/disclosurePreviewActions.ts",
        "src/authority/authorityStateAdapter.ts",
        "src/authority/authorityTimeline.ts",
        "src/authority/disclosurePreviewReport.ts",
        "src/authority/garpHandoffContext.ts",
        "src/components/AuthorityNotificationDemo.tsx",
        "src/components/AuthorityResolutionPanel.tsx",
        "src/components/AuthorityTimeline.tsx",
        "src/components/DisclosurePreviewPanel.tsx",
        "src/components/GARPStatusIndicator.tsx",
        "src/components/ControlRoomShell.tsx",
      ];
      const source = (
        await Promise.all(
          files.map((file) => readFile(path.resolve(process.cwd(), file), "utf8"))
        )
      ).join("\n").toLowerCase();
      const forbiddenClaims = [
        "production auth",
        "live openfga",
        "legal access control",
        "public portal",
        "fort worth live login",
        "official city identity",
        "compliance-ready",
        "secure production authorization",
        "live city deployment",
        "auth0 enterprise",
        "ciba shipped",
        "tpia compliant",
        "legal sufficiency",
        "official disclosure workflow",
        "notification delivery",
        "live browser push",
        "live email sending",
        "foreman answer",
        "foreman narration",
        "foreman mode",
      ];

      for (const claim of forbiddenClaims) {
        assert.equal(source.includes(claim), false, claim);
      }

      assert.equal(source.includes("ciba status"), false);
      assert.equal(source.includes("garp authority state"), true);
    },
  },
  {
    name: "g5 prepared actions and handoff context do not ship Foreman behavior",
    run: async () => {
      const sideEffectGuardFiles = [
        "src/authority/disclosurePreviewActions.ts",
        "src/authority/garpHandoffContext.ts",
        "src/components/ControlRoomShell.tsx",
        "src/foremanGuide/ForemanMountPoint.tsx",
      ];
      const source = (
        await Promise.all(
          sideEffectGuardFiles.map((file) => readFile(path.resolve(process.cwd(), file), "utf8"))
        )
      ).join("\n");
      const disclosurePreviewPanel = await readFile(
        path.resolve(process.cwd(), "src/components/DisclosurePreviewPanel.tsx"),
        "utf8"
      );
      const lowerSource = source.toLowerCase();
      const lowerDisclosurePreviewPanel = disclosurePreviewPanel.toLowerCase();

      for (const fragment of [
        "navigator.clipboard",
        "window.print",
        "createobjecturl",
        "document.createelement(\"a\")",
        "fetch(",
        "axios",
        "xmlhttprequest",
        "serviceworker",
        "pushmanager",
        "notification.requestpermission",
        "resend",
        "sendgrid",
        "openfga",
        "date.now",
        "foreman_prompt",
        "foreman_mode",
        "answer_text",
        "narration_text",
        "voice/avatar",
        "proactive_foreman",
        ".pdf",
        "../../src/live",
        "../../src/skins",
      ]) {
        assert.equal(lowerSource.includes(fragment), false, fragment);
      }

      assert.equal(disclosurePreviewPanel.includes("window.print()"), true);
      for (const fragment of [
        "navigator.clipboard",
        "createobjecturl",
        "document.createelement(\"a\")",
        "fetch(",
        "serviceworker",
        "pushmanager",
        "notification.requestpermission",
        "resend",
        "sendgrid",
        "openfga",
        "../../src/live",
        "../../src/skins",
      ]) {
        assert.equal(lowerDisclosurePreviewPanel.includes(fragment), false, fragment);
      }

      const foremanMount = await readFile(
        path.resolve(process.cwd(), "src/foremanGuide/ForemanMountPoint.tsx"),
        "utf8"
      );

      assert.equal(foremanMount.includes("data-foreman-mount=\"inert\""), true);
      assert.equal(foremanMount.includes("GarpHandoff"), false);
      assert.equal(foremanMount.includes("garpHandoff"), false);
      assert.equal(foremanMount.includes("disclosurePreviewAction"), false);
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
