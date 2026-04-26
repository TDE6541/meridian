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
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { RoleSessionPanel } from "../src/components/RoleSessionPanel.tsx";
import { SkinSwitcher } from "../src/components/SkinSwitcher.tsx";
import { resolveDashboardRoleSession } from "../src/roleSession/resolveRoleSession.ts";
import { ROLE_SESSION_PROOF_CONTRACT } from "../src/roleSession/roleSessionTypes.ts";
import {
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
];

async function main() {
  await runTests(tests);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
