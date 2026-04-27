import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { ForemanGuidePanel } from "../src/components/ForemanGuidePanel.tsx";
import { buildForemanGuideContext } from "../src/foremanGuide/buildForemanGuideContext.ts";
import {
  deriveForemanAvatarState,
  FOREMAN_AVATAR_STATE_VERSION,
  FOREMAN_AVATAR_STATES,
} from "../src/foremanGuide/avatarState.ts";
import type { ForemanGuideHold } from "../src/foremanGuide/foremanGuideTypes.ts";
import type { ForemanGuideSignalV1 } from "../src/foremanGuide/foremanSignals.ts";
import type { ForemanGuideResponseV1 } from "../src/foremanGuide/offlineNarration.ts";
import { FOREMAN_GUIDE_RESPONSE_VERSION } from "../src/foremanGuide/offlineNarration.ts";
import {
  createTestLiveEvent,
  createTestLiveProjection,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

const sourceRef = {
  evidence_id: "b6",
  label: "B6 source",
  path: "dashboard/tests/foreman-avatar-state.test.tsx",
  source_kind: "test.source",
  source_ref: "test.source:dashboard/tests/foreman-avatar-state.test.tsx",
};

function hold(
  severity: ForemanGuideHold["severity"] = "HOLD"
): ForemanGuideHold {
  return {
    id: `b6_${severity.toLowerCase()}`,
    proof_needed: ["source-bounded proof"],
    reason: `${severity}: B6 test hold.`,
    severity,
    source_ref: sourceRef.source_ref,
  };
}

function response(
  overrides: Partial<ForemanGuideResponseV1> = {}
): ForemanGuideResponseV1 {
  return {
    answer: "Foreman explains current proof.",
    holds: [],
    mode: "offline",
    response_kind: "walk_summary",
    source_refs: [sourceRef],
    version: FOREMAN_GUIDE_RESPONSE_VERSION,
    ...overrides,
  };
}

function signal(overrides: Partial<ForemanGuideSignalV1> = {}): ForemanGuideSignalV1 {
  return {
    created_at: "dashboard-local",
    dedupe_key: "b6-signal",
    eligible_for_proactive_narration: true,
    event_ref: null,
    holds: [],
    kind: "scenario.changed",
    panel_id: "control-room",
    priority: "medium",
    signal_id: "foreman-signal-b6",
    source_ref: sourceRef.source_ref,
    source_refs: [sourceRef],
    summary: "B6 signal.",
    title: "B6 signal",
    version: "meridian.v2.foremanGuideSignal.v1",
    ...overrides,
  };
}

function panelContext() {
  return buildForemanGuideContext({
    liveProjection: createTestLiveProjection({
      events: [
        createTestLiveEvent({
          event_id: "b6-live-event",
          title: "B6 live event",
        }),
      ],
    }),
    snapshot: {
      activePanel: "control-room",
      activeSkin: "operations",
      scenarioId: "scenario-b6",
      sessionId: "snapshot:b6",
      sourceRefs: [sourceRef],
    },
  });
}

const tests = [
  {
    name: "avatar state vocabulary and version are pinned",
    run: () => {
      assert.equal(
        FOREMAN_AVATAR_STATE_VERSION,
        "meridian.v2.foremanAvatarState.v1"
      );
      assert.deepEqual(FOREMAN_AVATAR_STATES, [
        "idle",
        "explaining",
        "holding",
        "warning",
        "blocked",
        "live",
        "public-boundary",
      ]);
    },
  },
  {
    name: "avatar state defaults to idle",
    run: () => {
      const state = deriveForemanAvatarState();

      assert.equal(state.state, "idle");
      assert.equal(state.source_ref, null);
    },
  },
  {
    name: "avatar state becomes explaining for normal answer",
    run: () => {
      const state = deriveForemanAvatarState({
        latestResponse: response(),
      });

      assert.equal(state.state, "explaining");
    },
  },
  {
    name: "avatar state becomes holding when response has HOLDs",
    run: () => {
      const state = deriveForemanAvatarState({
        latestResponse: response({ holds: [hold("HOLD")] }),
      });

      assert.equal(state.state, "holding");
    },
  },
  {
    name: "avatar state becomes blocked for endpoint HOLD context",
    run: () => {
      const state = deriveForemanAvatarState({
        latestSignal: signal({
          kind: "endpoint.hold",
          priority: "high",
        }),
      });

      assert.equal(state.state, "blocked");
    },
  },
  {
    name: "avatar state becomes warning for high-priority signal",
    run: () => {
      const state = deriveForemanAvatarState({
        latestSignal: signal({ priority: "high" }),
      });

      assert.equal(state.state, "warning");
    },
  },
  {
    name: "avatar state becomes public-boundary for public mode",
    run: () => {
      const state = deriveForemanAvatarState({
        activeModeId: "public",
        latestResponse: response({ response_kind: "public_boundary" }),
      });

      assert.equal(state.state, "public-boundary");
    },
  },
  {
    name: "avatar state becomes live for live source signal",
    run: () => {
      const state = deriveForemanAvatarState({
        latestSignal: signal({
          kind: "live.event.observed",
          priority: "low",
        }),
      });

      assert.equal(state.state, "live");
    },
  },
  {
    name: "panel renders avatar state indicator",
    run: () => {
      const markup = renderMarkup(
        <ForemanGuidePanel context={panelContext()} />
      );

      assert.equal(markup.includes("Foreman state"), true);
      assert.equal(markup.includes("data-foreman-presence-state"), true);
    },
  },
  {
    name: "B6 avatar source avoids forbidden external behavior",
    run: async () => {
      const files = [
        "src/foremanGuide/avatarState.ts",
        "src/components/ForemanGuidePanel.tsx",
      ];
      const forbidden = [
        "VITE_" + "ANTH" + "ROPIC" + "_API_KEY",
        "anth" + "ropic",
        "op" + "enai",
        "." + "env" + ".local",
        "fet" + "ch(",
        "Media" + "Recorder",
        "Wh" + "isper",
        "navigator" + ".mediaDevices",
        "get" + "UserMedia",
      ];

      for (const file of files) {
        const content = await readFile(path.resolve(process.cwd(), file), "utf8");
        for (const token of forbidden) {
          assert.equal(
            content.toLowerCase().includes(token.toLowerCase()),
            false,
            `${file} contains ${token}`
          );
        }
      }
    },
  },
];

await runTests(tests);
