import assert from "node:assert/strict";
import React from "react";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
} from "../src/adapters/skinPayloadAdapter.ts";
import { buildDisclosurePreviewActionBundle } from "../src/authority/disclosurePreviewActions.ts";
import { buildAuthorityDashboardState } from "../src/authority/authorityStateAdapter.ts";
import { buildDisclosurePreviewReport } from "../src/authority/disclosurePreviewReport.ts";
import { buildGarpHandoffContext } from "../src/authority/garpHandoffContext.ts";
import {
  DISCLOSURE_PREVIEW_ACTION_BUNDLE_CONTRACT,
  DISCLOSURE_PREVIEW_DEMO_DISCLAIMER,
} from "../src/authority/authorityDashboardTypes.ts";
import { resolveAuth0DashboardConfig } from "../src/auth/authConfig.ts";
import type { MeridianAuthState } from "../src/auth/MeridianAuthProvider.tsx";
import { DisclosurePreviewPanel } from "../src/components/DisclosurePreviewPanel.tsx";
import type { JsonObject } from "../src/live/liveTypes.ts";
import { SkinPanel } from "../src/components/SkinPanel.tsx";
import { resolveDashboardRoleSession } from "../src/roleSession/resolveRoleSession.ts";
import {
  createTestLiveProjection,
  loadScenarioRecord,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

function createAuthState(user: Record<string, unknown> | null = null): MeridianAuthState {
  const config = resolveAuth0DashboardConfig({
    VITE_AUTH0_CALLBACK_URL: "http://localhost:5173",
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

function createJudgeRoleSession() {
  return resolveDashboardRoleSession({
    activeSkin: "public",
    auth: createAuthState({
      role: "judge_demo_operator",
      sub: "auth0|judge-demo",
    }),
  });
}

function createAuthorityRequest(status = "pending"): JsonObject {
  return {
    binding_context: {
      actor_trace: "restricted-demo-trace",
      source_refs: ["authority_context.required_approvals"],
    },
    contract: "meridian.v2.garpAuthorityRequest.v1",
    request_id: `ARR-${status}`,
    required_authority_department: "public_works",
    required_authority_role: "public_works_director",
    resolution_type: "approval",
    source_absence_id: "absence-ref-1",
    source_governance_evaluation: "governance-ref-1",
    status,
  };
}

function createAuthorityProjection(authority: JsonObject) {
  const base = createTestLiveProjection();

  return createTestLiveProjection({
    events: [],
    latest: {
      ...base.latest,
      authority,
    },
  });
}

type ButtonElement = React.ReactElement<{
  "aria-label"?: string;
  disabled?: boolean;
  onClick?: () => void;
}>;

function readElementText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => readElementText(child)).join("");
  }

  if (!React.isValidElement(node)) {
    return "";
  }

  return readElementText((node.props as { children?: React.ReactNode }).children);
}

function findButtonByText(
  node: React.ReactNode,
  text: string
): ButtonElement | null {
  if (!React.isValidElement(node)) {
    return null;
  }

  const props = node.props as { children?: React.ReactNode };

  if (node.type === "button" && readElementText(props.children).includes(text)) {
    return node as ButtonElement;
  }

  for (const child of React.Children.toArray(props.children)) {
    const match = findButtonByText(child, text);

    if (match) {
      return match;
    }
  }

  return null;
}

function installMockPrintWindow(print: () => void): () => void {
  const globalWithWindow = globalThis as typeof globalThis & {
    window?: Pick<Window, "print">;
  };
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const previousWindow = globalWithWindow.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { print },
  });

  return () => {
    if (hadWindow) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
      return;
    }

    Reflect.deleteProperty(globalThis, "window");
  };
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
  {
    name: "disclosure preview action bundle pins contract and prepares metadata",
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
      const report = buildDisclosurePreviewReport({
        authorityState,
        generatedAt: "2026-04-27T15:00:00.000Z",
        publicSkinView: publicView,
        roleSession,
        scenarioLabel: "Routine",
        sessionLabel: "session-public",
      });
      const context = buildGarpHandoffContext({
        authorityState,
        disclosurePreviewReport: report,
      });
      const bundle = buildDisclosurePreviewActionBundle({
        garpHandoffContext: context,
        report,
        roleSession,
      });
      const markup = renderMarkup(
        <DisclosurePreviewPanel actionBundle={bundle} report={report} />
      );

      assert.equal(bundle.contract, DISCLOSURE_PREVIEW_ACTION_BUNDLE_CONTRACT);
      assert.equal(bundle.disclaimer, DISCLOSURE_PREVIEW_DEMO_DISCLAIMER);
      assert.equal(bundle.filename, "routine-disclosure-preview.json");
      assert.equal(bundle.mime_type, "application/json");
      assert.equal(bundle.print_title, "Routine disclosure preview");
      assert.equal(bundle.text_content.includes(report.public_safe_summary), true);
      assert.equal(bundle.prepared_actions.map((action) => action.action).join(","), "copy,download,print");
      assert.equal(markup.includes("Preview action"), true);
      assert.equal(markup.includes("routine-disclosure-preview.json"), true);
      assert.equal(markup.includes("application/json"), true);
    },
  },
  {
    name: "disclosure preview print action uses browser-native print and preserves claim boundaries",
    run: async () => {
      let printCalls = 0;
      const restoreWindow = installMockPrintWindow(() => {
        printCalls += 1;
      });

      try {
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
        const report = buildDisclosurePreviewReport({
          authorityState,
          generatedAt: "2026-04-27T15:00:00.000Z",
          publicSkinView: publicView,
          roleSession,
          scenarioLabel: "Routine",
          sessionLabel: "session-public",
        });
        const context = buildGarpHandoffContext({
          authorityState,
          disclosurePreviewReport: report,
        });
        const bundle = buildDisclosurePreviewActionBundle({
          garpHandoffContext: context,
          report,
          roleSession,
        });
        const panel = DisclosurePreviewPanel({ actionBundle: bundle, report });
        const button = findButtonByText(panel, "Print / Save report");
        const markup = renderMarkup(
          <DisclosurePreviewPanel actionBundle={bundle} report={report} />
        );
        const lowerMarkup = markup.toLowerCase();

        assert.ok(button);
        assert.equal(
          button.props["aria-label"],
          "Print / Save report using your browser print dialog"
        );
        assert.equal(button.props.disabled, false);
        assert.equal(markup.includes("Print / Save report"), true);
        assert.equal(
          markup.includes(
            "Opens your browser print dialog. Save as PDF from there if needed."
          ),
          true
        );

        button.props.onClick?.();
        assert.equal(printCalls, 1);
        assert.equal(markup.includes("restricted-demo-trace"), false);
        assert.equal(lowerMarkup.includes("tpia compliant"), false);
        assert.equal(lowerMarkup.includes("legal sufficiency"), false);
        assert.equal(lowerMarkup.includes("public portal"), false);
        assert.equal(lowerMarkup.includes(["official", "report"].join(" ")), false);
        assert.equal(
          lowerMarkup.includes(["official", "fort worth", "report"].join(" ")),
          false
        );
        assert.equal(lowerMarkup.includes(["production", "report"].join(" ")), false);
        assert.equal(lowerMarkup.includes("certified"), false);
      } finally {
        restoreWindow();
      }
    },
  },
  {
    name: "disclosure preview action bundle holds when report is missing",
    run: () => {
      const roleSession = createPublicRoleSession();
      const bundle = buildDisclosurePreviewActionBundle({
        report: null,
        roleSession,
      });
      const markup = renderMarkup(
        <DisclosurePreviewPanel actionBundle={bundle} report={null} />
      );

      assert.equal(bundle.status, "holding");
      assert.equal(bundle.holds[0]?.includes("report unavailable"), true);
      assert.equal(markup.includes("HOLD: disclosure preview report is unavailable."), true);
      assert.equal(markup.includes("Preview action holding"), true);
    },
  },
  {
    name: "public disclosure action bundle excludes restricted authority detail and raw tokens",
    run: async () => {
      const record = await loadScenarioRecord("contested");
      const publicView = getDashboardSkinView(
        adaptStepSkinPayloads(record.scenario.steps[3]),
        "public"
      );
      const roleSession = createPublicRoleSession();
      const authorityState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          generated_requests: [createAuthorityRequest("pending")],
          notification_payload: {
            actions: [
              {
                label: "Approve",
                response_token: "garp-action-v1-explicit-token",
              },
            ],
          },
        }),
        roleSession,
      });
      const report = buildDisclosurePreviewReport({
        authorityState,
        generatedAt: "2026-04-27T15:00:00.000Z",
        publicSkinView: publicView,
        roleSession,
        scenarioLabel: "Contested",
        sessionLabel: "session-public",
      });
      const context = buildGarpHandoffContext({
        authorityState,
        disclosurePreviewReport: report,
      });
      const bundle = buildDisclosurePreviewActionBundle({
        garpHandoffContext: context,
        report,
        roleSession,
      });
      const text = bundle.text_content.toLowerCase();

      assert.equal(text.includes("restricted-demo-trace"), false);
      assert.equal(text.includes("garp-action-v1-explicit-token"), false);
      assert.equal(text.includes("binding context keys"), false);
      assert.equal(text.includes("tpia compliant"), false);
      assert.equal(text.includes("legal sufficiency"), false);
      assert.equal(text.includes("public portal"), false);
      assert.equal(text.includes("official disclosure workflow"), false);
    },
  },
  {
    name: "judge disclosure action bundle may include explicit demo authority detail",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const publicView = getDashboardSkinView(
        adaptStepSkinPayloads(record.scenario.steps[0]),
        "public"
      );
      const roleSession = createJudgeRoleSession();
      const authorityState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          generated_requests: [createAuthorityRequest("pending")],
        }),
        roleSession,
      });
      const report = buildDisclosurePreviewReport({
        authorityState,
        generatedAt: "2026-04-27T15:00:00.000Z",
        publicSkinView: publicView,
        roleSession,
        scenarioLabel: "Routine",
        sessionLabel: "session-judge",
      });
      const context = buildGarpHandoffContext({
        authorityState,
        disclosurePreviewReport: report,
      });
      const bundle = buildDisclosurePreviewActionBundle({
        garpHandoffContext: context,
        report,
        roleSession,
      });

      assert.equal(bundle.text_content.includes("Binding context keys"), true);
      assert.equal(bundle.text_content.includes("public_works / public_works_director"), true);
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
