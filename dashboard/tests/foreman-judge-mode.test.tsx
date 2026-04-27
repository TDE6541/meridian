import assert from "node:assert/strict";
import React from "react";
import { ForemanGuidePanel } from "../src/components/ForemanGuidePanel.tsx";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import {
  appendForemanGuideModeResponse,
} from "../src/foremanGuide/useForemanGuide.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { createTestLiveProjection, renderMarkup, runTests } from "./scenarioTestUtils.ts";

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

function createPanelContext() {
  return buildForemanGuideContext({
    liveProjection: createTestLiveProjection(),
    roleSession: createRoleSession(),
    snapshot: {
      activePanel: "control-room",
      activeSkin: "public",
      currentStep: null,
      scenarioId: "scenario-b5-panel",
      sessionId: "snapshot:b5-panel",
      sourceRefs: [
        {
          evidence_id: "scenario-b5-panel",
          label: "B5 panel source",
          path: "dashboard/tests/foreman-judge-mode.test.tsx",
          source_kind: "test.source",
          source_ref: "test.source:dashboard/tests/foreman-judge-mode.test.tsx",
        },
      ],
    },
  });
}

const tests = [
  {
    name: "mode controls render in Foreman panel",
    run: () => {
      const markup = renderMarkup(
        <ForemanGuidePanel context={createPanelContext()} />
      );

      assert.equal(markup.includes("Foreman Gold modes"), true);
      assert.equal(markup.includes("Active mode"), true);
      assert.equal(markup.includes("Run mode"), true);
      for (const mode of ["Walk", "Absence", "Challenge", "Public", "Judge"]) {
        assert.equal(markup.includes(`>${mode}<`), true, mode);
      }
    },
  },
  {
    name: "mode controls expose eligibility state",
    run: () => {
      const markup = renderMarkup(
        <ForemanGuidePanel context={buildForemanGuideContext()} />
      );

      assert.equal(markup.includes('data-foreman-mode-id="walk"'), true);
      assert.equal(markup.includes('data-foreman-mode-eligible="false"'), true);
      assert.equal(markup.includes("HOLD: Walk Mode needs"), true);
    },
  },
  {
    name: "selecting a mode adds a mode response",
    run: () => {
      const messages = appendForemanGuideModeResponse(
        [],
        "judge",
        createPanelContext()
      );

      assert.equal(messages.length, 1);
      assert.equal(messages[0]?.speaker, "foreman");
      assert.equal(messages[0]?.response?.response_kind, "judge_mode");
      assert.equal(messages[0]?.content.includes("governed city intelligence"), true);
    },
  },
  {
    name: "unsupported mode emits HOLD-style response",
    run: () => {
      const messages = appendForemanGuideModeResponse(
        [],
        "public",
        buildForemanGuideContext()
      );

      assert.equal(messages[0]?.response?.response_kind, "hold");
      assert.equal(messages[0]?.content.startsWith("HOLD"), true);
      assert.equal(messages[0]?.response?.holds[0]?.severity, "HOLD");
    },
  },
];

await runTests(tests);
