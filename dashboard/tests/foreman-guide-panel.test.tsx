import assert from "node:assert/strict";
import React from "react";
import { ForemanGuidePanel } from "../src/components/ForemanGuidePanel.tsx";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import { appendForemanGuideExchange } from "../src/foremanGuide/useForemanGuide.ts";
import { FOREMAN_GUIDE_RESPONSE_VERSION } from "../src/foremanGuide/offlineNarration.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import {
  createTestLiveProjection,
  loadScenarioRecord,
  renderMarkup,
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

async function createPanelContext() {
  const record = await loadScenarioRecord("routine");
  const currentStep = buildTimelineSteps(record.scenario)[0];

  assert.ok(currentStep);

  return buildForemanGuideContext({
    liveProjection: createTestLiveProjection(),
    roleSession: createRoleSession(),
    snapshot: {
      activePanel: "snapshot",
      activeSkin: "public",
      currentStep,
      scenarioId: record.scenario.scenarioId,
      sessionId: "snapshot:routine",
      sourceRefs: [
        {
          evidence_id: record.scenario.scenarioId,
          label: "committed scenario snapshot",
          path: "dashboard/public/scenarios/routine.json",
          source_kind: "snapshot.file",
          source_ref: "snapshot.file:dashboard/public/scenarios/routine.json",
        },
      ],
    },
  });
}

const tests = [
  {
    name: "Foreman panel renders identity and proof status",
    run: async () => {
      const markup = renderMarkup(
        <ForemanGuidePanel context={await createPanelContext()} />
      );

      assert.equal(markup.includes("The Foreman"), true);
      assert.equal(markup.includes("Dashboard-local offline guide"), true);
      assert.equal(markup.includes("Source mode"), true);
      assert.equal(markup.includes('data-foreman-mount="active"'), true);
    },
  },
  {
    name: "quick-action chips render",
    run: async () => {
      const markup = renderMarkup(
        <ForemanGuidePanel context={await createPanelContext()} />
      );

      for (const label of [
        "Walk the proof",
        "What can my role do?",
        "Show me an absence",
        "Explain authority",
        "Public view",
        "Challenge this",
      ]) {
        assert.equal(markup.includes(label), true, label);
      }

      assert.equal(markup.includes("Who built this?"), false);
    },
  },
  {
    name: "typing and submitting a question adds a response",
    run: async () => {
      const messages = appendForemanGuideExchange(
        [],
        "Walk the proof",
        await createPanelContext()
      );

      assert.equal(messages.length, 2);
      assert.equal(messages[0]?.speaker, "user");
      assert.equal(messages[1]?.speaker, "foreman");
      assert.equal(messages[1]?.response?.version, FOREMAN_GUIDE_RESPONSE_VERSION);
    },
  },
  {
    name: "panel does not call network while rendering or answering",
    run: async () => {
      const originalFetch = globalThis.fetch;
      let fetchCalled = false;

      globalThis.fetch = (() => {
        fetchCalled = true;
        throw new Error("network should not be called");
      }) as typeof globalThis.fetch;

      try {
        const context = await createPanelContext();

        renderMarkup(<ForemanGuidePanel context={context} />);
        appendForemanGuideExchange([], "Explain authority", context);

        assert.equal(fetchCalled, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "panel displays role session status and missing-context HOLD",
    run: async () => {
      const roleMarkup = renderMarkup(
        <ForemanGuidePanel context={await createPanelContext()} />
      );
      const missingMarkup = renderMarkup(<ForemanGuidePanel context={null} />);

      assert.equal(roleMarkup.includes("public / unauthenticated"), true);
      assert.equal(missingMarkup.includes("holding"), true);
      assert.equal(missingMarkup.includes("HOLD: B1 context unavailable"), true);
      assert.equal(missingMarkup.includes("missing_foreman_context"), true);
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
