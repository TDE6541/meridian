import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import {
  AUTHORITY_DASHBOARD_STATE_CONTRACT,
  AUTHORITY_TIMELINE_VIEW_CONTRACT,
  type AuthorityDashboardStateV1,
  type AuthorityDashboardStatus,
} from "../src/authority/authorityDashboardTypes.ts";
import {
  SHARED_AUTHORITY_EVENT_TYPES,
  type SharedAuthorityEventPayload,
  type SharedAuthorityRequest,
} from "../src/authority/sharedAuthorityClient.ts";
import {
  SHARED_AUTHORITY_INITIAL_STATE,
  type SharedAuthorityRequestsState,
} from "../src/authority/useSharedAuthorityRequests.ts";
import { SyncPill } from "../src/components/SyncPill.tsx";
import {
  requestAuthoritySignalVibration,
  type AuthorityVibrationAttempt,
} from "../src/demo/deviceVibration.ts";
import { buildSyncChoreographyView } from "../src/demo/syncChoreography.ts";
import { ROLE_SESSION_PROOF_CONTRACT } from "../src/roleSession/roleSessionTypes.ts";
import {
  createTestLiveEvent,
  createTestLiveProjection,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

const emptyForensicChain = {
  activeStepId: null,
  cumulativeEntries: [],
  currentStepEntryIds: new Set<string>(),
  entryVocabulary: [],
  hasEntries: false,
  sourceMode: "derived-from-step-entries" as const,
  stepEntryCount: 0,
  totalEntryCount: 0,
};

function createAuthorityState(
  status: AuthorityDashboardStatus = "empty",
  counts: Partial<AuthorityDashboardStateV1["counts"]> = {}
): AuthorityDashboardStateV1 {
  return {
    advisories: [],
    contract: AUTHORITY_DASHBOARD_STATE_CONTRACT,
    counts: {
      approved: 0,
      denied: 0,
      expired: 0,
      holding: 0,
      pending: 0,
      total: 0,
      ...counts,
    },
    notification_preview: {
      actions: [],
      advisory: null,
      body: null,
      built_at: null,
      channel: null,
      payload: null,
      request_id: null,
      source_refs: [],
      status: "empty",
      title: null,
      token_hashes: {},
    },
    public_boundary: {
      mode: "public",
      role: "public",
    },
    redaction_mode: "public",
    requests: [],
    role_session: {
      active_skin: "public",
      allowed_skins: ["public"],
      auth_status: "unauthenticated",
      contract: ROLE_SESSION_PROOF_CONTRACT,
      department: null,
      display_name: null,
      holds: [],
      role: "public",
      source: "public_default",
      subject_ref: null,
    },
    source_refs: [],
    status,
    timeline: {
      contract: AUTHORITY_TIMELINE_VIEW_CONTRACT,
      records: [],
    },
  };
}

function createRequest(overrides: Partial<SharedAuthorityRequest> = {}) {
  return {
    request_id: "ARR-SYNC-1",
    status: "pending",
    ...overrides,
  } satisfies SharedAuthorityRequest;
}

function createEvent(
  type: SharedAuthorityEventPayload["type"],
  request: SharedAuthorityRequest = createRequest()
): SharedAuthorityEventPayload {
  return {
    event_payload_only: true,
    request,
    request_id: request.request_id,
    sequence: 7,
    type,
  };
}

function createSharedState(
  overrides: Partial<SharedAuthorityRequestsState> = {}
): SharedAuthorityRequestsState {
  return {
    ...SHARED_AUTHORITY_INITIAL_STATE,
    endpointStatus: "connected",
    hold: null,
    loading: false,
    requests: [],
    ...overrides,
  };
}

function createVibrationStatus(
  overrides: Partial<AuthorityVibrationAttempt> = {}
): AuthorityVibrationAttempt {
  return {
    reason: "No authority request signal is active.",
    signalId: null,
    status: "idle",
    ...overrides,
  };
}

const tests = [
  {
    name: "SyncPill renders and animates from existing pending shared authority state",
    run: () => {
      const view = buildSyncChoreographyView({
        authorityState: createAuthorityState(),
        dashboardMode: "snapshot",
        forensicChain: emptyForensicChain,
        liveProjection: null,
        sharedAuthority: createSharedState({
          requests: [createRequest()],
        }),
      });
      const markup = renderMarkup(
        <SyncPill
          vibrationStatus={createVibrationStatus()}
          view={view}
        />
      );

      assert.equal(view.pulse, "pending");
      assert.equal(view.animate, true);
      assert.equal(view.vibrationSignalId, "shared-authority-request:ARR-SYNC-1");
      assert.equal(markup.includes('data-sync-pill="true"'), true);
      assert.equal(markup.includes('data-sync-animate="true"'), true);
      assert.equal(markup.includes('data-sync-source="sharedAuthority.requests.pending"'), true);
    },
  },
  {
    name: "approval pulse fires from existing shared approval event",
    run: () => {
      const request = createRequest({ status: "approved" });
      const view = buildSyncChoreographyView({
        authorityState: createAuthorityState(),
        dashboardMode: "snapshot",
        forensicChain: emptyForensicChain,
        liveProjection: null,
        sharedAuthority: createSharedState({
          events: [createEvent("AUTHORITY_APPROVED", request)],
          requests: [request],
        }),
      });
      const markup = renderMarkup(
        <SyncPill
          vibrationStatus={createVibrationStatus()}
          view={view}
        />
      );

      assert.equal(view.pulse, "approved");
      assert.equal(view.directorApprovalPulse, true);
      assert.equal(markup.includes('data-director-approval-pulse="true"'), true);
      assert.equal(markup.includes("Director approval synced"), true);
    },
  },
  {
    name: "projection pulse uses existing live authority event state only",
    run: () => {
      const view = buildSyncChoreographyView({
        authorityState: createAuthorityState(),
        dashboardMode: "live",
        forensicChain: emptyForensicChain,
        liveProjection: createTestLiveProjection({
          events: [
            createTestLiveEvent({
              event_id: "authority-live",
              kind: "authority.evaluated",
              sequence: 4,
            }),
          ],
        }),
        sharedAuthority: createSharedState(),
      });

      assert.equal(view.pulse, "projection");
      assert.equal(view.sourceRef, "projection.events.authority.evaluated");
      assert.equal(view.vibrationSignalId, null);
    },
  },
  {
    name: "Browser vibration is guarded by role enablement support and browser result",
    run: () => {
      const calls: Array<number | readonly number[]> = [];
      const skipped = requestAuthoritySignalVibration({
        enabled: false,
        navigatorLike: {
          vibrate: (pattern) => {
            calls.push(pattern);
            return true;
          },
        },
        signalId: "shared-authority-request:ARR-SYNC-1",
      });
      const unsupported = requestAuthoritySignalVibration({
        enabled: true,
        navigatorLike: null,
        signalId: "shared-authority-request:ARR-SYNC-1",
      });
      const vibrated = requestAuthoritySignalVibration({
        enabled: true,
        navigatorLike: {
          vibrate: (pattern) => {
            calls.push(pattern);
            return true;
          },
        },
        signalId: "shared-authority-request:ARR-SYNC-1",
      });
      const declined = requestAuthoritySignalVibration({
        enabled: true,
        navigatorLike: {
          vibrate: () => false,
        },
        signalId: "shared-authority-request:ARR-SYNC-2",
      });

      assert.equal(skipped.status, "skipped");
      assert.equal(unsupported.status, "unsupported");
      assert.equal(vibrated.status, "vibrated");
      assert.equal(declined.status, "declined");
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0], [80, 40, 80]);
    },
  },
  {
    name: "no vibration attempt is made without an authority request landing signal",
    run: () => {
      let called = false;
      const result = requestAuthoritySignalVibration({
        enabled: true,
        navigatorLike: {
          vibrate: () => {
            called = true;
            return true;
          },
        },
        signalId: null,
      });

      assert.equal(result.status, "idle");
      assert.equal(called, false);
    },
  },
  {
    name: "approval pulse can derive from existing authority outcome counts",
    run: () => {
      const view = buildSyncChoreographyView({
        authorityState: createAuthorityState("approved", {
          approved: 1,
          total: 1,
        }),
        dashboardMode: "snapshot",
        forensicChain: emptyForensicChain,
        liveProjection: null,
        sharedAuthority: createSharedState(),
      });

      assert.equal(view.pulse, "approved");
      assert.equal(view.directorApprovalPulse, true);
      assert.equal(view.sourceRef, "authorityState.status.approved");
    },
  },
  {
    name: "no new event types endpoint code websocket or SSE infrastructure are introduced",
    run: async () => {
      assert.deepEqual([...SHARED_AUTHORITY_EVENT_TYPES], [
        "AUTHORITY_RESOLUTION_REQUESTED",
        "AUTHORITY_APPROVED",
        "AUTHORITY_DENIED",
      ]);

      const endpointSource = await readFile("api/authority-requests.js", "utf8");
      const source = (
        await Promise.all([
          readFile("src/authority/sharedAuthorityClient.ts", "utf8"),
          readFile("src/demo/syncChoreography.ts", "utf8"),
          readFile("src/demo/deviceVibration.ts", "utf8"),
          readFile("src/components/SyncPill.tsx", "utf8"),
        ])
      ).join("\n");

      for (const forbidden of [
        "new WebSocket",
        "EventSource",
        "AUTHORITY_SYNC",
        "SYNC_PULSE_EVENT",
        "navigator.serviceWorker",
        "Notification.requestPermission",
        "OpenFgaClient",
      ]) {
        assert.equal(source.includes(forbidden), false, forbidden);
      }

      assert.equal(source.includes("data-sync-pill"), true);
      assert.equal(source.includes("/api/authority-requests"), true);
      assert.equal(endpointSource.includes("data-sync-pill"), false);
      assert.equal(endpointSource.includes("vibrate"), false);
    },
  },
];

await runTests(tests);
