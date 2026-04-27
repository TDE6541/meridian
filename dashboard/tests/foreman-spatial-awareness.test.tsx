import assert from "node:assert/strict";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import {
  createProactiveForemanResponse,
  FOREMAN_GUIDE_SIGNAL_VERSION,
  type ForemanGuideSignalV1,
} from "../src/foremanGuide/foremanSignals.ts";
import {
  getForemanPanelLabel,
  getForemanPanelReference,
} from "../src/foremanGuide/panelRegistry.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { createTestLiveProjection, runTests } from "./scenarioTestUtils.ts";

function createRoleSession(): DashboardRoleSessionProofV1 {
  return {
    active_skin: "operations",
    allowed_skins: ["operations", "public"],
    auth_status: "authenticated",
    contract: ROLE_SESSION_PROOF_CONTRACT,
    department: "public_works",
    display_name: "B4 spatial tester",
    holds: [],
    role: "public_works_director",
    source: "auth0_role_claim",
    subject_ref: "auth0|b4-spatial",
  };
}

function createContext() {
  return buildForemanGuideContext({
    liveProjection: createTestLiveProjection(),
    roleSession: createRoleSession(),
    snapshot: {
      activePanel: "authority-resolution",
      activeSkin: "operations",
      scenarioId: "scenario-b4-spatial",
      sessionId: "snapshot:b4-spatial",
      sourceRefs: [
        {
          evidence_id: "scenario-b4-spatial",
          label: "B4 spatial source",
          path: "dashboard/public/scenarios/routine.json",
          source_kind: "snapshot.file",
          source_ref: "snapshot.file:dashboard/public/scenarios/routine.json",
        },
      ],
    },
  });
}

function createSignal(
  overrides: Partial<ForemanGuideSignalV1> = {}
): ForemanGuideSignalV1 {
  return {
    created_at: "dashboard-local",
    dedupe_key: "authority.requested:ARR-B4-SPATIAL",
    eligible_for_proactive_narration: true,
    event_ref: "ARR-B4-SPATIAL",
    holds: [],
    kind: "authority.requested",
    panel_id: "authority-resolution",
    priority: "medium",
    signal_id: "foreman-signal-authority-requested-arr-b4-spatial",
    source_ref: "dashboard.shared_authority.request:ARR-B4-SPATIAL",
    source_refs: [
      {
        evidence_id: "ARR-B4-SPATIAL",
        label: "B4 shared authority",
        path: "/api/authority-requests",
        source_kind: "dashboard.shared_authority",
        source_ref: "dashboard.shared_authority.request:ARR-B4-SPATIAL",
      },
    ],
    summary: "ARR-B4-SPATIAL is pending in shared authority requests.",
    title: "Authority requested",
    version: FOREMAN_GUIDE_SIGNAL_VERSION,
    ...overrides,
  };
}

const tests = [
  {
    name: "active panel id maps to a registered panel label",
    run: () => {
      assert.equal(
        getForemanPanelLabel("authority-resolution"),
        "Authority Resolution"
      );
      assert.equal(
        getForemanPanelReference("disclosure-preview"),
        "Look at the Disclosure Preview panel."
      );
    },
  },
  {
    name: "unknown panel id does not produce a false spatial claim",
    run: () => {
      const signal = createSignal({
        panel_id: "unknown-panel" as ForemanGuideSignalV1["panel_id"],
      });
      const response = createProactiveForemanResponse(signal, createContext());

      assert.equal(getForemanPanelLabel("unknown-panel"), null);
      assert.equal(response.answer.includes("unknown-panel"), false);
      assert.equal(response.answer.includes("Look at the"), false);
    },
  },
  {
    name: "registered panel signal produces source-bounded spatial language",
    run: () => {
      const response = createProactiveForemanResponse(
        createSignal(),
        createContext()
      );

      assert.equal(
        response.answer.includes("Look at the Authority Resolution panel."),
        true
      );
      assert.equal(response.source_refs.length > 0, true);
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
