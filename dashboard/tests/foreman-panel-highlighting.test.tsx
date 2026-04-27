import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import {
  AUTHORITY_DASHBOARD_STATE_CONTRACT,
  AUTHORITY_TIMELINE_VIEW_CONTRACT,
  type AuthorityDashboardStateV1,
} from "../src/authority/authorityDashboardTypes.ts";
import type { SharedAuthorityRequest } from "../src/authority/sharedAuthorityClient.ts";
import type { UseSharedAuthorityRequestsResult } from "../src/authority/useSharedAuthorityRequests.ts";
import { AuthorityResolutionPanel } from "../src/components/AuthorityResolutionPanel.tsx";
import { AuthorityTimeline } from "../src/components/AuthorityTimeline.tsx";
import { DisclosurePreviewPanel } from "../src/components/DisclosurePreviewPanel.tsx";
import { ForemanGuidePanel } from "../src/components/ForemanGuidePanel.tsx";
import { GARPStatusIndicator } from "../src/components/GARPStatusIndicator.tsx";
import { LiveEventRail } from "../src/components/LiveEventRail.tsx";
import {
  FOREMAN_GUIDE_SIGNAL_VERSION,
  type ForemanGuideSignalV1,
} from "../src/foremanGuide/foremanSignals.ts";
import { appendProactiveForemanSignals } from "../src/foremanGuide/useForemanGuide.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import {
  createTestLiveEvent,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

function createRoleSession(): DashboardRoleSessionProofV1 {
  return {
    active_skin: "operations",
    allowed_skins: ["operations", "public"],
    auth_status: "authenticated",
    contract: ROLE_SESSION_PROOF_CONTRACT,
    department: "public_works",
    display_name: "B4 highlight tester",
    holds: [],
    role: "public_works_director",
    source: "auth0_role_claim",
    subject_ref: "auth0|b4-highlight",
  };
}

function createAuthorityState(): AuthorityDashboardStateV1 {
  const roleSession = createRoleSession();

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
      mode: "internal",
      role: roleSession.role,
    },
    redaction_mode: "internal",
    requests: [],
    role_session: roleSession,
    source_refs: [],
    status: "empty",
    timeline: {
      contract: AUTHORITY_TIMELINE_VIEW_CONTRACT,
      records: [],
    },
  };
}

function createSharedAuthority(): UseSharedAuthorityRequestsResult {
  const hold = {
    code: "shared_authority_test_hold",
    message: "HOLD: test shared authority client is inert.",
    severity: "HOLD" as const,
    source_ref: "dashboard.shared_authority.test",
  };
  const result = {
    data: null,
    endpointStatus: "holding" as const,
    hold,
    httpStatus: null,
    ok: false as const,
  };

  return {
    createRequest: async (_request: SharedAuthorityRequest) => result,
    endpointStatus: "holding",
    events: [],
    hold,
    loading: false,
    refresh: async () => undefined,
    requests: [],
    resetRequests: async () => undefined,
    resolveRequest: async () => result,
  };
}

function createSignal(): ForemanGuideSignalV1 {
  return {
    created_at: "dashboard-local",
    dedupe_key: "authority.requested:ARR-B4-HIGHLIGHT",
    eligible_for_proactive_narration: true,
    event_ref: "ARR-B4-HIGHLIGHT",
    holds: [],
    kind: "authority.requested",
    panel_id: "authority-resolution",
    priority: "medium",
    signal_id: "foreman-signal-authority-requested-arr-b4-highlight",
    source_ref: "dashboard.shared_authority.request:ARR-B4-HIGHLIGHT",
    source_refs: [
      {
        evidence_id: "ARR-B4-HIGHLIGHT",
        label: "B4 highlight source",
        path: "/api/authority-requests",
        source_kind: "dashboard.shared_authority",
        source_ref: "dashboard.shared_authority.request:ARR-B4-HIGHLIGHT",
      },
    ],
    summary: "ARR-B4-HIGHLIGHT is pending in shared authority requests.",
    title: "Authority requested",
    version: FOREMAN_GUIDE_SIGNAL_VERSION,
  };
}

const tests = [
  {
    name: "panel highlight id is set from proactive signal response",
    run: () => {
      const result = appendProactiveForemanSignals({
        context: null,
        messages: [],
        paused: false,
        signals: [createSignal()],
      });

      assert.equal(result.highlightedPanelId, "authority-resolution");
      assert.equal(result.messages[0]?.response?.source_refs.length, 1);
    },
  },
  {
    name: "highlight can be reset to an unhighlighted panel state",
    run: () => {
      const markup = renderMarkup(
        <AuthorityResolutionPanel
          foremanHighlighted={false}
          sharedAuthority={createSharedAuthority()}
          state={createAuthorityState()}
        />
      );

      assert.equal(markup.includes('data-foreman-highlighted="false"'), true);
      assert.equal(markup.includes("foreman-panel-highlight"), false);
    },
  },
  {
    name: "approved panels receive visual-only Foreman highlight attributes",
    run: () => {
      const state = createAuthorityState();
      const sharedAuthority = createSharedAuthority();
      const markup = renderMarkup(
        <>
          <AuthorityResolutionPanel
            foremanHighlighted
            sharedAuthority={sharedAuthority}
            state={state}
          />
          <AuthorityTimeline
            foremanHighlighted
            sharedAuthority={sharedAuthority}
            state={state}
          />
          <DisclosurePreviewPanel foremanHighlighted report={null} />
          <LiveEventRail
            events={[createTestLiveEvent()]}
            foremanHighlighted
          />
          <GARPStatusIndicator
            foremanHighlighted
            sharedAuthority={sharedAuthority}
            state={state}
          />
        </>
      );

      for (const panelId of [
        "authority-resolution",
        "authority-timeline",
        "disclosure-preview",
        "live-event-rail",
        "garp-status",
      ]) {
        assert.equal(
          markup.includes(`data-foreman-panel-id="${panelId}"`),
          true,
          panelId
        );
      }

      assert.equal(
        (markup.match(/data-foreman-highlighted="true"/g) ?? []).length,
        5
      );
      assert.equal(markup.includes("foreman-panel-highlight"), true);
    },
  },
  {
    name: "Foreman panel renders proactive status and active panel label",
    run: () => {
      const markup = renderMarkup(
        <ForemanGuidePanel
          activePanelId="authority-resolution"
          context={null}
          proactiveSignals={[createSignal()]}
        />
      );

      assert.equal(markup.includes("Proactive narration"), true);
      assert.equal(markup.includes("Pause proactive"), true);
      assert.equal(markup.includes("Looking at"), true);
      assert.equal(markup.includes("Authority Resolution"), true);
      assert.equal(markup.includes('data-foreman-proactive-signals="true"'), true);
    },
  },
  {
    name: "Foreman highlight style is a bounded visual class",
    run: async () => {
      const styles = await readFile(
        path.resolve(process.cwd(), "src", "styles.css"),
        "utf8"
      );
      const highlightBlock = styles.slice(
        styles.indexOf(".foreman-panel-highlight"),
        styles.indexOf(".director-toggle__bookmarks")
      );

      assert.equal(highlightBlock.includes("box-shadow"), true);
      assert.equal(highlightBlock.includes("display:"), false);
      assert.equal(highlightBlock.includes("position:"), false);
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
