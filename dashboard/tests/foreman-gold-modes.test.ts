import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AUTHORITY_DASHBOARD_STATE_CONTRACT,
  AUTHORITY_TIMELINE_VIEW_CONTRACT,
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
  answerForemanGuideMode,
  FOREMAN_GUIDE_MODE_IDS,
  FOREMAN_GUIDE_MODE_VERSION,
  resolveForemanGuideModes,
  type ForemanGuideModeId,
} from "../src/foremanGuide/foremanModes.ts";
import { getForemanPanel } from "../src/foremanGuide/panelRegistry.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { createTestLiveProjection, runTests } from "./scenarioTestUtils.ts";

function createRoleSession(
  role: DashboardRoleSessionProofV1["role"] = "public_works_director"
): DashboardRoleSessionProofV1 {
  return {
    active_skin: role === "public" ? "public" : "operations",
    allowed_skins:
      role === "public"
        ? ["public"]
        : ["operations", "permitting", "council", "public"],
    auth_status: role === "public" ? "unauthenticated" : "authenticated",
    contract: ROLE_SESSION_PROOF_CONTRACT,
    department: role === "public" ? null : "public_works",
    display_name: role === "public" ? null : "B5 tester",
    holds: [],
    role,
    source: role === "public" ? "public_default" : "auth0_role_claim",
    subject_ref: role === "public" ? null : "auth0|b5",
  };
}

function createAuthorityState(
  roleSession: DashboardRoleSessionProofV1
): AuthorityDashboardStateV1 {
  const base: AuthorityDashboardStateV1 = {
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
      mode: roleSession.role === "public" ? "public" : "internal",
      role: roleSession.role,
    },
    redaction_mode: roleSession.role === "public" ? "public" : "internal",
    requests: [],
    role_session: roleSession,
    source_refs: [],
    status: "empty",
    timeline: {
      contract: AUTHORITY_TIMELINE_VIEW_CONTRACT,
      records: [],
    },
  };
  const request: SharedAuthorityRequest = {
    binding_context: {
      source_refs: ["dashboard.authority.b5"],
    },
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
    request_id: "ARR-B5-PENDING",
    required_authority_department: "public_works",
    required_authority_role: "public_works_director",
    resolution_type: "approval",
    source_absence_id: "absence-ref-1",
    source_governance_evaluation: "governance-ref-1",
    status: "pending",
  };

  return buildSharedAuthorityDisplayState(base, {
    endpointStatus: "connected",
    events: [],
    hold: null,
    loading: false,
    requests: [request],
  }).state;
}

function createGuideContext(role = createRoleSession()) {
  const projection = createTestLiveProjection();
  const authorityState = createAuthorityState(role);
  const disclosurePreviewReport = buildDisclosurePreviewReport({
    authorityState,
    generatedAt: "2026-04-27T12:00:00.000Z",
    publicSkinView: null,
    roleSession: role,
    scenarioLabel: "B5 Gold scenario",
    sessionLabel: projection.session.session_id,
  });
  const garpHandoffContext = buildGarpHandoffContext({
    activeSkin: role.active_skin,
    authorityState,
    disclosurePreviewReport,
  });

  return buildForemanGuideContext({
    authorityState,
    disclosurePreviewReport,
    garpHandoffContext,
    liveProjection: projection,
    roleSession: role,
    snapshot: {
      activePanel: "control-room",
      activeSkin: role.active_skin,
      currentStep: null,
      scenarioId: "scenario-b5",
      sessionId: "snapshot:b5",
      sourceRefs: [
        {
          evidence_id: "scenario-b5",
          label: "B5 test source",
          path: "dashboard/tests/foreman-gold-modes.test.ts",
          source_kind: "test.source",
          source_ref: "test.source:dashboard/tests/foreman-gold-modes.test.ts",
        },
      ],
    },
  });
}

function assertNoOverclaim(answer: string) {
  const lower = answer.toLowerCase();

  for (const fragment of [
    "production",
    "live city",
    "official fort worth",
    "openfga",
    "ciba",
    "notification delivery",
  ]) {
    assert.equal(lower.includes(fragment), false, fragment);
  }
}

const tests = [
  {
    name: "mode version is pinned and all five modes are defined",
    run: () => {
      const modes = resolveForemanGuideModes(createGuideContext());

      assert.equal(FOREMAN_GUIDE_MODE_VERSION, "meridian.v2.foremanGuideMode.v1");
      assert.deepEqual(
        modes.map((mode) => mode.mode_id),
        FOREMAN_GUIDE_MODE_IDS
      );
      assert.equal(modes.every((mode) => mode.version === FOREMAN_GUIDE_MODE_VERSION), true);
    },
  },
  {
    name: "mode contract uses registered primary panels",
    run: () => {
      const modes = resolveForemanGuideModes(createGuideContext());

      assert.equal(modes.every((mode) => getForemanPanel(mode.primary_panel_id)), true);
      assert.equal(modes.every((mode) => mode.quick_prompt.length > 0), true);
      assert.equal(modes.every((mode) => mode.required_context.length > 0), true);
    },
  },
  {
    name: "Walk Mode summarizes current scenario and session from context",
    run: () => {
      const context = createGuideContext();
      const response = answerForemanGuideMode("walk", context);

      assert.equal(response.response_kind, "walk_mode");
      assert.equal(response.answer.includes("scenario-b5"), true);
      assert.equal(response.answer.includes("snapshot:b5"), true);
      assert.equal(response.answer.includes("Foreman is guiding, not deciding"), true);
      assert.equal(response.source_refs.length > 0, true);
    },
  },
  {
    name: "Walk Mode HOLDs when no scenario or session context exists",
    run: () => {
      const response = answerForemanGuideMode("walk", buildForemanGuideContext());

      assert.equal(response.response_kind, "hold");
      assert.equal(response.answer.startsWith("HOLD"), true);
      assert.equal(response.holds.some((hold) => hold.id === "foreman_walk_mode_unavailable"), true);
    },
  },
  {
    name: "Absence Mode uses absence findings and refs from context",
    run: () => {
      const response = answerForemanGuideMode("absence", createGuideContext());

      assert.equal(response.response_kind, "absence_mode");
      assert.equal(response.answer.includes("absence-ref-1"), true);
      assert.equal(response.source_refs.some((ref) => ref.evidence_id === "absence-ref-1"), true);
    },
  },
  {
    name: "Absence Mode does not invent missing facts",
    run: () => {
      const response = answerForemanGuideMode("absence", createGuideContext());
      const lower = response.answer.toLowerCase();

      assert.equal(lower.includes("city secretary"), false);
      assert.equal(lower.includes("statutory"), false);
      assert.equal(lower.includes("2026-05-01"), false);
    },
  },
  {
    name: "Absence Mode HOLDs without absence context",
    run: () => {
      const context = buildForemanGuideContext({
        snapshot: {
          activePanel: "control-room",
          activeSkin: "public",
          scenarioId: "scenario-without-absence",
          sessionId: "snapshot:no-absence",
          sourceRefs: [
            {
              evidence_id: "scenario-without-absence",
              label: "no absence source",
              path: "test.no_absence",
              source_kind: "test.source",
              source_ref: "test.source:no_absence",
            },
          ],
        },
      });
      const response = answerForemanGuideMode("absence", context);

      assert.equal(response.response_kind, "hold");
      assert.equal(response.answer.startsWith("HOLD"), true);
    },
  },
  {
    name: "Challenge Mode lists only source-backed gaps and HOLDs",
    run: () => {
      const response = answerForemanGuideMode("challenge", createGuideContext());

      assert.equal(response.response_kind, "challenge_mode");
      assert.equal(response.answer.includes("Source-backed gaps/HOLDs"), true);
      assert.equal(response.answer.includes("pending approval remains unresolved"), true);
      assert.equal(response.source_refs.length > 0, true);
    },
  },
  {
    name: "Challenge Mode does not invent laws officials deadlines or legal claims",
    run: () => {
      const lower = answerForemanGuideMode("challenge", createGuideContext()).answer.toLowerCase();

      for (const fragment of ["statute", "mayor", "deadline", "noncompliance", "violation"]) {
        assert.equal(lower.includes(fragment), false, fragment);
      }
    },
  },
  {
    name: "Challenge Mode HOLDs without enough context",
    run: () => {
      const response = answerForemanGuideMode(
        "challenge",
        buildForemanGuideContext()
      );

      assert.equal(response.response_kind, "hold");
      assert.equal(response.holds[0]?.severity, "HOLD");
    },
  },
  {
    name: "Public Mode respects disclosure boundary context",
    run: () => {
      const response = answerForemanGuideMode("public", createGuideContext(createRoleSession("public")));

      assert.equal(response.response_kind, "public_mode");
      assert.equal(response.answer.includes("redaction mode is public"), true);
      assert.equal(response.answer.includes("Demo disclosure preview only"), true);
    },
  },
  {
    name: "Public Mode refuses legal sufficiency claims",
    run: () => {
      const response = answerForemanGuideMode("public", createGuideContext());
      const lower = response.answer.toLowerCase();

      assert.equal(lower.includes("cannot certify legal sufficiency"), true);
      assert.equal(lower.includes("legally sufficient"), false);
    },
  },
  {
    name: "Judge Mode returns concise demo explanation",
    run: () => {
      const response = answerForemanGuideMode("judge", createGuideContext());

      assert.equal(response.response_kind, "judge_mode");
      assert.equal(response.answer.includes("governed city intelligence"), true);
      assert.equal(response.answer.includes("Foreman is the guide"), true);
      assert.equal(response.answer.split(/\s+/).length < 95, true);
    },
  },
  {
    name: "Judge Mode avoids forbidden deployment and integration claims",
    run: () => {
      const response = answerForemanGuideMode("judge", createGuideContext());

      assertNoOverclaim(response.answer);
      assert.equal(response.answer.toLowerCase().includes("legal compliance"), false);
    },
  },
  {
    name: "Judge Mode softens when current context lacks a proof path",
    run: () => {
      const response = answerForemanGuideMode("judge", buildForemanGuideContext());

      assert.equal(response.response_kind, "hold");
      assert.equal(response.answer.startsWith("HOLD"), true);
    },
  },
  {
    name: "B5 guide source avoids model key direct network and persona behavior",
    run: async () => {
      const files = [
        "src/foremanGuide/foremanModes.ts",
        "src/foremanGuide/useForemanModes.ts",
        "src/foremanGuide/useForemanGuide.ts",
        "src/components/ForemanGuidePanel.tsx",
      ];
      const forbidden = [
        "VITE_" + "ANTHROPIC" + "_API_KEY",
        "anth" + "ropic",
        "op" + "enai",
        "." + "env" + ".local",
        "ELEVENLABS_API_KEY",
        "api.elevenlabs.io",
        "xi-api-key",
        "fet" + "ch(",
        "new Web" + "Socket",
        "Event" + "Source",
        "ava" + "tar",
      ];

      for (const file of files) {
        const content = await readFile(path.resolve(process.cwd(), file), "utf8");
        for (const token of forbidden) {
          assert.equal(content.toLowerCase().includes(token.toLowerCase()), false, `${file} contains ${token}`);
        }
      }
    },
  },
];

await runTests(tests);
