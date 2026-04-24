import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { scenarioRegistry } from "../src/data/scenarioRegistry.ts";
import { getScenarioRegistryEntry } from "../src/data/scenarioRegistry.ts";
import { assertValidScenarioPayload } from "../src/data/validateScenario.ts";
import {
  DASHBOARD_LIVE_PROJECTION_VERSION,
  LIVE_FEED_EVENT_VERSION,
  type DashboardLiveProjectionV1,
  type LiveFeedEventV1,
} from "../src/live/liveTypes.ts";
import { createReadyScenarioRecord } from "../src/state/controlRoomState.ts";
import type {
  ControlRoomScenarioRecord,
} from "../src/state/controlRoomState.ts";
import type { ScenarioKey } from "../src/types/scenario.ts";

export type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

export async function loadScenarioRecord(
  key: ScenarioKey
): Promise<Extract<ControlRoomScenarioRecord, { status: "ready" }>> {
  const entry = getScenarioRegistryEntry(key);
  const scenarioPath = path.resolve(process.cwd(), "public", "scenarios", entry.fileName);
  const payload = assertValidScenarioPayload(
    JSON.parse(await readFile(scenarioPath, "utf8")),
    entry.fileName
  );
  const record = createReadyScenarioRecord(entry, payload);

  if (record.status !== "ready") {
    throw new Error(`Expected ready record for ${key}.`);
  }

  return record;
}

export async function loadAllScenarioRecords() {
  return Promise.all(
    scenarioRegistry.map((entry) => loadScenarioRecord(entry.key))
  );
}

export function renderMarkup(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

export function createTestLiveEvent(
  overrides: Partial<LiveFeedEventV1> = {}
): LiveFeedEventV1 {
  return {
    event_id: "event-1",
    foreman_hints: {
      narration_eligible: false,
      priority: 0,
      reason: "not_requested",
    },
    kind: "capture.artifact_ingested",
    refs: {
      absence_refs: [],
      authority_ref: null,
      entity_ids: ["entity-1"],
      evidence_ids: ["evidence-1"],
      forensic_refs: [],
      governance_ref: null,
      skin_ref: null,
    },
    sequence: 1,
    session_id: "session-a5",
    severity: "INFO",
    source: {
      ref: "holdpoint-artifact-a",
      type: "holdpoint_artifact",
    },
    summary: "Projected test event.",
    timestamp: "2026-04-24T12:00:00.000Z",
    title: "Test live event",
    version: LIVE_FEED_EVENT_VERSION,
    visibility: "internal",
    ...overrides,
  };
}

export function createTestLiveProjection(
  overrides: Partial<DashboardLiveProjectionV1> = {}
): DashboardLiveProjectionV1 {
  return {
    connection: {
      hold_reason: null,
      status: "connected",
    },
    current: {
      active_event_id: "event-1",
      active_skin: "public",
    },
    entities: {
      changed_entity_ids: ["entity-1"],
      counts_by_type: {
        permit_application: 1,
      },
    },
    events: [
      createTestLiveEvent({
        event_id: "capture-event",
        kind: "capture.artifact_ingested",
        title: "Capture artifact ingested",
      }),
      createTestLiveEvent({
        event_id: "governance-event",
        kind: "governance.evaluated",
        refs: {
          absence_refs: [],
          authority_ref: "authority-ref-1",
          entity_ids: ["entity-1"],
          evidence_ids: [],
          forensic_refs: ["forensic-ref-1"],
          governance_ref: "governance-ref-1",
          skin_ref: null,
        },
        sequence: 2,
        title: "Governance evaluated",
      }),
      createTestLiveEvent({
        event_id: "absence-event",
        kind: "absence.finding.created",
        refs: {
          absence_refs: ["absence-ref-1"],
          authority_ref: null,
          entity_ids: ["entity-1"],
          evidence_ids: [],
          forensic_refs: [],
          governance_ref: null,
          skin_ref: null,
        },
        sequence: 3,
        severity: "HOLD",
        title: "Absence finding created",
      }),
    ],
    foreman_context_seed: {
      active_event_id: "event-1",
      active_session_id: "session-a5",
      active_skin: "public",
      latest_absence_refs: ["absence-ref-1"],
      latest_forensic_refs: ["forensic-ref-1"],
      latest_governance_ref: "governance-ref-1",
      public_boundary: {
        mode: "inert_a2_projection_only",
      },
      role_session: null,
      visible_entity_ids: ["entity-1"],
    },
    latest: {
      absence: {
        finding_id: "absence-ref-1",
        source_ref: "absence-rule-1",
      },
      authority: {
        authority_ref: "authority-ref-1",
        decision: "ALLOW",
      },
      capture: {
        artifact_id: "artifact-a",
        source_ref: "holdpoint://artifact/a",
      },
      forensic: {
        entryRefs: ["forensic-ref-1"],
        status: "RECORDED",
      },
      governance: {
        evaluation_id: "governance-ref-1",
        governance_result: {
          decision: "ALLOW",
        },
      },
    },
    session: {
      created_at: "2026-04-24T12:00:00.000Z",
      session_id: "session-a5",
      status: "open",
      updated_at: "2026-04-24T12:01:00.000Z",
    },
    skins: {
      outputs: {
        public: {
          claim: "Live public skin payload projected.",
          source_ref: "projection.skins.outputs.public",
        },
      },
    },
    version: DASHBOARD_LIVE_PROJECTION_VERSION,
    ...overrides,
  };
}

export async function runTests(tests: readonly TestCase[]) {
  let failureCount = 0;

  for (const entry of tests) {
    try {
      await entry.run();
      console.log(`PASS ${entry.name}`);
    } catch (error) {
      failureCount += 1;
      console.error(`FAIL ${entry.name}`);
      console.error(error);
    }
  }

  if (failureCount > 0) {
    process.exitCode = 1;
    throw new Error(`${failureCount} dashboard test(s) failed.`);
  }

  assert.equal(failureCount, 0);
  console.log(`PASS ${tests.length} dashboard test(s)`);
}
