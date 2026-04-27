import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AUTHORITY_DASHBOARD_STATE_CONTRACT,
  AUTHORITY_TIMELINE_VIEW_CONTRACT,
  type AuthorityDashboardRedactionMode,
  type AuthorityDashboardStateV1,
} from "../src/authority/authorityDashboardTypes.ts";
import { buildDisclosurePreviewReport } from "../src/authority/disclosurePreviewReport.ts";
import { buildGarpHandoffContext } from "../src/authority/garpHandoffContext.ts";
import { buildSharedAuthorityDisplayState } from "../src/authority/sharedAuthorityEvents.ts";
import {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
  type SharedAuthorityRequest,
} from "../src/authority/sharedAuthorityClient.ts";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import {
  answerForemanGuideOffline,
  type ForemanGuideResponseV1,
} from "../src/foremanGuide/offlineNarration.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { runTests } from "./scenarioTestUtils.ts";

function createRoleSession(
  role: DashboardRoleSessionProofV1["role"],
  overrides: Partial<DashboardRoleSessionProofV1> = {}
): DashboardRoleSessionProofV1 {
  const activeSkin = role === "public" ? "public" : "operations";
  const allowedSkins =
    role === "public"
      ? ["public" as const]
      : ["operations" as const, "permitting" as const, "council" as const];

  return {
    active_skin: activeSkin,
    allowed_skins: allowedSkins,
    auth_status: role === "public" ? "unauthenticated" : "authenticated",
    contract: ROLE_SESSION_PROOF_CONTRACT,
    department: role === "public" ? null : "public_works",
    display_name: role === "public" ? null : role,
    holds: [],
    role,
    source: role === "public" ? "public_default" : "auth0_role_claim",
    subject_ref: role === "public" ? null : `auth0|${role}`,
    ...overrides,
  };
}

function redactionModeFor(
  roleSession: DashboardRoleSessionProofV1
): AuthorityDashboardRedactionMode {
  if (roleSession.role === "judge_demo_operator") {
    return "judge_demo";
  }

  return roleSession.role === "public" ? "public" : "internal";
}

function createBaseAuthorityState(
  roleSession: DashboardRoleSessionProofV1
): AuthorityDashboardStateV1 {
  const redactionMode = redactionModeFor(roleSession);

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
      mode: redactionMode,
      role: roleSession.role,
    },
    redaction_mode: redactionMode,
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

function createSharedAuthorityRequest(
  status: "approved" | "denied" | "pending" = "pending"
): SharedAuthorityRequest {
  return {
    binding_context: {
      source_refs: ["dashboard.authority.shared_endpoint"],
    },
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
    request_id: `ARR-B3-${status.toUpperCase()}`,
    required_authority_department: "public_works",
    required_authority_role: "public_works_director",
    resolution_type: "approval",
    source_absence_id: "absence-b3-1",
    source_governance_evaluation: "governance-b3-1",
    status,
  };
}

function createAuthorityStateWithSharedRequest({
  roleSession,
  status = "pending",
}: {
  roleSession: DashboardRoleSessionProofV1;
  status?: "approved" | "denied" | "pending";
}) {
  const base = createBaseAuthorityState(roleSession);

  return buildSharedAuthorityDisplayState(base, {
    endpointStatus: "connected",
    events: [],
    hold: null,
    loading: false,
    requests: [createSharedAuthorityRequest(status)],
  }).state;
}

function createGuideContext({
  roleSession = createRoleSession("public_works_director"),
  status = "pending",
}: {
  roleSession?: DashboardRoleSessionProofV1;
  status?: "approved" | "denied" | "pending";
} = {}) {
  const authorityState = createAuthorityStateWithSharedRequest({
    roleSession,
    status,
  });
  const disclosurePreviewReport = buildDisclosurePreviewReport({
    authorityState,
    generatedAt: "2026-04-27T12:00:00.000Z",
    publicSkinView: null,
    roleSession,
    scenarioLabel: "B3 authority narration",
    sessionLabel: "snapshot:b3",
  });
  const garpHandoffContext = buildGarpHandoffContext({
    activeSkin: roleSession.active_skin,
    authorityState,
    disclosurePreviewReport,
  });

  return buildForemanGuideContext({
    authorityState,
    disclosurePreviewReport,
    garpHandoffContext,
    roleSession,
    snapshot: {
      activePanel: "snapshot",
      activeSkin: roleSession.active_skin,
      currentStep: null,
      scenarioId: "scenario-b3",
      sessionId: "snapshot:b3",
      sourceRefs: [
        {
          evidence_id: "scenario-b3",
          label: "B3 test source",
          path: "dashboard/tests/foreman-authority-narration.test.ts",
          source_kind: "test.source",
          source_ref: "test.source:dashboard/tests/foreman-authority-narration.test.ts",
        },
      ],
    },
  });
}

function createNoRoleSessionContext() {
  return buildForemanGuideContext({
    snapshot: {
      activePanel: "snapshot",
      activeSkin: "public",
      currentStep: null,
      scenarioId: "scenario-b3",
      sessionId: "snapshot:b3",
      sourceRefs: [
        {
          evidence_id: "scenario-b3",
          label: "B3 test source",
          path: "dashboard/tests/foreman-authority-narration.test.ts",
          source_kind: "test.source",
          source_ref: "test.source:dashboard/tests/foreman-authority-narration.test.ts",
        },
      ],
    },
  });
}

function assertNoForbiddenClaims(response: ForemanGuideResponseV1) {
  const answer = response.answer.toLowerCase();

  for (const fragment of [
    "notification delivery",
    "forensicchain",
    "forensic chain write",
    "openfga",
    "ciba",
    "production persistence",
    "model call",
    "network call",
  ]) {
    assert.equal(answer.includes(fragment), false, fragment);
  }
}

const tests = [
  {
    name: "role session answer explains authenticated role posture",
    run: () => {
      const response = answerForemanGuideOffline(
        "Who am I logged in as?",
        createGuideContext()
      );

      assert.equal(response.response_kind, "role_session");
      assert.equal(response.answer.includes("public_works_director"), true);
      assert.equal(response.answer.includes("authenticated"), true);
      assert.equal(response.answer.includes("dashboard-local eval role"), true);
    },
  },
  {
    name: "no-session answer falls back safely",
    run: () => {
      const response = answerForemanGuideOffline(
        "Who am I logged in as?",
        createNoRoleSessionContext()
      );

      assert.equal(response.response_kind, "role_session");
      assert.equal(response.answer.includes("public/snapshot posture"), true);
      assert.equal(response.holds.some((hold) => hold.id === "role_session_unavailable"), true);
    },
  },
  {
    name: "public viewer cannot approve restricted authority",
    run: () => {
      const response = answerForemanGuideOffline(
        "Why can't the public viewer approve this?",
        createGuideContext({
          roleSession: createRoleSession("public", {
            auth_status: "authenticated",
            source: "auth0_role_claim",
          }),
        })
      );

      assert.equal(response.response_kind, "role_session");
      assert.equal(response.answer.includes("cannot approve or deny"), true);
      assert.equal(response.answer.includes("public view"), true);
    },
  },
  {
    name: "field inspector submit role is explained correctly",
    run: () => {
      const response = answerForemanGuideOffline(
        "What can my role do?",
        createGuideContext({
          roleSession: createRoleSession("permitting_staff", {
            active_skin: "permitting",
            allowed_skins: ["permitting", "operations"],
            display_name: "field_inspector",
          }),
        })
      );

      assert.equal(response.response_kind, "role_session");
      assert.equal(response.answer.includes("may submit dashboard-local shared authority requests"), true);
      assert.equal(response.answer.includes("cannot approve or deny"), true);
    },
  },
  {
    name: "director approver role is explained according to policy",
    run: () => {
      const response = answerForemanGuideOffline(
        "What can the department director do?",
        createGuideContext()
      );

      assert.equal(response.response_kind, "role_session");
      assert.equal(response.answer.includes("may approve or deny"), true);
      assert.equal(response.answer.includes("dashboard-local shared authority requests"), true);
    },
  },
  {
    name: "pending authority request narration uses shared state",
    run: () => {
      const response = answerForemanGuideOffline(
        "Explain this authority request.",
        createGuideContext({ status: "pending" })
      );

      assert.equal(response.response_kind, "authority_lifecycle");
      assert.equal(response.answer.includes("pending 1"), true);
      assert.equal(response.answer.includes("ARR-B3-PENDING is pending"), true);
      assert.equal(response.answer.includes("AUTHORITY_RESOLUTION_REQUESTED"), true);
      assertNoForbiddenClaims(response);
    },
  },
  {
    name: "approved authority request narration uses shared state",
    run: () => {
      const response = answerForemanGuideOffline(
        "What just happened with authority?",
        createGuideContext({ status: "approved" })
      );

      assert.equal(response.response_kind, "authority_lifecycle");
      assert.equal(response.answer.includes("approved 1"), true);
      assert.equal(response.answer.includes("ARR-B3-APPROVED is approved"), true);
      assert.equal(response.answer.includes("AUTHORITY_APPROVED"), true);
      assertNoForbiddenClaims(response);
    },
  },
  {
    name: "denied authority request narration uses shared state",
    run: () => {
      const response = answerForemanGuideOffline(
        "Explain this denied authority request.",
        createGuideContext({ status: "denied" })
      );

      assert.equal(response.response_kind, "authority_lifecycle");
      assert.equal(response.answer.includes("denied 1"), true);
      assert.equal(response.answer.includes("ARR-B3-DENIED is denied"), true);
      assert.equal(response.answer.includes("AUTHORITY_DENIED"), true);
      assertNoForbiddenClaims(response);
    },
  },
  {
    name: "director-not-approve question stays source bounded",
    run: () => {
      const response = answerForemanGuideOffline(
        "What happens if the director does not approve?",
        createGuideContext({ status: "pending" })
      );

      assert.equal(response.response_kind, "authority_lifecycle");
      assert.equal(response.answer.includes("if approval is not supplied"), true);
      assert.equal(response.answer.includes("pending, denied, or HOLD"), true);
      assert.equal(response.answer.includes("does not resolve authority"), true);
    },
  },
  {
    name: "GARP handoff answer says Foreman explains and does not decide",
    run: () => {
      const response = answerForemanGuideOffline(
        "What does GARP give Foreman?",
        createGuideContext()
      );

      assert.equal(response.response_kind, "garp_handoff");
      assert.equal(response.answer.includes("local authority runway"), true);
      assert.equal(response.answer.includes("does not make or resolve"), true);
      assert.equal(response.answer.includes("foreman_ready value is false"), true);
    },
  },
  {
    name: "disclosure public boundary answer respects public boundary",
    run: () => {
      const response = answerForemanGuideOffline(
        "Walk me through the disclosure preview.",
        createGuideContext({ roleSession: createRoleSession("public") })
      );

      assert.equal(response.response_kind, "public_boundary");
      assert.equal(response.answer.includes("redaction mode is public"), true);
      assert.equal(response.answer.includes("Demo disclosure preview only"), true);
      assert.equal(response.answer.includes("cannot certify legal sufficiency"), true);
    },
  },
  {
    name: "TPIA legal compliance question returns HOLD",
    run: () => {
      const response = answerForemanGuideOffline(
        "Is this TPIA compliant legal proof?",
        createGuideContext()
      );

      assert.equal(response.response_kind, "hold");
      assert.equal(response.answer.startsWith("HOLD"), true);
      assert.equal(response.holds[0]?.source_ref, "foreman.offline.question");
    },
  },
  {
    name: "authority challenge returns only source-backed gaps and HOLDs",
    run: () => {
      const response = answerForemanGuideOffline(
        "Challenge this authority decision.",
        createGuideContext({ status: "pending" })
      );

      assert.equal(response.response_kind, "authority_challenge");
      assert.equal(response.answer.includes("Source-backed gaps/HOLDs"), true);
      assert.equal(response.answer.includes("pending approval remains unresolved"), true);
      assert.equal(response.answer.includes("does not invent approvals"), true);
      assert.equal(response.source_refs.length > 0, true);
    },
  },
  {
    name: "authority narration does not claim notification delivery",
    run: () => {
      assertNoForbiddenClaims(
        answerForemanGuideOffline(
          "Explain authority",
          createGuideContext({ status: "approved" })
        )
      );
    },
  },
  {
    name: "authority narration does not claim ForensicChain writes",
    run: () => {
      const response = answerForemanGuideOffline(
        "Explain authority",
        createGuideContext({ status: "denied" })
      );

      assert.equal(response.answer.includes("ForensicChain"), false);
      assert.equal(response.answer.toLowerCase().includes("chain write"), false);
    },
  },
  {
    name: "OpenFGA and CIBA questions return HOLD without claiming integration",
    run: () => {
      const response = answerForemanGuideOffline(
        "Does this use OpenFGA or CIBA?",
        createGuideContext()
      );

      assert.equal(response.response_kind, "hold");
      assert.equal(response.answer.startsWith("HOLD"), true);
      assertNoForbiddenClaims(response);
    },
  },
  {
    name: "B3 Foreman source has no runtime call behavior",
    run: async () => {
      const files = [
        "src/foremanGuide/authorityNarration.ts",
        "src/foremanGuide/offlineNarration.ts",
        "src/foremanGuide/useForemanGuide.ts",
        "src/components/ForemanGuidePanel.tsx",
      ];
      const source = (
        await Promise.all(
          files.map((file) => readFile(path.resolve(process.cwd(), file), "utf8"))
        )
      ).join("\n").toLowerCase();

      for (const fragment of [
        "fetch(",
        "xmlhttprequest",
        "new websocket",
        "eventsource",
        "navigator.serviceworker",
        "notification.requestpermission",
        "anthropic",
        "openai",
        "api_key",
        "apikey",
        "authorization:",
      ]) {
        assert.equal(source.includes(fragment), false, fragment);
      }
    },
  },
];

await runTests(tests);
