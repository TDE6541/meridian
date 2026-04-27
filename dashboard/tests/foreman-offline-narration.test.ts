import assert from "node:assert/strict";
import { adaptStepSkinPayloads, getDashboardSkinView } from "../src/adapters/skinPayloadAdapter.ts";
import { buildAuthorityDashboardState } from "../src/authority/authorityStateAdapter.ts";
import { buildDisclosurePreviewReport } from "../src/authority/disclosurePreviewReport.ts";
import { buildGarpHandoffContext } from "../src/authority/garpHandoffContext.ts";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import {
  answerForemanGuideOffline,
  FOREMAN_GUIDE_RESPONSE_VERSION,
} from "../src/foremanGuide/offlineNarration.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import {
  createTestLiveProjection,
  loadScenarioRecord,
  runTests,
} from "./scenarioTestUtils.ts";

function createRoleSession(): DashboardRoleSessionProofV1 {
  return {
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
  };
}

async function createGuideContext() {
  const record = await loadScenarioRecord("contested");
  const timelineSteps = buildTimelineSteps(record.scenario);
  const currentStep = timelineSteps[3];
  const roleSession = createRoleSession();

  assert.ok(currentStep);

  const skinViews = adaptStepSkinPayloads(currentStep.step);
  const publicSkinView = getDashboardSkinView(skinViews, "public");
  const projection = createTestLiveProjection({
    latest: {
      ...createTestLiveProjection().latest,
      authority: {
        generated_requests: [
          {
            binding_context: {
              source_refs: ["authority_context.required_approvals"],
            },
            request_id: "ARR-B2",
            required_authority_department: "public_works",
            required_authority_role: "public_works_director",
            source_absence_id: "absence-ref-1",
            source_governance_evaluation: "governance-ref-1",
            status: "pending",
          },
        ],
      },
    },
  });
  const authorityState = buildAuthorityDashboardState({
    currentStep,
    liveProjection: projection,
    roleSession,
  });
  const disclosurePreviewReport = buildDisclosurePreviewReport({
    authorityState,
    generatedAt: "2026-04-27T12:00:00.000Z",
    publicSkinView,
    roleSession,
    scenarioLabel: "B2 test scenario",
    sessionLabel: projection.session.session_id,
  });
  const garpHandoffContext = buildGarpHandoffContext({
    activeSkin: "public",
    authorityState,
    disclosurePreviewReport,
  });

  return buildForemanGuideContext({
    authorityState,
    disclosurePreviewReport,
    garpHandoffContext,
    liveProjection: projection,
    roleSession,
    snapshot: {
      activePanel: "snapshot",
      activeSkin: "public",
      currentStep,
      scenarioId: record.scenario.scenarioId,
      sessionId: "snapshot:contested",
      sourceRefs: [
        {
          evidence_id: record.scenario.scenarioId,
          label: "committed scenario snapshot",
          path: "dashboard/public/scenarios/contested.json",
          source_kind: "snapshot.file",
          source_ref: "snapshot.file:dashboard/public/scenarios/contested.json",
        },
      ],
    },
  });
}

const tests = [
  {
    name: "offline response version string is pinned",
    run: async () => {
      const context = await createGuideContext();
      const response = answerForemanGuideOffline("Walk the proof", context);

      assert.equal(FOREMAN_GUIDE_RESPONSE_VERSION, "meridian.v2.foremanGuideResponse.v1");
      assert.equal(response.version, FOREMAN_GUIDE_RESPONSE_VERSION);
      assert.equal(response.mode, "offline");
    },
  },
  {
    name: "walk current-state answer uses context and source refs",
    run: async () => {
      const context = await createGuideContext();
      const response = answerForemanGuideOffline("Walk the proof", context);

      assert.equal(response.response_kind, "walk_summary");
      assert.equal(response.answer.includes(context.current.scenario_id ?? ""), true);
      assert.equal(response.source_refs.length > 0, true);
      assert.equal(
        response.source_refs.some((ref) =>
          ref.source_ref.includes("dashboard/public/scenarios/contested.json")
        ),
        true
      );
    },
  },
  {
    name: "HOLD greater than GUESS answer is bounded without live state",
    run: () => {
      const response = answerForemanGuideOffline(
        "What is HOLD > GUESS?",
        buildForemanGuideContext()
      );

      assert.equal(response.response_kind, "hold_doctrine");
      assert.equal(response.answer.includes("HOLD > GUESS"), true);
      assert.equal(response.answer.toLowerCase().includes("model output"), true);
      assert.equal(response.holds.length, 0);
    },
  },
  {
    name: "absence answer uses absence findings when present",
    run: async () => {
      const response = answerForemanGuideOffline(
        "Show me an absence",
        await createGuideContext()
      );

      assert.equal(response.response_kind, "absence_summary");
      assert.equal(response.answer.includes("absence-ref-1"), true);
      assert.equal(response.source_refs.some((ref) => ref.evidence_id === "absence-ref-1"), true);
    },
  },
  {
    name: "authority answer uses GARP authority context when present",
    run: async () => {
      const response = answerForemanGuideOffline(
        "Explain authority",
        await createGuideContext()
      );

      assert.equal(response.response_kind, "authority_lifecycle");
      assert.equal(response.answer.includes("Authority lifecycle"), true);
      assert.equal(response.answer.includes("pending"), true);
      assert.equal(response.source_refs.some((ref) => ref.source_kind.includes("authority")), true);
    },
  },
  {
    name: "public disclosure answer respects public boundary context",
    run: async () => {
      const response = answerForemanGuideOffline(
        "Public view",
        await createGuideContext()
      );

      assert.equal(response.response_kind, "public_boundary");
      assert.equal(response.answer.includes("Demo disclosure preview only"), true);
      assert.equal(response.answer.toLowerCase().includes("redaction"), true);
    },
  },
  {
    name: "role session answer uses role proof context",
    run: async () => {
      const response = answerForemanGuideOffline(
        "Explain role session",
        await createGuideContext()
      );

      assert.equal(response.response_kind, "role_session");
      assert.equal(response.answer.includes(ROLE_SESSION_PROOF_CONTRACT), true);
      assert.equal(response.answer.includes("public"), true);
    },
  },
  {
    name: "unsupported question returns HOLD",
    run: async () => {
      const response = answerForemanGuideOffline(
        "Who will win the bond election?",
        await createGuideContext()
      );

      assert.equal(response.response_kind, "hold");
      assert.equal(response.answer.startsWith("HOLD"), true);
      assert.equal(response.holds[0]?.proof_needed.length > 0, true);
    },
  },
  {
    name: "legal TPIA compliance question returns HOLD",
    run: async () => {
      const response = answerForemanGuideOffline(
        "Is this TPIA compliant legal proof?",
        await createGuideContext()
      );

      assert.equal(response.response_kind, "hold");
      assert.equal(response.answer.startsWith("HOLD"), true);
      assert.equal(response.holds[0]?.source_ref, "foreman.offline.question");
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
