import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { AUTH0_ROLES_CLAIM_NAMESPACE, resolveAuth0DashboardConfig } from "../src/auth/authConfig.ts";
import type { MeridianAuthState } from "../src/auth/MeridianAuthProvider.tsx";
import {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
  type SharedAuthorityClient,
  type SharedAuthorityClientResult,
  type SharedAuthorityEventPayload,
  type SharedAuthorityListPayload,
  type SharedAuthorityMutationPayload,
  type SharedAuthorityRequest,
} from "../src/authority/sharedAuthorityClient.ts";
import {
  buildSharedAuthorityDisplayState,
  buildSharedAuthorityRequestDraft,
  getSharedAuthorityPermissions,
} from "../src/authority/sharedAuthorityEvents.ts";
import {
  SHARED_AUTHORITY_INITIAL_STATE,
  startSharedAuthorityPolling,
  type SharedAuthorityRequestsState,
  type UseSharedAuthorityRequestsResult,
} from "../src/authority/useSharedAuthorityRequests.ts";
import { buildAuthorityDashboardState } from "../src/authority/authorityStateAdapter.ts";
import { AuthorityResolutionPanel } from "../src/components/AuthorityResolutionPanel.tsx";
import { AuthorityTimeline } from "../src/components/AuthorityTimeline.tsx";
import { GARPStatusIndicator } from "../src/components/GARPStatusIndicator.tsx";
import type { JsonObject } from "../src/live/liveTypes.ts";
import { resolveDashboardRoleSession } from "../src/roleSession/resolveRoleSession.ts";
import type { DashboardRoleSessionProofV1 } from "../src/roleSession/roleSessionTypes.ts";
import {
  createTestLiveProjection,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

function createAuthState(user: Record<string, unknown> | null): MeridianAuthState {
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

function roleSessionFor(
  roleClaim: string | null,
  activeSkin: "council" | "operations" | "permitting" | "public" = "public"
): DashboardRoleSessionProofV1 {
  return resolveDashboardRoleSession({
    activeSkin,
    auth: createAuthState(
      roleClaim
        ? {
            [AUTH0_ROLES_CLAIM_NAMESPACE]: [roleClaim],
            department: "public_works",
            name: roleClaim,
            sub: `auth0|${roleClaim}`,
          }
        : null
    ),
  });
}

function createAuthorityRequest(
  overrides: Partial<SharedAuthorityRequest> = {}
): SharedAuthorityRequest {
  return {
    binding_context: {
      source_refs: ["dashboard.authority.shared_endpoint"],
    },
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
    request_id: "ARR-SHARED-1",
    required_authority_department: "public_works",
    required_authority_role: "public_works_director",
    resolution_type: "approval",
    source_absence_id: "absence-shared-1",
    source_governance_evaluation: "governance-shared-1",
    status: "pending",
    ...overrides,
  };
}

function createSharedEvent(
  type: SharedAuthorityEventPayload["type"],
  request: SharedAuthorityRequest
): SharedAuthorityEventPayload {
  return {
    event_payload_only: true,
    request,
    request_id: request.request_id,
    sequence: 1,
    side_effects: {
      ciba: false,
      forensic_chain_write: false,
      notification_delivery: false,
      openfga: false,
    },
    type,
  };
}

function okList(
  requests: readonly SharedAuthorityRequest[]
): SharedAuthorityClientResult<SharedAuthorityListPayload> {
  return {
    data: {
      count: requests.length,
      requests,
    },
    endpointStatus: "connected",
    hold: null,
    httpStatus: 200,
    ok: true,
  };
}

function okMutation(
  request: SharedAuthorityRequest,
  type: SharedAuthorityEventPayload["type"]
): SharedAuthorityClientResult<SharedAuthorityMutationPayload> {
  return {
    data: {
      event: createSharedEvent(type, request),
      request,
    },
    endpointStatus: "connected",
    hold: null,
    httpStatus: type === "AUTHORITY_RESOLUTION_REQUESTED" ? 201 : 200,
    ok: true,
  };
}

function createSharedState(
  overrides: Partial<SharedAuthorityRequestsState> = {}
): UseSharedAuthorityRequestsResult {
  return {
    ...SHARED_AUTHORITY_INITIAL_STATE,
    endpointStatus: "connected",
    hold: null,
    loading: false,
    createRequest: async (request) =>
      okMutation(request, "AUTHORITY_RESOLUTION_REQUESTED"),
    refresh: async () => undefined,
    resetRequests: async () => undefined,
    resolveRequest: async ({ request_id, resolution }) =>
      okMutation(
        createAuthorityRequest({
          request_id,
          status: resolution,
        }),
        resolution === "approved" ? "AUTHORITY_APPROVED" : "AUTHORITY_DENIED"
      ),
    ...overrides,
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

function createBaseAuthorityState(roleSession: DashboardRoleSessionProofV1) {
  return buildAuthorityDashboardState({
    currentStep: null,
    liveProjection: createAuthorityProjection({}),
    roleSession,
  });
}

function buttonSegment(markup: string, label: string): string {
  const labelIndex = markup.indexOf(`>${label}<`);

  assert.notEqual(labelIndex, -1, label);

  const start = markup.lastIndexOf("<button", labelIndex);
  const end = markup.indexOf("</button>", labelIndex);

  return markup.slice(start, end);
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

const tests = [
  {
    name: "unauthorized public role cannot submit restricted shared request",
    run: () => {
      const roleSession = roleSessionFor(null);
      const permissions = getSharedAuthorityPermissions(roleSession);
      const state = createBaseAuthorityState(roleSession);
      const markup = renderMarkup(
        <AuthorityResolutionPanel
          sharedAuthority={createSharedState()}
          state={state}
        />
      );

      assert.equal(permissions.canSubmit, false);
      assert.equal(permissions.canResolve, false);
      assert.equal(buttonSegment(markup, "Submit shared request").includes("disabled"), true);
      assert.equal(markup.includes("Shared endpoint connected"), true);
    },
  },
  {
    name: "field inspector can submit shared authority request",
    run: () => {
      const roleSession = roleSessionFor("field_inspector", "permitting");
      const permissions = getSharedAuthorityPermissions(roleSession);
      const state = createBaseAuthorityState(roleSession);
      const draft = buildSharedAuthorityRequestDraft(state);
      const markup = renderMarkup(
        <AuthorityResolutionPanel
          sharedAuthority={createSharedState()}
          state={state}
        />
      );

      assert.equal(roleSession.role, "permitting_staff");
      assert.equal(permissions.canSubmit, true);
      assert.equal(draft.contract, AUTHORITY_RESOLUTION_REQUEST_CONTRACT);
      assert.equal(draft.required_authority_role, "public_works_director");
      assert.equal(buttonSegment(markup, "Submit shared request").includes("disabled"), false);
    },
  },
  {
    name: "department director can approve and deny shared pending request",
    run: () => {
      const roleSession = roleSessionFor("department_director", "operations");
      const permissions = getSharedAuthorityPermissions(roleSession);
      const request = createAuthorityRequest();
      const state = createBaseAuthorityState(roleSession);
      const markup = renderMarkup(
        <AuthorityResolutionPanel
          sharedAuthority={createSharedState({
            requests: [request],
          })}
          state={state}
        />
      );

      assert.equal(roleSession.role, "public_works_director");
      assert.equal(permissions.canResolve, true);
      assert.equal(markup.includes("ARR-SHARED-1"), true);
      assert.equal(buttonSegment(markup, "Approve").includes("disabled"), false);
      assert.equal(buttonSegment(markup, "Deny").includes("disabled"), false);
    },
  },
  {
    name: "operations lead maps to approved operational approver role",
    run: () => {
      const roleSession = roleSessionFor("operations_lead", "operations");
      const permissions = getSharedAuthorityPermissions(roleSession);

      assert.equal(roleSession.role, "public_works_director");
      assert.equal(permissions.canResolve, true);
      assert.equal(permissions.canReview, true);
    },
  },
  {
    name: "council member can review but cannot approve or deny shared request",
    run: () => {
      const roleSession = roleSessionFor("council_member", "council");
      const permissions = getSharedAuthorityPermissions(roleSession);
      const markup = renderMarkup(
        <AuthorityResolutionPanel
          sharedAuthority={createSharedState({
            requests: [createAuthorityRequest()],
          })}
          state={createBaseAuthorityState(roleSession)}
        />
      );

      assert.equal(permissions.canReview, true);
      assert.equal(permissions.canResolve, false);
      assert.equal(markup.includes("Review-only for this dashboard-local role."), true);
      assert.equal(markup.includes(">Approve<"), false);
      assert.equal(markup.includes(">Deny<"), false);
    },
  },
  {
    name: "pending shared request appears after refresh state",
    run: () => {
      const roleSession = roleSessionFor("department_director", "operations");
      const request = createAuthorityRequest();
      const state = createBaseAuthorityState(roleSession);
      const sharedView = buildSharedAuthorityDisplayState(
        state,
        createSharedState({
          requests: [request],
        })
      );
      const markup = renderMarkup(
        <AuthorityResolutionPanel
          sharedAuthority={createSharedState({
            requests: [request],
          })}
          state={state}
        />
      );

      assert.equal(sharedView.state.counts.pending, 1);
      assert.equal(
        sharedView.state.requests.some((entry) => entry.request_id === "ARR-SHARED-1"),
        true
      );
      assert.equal(markup.includes("Shared authority request pending."), true);
    },
  },
  {
    name: "resolved shared request updates after refresh state",
    run: () => {
      const roleSession = roleSessionFor("department_director", "operations");
      const request = createAuthorityRequest({ status: "approved" });
      const shared = createSharedState({
        requests: [request],
      });
      const sharedView = buildSharedAuthorityDisplayState(
        createBaseAuthorityState(roleSession),
        shared
      );
      const markup = renderMarkup(
        <AuthorityTimeline
          sharedAuthority={shared}
          state={createBaseAuthorityState(roleSession)}
        />
      );

      assert.equal(sharedView.state.counts.approved, 1);
      assert.equal(markup.includes("AUTHORITY_APPROVED"), true);
      assert.equal(markup.includes("Shared authority request approved."), true);
    },
  },
  {
    name: "returned event-compatible payload is consumed for timeline display",
    run: () => {
      const roleSession = roleSessionFor("department_director", "operations");
      const request = createAuthorityRequest({ status: "denied" });
      const shared = createSharedState({
        events: [createSharedEvent("AUTHORITY_DENIED", request)],
        requests: [request],
      });
      const markup = renderMarkup(
        <AuthorityTimeline
          sharedAuthority={shared}
          state={createBaseAuthorityState(roleSession)}
        />
      );

      assert.equal(markup.includes("AUTHORITY_DENIED"), true);
      assert.equal(markup.includes("Shared authority request denied."), true);
      assert.equal(markup.includes("Forensic refs:"), false);
    },
  },
  {
    name: "endpoint unavailable does not break snapshot dashboard fallback",
    run: () => {
      const roleSession = roleSessionFor("department_director", "operations");
      const baseState = buildAuthorityDashboardState({
        currentStep: null,
        liveProjection: createAuthorityProjection({
          generated_requests: [
            createAuthorityRequest({
              request_id: "ARR-SNAPSHOT-1",
            }) as unknown as JsonObject,
          ],
        }),
        roleSession,
      });
      const unavailable = createSharedState({
        endpointStatus: "unavailable",
        hold: {
          code: "shared_authority_network_failure",
          message: "HOLD: Shared authority endpoint request failed closed.",
          severity: "HOLD",
          source_ref: "dashboard.shared_authority.refresh",
        },
        requests: [],
      });
      const sharedView = buildSharedAuthorityDisplayState(baseState, unavailable);
      const markup = renderMarkup(
        <GARPStatusIndicator sharedAuthority={unavailable} state={baseState} />
      );

      assert.equal(sharedView.state.requests.length, baseState.requests.length);
      assert.equal(
        sharedView.state.requests.some((entry) => entry.request_id === "ARR-SNAPSHOT-1"),
        true
      );
      assert.equal(markup.includes("Shared endpoint"), true);
      assert.equal(markup.includes("unavailable"), true);
      assert.equal(markup.includes("failed closed"), true);
    },
  },
  {
    name: "shared authority polling refreshes and cleans up timers",
    run: async () => {
      const pending = createAuthorityRequest({ status: "pending" });
      const approved = createAuthorityRequest({ status: "approved" });
      const states: SharedAuthorityRequestsState[] = [];
      const intervals: Array<() => void> = [];
      let cleared = false;
      let callCount = 0;
      const client: SharedAuthorityClient = {
        createRequest: async (request) =>
          okMutation(request, "AUTHORITY_RESOLUTION_REQUESTED"),
        listRequests: async () => {
          callCount += 1;
          return okList(callCount === 1 ? [pending] : [approved]);
        },
        resetRequests: async () => ({
          data: {
            cleared_count: 0,
            requests: [],
            reset: true,
          },
          endpointStatus: "connected",
          hold: null,
          httpStatus: 200,
          ok: true,
        }),
        resolveRequest: async ({ request_id, resolution }) =>
          okMutation(
            createAuthorityRequest({
              request_id,
              status: resolution,
            }),
            resolution === "approved" ? "AUTHORITY_APPROVED" : "AUTHORITY_DENIED"
          ),
      };
      const controller = startSharedAuthorityPolling(
        {
          client,
          pollIntervalMs: 1000,
        },
        (state) => states.push(state),
        {
          clearInterval: () => {
            cleared = true;
          },
          setInterval: (handler) => {
            intervals.push(handler);
            return "interval";
          },
        }
      );

      await flushMicrotasks();
      assert.equal(
        states.some((state) =>
          state.requests.some((request) => request.status === "pending")
        ),
        true
      );

      await controller.refresh();
      assert.equal(
        states.some((state) =>
          state.requests.some((request) => request.status === "approved")
        ),
        true
      );
      assert.equal(intervals.length, 1);

      controller.stop();
      assert.equal(cleared, true);
    },
  },
  {
    name: "shared authority UI does not expose reset as operator CTA",
    run: () => {
      const roleSession = roleSessionFor("field_inspector", "permitting");
      const markup = renderMarkup(
        <AuthorityResolutionPanel
          sharedAuthority={createSharedState()}
          state={createBaseAuthorityState(roleSession)}
        />
      );

      assert.equal(markup.includes("Reset shared"), false);
      assert.equal(markup.includes("resetRequests"), false);
    },
  },
  {
    name: "AUTH-3 source has no OpenFGA CIBA delivery Foreman or model behavior",
    run: async () => {
      const source = (
        await Promise.all([
          readFile("src/authority/sharedAuthorityClient.ts", "utf8"),
          readFile("src/authority/useSharedAuthorityRequests.ts", "utf8"),
          readFile("src/authority/sharedAuthorityEvents.ts", "utf8"),
          readFile("src/components/AuthorityResolutionPanel.tsx", "utf8"),
          readFile("src/components/AuthorityTimeline.tsx", "utf8"),
          readFile("src/components/GARPStatusIndicator.tsx", "utf8"),
        ])
      ).join("\n");
      const forbiddenRuntime = [
        "../../src/live",
        "../../src/governance",
        "../../src/skins",
        "new WebSocket",
        "EventSource",
        "Notification.requestPermission",
        "navigator.serviceWorker",
        "PushManager",
        "sendgrid",
        "smtp",
        "OpenFgaClient",
        "createOpenFga",
        "Auth0Provider",
        "ForemanMount",
        "foremanGuide",
        "anthropic",
        "openai",
        "localStorage",
        "indexedDB",
      ];

      for (const fragment of forbiddenRuntime) {
        assert.equal(source.includes(fragment), false, fragment);
      }
    },
  },
];

await runTests(tests);
