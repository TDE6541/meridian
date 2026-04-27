import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import {
  MeridianAuthContext,
  MeridianAuthProvider,
  type MeridianAuthState,
} from "../src/auth/MeridianAuthProvider.tsx";
import { resolveAuth0DashboardConfig } from "../src/auth/authConfig.ts";
import {
  DASHBOARD_SKIN_ORDER,
  adaptStepSkinPayloads,
} from "../src/adapters/skinPayloadAdapter.ts";
import { buildAuthorityDashboardState } from "../src/authority/authorityStateAdapter.ts";
import { AuthorityNotificationDemo } from "../src/components/AuthorityNotificationDemo.tsx";
import { AuthorityResolutionPanel } from "../src/components/AuthorityResolutionPanel.tsx";
import { AuthorityTimeline } from "../src/components/AuthorityTimeline.tsx";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { GARPStatusIndicator } from "../src/components/GARPStatusIndicator.tsx";
import type { JsonObject } from "../src/live/liveTypes.ts";
import { RoleSessionPanel } from "../src/components/RoleSessionPanel.tsx";
import { SkinSwitcher } from "../src/components/SkinSwitcher.tsx";
import { resolveDashboardRoleSession } from "../src/roleSession/resolveRoleSession.ts";
import { ROLE_SESSION_PROOF_CONTRACT } from "../src/roleSession/roleSessionTypes.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import {
  createTestLiveProjection,
  loadAllScenarioRecords,
  loadScenarioRecord,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

function createAuthState(
  overrides: Partial<MeridianAuthState> = {}
): MeridianAuthState {
  const config = resolveAuth0DashboardConfig({
    VITE_AUTH0_CLIENT_ID: "client-a",
    VITE_AUTH0_DOMAIN: "tenant.example.auth0.com",
  });

  return {
    authStatus: "unauthenticated",
    config,
    errorMessage: null,
    holds: config.holds,
    isAuthenticated: false,
    isConfigured: config.isConfigured,
    login: () => undefined,
    logout: () => undefined,
    user: null,
    ...overrides,
  };
}

function findSkinTabSegment(markup: string, key: string): string {
  const start = markup.indexOf(`data-skin-tab="${key}"`);

  assert.notEqual(start, -1);

  const nextStart = markup.indexOf("data-skin-tab=", start + 1);

  return nextStart === -1 ? markup.slice(start) : markup.slice(start, nextStart);
}

function createAuthorityRequest(status = "pending"): JsonObject {
  return {
    binding_context: {
      actor_trace: "restricted-demo-trace",
      source_refs: ["authority_context.required_approvals"],
    },
    consumed_action_token_hashes: [],
    contract: "meridian.v2.garpAuthorityRequest.v1",
    expires_at: "2026-04-27T15:00:00.000Z",
    forensic_receipt_id: "forensic-ref-explicit",
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
      authStatus: "authenticated",
      isAuthenticated: true,
      user: {
        role: "judge_demo_operator",
        sub: "auth0|judge-demo",
      },
    }),
  });
}

const tests = [
  {
    name: "missing Auth0 env does not crash and renders public advisory",
    run: async () => {
      const config = resolveAuth0DashboardConfig({});
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(
        <MeridianAuthProvider config={config}>
          <ControlRoomShell records={records} />
        </MeridianAuthProvider>
      );

      assert.equal(config.isConfigured, false);
      assert.equal(markup.includes("Auth0 login unavailable; public mode active"), true);
      assert.equal(markup.includes("Role session proof"), true);
      assert.equal(markup.includes("Local dashboard role boundary"), true);
      assert.equal(markup.includes("Public snapshot"), true);
    },
  },
  {
    name: "unauthenticated state resolves to public role",
    run: () => {
      const roleSession = resolveDashboardRoleSession({
        activeSkin: "public",
        auth: createAuthState(),
      });

      assert.equal(roleSession.contract, ROLE_SESSION_PROOF_CONTRACT);
      assert.equal(roleSession.auth_status, "unauthenticated");
      assert.equal(roleSession.role, "public");
      assert.deepEqual(roleSession.allowed_skins, ["public"]);
      assert.equal(roleSession.active_skin, "public");
    },
  },
  {
    name: "authenticated recognized role resolves expected allowed skins",
    run: () => {
      const roleSession = resolveDashboardRoleSession({
        activeSkin: "permitting",
        auth: createAuthState({
          authStatus: "authenticated",
          isAuthenticated: true,
          user: {
            civic_role: "permitting_staff",
            department: "Planning",
            name: "Planner A",
            sub: "auth0|planner-a",
          },
        }),
      });

      assert.equal(roleSession.role, "permitting_staff");
      assert.equal(roleSession.department, "Planning");
      assert.equal(roleSession.display_name, "Planner A");
      assert.equal(roleSession.subject_ref, "auth0|planner-a");
      assert.deepEqual(roleSession.allowed_skins, ["permitting", "operations"]);
      assert.equal(roleSession.active_skin, "permitting");
      assert.equal(roleSession.holds.length, 0);
    },
  },
  {
    name: "unknown or missing role claim falls back to public with visible advisory",
    run: () => {
      const unknownRoleSession = resolveDashboardRoleSession({
        activeSkin: "public",
        auth: createAuthState({
          authStatus: "authenticated",
          isAuthenticated: true,
          user: {
            civic_role: "unmapped_role",
            sub: "auth0|unknown",
          },
        }),
      });
      const missingRoleSession = resolveDashboardRoleSession({
        activeSkin: "public",
        auth: createAuthState({
          authStatus: "authenticated",
          isAuthenticated: true,
          user: {
            department: "Planning",
            sub: "auth0|missing-role",
          },
        }),
      });
      const markup = renderMarkup(
        <RoleSessionPanel
          auth={createAuthState({ authStatus: "authenticated", isAuthenticated: true })}
          roleSession={unknownRoleSession}
        />
      );

      assert.equal(unknownRoleSession.role, "public");
      assert.equal(unknownRoleSession.holds[0]?.code, "role_claim_unrecognized");
      assert.equal(missingRoleSession.role, "public");
      assert.equal(missingRoleSession.holds[0]?.code, "role_claim_missing");
      assert.equal(markup.includes("HOLD: Authenticated role claim is not recognized"), true);
    },
  },
  {
    name: "public role cannot select restricted skins",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const views = adaptStepSkinPayloads(record.scenario.steps[0]);
      let selected = "public";
      const markup = renderMarkup(
        <SkinSwitcher
          activeSkinTab="public"
          allowedSkins={["public"]}
          onSelect={(key) => {
            selected = key;
          }}
          status="ready"
          views={views}
        />
      );
      const permittingSegment = findSkinTabSegment(markup, "permitting");
      const publicSegment = findSkinTabSegment(markup, "public");

      assert.equal(permittingSegment.includes('disabled=""'), true);
      assert.equal(permittingSegment.includes("Local dashboard role boundary"), true);
      assert.equal(publicSegment.includes('disabled=""'), false);
      assert.equal(selected, "public");
    },
  },
  {
    name: "restricted role cannot select unauthorized skins",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const views = adaptStepSkinPayloads(record.scenario.steps[0]);
      const markup = renderMarkup(
        <SkinSwitcher
          activeSkinTab="operations"
          allowedSkins={["operations"]}
          onSelect={() => undefined}
          status="ready"
          views={views}
        />
      );

      assert.equal(findSkinTabSegment(markup, "operations").includes('disabled=""'), false);
      assert.equal(findSkinTabSegment(markup, "council").includes('disabled=""'), true);
    },
  },
  {
    name: "judge demo operator can access all shipped skins",
    run: () => {
      const roleSession = resolveDashboardRoleSession({
        activeSkin: "dispatch",
        auth: createAuthState({
          authStatus: "authenticated",
          isAuthenticated: true,
          user: {
            role: "judge_demo_operator",
            sub: "auth0|judge-demo",
          },
        }),
      });

      assert.deepEqual(roleSession.allowed_skins, DASHBOARD_SKIN_ORDER);
      assert.equal(roleSession.active_skin, "dispatch");
    },
  },
  {
    name: "current unauthorized active skin is corrected to an allowed skin",
    run: () => {
      const roleSession = resolveDashboardRoleSession({
        activeSkin: "dispatch",
        auth: createAuthState({
          authStatus: "authenticated",
          isAuthenticated: true,
          user: {
            civic_role: "city_attorney",
            sub: "auth0|city-attorney",
          },
        }),
      });

      assert.deepEqual(roleSession.allowed_skins, ["council", "public"]);
      assert.equal(roleSession.active_skin, "council");
      assert.equal(roleSession.holds[0]?.code, "active_skin_not_allowed");
    },
  },
  {
    name: "step.skins.outputs remains in use and step.skins.renders remains absent",
    run: async () => {
      const adapterSource = await readFile(
        "src/adapters/skinPayloadAdapter.ts",
        "utf8"
      );

      assert.equal(adapterSource.includes("step.skins.outputs"), true);
      assert.equal(adapterSource.includes("step.skins.renders"), false);
    },
  },
  {
    name: "snapshot mode still works and Live Mode controls still render",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(
        <MeridianAuthContext.Provider value={createAuthState()}>
          <ControlRoomShell records={records} />
        </MeridianAuthContext.Provider>
      );

      assert.equal(markup.includes("Snapshot remains the default stable path"), true);
      assert.equal(markup.includes("data-live-mode=\"enabled\""), false);
      assert.equal(markup.includes("Role session proof"), true);
      assert.equal(markup.includes("Public snapshot"), true);
    },
  },
  {
    name: "authority dashboard adapter handles unavailable and empty states",
    run: async () => {
      const unavailable = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: null,
        roleSession: createPublicRoleSession(),
      });
      const record = await loadScenarioRecord("routine");
      const currentStep = buildTimelineSteps(record.scenario)[0];
      const empty = buildAuthorityDashboardState({
        currentStep,
        liveProjection: null,
        roleSession: createPublicRoleSession(),
      });

      assert.equal(unavailable.status, "unavailable");
      assert.equal(unavailable.advisories[0]?.code, "authority_inputs_unavailable");
      assert.equal(empty.status, "empty");
      assert.equal(empty.requests.length, 0);
    },
  },
  {
    name: "authority dashboard adapter reads pending and resolved explicit requests",
    run: () => {
      const state = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          generated_requests: [
            createAuthorityRequest("pending"),
            createAuthorityRequest("approved"),
            createAuthorityRequest("denied"),
            createAuthorityRequest("expired"),
          ],
        }),
        roleSession: createJudgeRoleSession(),
      });

      assert.equal(state.counts.pending, 1);
      assert.equal(state.counts.approved, 1);
      assert.equal(state.counts.denied, 1);
      assert.equal(state.counts.expired, 1);
      assert.equal(
        state.requests[0]?.source_refs.some(
          (ref) => ref.path === "authority_context.required_approvals"
        ),
        true
      );
    },
  },
  {
    name: "authority dashboard adapter holds ambiguous authority payloads",
    run: () => {
      const state = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          authority_ref: "authority-ref-without-safe-shape",
        }),
        roleSession: createPublicRoleSession(),
      });

      assert.equal(state.status, "holding");
      assert.equal(state.advisories[0]?.code, "authority_payload_ambiguous");
    },
  },
  {
    name: "authority resolution panel redacts public detail and shows judge detail",
    run: () => {
      const projection = createAuthorityProjection({
        generated_requests: [createAuthorityRequest("pending")],
      });
      const publicState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: projection,
        roleSession: createPublicRoleSession(),
      });
      const judgeState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: projection,
        roleSession: createJudgeRoleSession(),
      });
      const publicMarkup = renderMarkup(<AuthorityResolutionPanel state={publicState} />);
      const judgeMarkup = renderMarkup(<AuthorityResolutionPanel state={judgeState} />);

      assert.equal(publicMarkup.includes("Authority request pending."), true);
      assert.equal(publicMarkup.includes("restricted-demo-trace"), false);
      assert.equal(publicMarkup.includes("Restricted authority detail redacted"), true);
      assert.equal(judgeMarkup.includes("Binding context keys"), true);
      assert.equal(judgeMarkup.includes("Source absence"), true);
      assert.equal(judgeMarkup.includes("authority_context.required_approvals"), true);
    },
  },
  {
    name: "authority resolution panel renders empty and advisory states",
    run: () => {
      const emptyState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({}),
        roleSession: createPublicRoleSession(),
      });
      const holdState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          authority_ref: "ambiguous-only",
        }),
        roleSession: createPublicRoleSession(),
      });
      const emptyMarkup = renderMarkup(<AuthorityResolutionPanel state={emptyState} />);
      const holdMarkup = renderMarkup(<AuthorityResolutionPanel state={holdState} />);

      assert.equal(emptyMarkup.includes("No authority requests"), true);
      assert.equal(holdMarkup.includes("HOLD: authority_payload_ambiguous"), true);
      assert.equal(emptyMarkup.includes("ARR-pending"), false);
    },
  },
  {
    name: "authority timeline sorts lifecycle records and avoids forensic claim without refs",
    run: () => {
      const state = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          lifecycle_records: [
            {
              kind: "approved",
              label: "Approved",
              occurred_at: "2026-04-27T15:00:00.000Z",
              summary: "Authority approved request.",
            },
            {
              kind: "notification_prepared",
              label: "Notification prepared",
              occurred_at: "2026-04-27T14:00:00.000Z",
              summary: "Notification payload prepared.",
            },
          ],
        }),
        roleSession: createJudgeRoleSession(),
      });
      const markup = renderMarkup(<AuthorityTimeline state={state} />);

      assert.equal(
        markup.indexOf("Notification prepared") < markup.indexOf("Approved"),
        true
      );
      assert.equal(markup.includes("Forensic refs:"), false);
    },
  },
  {
    name: "authority timeline renders forensic refs only when explicit refs exist",
    run: () => {
      const state = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          lifecycle_records: [
            {
              forensic_refs: ["forensic-ref-explicit"],
              kind: "approved",
              label: "Approved",
              occurred_at: "2026-04-27T15:00:00.000Z",
              summary: "Authority approved request.",
            },
          ],
        }),
        roleSession: createJudgeRoleSession(),
      });
      const markup = renderMarkup(<AuthorityTimeline state={state} />);

      assert.equal(markup.includes("Forensic refs: forensic-ref-explicit"), true);
    },
  },
  {
    name: "garp status indicator shows local counts without CIBA or service language",
    run: () => {
      const state = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          generated_requests: [
            createAuthorityRequest("pending"),
            createAuthorityRequest("approved"),
            createAuthorityRequest("denied"),
            createAuthorityRequest("expired"),
            createAuthorityRequest("holding"),
          ],
        }),
        roleSession: createJudgeRoleSession(),
      });
      const markup = renderMarkup(<GARPStatusIndicator state={state} />);
      const lowerMarkup = markup.toLowerCase();

      assert.equal(markup.includes("GARP authority state"), true);
      assert.equal(markup.includes("Pending"), true);
      assert.equal(markup.includes("Denied / expired"), true);
      assert.equal(markup.includes("Holding"), true);
      assert.equal(lowerMarkup.includes("ciba"), false);
      assert.equal(lowerMarkup.includes("service connectivity"), false);
      assert.equal(lowerMarkup.includes("service health"), false);
    },
  },
  {
    name: "authority notification demo renders explicit payload and does not fetch",
    run: () => {
      let fetchCalled = false;
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (() => {
        fetchCalled = true;
        throw new Error("network should not be called");
      }) as typeof globalThis.fetch;

      try {
        const state = buildAuthorityDashboardState({
          currentStep: null,
          liveProjection: createAuthorityProjection({
            notification_payload: {
              action_url: "https://example.test/authority?action=explicit-token",
              actions: [
                {
                  label: "Approve",
                  response_token: "garp-action-v1-explicit-token",
                  url: "https://example.test/approve?token=explicit-token",
                },
              ],
              body: "Authority request requires review.",
              channel: "simulated_device",
              source_refs: ["notification.explicit"],
              title: "Authority request",
              token_hashes: ["sha256:explicit-token-hash"],
            },
          }),
          roleSession: createJudgeRoleSession(),
        });
        const markup = renderMarkup(<AuthorityNotificationDemo state={state} />);

        assert.equal(markup.includes("Simulated authority-device preview"), true);
        assert.equal(markup.includes("garp-action-v1-explicit-token"), true);
        assert.equal(markup.includes("sha256:explicit-token-hash"), true);
        assert.equal(fetchCalled, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "authority notification demo shows empty state without explicit payload",
    run: () => {
      const state = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({}),
        roleSession: createPublicRoleSession(),
      });
      const markup = renderMarkup(<AuthorityNotificationDemo state={state} />);

      assert.equal(markup.includes("Simulated authority-device preview"), true);
      assert.equal(markup.includes("No explicit simulated authority-device payload"), true);
      assert.equal(markup.includes("garp-action-v1"), false);
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
