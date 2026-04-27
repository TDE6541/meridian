import assert from "node:assert/strict";
import { buildAuthorityDashboardState } from "../src/authority/authorityStateAdapter.ts";
import { buildDisclosurePreviewReport } from "../src/authority/disclosurePreviewReport.ts";
import { buildGarpHandoffContext } from "../src/authority/garpHandoffContext.ts";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import { FOREMAN_GUIDE_CONTEXT_VERSION } from "../src/foremanGuide/foremanGuideTypes.ts";
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

function createPublicRoleSession(): DashboardRoleSessionProofV1 {
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

async function createSnapshotInput() {
  const record = await loadScenarioRecord("contested");
  const timelineSteps = buildTimelineSteps(record.scenario);
  const currentStep = timelineSteps[3];

  assert.ok(currentStep);

  return {
    activePanel: "governance",
    activeSkin: "public",
    currentStep,
    scenarioId: record.scenario.scenarioId,
    sessionId: "snapshot-session-contested",
    sourceRefs: [
      {
        evidence_id: record.scenario.scenarioId,
        label: "committed scenario snapshot",
        path: "dashboard/public/scenarios/contested.json",
        source_kind: "snapshot.file",
        source_ref: "snapshot.file:dashboard/public/scenarios/contested.json",
      },
    ],
  };
}

function createGarpInputs() {
  const roleSession = createPublicRoleSession();
  const projection = createTestLiveProjection({
    latest: {
      ...createTestLiveProjection().latest,
      authority: {
        generated_requests: [
          {
            binding_context: {
              source_refs: ["authority_context.required_approvals"],
            },
            request_id: "ARR-B1",
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
    currentStep: null,
    liveProjection: projection,
    roleSession,
  });
  const disclosurePreviewReport = buildDisclosurePreviewReport({
    authorityState,
    generatedAt: "2026-04-27T12:00:00.000Z",
    publicSkinView: null,
    roleSession,
    scenarioLabel: "B1 test scenario",
    sessionLabel: projection.session.session_id,
  });
  const garpHandoffContext = buildGarpHandoffContext({
    activeSkin: "public",
    authorityState,
    disclosurePreviewReport,
  });

  return {
    authorityState,
    disclosurePreviewReport,
    garpHandoffContext,
    projection,
    roleSession,
  };
}

const tests = [
  {
    name: "version string is pinned",
    run: () => {
      const context = buildForemanGuideContext();

      assert.equal(FOREMAN_GUIDE_CONTEXT_VERSION, "meridian.v2.foremanGuideContext.v1");
      assert.equal(context.version, FOREMAN_GUIDE_CONTEXT_VERSION);
    },
  },
  {
    name: "snapshot-only context builds from committed scenario step",
    run: async () => {
      const snapshot = await createSnapshotInput();
      const context = buildForemanGuideContext({ snapshot });

      assert.equal(context.source_mode, "snapshot");
      assert.equal(context.current.scenario_id, snapshot.scenarioId);
      assert.equal(context.current.session_id, "snapshot-session-contested");
      assert.equal(context.current.step_id, "C4");
      assert.equal(context.current.active_skin, "public");
      assert.equal(context.current.active_panel, "governance");
      assert.equal(context.state.latest_governance !== null, true);
      assert.equal(
        context.sources.snapshot_refs.some((ref) =>
          ref.source_ref.includes("dashboard/public/scenarios/contested.json")
        ),
        true
      );
    },
  },
  {
    name: "live-only context builds from live projection",
    run: () => {
      const projection = createTestLiveProjection();
      const context = buildForemanGuideContext({ liveProjection: projection });

      assert.equal(context.source_mode, "live");
      assert.equal(context.current.session_id, "session-a5");
      assert.equal(context.current.event_id, "event-1");
      assert.equal(context.current.active_skin, "public");
      assert.equal(context.state.live_events.length, projection.events.length);
      assert.equal(context.state.live_events[0]?.event_id, projection.events[0]?.event_id);
      assert.equal(context.sources.live_refs.some((ref) => ref.evidence_id === "governance-ref-1"), true);
    },
  },
  {
    name: "mixed snapshot live and GARP context builds",
    run: async () => {
      const snapshot = await createSnapshotInput();
      const garp = createGarpInputs();
      const context = buildForemanGuideContext({
        authorityState: garp.authorityState,
        disclosurePreviewReport: garp.disclosurePreviewReport,
        garpHandoffContext: garp.garpHandoffContext,
        liveProjection: garp.projection,
        roleSession: garp.roleSession,
        snapshot,
      });

      assert.equal(context.source_mode, "mixed");
      assert.equal(context.current.scenario_id, snapshot.scenarioId);
      assert.equal(context.current.session_id, "snapshot-session-contested");
      assert.equal(context.state.role_session?.contract, ROLE_SESSION_PROOF_CONTRACT);
      assert.equal(context.state.garp_handoff?.contract, garp.garpHandoffContext.contract);
      assert.equal(context.state.disclosure_preview?.contract, garp.disclosurePreviewReport.contract);
    },
  },
  {
    name: "GARP handoff is preserved with original foreman readiness",
    run: async () => {
      const snapshot = await createSnapshotInput();
      const garp = createGarpInputs();
      const context = buildForemanGuideContext({
        authorityState: garp.authorityState,
        disclosurePreviewReport: garp.disclosurePreviewReport,
        garpHandoffContext: garp.garpHandoffContext,
        roleSession: garp.roleSession,
        snapshot,
      });

      assert.equal(context.state.garp_handoff, garp.garpHandoffContext);
      assert.equal(garp.garpHandoffContext.foreman_ready, false);
      assert.equal(context.foreman_readiness.original_garp_foreman_ready, false);
      assert.equal(context.foreman_readiness.source, "derived_from_context");
    },
  },
  {
    name: "derived Foreman readiness does not mutate GARP input",
    run: async () => {
      const snapshot = await createSnapshotInput();
      const garp = createGarpInputs();
      const before = JSON.stringify(garp.garpHandoffContext);
      const context = buildForemanGuideContext({
        authorityState: garp.authorityState,
        disclosurePreviewReport: garp.disclosurePreviewReport,
        garpHandoffContext: garp.garpHandoffContext,
        roleSession: garp.roleSession,
        snapshot,
      });

      assert.equal(context.foreman_readiness.ready, true);
      assert.equal(JSON.stringify(garp.garpHandoffContext), before);
      assert.equal(garp.garpHandoffContext.foreman_ready, false);
    },
  },
  {
    name: "source refs are preserved across snapshot live authority and disclosure sources",
    run: async () => {
      const snapshot = await createSnapshotInput();
      const garp = createGarpInputs();
      const context = buildForemanGuideContext({
        authorityState: garp.authorityState,
        disclosurePreviewReport: garp.disclosurePreviewReport,
        garpHandoffContext: garp.garpHandoffContext,
        liveProjection: garp.projection,
        roleSession: garp.roleSession,
        snapshot,
      });
      const sourceRefs = context.source_refs.map((ref) => ref.source_ref);

      assert.equal(sourceRefs.some((ref) => ref.includes("dashboard/public/scenarios/contested.json")), true);
      assert.equal(sourceRefs.some((ref) => ref.includes("authority_context.required_approvals")), true);
      assert.equal(sourceRefs.some((ref) => ref.includes("disclosurePreviewReport.contract")), true);
      assert.equal(sourceRefs.some((ref) => ref.includes("refs.absence_refs")), true);
    },
  },
  {
    name: "missing scenario session and skin create structured HOLDs",
    run: () => {
      const context = buildForemanGuideContext({
        snapshot: {
          sourceRefs: [
            {
              evidence_id: "explicit-source",
              label: "explicit source",
              path: "explicit.source",
              source_kind: "test.source",
              source_ref: "test.source:explicit.source",
            },
          ],
        },
      });

      assert.equal(context.source_mode, "snapshot");
      assert.deepEqual(
        context.holds.map((entry) => entry.id),
        [
          "missing_active_scenario",
          "missing_active_session",
          "missing_active_skin",
          "missing_active_step_or_event",
        ]
      );
      assert.equal(context.holds.every((entry) => entry.severity === "HOLD"), true);
      assert.equal(context.holds.every((entry) => entry.proof_needed.length > 0), true);
    },
  },
  {
    name: "missing all source data creates unknown mode and HOLD",
    run: () => {
      const context = buildForemanGuideContext();

      assert.equal(context.source_mode, "unknown");
      assert.equal(context.source_refs.length, 0);
      assert.equal(context.holds.some((entry) => entry.id === "missing_source_data"), true);
      assert.equal(context.foreman_readiness.ready, false);
    },
  },
  {
    name: "input objects are not mutated",
    run: async () => {
      const snapshot = await createSnapshotInput();
      const projection = createTestLiveProjection();
      const beforeSnapshot = JSON.stringify(snapshot);
      const beforeProjection = JSON.stringify(projection);

      buildForemanGuideContext({
        liveProjection: projection,
        snapshot,
      });

      assert.equal(JSON.stringify(snapshot), beforeSnapshot);
      assert.equal(JSON.stringify(projection), beforeProjection);
    },
  },
  {
    name: "context output does not include chat model voice or avatar fields",
    run: async () => {
      const snapshot = await createSnapshotInput();
      const garp = createGarpInputs();
      const context = buildForemanGuideContext({
        authorityState: garp.authorityState,
        disclosurePreviewReport: garp.disclosurePreviewReport,
        garpHandoffContext: garp.garpHandoffContext,
        liveProjection: garp.projection,
        roleSession: garp.roleSession,
        snapshot,
      });
      const serialized = JSON.stringify(context).toLowerCase();

      assert.equal(serialized.includes("chat"), false);
      assert.equal(serialized.includes("model"), false);
      assert.equal(serialized.includes("voice"), false);
      assert.equal(serialized.includes("avatar"), false);
      assert.equal(serialized.includes("answer_text"), false);
      assert.equal(serialized.includes("prompt"), false);
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
