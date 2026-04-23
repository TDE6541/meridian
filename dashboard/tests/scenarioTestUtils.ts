import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { scenarioRegistry } from "../src/data/scenarioRegistry.ts";
import { getScenarioRegistryEntry } from "../src/data/scenarioRegistry.ts";
import { assertValidScenarioPayload } from "../src/data/validateScenario.ts";
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
