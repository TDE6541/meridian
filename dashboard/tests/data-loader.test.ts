import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  buildScenarioUrl,
  loadAllScenarios,
  loadScenario,
} from "../src/data/loadScenario.ts";
import { scenarioRegistry } from "../src/data/scenarioRegistry.ts";
import {
  ScenarioValidationError,
  validateScenarioPayload,
} from "../src/data/validateScenario.ts";
import {
  buildLiveProjectionPath,
  fetchLiveProjection,
  isLocalLiveProjectionPath,
} from "../src/live/liveClient.ts";
import { createTestLiveProjection } from "./scenarioTestUtils.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCENARIO_ROOT = path.resolve(__dirname, "..", "public", "scenarios");

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

async function createFileResponse(url: string): Promise<Response> {
  const absolutePath = path.normalize(url);
  const body = await readFile(absolutePath, "utf8");

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

const tests: TestCase[] = [
  {
    name: "valid routine payload loads",
    run: async () => {
      const loaded = await loadScenario("routine", {
        basePath: SCENARIO_ROOT,
        fetcher: createFileResponse as typeof fetch,
      });

      assert.equal(
        loaded.payload.scenarios[0].result.scenarioId,
        "routine-lancaster-avenue-corridor-reconstruction"
      );
    },
  },
  {
    name: "valid contested payload loads",
    run: async () => {
      const loaded = await loadScenario("contested", {
        basePath: SCENARIO_ROOT,
        fetcher: createFileResponse as typeof fetch,
      });

      assert.equal(
        loaded.payload.scenarios[0].result.scenarioId,
        "contested-hemphill-street-mixed-use-contested-authority"
      );
    },
  },
  {
    name: "valid emergency payload loads",
    run: async () => {
      const loaded = await loadScenario("emergency", {
        basePath: SCENARIO_ROOT,
        fetcher: createFileResponse as typeof fetch,
      });

      assert.equal(
        loaded.payload.scenarios[0].result.scenarioId,
        "emergency-camp-bowie-water-main-break"
      );
    },
  },
  {
    name: "malformed scenario data fails visibly",
    run: async () => {
      await assert.rejects(
        () =>
          loadScenario(scenarioRegistry[0], {
            fetcher: async () =>
              new Response(JSON.stringify({ contractVersion: "broken" }), {
                status: 200,
                headers: {
                  "content-type": "application/json",
                },
              }),
          }),
        (error: unknown) =>
          error instanceof ScenarioValidationError &&
          error.message.includes("failed validation")
      );
    },
  },
  {
    name: "validator rejects missing required structure",
    run: () => {
      const result = validateScenarioPayload({
        contractVersion: "wave8.packet5.runnerReport.v1",
        runner: {},
        scenarios: [
          {
            result: {
              contractVersion: "wave8.scenarioResult.v1",
              scenarioId: "bad-scenario",
              status: "PASS",
              steps: [{}],
            },
          },
        ],
      });

      assert.equal(result.ok, false);
      if (result.ok) {
        throw new Error("Expected validation failure.");
      }

      assert.equal(
        result.issues.some((issue) =>
          issue.includes("scenarios[0].result.steps[0].matching")
        ),
        true
      );
    },
  },
  {
    name: "loader preserves real scenario ids",
    run: async () => {
      const loaded = await loadAllScenarios({
        basePath: SCENARIO_ROOT,
        fetcher: createFileResponse as typeof fetch,
      });

      assert.deepEqual(
        loaded.map((entry) => entry.payload.scenarios[0].result.scenarioId),
        [
          "routine-lancaster-avenue-corridor-reconstruction",
          "contested-hemphill-street-mixed-use-contested-authority",
          "emergency-camp-bowie-water-main-break",
        ]
      );
    },
  },
  {
    name: "loader does not require root package runtime changes",
    run: async () => {
      const originalFetch = globalThis.fetch;

      try {
        Object.assign(globalThis, {
          fetch: undefined,
        });

        const loaded = await loadScenario("routine", {
          basePath: SCENARIO_ROOT,
          fetcher: createFileResponse as typeof fetch,
        });

        assert.equal(
          buildScenarioUrl(loaded.entry, SCENARIO_ROOT),
          path.join(SCENARIO_ROOT, loaded.entry.fileName).replace(/\\/g, "/")
        );
      } finally {
        Object.assign(globalThis, {
          fetch: originalFetch,
        });
      }
    },
  },
  {
    name: "live client fetches a local dashboard projection with injected fetch",
    run: async () => {
      const projection = createTestLiveProjection();
      const requestedPaths: string[] = [];
      const result = await fetchLiveProjection({
        fetcher: async (url) => {
          requestedPaths.push(String(url));
          return new Response(JSON.stringify(projection), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          });
        },
        sessionId: "session-a5",
      });

      assert.equal(result.ok, true);
      assert.equal(result.connection.status, "connected");
      assert.equal(result.projection?.version, "meridian.v2.dashboardLiveProjection.v1");
      assert.deepEqual(requestedPaths, ["/live/sessions/session-a5/dashboard"]);
    },
  },
  {
    name: "live client returns disconnected HOLD posture on failed local fetch",
    run: async () => {
      const result = await fetchLiveProjection({
        fetcher: async () =>
          new Response(JSON.stringify({ ok: false }), {
            status: 503,
            statusText: "Unavailable",
          }),
        sessionId: "session-a5",
      });

      assert.equal(result.ok, false);
      assert.equal(result.projection, null);
      assert.equal(result.connection.status, "disconnected");
      assert.equal(result.connection.holdMessage?.startsWith("HOLD:"), true);
    },
  },
  {
    name: "live client rejects external projection paths before fetch",
    run: async () => {
      let fetchCount = 0;
      const externalPath = ["https:", "", "example.invalid", "live"].join("/");
      const result = await fetchLiveProjection({
        fetcher: async () => {
          fetchCount += 1;
          return new Response(JSON.stringify(createTestLiveProjection()));
        },
        path: externalPath,
      });

      assert.equal(result.ok, false);
      assert.equal(fetchCount, 0);
      assert.equal(result.connection.status, "disconnected");
      assert.equal(result.connection.holdMessage?.includes("external"), true);
      assert.equal(isLocalLiveProjectionPath("//example.invalid/live"), false);
      assert.equal(isLocalLiveProjectionPath(buildLiveProjectionPath("safe")), true);
    },
  },
  {
    name: "live client holds malformed projection payloads without raw UI throw",
    run: async () => {
      const result = await fetchLiveProjection({
        fetcher: async () =>
          new Response(JSON.stringify({ version: "wrong" }), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
      });

      assert.equal(result.ok, false);
      assert.equal(result.projection, null);
      assert.equal(result.connection.status, "holding");
      assert.equal(result.connection.holdMessage?.startsWith("HOLD:"), true);
    },
  },
];

async function run() {
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

  console.log(`PASS ${tests.length} dashboard test(s)`);
}

await run();
