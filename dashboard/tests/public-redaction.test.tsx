import assert from "node:assert/strict";
import React from "react";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
} from "../src/adapters/skinPayloadAdapter.ts";
import { buildAuthorityDashboardState } from "../src/authority/authorityStateAdapter.ts";
import { buildDisclosurePreviewReport } from "../src/authority/disclosurePreviewReport.ts";
import { resolveAuth0DashboardConfig } from "../src/auth/authConfig.ts";
import type { MeridianAuthState } from "../src/auth/MeridianAuthProvider.tsx";
import { DisclosurePreviewPanel } from "../src/components/DisclosurePreviewPanel.tsx";
import { SkinPanel } from "../src/components/SkinPanel.tsx";
import { resolveDashboardRoleSession } from "../src/roleSession/resolveRoleSession.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

function createAuthState(user: Record<string, unknown> | null = null): MeridianAuthState {
  const config = resolveAuth0DashboardConfig({
    VITE_AUTH0_CLIENT_ID: "client-a",
    VITE_AUTH0_DOMAIN: "tenant.example.auth0.com",
  });

  return {
    authStatus: user ? "authenticated" : "unauthenticated",
    config,
    errorMessage: null,
    holds: config.holds,
    isAuthenticated: Boolean(user),
    isConfigured: config.isConfigured,
    login: () => undefined,
    logout: () => undefined,
    user,
  };
}

function createPublicRoleSession() {
  return resolveDashboardRoleSession({
    activeSkin: "public",
    auth: createAuthState(),
  });
}

const tests = [
  {
    name: "public panel surfaces actual redactions, disclosure holds, and fallback text",
    run: async () => {
      const record = await loadScenarioRecord("contested");
      const publicView = getDashboardSkinView(
        adaptStepSkinPayloads(record.scenario.steps[3]),
        "public"
      );

      assert.ok(publicView?.payload);
      assert.equal(publicView?.redactions.length > 0, true);
      assert.equal(publicView?.absences.length > 0, true);
      assert.equal(publicView?.isFallbackActive, true);

      const markup = renderMarkup(
        <SkinPanel
          activeStepLabel="C4 (4/5)"
          skinView={publicView}
          status="ready"
        />
      );
      const lowerMarkup = markup.toLowerCase();

      assert.equal(markup.includes(publicView?.redactions[0]?.marker ?? ""), true);
      assert.equal(markup.includes(publicView?.redactions[0]?.text ?? ""), true);
      assert.equal(markup.includes(publicView?.absences[0]?.displayText ?? ""), true);
      assert.equal(markup.includes(publicView?.fallback?.message ?? ""), true);
      assert.equal(lowerMarkup.includes("legal sufficiency"), false);
      assert.equal(lowerMarkup.includes("attorney review"), false);
      assert.equal(lowerMarkup.includes("compliance certified"), false);
    },
  },
  {
    name: "public panel does not invent disclosure holds when the snapshot has none",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const publicView = getDashboardSkinView(
        adaptStepSkinPayloads(record.scenario.steps[0]),
        "public"
      );

      assert.ok(publicView?.payload);
      assert.equal(publicView?.absences.length, 0);
      assert.equal(publicView?.isFallbackActive, false);

      const markup = renderMarkup(
        <SkinPanel
          activeStepLabel="R1 (1/4)"
          skinView={publicView}
          status="ready"
        />
      );

      assert.equal(markup.includes("No disclosure holds are present on this step."), true);
      assert.equal(markup.includes("Fallback visible."), false);
    },
  },
  {
    name: "disclosure preview requires explicit generated timestamp",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const publicView = getDashboardSkinView(
        adaptStepSkinPayloads(record.scenario.steps[0]),
        "public"
      );
      const roleSession = createPublicRoleSession();
      const authorityState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: null,
        roleSession,
      });
      const missingTimestamp = buildDisclosurePreviewReport({
        authorityState,
        generatedAt: null,
        publicSkinView: publicView,
        roleSession,
        scenarioLabel: "Routine",
        sessionLabel: "routine",
      });
      const explicitTimestamp = buildDisclosurePreviewReport({
        authorityState,
        generatedAt: "2026-04-27T15:00:00.000Z",
        publicSkinView: publicView,
        roleSession,
        scenarioLabel: "Routine",
        sessionLabel: "routine",
      });

      assert.equal(
        missingTimestamp.unresolved_holds.includes(
          "HOLD: disclosure preview generated timestamp requires explicit input."
        ),
        true
      );
      assert.equal(
        explicitTimestamp.unresolved_holds.includes(
          "HOLD: disclosure preview generated timestamp requires explicit input."
        ),
        false
      );
    },
  },
  {
    name: "disclosure preview is public-safe and carries disclaimer, source refs, and holds",
    run: async () => {
      const record = await loadScenarioRecord("contested");
      const publicView = getDashboardSkinView(
        adaptStepSkinPayloads(record.scenario.steps[3]),
        "public"
      );
      const roleSession = createPublicRoleSession();
      const authorityState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: null,
        roleSession,
      });
      const report = buildDisclosurePreviewReport({
        authorityState,
        generatedAt: null,
        publicSkinView: publicView,
        roleSession,
        scenarioLabel: "Contested",
        sessionLabel: "session-public",
      });
      const markup = renderMarkup(<DisclosurePreviewPanel report={report} />);
      const lowerMarkup = markup.toLowerCase();

      assert.equal(
        markup.includes(
          "Demo disclosure preview only. Not legal advice, not a TPIA determination, and not an official Fort Worth disclosure workflow."
        ),
        true
      );
      assert.equal(
        markup.includes("HOLD: disclosure preview generated timestamp requires explicit input."),
        true
      );
      assert.equal(markup.includes("skin.output.public"), true);
      assert.equal(markup.includes("restricted-demo-trace"), false);
      assert.equal(lowerMarkup.includes("tpia compliant"), false);
      assert.equal(lowerMarkup.includes("legal sufficiency"), false);
      assert.equal(lowerMarkup.includes("public portal"), false);
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
